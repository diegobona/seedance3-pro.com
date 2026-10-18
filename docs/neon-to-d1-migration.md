# Neon → Cloudflare D1 数据迁移

迁移保留已有用户、登录会话、OAuth 账户与令牌、密码哈希、积分余额、积分预扣记录、视频任务、候补名单和来源访问记录。目标是 `seedance3-production`，Worker binding 为 `DB`。应用必须在数据迁移、校验和触发器安装完成后，才将 `DATABASE_BACKEND` 切为 `d1`。仅添加 `DB` binding 不代表已经迁移。

2026-10-19 已创建 D1 目标：数据库 ID 为 `bb9c23d4-43b3-4ef7-922d-ac2f9f02c62e`，区域提示为 APAC。创建时目标为空，基础结构尚未执行，线上仍使用 Neon。后续每次执行导入前，确认 `wrangler.jsonc` 中 `DB` 的名称、ID 和 `migrations_dir: "migrations/d1"` 与上述目标一致。

**当前 Neon 因计算额度耗尽而拒绝连接，且没有现成备份。此时不能导出原数据，也不能把空 D1 数据库切成线上主库。** 先恢复 Neon 读取能力，再执行下面的导出；升级临时恢复、等待额度重置或获得可恢复的完整备份均可解决源数据可读性问题。本工具遇到 HTTP 402 会立即停止，不重试、不创建空备份，也不会把读取失败解释成“没有用户”。

## 文件与转换规则

`scripts/migrate-neon-to-d1.mjs` 只执行 Neon 只读导出、本地转换和本地验证，**不执行远程写入**。一次导出在同一 `REPEATABLE READ, READ ONLY` 事务中读取全部 8 张应用表和表结构。缺表、多表、未知字段、无效值或断开的用户/预扣引用都会阻止导出。

- 所有表名、字段名和主键保持不变；父表先于子表写入。
- PostgreSQL 的绝对时间转为 Unix 毫秒整数。源库微秒中不足 1 毫秒的部分截去，与应用的 JavaScript `Date` 精度一致；空时间仍为 `NULL`。
- `daily_credit_date` 保留 `YYYY-MM-DD` 文本；布尔值转为 `0` / `1`。
- 每张表保存记录数和 SHA-256。校验覆盖全部字段，包括积分、会话 token、密码哈希和 OAuth 令牌；同样的行数不能代替内容校验。
- 导出文件、导入 SQL 和读回 JSON 包含私密数据，放在已忽略的 `.private/neon-to-d1/` 下；不提交到 Git，不粘贴到聊天或日志。新文件以独占方式创建，已有文件不会覆盖。文件权限在支持 POSIX 权限的系统上为 `0600`；Windows 继承所在私有用户目录的 ACL。

## 执行顺序

以下命令在项目根目录执行。若源 Neon 仍返回 402，到此停止，保持 `DATABASE_BACKEND=neon`，不要执行空库切换。

1. 暂停应用所有写请求及数据库 cron，等待已进入的写请求结束。源库在最终快照之后不得继续接收新写入；一致性快照只能保证快照内各表一致，不能自动同步快照后的新数据。保留同一 `BETTER_AUTH_SECRET`、Cookie 域及 R2 配置，避免已有登录和视频任务标记失效。
2. 从恢复可读的 Neon 导出一次完整快照。脚本只读取进程环境中的 `DATABASE_URL`，不会显示连接串或数据行。控制台只输出各表记录数与哈希：

   ```powershell
   node --env-file=.env.local scripts/migrate-neon-to-d1.mjs --export .private/neon-to-d1/snapshot.json
   node scripts/migrate-neon-to-d1.mjs --convert .private/neon-to-d1/snapshot.json --output .private/neon-to-d1/import.sql
   node scripts/migrate-neon-to-d1.mjs --verification-sql --output .private/neon-to-d1/verify.sql
   ```

3. 在新 D1 数据库上**只安装基础表结构**。不要先执行整个 `d1 migrations apply`，因为第二个文件包含积分触发器：

   ```powershell
   npx wrangler d1 execute seedance3-production --remote --file migrations/d1/0001_schema.sql --yes
   npx wrangler d1 execute seedance3-production --remote --file .private/neon-to-d1/import.sql --yes
   ```

   如果基础结构已经成功安装，跳过第一条，不要重复执行。导入 SQL 会先检查所有应用表均为空且没有应用表触发器；检查失败即停止。它使用普通 `INSERT`，不会覆盖、忽略冲突或删除既有数据。Wrangler 的远程文件导入按事务执行，失败时恢复导入前的状态。SQL 文件不含额外的 `BEGIN` / `COMMIT`。

