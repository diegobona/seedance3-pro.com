# Neon → Cloudflare D1 数据迁移

迁移保留已有用户、登录会话、OAuth 账户与令牌、密码哈希、积分余额、积分预扣记录、视频任务、候补名单和来源访问记录。目标是 `seedance3-production`，Worker binding 为 `DB`。应用必须在数据迁移、校验和触发器安装完成后，才将 `DATABASE_BACKEND` 切为 `d1`。仅添加 `DB` binding 不代表已经迁移。

2026-10-19 09:33（北京时间）已完成生产切换。D1 数据库 ID 为 `bb9c23d4-43b3-4ef7-922d-ac2f9f02c62e`，区域为 APAC / SIN，Worker `seedance3-blog-cms-worker` 的版本 `73e8985c-28d1-4548-81e7-d201d5d1e974` 承接 100% 流量。线上及仓库配置均为 `DATABASE_BACKEND=d1`、`DATABASE_MIGRATION_PAUSED=0`。

源 Neon 恢复后，先部署维护开关并安装 8 表写保护，再导出最终一致性快照。基础表导入后、积分触发器安装后各进行一次完整读回，均通过 8 表全部字段 SHA-256 和外键核对，共 428 行：

| 表 | 记录数 |
| --- | ---: |
| user | 36 |
| account | 36 |
| session | 40 |
| verification | 0 |
| generation_credit_reservation | 71 |
| video_generation_task | 26 |
| launch_waitlist | 2 |
| referral_visit | 217 |

`0001_schema.sql`、`0002_credit_triggers.sql` 已记录至 D1 迁移历史，没有待应用迁移。旧 R2 调度控制对象已清除；D1 定时调度已完成首次发现，`initialized` 已建立，`bootstrap` 和 `retry` 均不存在。两条原 cron 保留，空闲视频调度经 R2 判断后不查询数据库。

验证包括 97 项相关本地测试、生产构建及类型检查；本地临时 D1 中读取已迁移的真实旧会话，身份、日期精度及数据哈希均保持一致。线上临时测试账号完成注册、登录、会话、15 积分余额和图片/视频参数校验，随后删除测试账号及关联数据；未提交生成任务或调用付费模型。

原 Neon 数据及写保护继续保留。私有备份、两次读回、逐表哈希和验证结果位于 `.private/neon-to-d1/cutover-20261019T010429Z/`，不进入 Git。D1 已接受新写入，不能直接切回 Neon；回退必须先暂停写入并同步新增数据。以下是后续复用的迁移操作流程，并非要求再次导入当前生产库。

## 文件与转换规则

`scripts/migrate-neon-to-d1.mjs` 只执行 Neon 只读导出、本地转换和本地验证，**不执行远程写入**。一次导出在同一 `REPEATABLE READ, READ ONLY` 事务中读取全部 8 张应用表和表结构。缺表、多表、未知字段、无效值或断开的用户/预扣引用都会阻止导出。

- 所有表名、字段名和主键保持不变；父表先于子表写入。
- PostgreSQL 的绝对时间转为 Unix 毫秒整数。源库微秒中不足 1 毫秒的部分截去，与应用的 JavaScript `Date` 精度一致；空时间仍为 `NULL`。
- `daily_credit_date` 保留 `YYYY-MM-DD` 文本；布尔值转为 `0` / `1`。
- 每张表保存记录数和 SHA-256。校验覆盖全部字段，包括积分、会话 token、密码哈希和 OAuth 令牌；同样的行数不能代替内容校验。
- 导出文件、导入 SQL 和读回 JSON 包含私密数据，放在已忽略的 `.private/neon-to-d1/` 下；不提交到 Git，不粘贴到聊天或日志。新文件以独占方式创建，已有文件不会覆盖。文件权限在支持 POSIX 权限的系统上为 `0600`；Windows 继承所在私有用户目录的 ACL。

## 执行顺序

以下命令在项目根目录执行。若源 Neon 仍返回 402，到此停止，保持 `DATABASE_BACKEND=neon`，不要执行空库切换。

