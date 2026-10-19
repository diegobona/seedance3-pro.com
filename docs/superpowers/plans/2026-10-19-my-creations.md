# 我的作品与生成历史 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 登录用户可以跨页面、跨设备查看自己的图片和视频作品，预览、下载、复制提示词及删除作品；新生成的文件自动保存。

**Architecture:** D1 保存作品、生成参数和文件归档状态；私有 R2 保存实际文件；Worker 验证作品所有权后提供媒体访问。图片在生成响应期间保存，视频使用 Cloudflare Queues 做可重试的流式归档；R2 活动标记只在存在待处理工作时启动数据库恢复查询。生成结算和文件归档有各自状态，归档重试永远不调用模型或重复扣费。

**Tech Stack:** 现有 React / TanStack Start、Better Auth、Cloudflare Workers、D1、R2；新增归档 Queue 和 dead-letter Queue；Node 测试和真实 Miniflare D1 / R2。

---

## 用户需求与第一版范围

用户请求：“增加查看历史生成作品（图片或视频）的功能，先规划怎么做。”本轮只新增本计划，不修改应用、不创建云资源、不部署。

1. 工作室侧栏和账户菜单增加“我的作品”，页面为 `/app/creations` 与 `/zh/app/creations`。沿用现有深色风格、中英文文案和移动端适配。
2. 登录后展示当前账户的作品，按创建时间倒序；支持“全部 / 图片 / 视频”、每页 20 条及“加载更多”。无作品、加载失败、未登录分别有清晰状态。
3. 卡片展示预览、模型、生成时间、文件保存状态；详情展示提示词和现有可记录的比例、分辨率、时长等参数。多张图片的一次生成合并为一组，每张均可查看、下载。
4. 支持图片放大、视频播放/拖动、下载、复制提示词、删除一组作品。删除需一次确认；删除作品不退积分。
5. 新作品自动保存，不要求用户再点“保存”。刷新和重新登录后仍能查看已归档作品。
6. 第一版默认先保留文件，不启用自动到期删除，也不向用户承诺永久保存。提供主动删除；存储量先通过专用 R2 bucket 的运维面板观测，不增加用户容量仪表盘。后续若增加免费保存期限，先明确产品规则和页面提示，再实施清理，不默默删除已有作品。
7. 第一版覆盖登录账户。当前游客视频试用已有独立 D1 身份；游客作品在注册后的认领需随作品功能单独接入，不能仅凭浏览器本地 ID 认领别人的作品。
8. 第一版不包含公开分享、收藏、文件夹、批量管理、全文搜索、重新调用模型或视频转码。复制提示词足以支持再次创作；不新增消费入口。

## 当前实现与迁移边界

- `app/studio.js` 只在结果区域展示本次生成结果；已完成视频会清除 `sessionStorage` 中的活动任务 ID。
- `src/routes/api/images/generate.ts` 和 `scripts/tuzi-image.mjs` 返回图片 URL / base64，未持久保存作品；已有 `prepareImages` 回调在模型请求的 `try/catch` 内，直接抛出归档错误会把已成功的生成误判为失败，需要避免。
- `video_generation_task` 已保存用户、结果 URL 和部分视频参数；尚未保存提示词、模型展示名或作品文件。前端状态轮询和 `src/lib/video-task-reconciler.ts` 都可能确认视频完成，必须共用幂等归档入口。
- 现有 R2 `references/` 是 24 小时的输入引用；`references/sources/` 保存的是临时来源 URL，不是完整图片。作品不能复用其到期规则或无登录读取入口。
- 旧视频仅补回已经成功的任务记录；结果链接仍可下载的尝试归档，失效的标记“文件已失效”。模型只在 workflow 映射确定时填写；未记录的提示词显示“原记录未保存提示词”，不猜测。
- 旧图片没有完整、可靠的作品来源，不能承诺找回。新功能上线后开始可靠记录新生成作品。
- 不修改 Neon、现有 0001 / 0002 迁移或积分触发器。仅在 D1 新增 `0005_generation_works.sql`；新模块必须使用当前 D1 环境，不能初始化 Neon 连接。