4. 读取 D1 的完整数据到私有 JSON，并与快照逐表比较，同时检查外键。**读回使用 `--command`**；Wrangler 远程 `--file` 走批量导入接口，只返回执行摘要，无法用于完整数据校验。

   ```powershell
   $d1VerificationQuery = Get-Content -Raw .private/neon-to-d1/verify.sql
   npx wrangler d1 execute seedance3-production --remote --json --command $d1VerificationQuery | Set-Content -Encoding utf8 .private/neon-to-d1/verify-results.json
   if ($LASTEXITCODE -ne 0) { throw 'D1 read-back failed; do not cut over.' }
   node scripts/migrate-neon-to-d1.mjs --verify .private/neon-to-d1/snapshot.json --d1-results .private/neon-to-d1/verify-results.json
   if ($LASTEXITCODE -ne 0) { throw 'D1 data verification failed; do not cut over.' }
   ```

   只有输出 `{"verified":true,"tables":8,"rows":...}` 才表示各表记录数、全部行内容哈希和外键检查都已通过。校验输出不包含用户数据。

5. **校验通过后**再安装积分记账触发器：

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

6. 两次数据校验都通过后，补记这两份已手动安装的迁移文件，避免以后 `d1 migrations apply` 重放基础结构或提前安装触发器：

   ```powershell
   node scripts/migrate-neon-to-d1.mjs --migration-history-sql --output .private/neon-to-d1/record-history.sql
   npx wrangler d1 execute seedance3-production --remote --file .private/neon-to-d1/record-history.sql --yes
   npx wrangler d1 execute seedance3-production --remote --command "SELECT name FROM d1_migrations ORDER BY id"
   npx wrangler d1 migrations list seedance3-production --remote
   ```

   生成的 SQL 使用当前 Wrangler 的 `d1_migrations` 表结构：`id INTEGER PRIMARY KEY AUTOINCREMENT`、`name TEXT UNIQUE`、`applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL`；只记录 `0001_schema.sql` 和 `0002_credit_triggers.sql`。它先检查 8 张基础表与 3 个积分触发器都存在，否则拒绝补记。最后两条命令应分别显示这两份文件名和没有待应用迁移；不满足时保持维护状态，不能切换。未来新增迁移从 `0003` 开始，并保留这两份原文件名。
7. 确认所有旧 Worker 请求和旧 Neon 定时任务均已停止并完成，不会再写 Neon 或重建旧 R2 状态。然后**只清除这三个调度控制对象**，保留 `video-reconciliation/v1/tasks/` 下全部任务标记及其他 R2 对象：

   ```powershell
   npx wrangler r2 object delete seedance3-video-references/video-reconciliation/v1/initialized --remote
   npx wrangler r2 object delete seedance3-video-references/video-reconciliation/v1/bootstrap --remote
   npx wrangler r2 object delete seedance3-video-references/video-reconciliation/v1/retry --remote
   ```

   该清理仅在已验证 D1 数据导入、触发器安装及旧写入排空之后执行，不能在准备空 D1 时提前执行。清除 `initialized` 和旧分页游标后，新 D1 的首次调度会从头发现导入的未完成任务；清除 `retry` 避免沿用 Neon 超额产生的退避时间。已有任务标记继续保护并发恢复与退款。
8. 修改 `wrangler.jsonc` 中的 `vars.DATABASE_BACKEND` 为 `d1`，确认绑定指向已验证的 `seedance3-production`，运行 `npm run cf-typegen` 后重新构建并部署应用。不要只在控制台修改开关，下一次部署会采用仓库中的值。恢复访问前验证已有会话、用户余额、图片/视频任务提交与失败退款；付费模型调用应仅在需要端到端生成验证时执行。恢复 cron 后，视频任务仍遵循“R2 有活动标记才读数据库”的规则。
9. 记录源快照时间、表清单/行数/哈希、D1 数据库 ID、Worker 部署版本，以及两次校验结果。保留私有快照直到迁移验收完成。不要删除原 Neon 数据，直至切换及业务验收完成。

## 回退

在 D1 尚未接受新写入前，可以恢复原 Worker 配置与版本，并保持维护状态，直到源 Neon 恢复可用。D1 已接受新注册、扣款或任务后，Neon 就是旧快照；不能直接指回 Neon，否则会丢失新数据或出现积分不一致。此时先暂停写入，保留 D1 快照，再完成反向同步或修复 D1。

## 本地验证

```powershell
node --test tests/neon-to-d1-migration.test.mjs
```

测试使用真实 SQLite 执行生成的 SQL，并覆盖实际 D1 基础结构的完整导入、触发器延后安装、敏感字符串转义、时间/日期/空值、积分不重复扣款、哈希篡改、已有数据保护、外键错误、HTTP 402 不产生文件、无隐式重试及错误输出不泄漏私密 JSON。测试不连接线上 Neon，不写远程 D1，也不调用生成模型。

参考：[Neon HTTP 事务](https://github.com/neondatabase/serverless/blob/main/CONFIG.md#transaction-function)、[D1 导入与导出](https://developers.cloudflare.com/d1/best-practices/import-export-data/)、[Wrangler D1 命令](https://developers.cloudflare.com/d1/wrangler-commands/)。