1. 在 `wrangler.jsonc` 中保持 `vars.DATABASE_BACKEND` 为 `neon`，将 `vars.DATABASE_MIGRATION_PAUSED` 设为字符串 `"1"`，重新构建并部署维护版本。该开关使进入 Worker 的请求返回不缓存的 HTTP 503，并跳过全部数据库调度；现有视频参考资源的 GET/HEAD 读取继续允许。确认维护版本已接管全部流量，登录、生成和其他业务请求返回维护响应。保留同一 `BETTER_AUTH_SECRET`、Cookie 域及 R2 配置，避免已有登录和视频任务标记失效。维护开关不能撤销旧版本中已经进入的请求，因此不能仅靠部署完成就开始最终快照。
2. **最终快照前，必须安装 Neon 源库写保护。** 以下命令读取 `.env.local` 中的 `DATABASE_URL`，只输出是否安装及受保护的表数，不显示连接串或用户数据：

   ```powershell
   node --env-file=.env.local scripts/neon-cutover-guard.mjs --install
   if ($LASTEXITCODE -ne 0) { throw 'Neon write guard installation failed; remain in maintenance.' }
   ```

   只有输出 `{"installed":true,"guardedTables":8}` 才能继续。脚本在一个 Neon HTTP 事务中，对全部 8 张应用表取得 `SHARE ROW EXCLUSIVE` 锁，等待先前持有写锁的事务结束，然后安装同名的 `BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE FOR EACH STATEMENT` 触发器。即使更新、删除或插入零行，源库写入也会以 SQLSTATE `25006` 拒绝；SELECT、导出和普通 DDL 仍可执行。事务还会检查 8 个触发器的启用状态、目标函数和完整事件类型。锁等待超过 10 秒或单条语句超过 30 秒会失败，保持维护状态并查明原因，不能跳过保护继续迁移。不要在切换过程中移除或禁用这些触发器。源库最终快照之后不得继续接收写入；一致性快照不能同步快照后的新数据。
3. 从已保护且可读的 Neon 导出一次**最终**完整快照。迁移前的预备备份不能代替此快照；以下路径均须为尚不存在的新文件，如已执行过准备导出，改用新的私有目录并同步替换后续路径。脚本只读取进程环境中的 `DATABASE_URL`，不会显示连接串或数据行。控制台只输出各表记录数与哈希：

   ```powershell
   node --env-file=.env.local scripts/migrate-neon-to-d1.mjs --export .private/neon-to-d1/snapshot.json
   if ($LASTEXITCODE -ne 0) { throw 'Final Neon snapshot failed; do not import an older backup.' }
   node scripts/migrate-neon-to-d1.mjs --convert .private/neon-to-d1/snapshot.json --output .private/neon-to-d1/import.sql
   if ($LASTEXITCODE -ne 0) { throw 'Final snapshot conversion failed; remain in maintenance.' }
   node scripts/migrate-neon-to-d1.mjs --verification-sql --output .private/neon-to-d1/verify.sql
   if ($LASTEXITCODE -ne 0) { throw 'Verification SQL creation failed; remain in maintenance.' }
   ```

4. 在新 D1 数据库上**只安装基础表结构**。不要先执行整个 `d1 migrations apply`，因为第二个文件包含积分触发器：

   ```powershell
   npx wrangler d1 execute seedance3-production --remote --file migrations/d1/0001_schema.sql --yes
   npx wrangler d1 execute seedance3-production --remote --file .private/neon-to-d1/import.sql --yes
   ```

   如果基础结构已经成功安装，跳过第一条，不要重复执行。导入 SQL 会先检查所有应用表均为空且没有应用表触发器；检查失败即停止。它使用普通 `INSERT`，不会覆盖、忽略冲突或删除既有数据。Wrangler 的远程文件导入按事务执行，失败时恢复导入前的状态。SQL 文件不含额外的 `BEGIN` / `COMMIT`。