## 数据、接口与文件约定

### D1 模型

新增两张表，父表一次生成、子表每个输出文件；归档任务字段直接保存在子表，避免再维护一份重复的任务状态。

```sql
CREATE TABLE generation_work (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN ('image','video')),
  source_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('image','video')),
  model_id TEXT,
  prompt TEXT,
  params_json TEXT,
  generation_status TEXT NOT NULL CHECK(generation_status IN ('generating','succeeded','failed')),
  legacy INTEGER NOT NULL DEFAULT 0 CHECK(legacy IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  UNIQUE(source_type,source_id)
);
CREATE INDEX generation_work_user_created_idx ON generation_work(user_id,created_at DESC,id DESC);
CREATE INDEX generation_work_user_kind_created_idx ON generation_work(user_id,kind,created_at DESC,id DESC);

CREATE TABLE generation_asset (
  id TEXT PRIMARY KEY NOT NULL,
  work_id TEXT NOT NULL REFERENCES generation_work(id) ON DELETE CASCADE,
  output_index INTEGER NOT NULL CHECK(output_index>=0),
  source_url TEXT,
  object_key TEXT UNIQUE,
  content_type TEXT,
  byte_size INTEGER CHECK(byte_size IS NULL OR byte_size>=0),
  storage_status TEXT NOT NULL CHECK(storage_status IN ('pending','saving','ready','failed','missing','deleting','deleted')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at INTEGER,
  lease_token TEXT,
  lease_until INTEGER,
  last_error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(work_id,output_index)
);
CREATE INDEX generation_asset_work_idx ON generation_asset(work_id,output_index);
```

`source_id`：图片使用已存在的积分 reservation ID，视频使用本地 task ID，形成幂等键。时间保持 Unix 毫秒。`params_json` 只存允许字段：图片 quantity / size / resolution / mode，视频 duration / resolution / aspectRatio / referenceCount；不存参考图原件、密钥、Cookie 或用户提交的任意 JSON。

列表使用 `(created_at,id)` 游标，不用 OFFSET。SQL 始终包含 `user_id=? AND deleted_at IS NULL`，以及可选 `kind=?`；游标经解析和长度校验，limit 限制为 1–50，默认 20。一次列表查询作品、一次批量查询对应资产，禁止每卡片再查询 D1。

### API 契约

| 接口 | 行为 |
| --- | --- |
| `GET /api/creations?kind=image\|video&cursor=...&limit=20` | 当前用户作品分页，返回 `items,nextCursor`；不返回供应商 URL、object key、内部 lease / 错误详情 |
| `GET /api/creations/$id` | 当前用户作品详情及输出资产；他人或已删除作品统一 404 |
| `GET /api/creations/$id/media?asset=...&download=1` | 验证归属后读取 R2；GET / HEAD、Range、ETag；download 参数控制 Content-Disposition |
| `POST /api/creations/$id/media?asset=...` | 本账户已生成成功、尚未保存的 base64 图片重传；原始 PNG/JPEG/WebP body，20 MiB 上限，同源及限流；ready 时幂等返回，禁止覆盖或外链代取 |
| `DELETE /api/creations/$id` | 同源及登录校验；先在 R2 持久保存清理意图，再 D1 tombstone 并异步清理全部资产；幂等，不改积分 |

未登录请求 401；作品跨账户访问统一 404。媒体端点先检查用户与资产关联，禁止客户端指定 object key 或远程 URL。对带登录态的 API、媒体和错误响应使用 `private, no-store`，禁止进入共享缓存。视频支持单段 Range 的 206 / Content-Range / Accept-Ranges 与无效范围 416，不能把部分内容当 200 返回。

详情返回参数示例：

```ts
type WorkSummary = {
  id: string
  kind: 'image' | 'video'
  modelId: string | null
  createdAt: number
  generationStatus: 'generating' | 'succeeded' | 'failed'
  assets: Array<{
    id: string
    storageStatus: 'pending' | 'saving' | 'ready' | 'failed' | 'missing'
    mediaUrl: string | null // 仅同站鉴权端点；ready 时提供
  }>
}
```

### R2、后台任务与费用

- 新建专用私有 bucket `seedance3-user-creations`，binding `USER_CREATIONS`，与临时参考图片隔离；不启用公开访问或自动删除规则。
- 对象 key 为 `works/<userId>/<workId>/<assetId>/<attemptId>.<ext>`，每次归档尝试独立 key；D1 仅指向通过 lease/CAS 成功发布的对象。失败/过期 consumer 只能删除自己本次写入的对象，不能误删另一 consumer 已发布的文件。
- 下载与 R2 写入使用 stream，按 MIME、文件签名与实际字节数限制大小；初始上限图片 20 MiB、视频 512 MiB，作为可调整的运维保护，不改变模型的生成限制。外链只能来自服务端保存的供应商结果，HTTPS、禁私网地址/凭据/自定义端口；按实际供应商 CDN 配置允许列表，拒绝自动重定向或逐跳重新验证，禁止开放代理。
- 新增 Queue `seedance3-media-archive`、DLQ `seedance3-media-archive-dlq`；消息只含 `version,assetId,action`，不含图片 base64、视频、提示词、用户凭据或大 JSON。
- 图片 base64 无法塞进 Queue：在生成响应前解码并写 R2，批次逐张保存，限制内存峰值。URL 类型图片先尝试归档，瞬时失败后可通过 Queue 使用已持久保存的来源重试。
- 视频通过 Queue 流式转存，不把大文件复制仅交给 HTTP 的 `waitUntil()`；它在响应后只有有限执行窗口。[Worker 生命周期](https://developers.cloudflare.com/workers/runtime-apis/context/)、[Queue 限制](https://developers.cloudflare.com/queues/platform/limits/)。
- R2 标记 `work-archive/v1/active/<sourceType>/<sourceId>` 在付费模型调用前建立，并保留到所有资产 ready / 终止失败 / 删除完成。若标记或初始 D1 元数据建立失败，在调用模型前停止，按原逻辑退还尚未消费的预扣。
- 存在活动标记时，现有 cron 批量读取对应 D1 工作状态，恢复待发 Queue 消息、过期 lease 或删除任务；无标记时直接返回，不能每分钟扫描作品表。Queue 投递失败保留 D1 待处理状态和 R2 标记；发送成功后也保留标记直到消费者持久完成，防止消息保留期结束后出现永久卡住的归档。
- 生成失败也必须进入终态：图片 provider 异常/无效结果，视频 submission failure / failure / expiry 均同步 work 状态。若请求中断导致传播遗漏，恢复器按同源 reservation / video task 的既有状态补齐，不调用模型、不结算或退款。图片生成超过 20 分钟且没有存活的归档 lease 时终止页面和后台等待：reservation 已 settled 则显示“生成已完成但作品未保存”，已 refunded 或仍 reserved 则显示“生成结果未保存”，work 进入不再轮询的终态；预扣的后续退款仍完全由原积分机制负责。上线前确认该 20 分钟大于当前 provider + 文件保存超时总预算，否则按实际总预算加 2 分钟调整。
- 对 R2 标记先落地、D1 work 尚未创建的崩溃窗口，标记携带 `prepareDeadline`（初始 2 分钟）。创建 work 的 D1 SQL 必须以数据库当前时间未超过该 deadline 为条件；过期后恢复器确认没有对应 work 才移除标记。这样不会清掉标记后又迟到创建不可发现的工作。
- 图片只有 base64 且 R2 持续失败时，无法凭空创建可重试的持久副本：返回当前成功结果供下载，明确“作品保存失败”；当前页面保留本次数据并提供仅重传文件的重试保存，绑定已验证账户/asset 并限制类型、大小，不接受任意外链。关闭页面后不能承诺找回这类未保存文件。
- consumer 以 D1 lease/CAS、唯一来源键和输出序号保证重复消息不产生重复作品；只操作文件和归档状态，禁止调用模型和积分 store。归档持久业务错误进入 failed / missing，有限次数瞬时错误退避重试，最终归档失败由 DLQ consumer 持久记录并清除归档活动标记。删除失败则保留 deleting 状态及持久删除/上传恢复标记，必须等物理清理成功才移除；按 R2 元数据中的 retryAt 退避恢复或受控重放 DLQ，退避未到时不查 D1，不能把清理失败当作删除完成。
- 每次上传前建立 `work-archive/v1/uploads/<attemptId>` 的恢复标记；上传后 D1 CAS 发布成功才能移除。中断上传/未发布对象只在存在恢复标记时清理，查证对象没有成为当前有效资产且 lease 已过期后删除，防止 R2 孤儿积累。删除与归档并发时，以作品 tombstone 拒绝发布，上传者清理自己的对象。
- 已完成作品的删除使用独立标记 `work-archive/v1/deletions/<workId>/<operationId>`：鉴权后先写入含 2 分钟提交 deadline 的清理意图，失败则不写 tombstone，返回可重试错误。然后一个 D1 batch 在 deadline 未过且 owner 匹配时写 work tombstone 和资产 deleting 状态；R2 标记保留到全部文件清理完成。恢复器不会因 SQL 尚未提交而立即删掉准备标记；只在 deadline 已过且 D1 证明未发生 tombstone 时移除。SQL 也必须拒绝 deadline 后的迟到提交。已写 tombstone 的标记则持续恢复清理，即使 API 当时未成功发送 Queue 消息。
- 成本估算只基于实测文件大小与调用量。R2 Standard 目前包含 10 GB-month 存储，超额单价 $0.015 / GB-month，读写操作另计；免费额度不视为本项目独占。Queues 也按操作数计费，不能承诺无限免费。[R2 价格](https://developers.cloudflare.com/r2/pricing/)、[Queues 价格](https://developers.cloudflare.com/queues/platform/pricing/)。

## 实施任务

每个任务按“先写关键失败测试 → 确认失败 → 最小实现 → 相关测试通过 → 单独提交”的顺序执行；不调用付费模型来跑测试。下列新测试的 Expected 均为所列场景通过、0 fail。

### Task 1：作品表与用户隔离的存储层

**Files:** Create `migrations/d1/0005_generation_works.sql`, `src/db/generation-works.ts`, `tests/d1-generation-works.test.ts`; Modify `src/db/d1-schema.ts`, `tests/helpers/d1-test-db.ts`。

- [ ] 写真实 Miniflare D1 测试：同源幂等、多张输出、同毫秒游标无漏重、类型筛选、跨用户隔离、删除后不可见。
- [ ] 应用上述完整 DDL，增加 store：`createWork`, `attachAssets`, `listForUser`, `getForUser`, `claimArchive`, `completeArchive`, `markDeleted`，所有用户操作显式接收 userId。
- [ ] 为 owner / work / asset 关联、状态更新和 lease token 做 SQL 条件约束；归档 complete 不得恢复 deleted 作品。图片新增记录与原 reservation 关联；视频创建作品与 task 的 D1 batch 共同提交，预扣失败时不能遗留作品。
- [ ] 运行 `node --import tsx --test tests/d1-generation-works.test.ts tests/d1-auth.test.ts tests/d1-generation-credits.test.ts`。确认原始 8 表数据和积分触发器无变化。
- [ ] 提交 `feat: add private generation works store`。

### Task 2：R2 归档服务、Queue 与恢复调度

**Files:** Create `src/lib/creation-archive.ts`, `src/lib/creation-archive-activity.ts`, `src/lib/creation-archive-consumer.ts`, `tests/creation-archive.test.ts`, `tests/creation-archive-activity.test.ts`; Modify `src/server.ts`, `src/cloudflare-env.d.ts`, `wrangler.jsonc`, generated `src/worker-bindings.d.ts`。

- [ ] 先测试 base64 / URL 图片、流式 MP4、超大小/错误 MIME、禁止内网与重定向、流中断后不发布 ready。
- [ ] 实现 Queue action `archive|delete` 和 DLQ 处理，初始 consumer batch size 1、最大并发 2、最多 5 次瞬时失败重试；未知 message version 拒绝处理。确切 Wrangler 字段先对照已安装 CLI/schema。
- [ ] 验证多次消息、consumer lease 过期、写完 R2 但 D1 更新失败、上传时用户删除、先消费后 producer 更新、先发消息后进程退出等竞态；只发布当前 lease 的对象。
- [ ] 实现独立 R2 活动标记与恢复扫描。测试无标记时 `D1.prepare` / `D1.batch` 调用数均为 0；只按标记 ID 分批查询、带上限和退避，无全表定时扫描。
- [ ] 测试并实现全部终态恢复：图片 provider 错误、视频提交失败/失败/到期、20 分钟图片中断、准备标记存在但 D1 不存在、删除意图准备期间及 SQL 提交后崩溃。所有已终止工作最终清除活动标记，页面不再把它们当作 generating；过期准备意图不得允许迟到 SQL 创建工作或执行 tombstone。
- [ ] 给 Worker 新增 `queue` 处理；维护开关开启时消费者 retry 并延后处理，不 ack 丢弃任务，HTTP 和原定时维护行为保持。
- [ ] 运行 `node --import tsx --test tests/creation-archive.test.ts tests/creation-archive-activity.test.ts tests/video-task-activity.test.ts tests/video-task-activity-db.test.ts tests/video-task-reconciler.test.ts`。
- [ ] 提交 `feat: archive generated media with durable retries`。

### Task 3：接入新图片和视频生成

**Files:** Modify `scripts/tuzi-image.mjs`, `src/routes/api/images/generate.ts`, `src/lib/protected-image-generation.ts`, `src/lib/protected-video-generation.ts`, `src/db/d1-video-generation-tasks.ts`, `src/routes/api/videos/generate.ts`, `src/lib/video-task-reconciler.ts`; Create `tests/creation-generation-integration.test.ts`。

- [ ] 将图片保护层的回调扩展为 `generate(request, { reservationId, userId })`，ID 来自现有预扣与已鉴权会话；不依赖调用方猜测或新建另一份 reservation。图片解析器增加 `onValidatedInput(metadata)`，在字段/引用图校验后、provider 调用前建立 work；`prepareImages(images, metadata)` 接收同一可信元数据，且保持现有图片转视频的 animateId 行为。
- [ ] 图片在请求已经解析/校验完成的位置读取 prompt、model、参数，不重复读取包含参考图的大 multipart，也不从客户端接收 ownerId。归档模块不会重写现有 provider 验证或改变成功图片数量判断。
- [ ] 在预扣后、模型调用前建立 work 和恢复标记；成功返回 images 后保存全部输出并关联原 reservation。新增归档步骤捕获自身错误，避免 `prepareImages` 抛错导致已有成功生成被当成 provider 失败退款。
- [ ] 归档失败仍按原来的生成成功逻辑结算一次，响应保留可下载的本次结果并附上 `workId` / 保存状态；URL 输出可后台重试，base64 输出允许当前页面重传保存，不再生成。
- [ ] 视频预扣/创建任务时记录 prompt 和参数；在 D1 finalizeSuccess 的同一个 batch 中幂等写入 work 成功状态和待归档 asset。由前端轮询完成或 cron 完成的任务使用同一事务，不产生两份作品。
- [ ] 视频 `finalizeSubmissionFailure`、`finalizeFailure` 和 `expireOverdue` 在原 D1 事务中同步 work 失败终态；图片保护层增加非抛出式 outcome 回调，在生成异常/非成功响应/无效结果时同步 work 失败。记录失败不得覆盖原生成或积分结果，遗漏由 R2 标记恢复器补齐。
- [ ] 归档 Queue 失败不撤销已经成功的任务或结算；活动标记恢复投递。原视频结果响应保持兼容，不能因后台归档尚未结束而强迫用户重新提交模型。
- [ ] 注入 provider 假实现，测试一张/三张图片、两种图片表示、同一 reservation / task 的归档和终态转换重试、前端/cron 并发完成、归档失败、结算只发生一次且积分不二次扣减。新的图片生成 HTTP 请求仍沿用既有扣费语义；本功能不声称为它新增跨请求幂等键。
- [ ] 运行 `node --import tsx --test tests/creation-generation-integration.test.ts tests/d1-video-generation.test.ts tests/auth-image-route.test.ts tests/auth-video-route.test.ts tests/video-task-reconciler.test.ts`。
- [ ] 提交 `feat: save new image and video creations automatically`。

### Task 4：作品列表、详情、媒体与删除接口

**Files:** Create `src/routes/api/creations.ts`, `src/routes/api/creations.$id.ts`, `src/routes/api/creations.$id.media.ts`, `src/lib/creation-responses.ts`, `src/lib/creation-media.ts`, `tests/creation-routes.test.ts`, `tests/creation-media.test.ts`。

- [ ] 先测试未登录 401、他人作品和资产 404、恶意游标/limit、同源 DELETE / POST、删除幂等以及无供应商 URL / object key 泄漏。
- [ ] 按 API 契约实现列表、详情、GET / HEAD / 下载；从 Better Auth 获取 userId，绑定参数查询，禁止接受客户端 ownerId。
- [ ] R2 媒体支持完整响应、单段 Range / 视频 seek、ETag 条件响应、416；文件缺失返回可理解的不可用状态，不能触发新生成。
- [ ] 删除按“R2 清理意图先持久化 → deadline 条件下 D1 tombstone+资产 deleting 同一批次 → Queue 清理”的顺序执行。测试在 tombstone 后立即中断时能从标记恢复删除、R2 写意图失败时 D1 不隐藏作品、过期意图被清理后迟到 SQL 被拒绝。持久 tombstone 后 UI 才隐藏，后台任务不得将已删除记录变回 ready。
- [ ] 在 media 路由实现本账户 base64 保存失败资产的 POST 重传；仅 generation succeeded、source_url 为空且状态 failed / pending 的 image asset 可写入。复用有界上传验证及 archive lease，明确速率限制；不接受新建作品、客户端 userId、远程 URL 或对 ready 文件的覆盖。
- [ ] 运行 `node --import tsx --test tests/creation-routes.test.ts tests/creation-media.test.ts tests/database-maintenance.test.ts`。
- [ ] 提交 `feat: expose authenticated creations and media APIs`。

### Task 5：“我的作品”页面及工作室入口

**Files:** Create `src/routes/app_.creations.tsx`, `src/routes/zh.app_.creations.tsx`, `src/components/my-creations-page.tsx`, `src/styles/creations.css`, `app/creations-api.mjs`, `tests/creations-client.test.mjs`; Modify `src/routes/app.tsx`, `src/components/user-menu.tsx`, `src/data/ui-zh.json`, `vite.config.ts`, `app/studio.js`, `app/image-generation.mjs` and generated `src/routeTree.gen.ts`。

- [ ] 页面复用账户菜单、语言切换和工作室导航；入口“我的作品”放侧栏显眼位置，账户菜单提供第二入口。检查 `isStudioDocument`、开发资产直通路由及中英文 route，避免请求落到旧静态站。
- [ ] 实现筛选、分页、分组图片预览、视频播放器和详情操作；视频 `preload=metadata`、不自动播放，图片懒加载，首屏不下载所有视频原件。第一版视频卡片使用原生 video 首帧/占位，不在 Worker 内引入 ffmpeg 或转码服务。
- [ ] 只有页面存在 generating / pending / saving 项时按 5 秒刷新可见数据，页面隐藏暂停；所有项目终态后停止。退出或切换账户立即清空旧列表、取消旧请求，不能闪现上一账户作品。
- [ ] 当前生成结果补“查看我的作品”；归档失败展示一次简短提示和下载/仅重传保存入口，正常完成不增加冗长技术文案。重传接口仅允许本账户已创建的待保存 image asset，不能覆盖 ready 资产，不支持任意 URL。
- [ ] 扩展 `app/image-generation.mjs` 的响应校验，保留服务端 `workId`、每张图的 `assetId` 和保存状态；原有 URL / dataUrl / animateId 仍兼容，不能把当前页面重传所需的关联信息在 normalize 时丢掉。
- [ ] 客户端测试筛选/游标、错误恢复、账户切换隔离和停止轮询；浏览器手动验证桌面/手机、中英文、播放器拖动、下载、删除确认、刷新及重新登录。
- [ ] 运行 `node --test tests/creations-client.test.mjs`，再运行 `npm run build`。不为单纯静态样式编写镜像测试。
- [ ] 提交 `feat: add my creations library and studio navigation`。

### Task 6：旧视频回填与发布验收

**Files:** Create `scripts/backfill-video-creations.mjs`, `tests/backfill-video-creations.test.mjs`, `docs/my-creations.md`。

- [ ] 回填脚本默认 dry-run，只有显式 `--apply` 才为成功视频写入 work / asset 及恢复标记；可分批续跑，唯一来源键避免重复。日志只给数量与错误码，不输出用户信息、提示词或供应商链接。
- [ ] 历史缺少 prompt/model 时保持 null；已有 result_url 进入归档流程，已失效则 missing；回填不更新原视频/积分/用户余额，不重新调用 provider 生成。
- [ ] 测试回填重复执行、缺失 URL、未知 workflow、失效链接、部分批次中断和恢复；旧图片明确不做不可靠回填。
- [ ] 发布前通过全部相关测试、类型检查和构建；检查 R2 原有生命周期和队列权限。先创建私有作品 bucket 与队列，再在旧 Worker 仍可工作的条件下应用仅新增表的 0005，确认成功后才部署引用新表、含 queue consumer 的 Worker；迁移失败不发布新代码。若需要维护窗口，沿用现有开关，不能让用户请求落到尚未建表的新代码。
- [ ] 用自有临时测试账户及小型测试媒体验证端到端归档/下载/Range/删除与账户隔离；不通过免费赠送额度掩盖实际付费模型请求。真实模型端到端另作一次明确验收，不能声称 mock 已证明供应商生成链路。
- [ ] 上线后受控执行旧视频回填，记录成功/失效数量；核验新作品刷新、跨会话可见、无其他用户内容、归档/删除重试不改积分、空闲调度零 D1 查询。保留备份，确认后推送最终 main 配置。
- [ ] 文档记录专用 R2 bucket 的存储量及 Queue 重试/DLQ 运维面板位置，按真实占用评估后续保留策略；第一版不宣称已有用户容量仪表盘。
- [ ] 运行 `node --test tests/backfill-video-creations.test.mjs`；再运行所有 `tests/creation*.test.*`、`tests/d1-*.test.ts`、现有视频活动/维护/鉴权测试和 `node node_modules/typescript/bin/tsc --noEmit`。
- [ ] 提交 `feat: backfill legacy video creations and document rollout`。

## 发布验收清单

- [ ] 两个用户只能列出、播放、下载、删除自己的作品；猜 ID / 篡改 asset / 切账户均不泄漏。
- [ ] 一次三张图片全部保存，文件与提示词/参数正确；视频完成后跨设备可见并可拖动播放。
- [ ] 页面关闭不影响已经持久提交的归档 Queue；归档异常不会触发第二次模型调用、扣款或退款。
- [ ] 供应商链接过期后，已归档文件仍可从 R2 下载；未成功归档的明确显示失败/失效。
- [ ] 删除后立即不可访问，后台重试和并发归档不会使文件复活，R2 清理失败可恢复。
- [ ] 没有生成/归档/删除任务且恢复已完成时，定时调用不访问 D1；没有待完成项时历史页不持续轮询。
- [ ] 保留规则、历史图片限制和旧视频回填结果已写清楚；没有改变既有生成时长、赠送额度或计费规则。