5. 读取 D1 的完整数据到私有 JSON，并与快照逐表比较，同时检查外键。**读回使用 `--command`**；Wrangler 远程 `--file` 走批量导入接口，只返回执行摘要，无法用于完整数据校验。

   ```powershell
   $d1VerificationQuery = Get-Content -Raw .private/neon-to-d1/verify.sql
   npx wrangler d1 execute seedance3-production --remote --json --command $d1VerificationQuery | Set-Content -Encoding utf8 .private/neon-to-d1/verify-results.json
   if ($LASTEXITCODE -ne 0) { throw 'D1 read-back failed; do not cut over.' }
   node scripts/migrate-neon-to-d1.mjs --verify .private/neon-to-d1/snapshot.json --d1-results .private/neon-to-d1/verify-results.json
   if ($LASTEXITCODE -ne 0) { throw 'D1 data verification failed; do not cut over.' }
   ```

   只有输出 `{"verified":true,"tables":8,"rows":...}` 才表示各表记录数、全部行内容哈希和外键检查都已通过。校验输出不包含用户数据。

6. **校验通过后**再安装积分记账触发器：

   ```powershell
   npx wrangler d1 execute seedance3-production --remote --file migrations/d1/0002_credit_triggers.sql --yes
   ```

   现有 `reserved` 记录已经在 PostgreSQL 中扣过积分。提前安装触发器会在导入时再次扣款，甚至因余额不足而失败；触发器延后安装可避免重复扣款。安装触发器本身不会改动已有行。再次读回并保留第二份结果，确认安装后数据仍与快照一致：

   ```powershell
   npx wrangler d1 execute seedance3-production --remote --json --command $d1VerificationQuery | Set-Content -Encoding utf8 .private/neon-to-d1/verify-results-after-triggers.json
   if ($LASTEXITCODE -ne 0) { throw 'D1 read-back failed after triggers; do not cut over.' }
   node scripts/migrate-neon-to-d1.mjs --verify .private/neon-to-d1/snapshot.json --d1-results .private/neon-to-d1/verify-results-after-triggers.json
   if ($LASTEXITCODE -ne 0) { throw 'D1 verification failed after triggers; do not cut over.' }
   ```

7. 两次数据校验都通过后，补记这两份已手动安装的迁移文件，避免以后 `d1 migrations apply` 重放基础结构或提前安装触发器：

   ```powershell
   node scripts/migrate-neon-to-d1.mjs --migration-history-sql --output .private/neon-to-d1/record-history.sql
   npx wrangler d1 execute seedance3-production --remote --file .private/neon-to-d1/record-history.sql --yes
   npx wrangler d1 execute seedance3-production --remote --command "SELECT name FROM d1_migrations ORDER BY id"
   npx wrangler d1 migrations list seedance3-production --remote
   ```

   生成的 SQL 使用当前 Wrangler 的 `d1_migrations` 表结构：`id INTEGER PRIMARY KEY AUTOINCREMENT`、`name TEXT UNIQUE`、`applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL`；只记录 `0001_schema.sql` 和 `0002_credit_triggers.sql`。它先检查 8 张基础表与 3 个积分触发器都存在，否则拒绝补记。最后两条命令应分别显示这两份文件名和没有待应用迁移；不满足时保持维护状态，不能切换。未来新增迁移从 `0003` 开始，并保留这两份原文件名。
8. 保持维护开关和 Neon 写保护，确认所有旧 Worker 请求和旧 Neon 定时任务均已停止并完成，不会重建旧 R2 状态。写保护负责拒绝旧请求迟到的数据库写入；仍须等待其余操作结束。然后**只清除这三个调度控制对象**，保留 `video-reconciliation/v1/tasks/` 下全部任务标记及其他 R2 对象：

   ```powershell
   npx wrangler r2 object delete seedance3-video-references/video-reconciliation/v1/initialized --remote
   npx wrangler r2 object delete seedance3-video-references/video-reconciliation/v1/bootstrap --remote
   npx wrangler r2 object delete seedance3-video-references/video-reconciliation/v1/retry --remote
   ```

   该清理仅在已验证 D1 数据导入、触发器安装及旧写入排空之后执行，不能在准备空 D1 时提前执行。清除 `initialized` 和旧分页游标后，新 D1 的首次调度会从头发现导入的未完成任务；清除 `retry` 避免沿用 Neon 超额产生的退避时间。已有任务标记继续保护并发恢复与退款。
9. 修改 `wrangler.jsonc` 中的 `vars.DATABASE_BACKEND` 为 `d1`，**继续保持 `vars.DATABASE_MIGRATION_PAUSED: "1"`**，确认绑定指向已验证的 `seedance3-production`，运行 `npm run cf-typegen` 后重新构建并部署。确认 D1 版本已接管全部流量、部署配置正确且维护响应仍有效。不要只在控制台修改开关，下一次部署会采用仓库中的值。
10. 完成数据和配置检查后，将仓库中的 `vars.DATABASE_MIGRATION_PAUSED` 设为字符串 `"0"`，重新构建并部署以恢复访问和 cron。保留 Neon 的 8 表写保护，避免旧请求继续修改源库。验证已有会话、用户余额、图片/视频任务提交与失败退款；付费模型调用应仅在需要端到端生成验证时执行。视频任务仍遵循“R2 有活动标记才读数据库”的规则。**从 D1 接受第一笔业务写入开始，禁止直接将后端切回 Neon；登录会话更新等写入同样属于这一界限。**
11. 记录源快照时间、表清单/行数/哈希、D1 数据库 ID、维护部署版本和最终部署版本，以及两次校验结果。保留私有快照直到迁移验收完成。不要删除原 Neon 数据，直至切换及业务验收完成。

## 回退

**只有确认 D1 尚未接受任何业务写入时，才能直接回退到 Neon。** 先保持 `DATABASE_MIGRATION_PAUSED="1"`，将 `DATABASE_BACKEND` 恢复为 `neon` 并部署，确认全部流量仍处于维护状态。确认源 Neon 可用且确实决定取消此次切换后，移除源库写保护：

```powershell
node --env-file=.env.local scripts/neon-cutover-guard.mjs --remove
if ($LASTEXITCODE -ne 0) { throw 'Neon write guard removal failed; remain in maintenance.' }
```

只有输出 `{"removed":true}` 后，才将 `DATABASE_MIGRATION_PAUSED` 改为 `"0"` 并重新部署，恢复 Neon 业务。移除命令在一个事务中只删除这 8 张表上本工具拥有的同名触发器和对应函数，不删除用户行，也不删除其他触发器。失败或状态不明时保持维护状态，不直接恢复旧版本绕过保护。

**D1 开始接受业务写入后，不可直接切回 Neon。** 新注册、会话更新、扣款、退款或任务状态变化都会令 Neon 成为旧快照；切回会丢失新数据或造成积分不一致。此时先重新部署 `DATABASE_MIGRATION_PAUSED="1"` 停止业务和调度，保留 D1 完整快照，在维护状态下修复 D1，或设计并校验完整的反向同步。反向同步与冲突处理完成前，保留 Neon 写保护，不执行 `--remove`，不把旧 Neon 当作当前主库。

## 本地验证

```powershell
node --test tests/neon-to-d1-migration.test.mjs
```

测试使用真实 SQLite 执行生成的 SQL，并覆盖实际 D1 基础结构的完整导入、触发器延后安装、敏感字符串转义、时间/日期/空值、积分不重复扣款、哈希篡改、已有数据保护、外键错误、HTTP 402 不产生文件、无隐式重试及错误输出不泄漏私密 JSON。测试不连接线上 Neon，不写远程 D1，也不调用生成模型。

参考：[Neon HTTP 事务](https://github.com/neondatabase/serverless/blob/main/CONFIG.md#transaction-function)、[D1 导入与导出](https://developers.cloudflare.com/d1/best-practices/import-export-data/)、[Wrangler D1 命令](https://developers.cloudflare.com/d1/wrangler-commands/)。
