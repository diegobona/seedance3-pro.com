**Pose to Image / Video SEO 调研与执行建议**

调研日期：2026-09-22。对象：seedance3-pro.com。默认目标：英文 Google 搜索，以及能实际使用图片／视频生成的创作者。

**决策建议**

优先建立一个可收录、可体验或可直接进入工具的 Pose to Image 功能页，再升级现有教程，用原创案例和演示视频扩展搜索入口，最后做少量相关渠道分发和投稿。如果目前只做一件事，先做功能页。

这是一个值得测试的细分切口，但“拖动 3D 人偶再生成图片”已有直接竞品。应强调实际可见的姿势、机位、多人构图控制，以及简短的操作流程，用结果证明价值。现阶段不宜把“Pose to Video”作为主要转化承诺：当前仓库核验到的是 Pose → GPT Image 2 图片生成；视频提交链路是文字生视频，未传递姿势图。

**调研方法与边界**

- 在浏览器实际查看 Google 四组查询：`ai pose generator`、`pose to image`、`pose to video`、`3d pose editor online`。设置英文、美国地区和 `pws=0`；页脚显示 Results are not personalized，IP 地域显示洛杉矶县。它是某一时间、地区的桌面搜索样本，不代表全球固定排名。
- 用公开网页搜索补充竞品，再查看产品官方页面、用户原始讨论和 Google Search Central 文档。以下竞品能力为公开页面所述，本次未进行付费生成横向实测。
- 检查本地代码，并直接请求线上首页、Pose 工作台、现有教程和 sitemap。网页搜索工具读到的首页版本缺少最新 Pose 区块，但直接 HTTP 请求确认最新线上首页已有该区块；诊断以直接请求为准。
- 未读取本站 Google Search Console、转化分析或付费关键词数据库。因此不给出未经验证的月搜索量、关键词难度、竞品流量、排名概率和收入预测。搜索结果组成能提示意图，不能证明需求规模。社区样本也是定性证据。

**你的网站目前有什么，以及哪些地方限制了 SEO**

| 核验项 | 当前发现 | 对策略的影响 |
| --- | --- | --- |
| 首页 | 线上已有 Pose first. Generate with intention. 区块与演示，入口指向 `/app/?model=pose-to-image` | 已有素材可以复用；首页整体仍以 AI Video Generator 为主，Pose 需要更明确的独立搜索入口 |
| Pose 工作台 | 线上返回 200，robots 为 `noindex,follow`；本地 `src/routes/app.tsx:18` 同样设置 | 该工具 URL 明确要求搜索引擎不收录；不能把它当成当前 SEO 落地页。工作台继续 noindex 可以是合理设计，另设公开功能页即可 |
| 现有 Pose 博客 | 线上返回 200 且允许收录；主要介绍 Anyposes + Seedance；正文仍有 `SEO / Title / Meta description / Slug` 编辑草稿 | 先升级已有资产：介绍本站现有操作，补真实输出与入口，去掉编辑草稿；不必另发一篇同题文章 |
| Sitemap | 直接请求看到 Pose 相关 URL 为现有教程，没有专门的 Pose 功能页 | 增加功能页时纳入 sitemap、导航和正文链接；sitemap 出现不等于已经收录 |
| 图片链路 | `app/studio.js:173` 的 onUsePose 切到 GPT Image 2，注入姿势截图和提示词；`app/pose-transfer.mjs` 要求保留人数、姿态、相对位置和构图 | 可以主打视觉参考工作流；参考约束不是每个关节必然完全一致的保证 |
| 视频链路 | `app/studio.js` 的视频请求仅提交提示词和视频参数；`app/video-generation.mjs:231` 的请求体没有图片或姿势序列 | 当前应先做图片 SEO。未来接通图生视频后，再推出完整的 Pose → Image → Video 页面与案例 |

相关页面：[首页](https://seedance3-pro.com/)、[Pose 工作台](https://seedance3-pro.com/app/?model=pose-to-image)、[现有 Pose 教程](https://seedance3-pro.com/how-to-control-character-poses-in-seedance-with-3d-pose-references.html)、[Sitemap](https://seedance3-pro.com/sitemap.xml)。`noindex` 含义参见 [Google 官方说明](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)。

本次没有执行付费生成，因此“代码支持该流程”和“效果已经过充分实测”需要区分。正式写转化文案前，应完成下文的案例测试。

**Google 实际搜索结果说明了什么**

以下为首屏／第一页中的代表性结果，省略部分条目和重复链接；不是长期排名报告。

| 查询 | 本次实际看到的结果 | 判断与动作 |
| --- | --- | --- |
| `ai pose generator` | PoseGen、PhotoGPT、CamClo、VisualGPT、Pokecut、OCMaker；另有应用商店和 Reddit。出现 AI Overview、People also ask | 用户可能要照片换姿势、绘画参考或完整画面。可作为上位词覆盖，但需用副标题与演示明确你提供 3D 手动控制 |
| `pose to image` | PixelLab 文档、Pixwit、AnimeGenius、Van Gogh Studio、PoseMy.Art、VidCella、3D AI Studio、Aragon；出现 AI Overview 和图片模块 | 与当前产品的输入／输出更接近。优先由功能页承接，辅以真实参考图与生成结果 |
| `pose to video` | Comfy 的 LTX-2 工作流、YouTube 教程、GitHub pose-to-video、PoseAnything、PoseCrafter、DreamPose、MusePose，以及同名 Pose 应用 | 技术流程、骨骼序列和动作驱动意图明显。搜索结果里商业页少，不能据此断言“蓝海、容易排名”；也不能把静态起始姿势等同于整段动作控制 |
| `3d pose editor online` | JustSketchMe、PoseMy.Art、OpenPoseAI、Magic Poser Web、SetPose、Pick and Pose；还有照片编辑工具 | 用户优先找可操作的编辑器；绘画参考需求很大一部分与 AI 付费生成不一致。适合用低门槛编辑体验获客，再看生成转化 |

已观察到的相关搜索包括：`pose to image generator`、`pose to image free`、`pose to image ComfyUI`、`3D pose maker online`、`AI pose generator from photo`、`AI pose generator no sign up`。这些说明用户关注的限制条件，不等于已经验证了每个词的搜索量。

实际结果对应的可核验页面：[PoseGen](https://posegen.com/)、[PixelLab](https://www.pixellab.ai/docs/tools/pose-to-image)、[Pixwit](https://pixwit.ai/tools/pose-to-image)、[Comfy](https://comfy.org/workflows/video_ltx2_pose_to_video-3cf3c6a082ed/)、[PoseMy.Art](https://posemy.art/)、[JustSketchMe](https://justsketch.me/)。

**同类产品：哪些是直接竞争，哪些争夺相邻需求**

| 产品 | 公开产品页体现的能力 | 对本站的启发 |
| --- | --- | --- |
| [FaceHub Pose Editor](https://www.facehub.ai/tools/ai-pose-editor) | 拖动 3D 人体、设置机位，再生成照片；用摆姿截图和结果对照展示 | 直接竞品。不能只强调“我们有 3D 编辑器”；应证明具体复杂姿势、构图与操作效率 |
| [LlamaGen AI Pose](https://llamagen.ai/features/ai-pose) | 在线 3D 骨骼编辑、第二个人物、导出／复制参考图、继续 AI 生图；明确区分免费摆姿和按积分生成 | 直接竞品。公开功能页与收费边界清楚，值得借鉴；本次未实测其输出稳定性 |
| [Pixwit Pose to Image](https://pixwit.ai/tools/pose-to-image) | 人物照片加预设、手绘骨架或姿势参考，再生成人物姿势变化 | 争夺同一关键词，但更多满足“原人物换姿势”。你的差别是从 3D 场景主动构建姿势与机位 |
| [OpenArt Pose Reference](https://openart.ai/highlights/pose-reference) | 上传姿势参考图指导生成 | 说明“参考图控制姿势”本身并非新功能；省去寻找现成参考图的步骤才是有意义的价值 |
| [PoseMy.Art](https://posemy.art/) | 3D 人物、场景、机位，以及 OpenPose、Depth、Canny 等导出与姿势参考分类 | 是成熟的参考素材入口。可以借鉴分类与可复用素材思路，但没必要立即复制大量泛绘画关键词页 |
| [Viggle AI Pose Generator](https://viggle.ai/tools/ai-pose-generator) | 官方定位为参考动作／模板驱动的人物动画视频 | 与视频方向竞争；用户对“动作跟随”的预期高于静态起始姿势参考 |
| [Comfy LTX-2 Pose to Video](https://comfy.org/workflows/video_ltx2_pose_to_video-3cf3c6a082ed/) | 提供姿势驱动的视频工作流 | 教程可解释你的轻量工作流适用范围，但不要声称具备相同的逐帧控制能力 |

Anyposes 单独处理，因为已发现它的截图提示链接到本站。其[官网](https://anyposes.com/)当时仍把站内 AI 生图标为即将上线；这不能作为未来状态承诺，也不能据此判断双方的归属关系。

**用户需求：哪些最值得服务**

1. **脑中有精确姿势，但找不到参考图。** r/aiArt 的原始提问需要空白姿势模板，特别提到朝镜头的透视缩短。这支持“自己摆出参考”的价值，也提醒：有些人只想自己画，并不想付费 AI 生图。[原始讨论](https://www.reddit.com/r/aiArt/comments/14zrjxl/is_there_any_ai_generator_for_poses/)
2. **想精确拖动关节，但不愿来回切换复杂工具。** r/StableDiffusion 的提问希望简单、精确、可看到参考底图的编辑器；讨论还提及 2D 骨架的比例问题。产品介绍应演示一次改动如何传到最终图，而非只展示漂亮成品。[原始讨论](https://www.reddit.com/r/StableDiffusion/comments/1iagsbu/best_pose_editor_precise_and_simple/)
3. **多人位置、身高、镜头角度要可控。** 最近的漫画创作讨论使用 3D 场景控制两个人物与俯视机位，再生成画面；回复同时指出腿部和阴影漂移。适合做真实成功／失败对照，而非承诺完全精确。[原始讨论](https://www.reddit.com/r/aicomicmakers/comments/1vtk48r/quick_workflow_tip_use_a_3d_pose_app_to_lock_the/)
4. **换姿势但保留脸、衣服、背景。** 这是 Pixwit 等照片换姿产品反复承接的需求。不过你的现有 Pose 流程主要传入人偶参考，不能直接把成熟的身份一致性当成已验证卖点。[产品参考](https://pixwit.ai/tools/pose-to-image)
5. **让角色复制一整段动作。** Viggle、Comfy 和 MusePose 对应这类任务。它需要与“按一个 3D 静态姿势生成首帧”分开说明。[Viggle](https://viggle.ai/tools/ai-pose-generator)、[MusePose](https://github.com/TMElyralab/MusePose)

我的商业优先级判断：先争取做角色画面、漫画分镜、动作构图的 AI 创作者；摄影换姿、服装电商和动作复刻需要另外验证能力。纯绘画参考用户可以引流，但应单独看生成转化，不能用访问量代替商业价值。

**关键词与页面怎么分工**

| 优先级 | 词组／需求 | 承接方式 |
| --- | --- | --- |
| 第一阶段 | `pose to image`、`AI pose generator`，在文案中明确 3D 编辑 | 同一个核心功能页，不为近义词创建三个内容相似的页面 |
| 第一阶段 | `3D pose editor for AI images`、`3D pose reference for AI` | 功能页和真实操作教程自然覆盖；这些是待验证的定位词，不是已量化的高流量词 |
| 第一阶段 | control poses in AI images、camera angle control、two-character composition 等问题 | 案例教程，展示具体问题与操作；按 Search Console 后续出现的查询调整用词 |
| 第二阶段 | `3d pose editor online`、pose reference 等更宽需求 | 有实际免费编辑／导出价值时强化；若 Anyposes 也由你运营，应先明确两站分工 |
| 接通视频后 | `pose to video`、3D pose reference for AI video | 建独立视频工作流页，清楚说明输入是单张姿势图还是动作序列 |
| 暂不主攻 | `AI pose changer`、pose transfer、OpenPose editor、motion transfer | 分别要求人物保持、姿势迁移、特定导出格式或视频动作控制；确认产品满足后再扩大 |

这些优先级基于产品匹配与结果页意图，不是 Ahrefs／Semrush 的难度排名。

**核心功能页：第一项交付**

建议路径为 `/pose-to-image`，或沿用本站静态页习惯使用 `.html`。扩展名不是关键；关键是只选择一个稳定 URL，允许收录，并从首页、导航、教程直接链接过去。

建议 Title：`AI Pose Generator & 3D Pose Editor | Seedance`

建议 H1：`Pose to Image: Create AI Images from 3D Poses`

建议副标题方向：先摆人物和机位，再描述角色、服装与场景。不需要先找到一张完全匹配姿势的照片。

页面按这个顺序组织：

1. 首屏展示一个“3D 人偶 → 实际生成图”对照和明确的开始按钮；视频流程尚未接通时，首屏承诺图片生成。
2. 30–60 秒真实录屏：拖动姿势、调整机位、使用参考、生成与再修改。当前首页已有录屏可作为素材起点，但要确认视频包含完整、最新操作。
3. 三步操作说明，以及若干可复现案例。首轮 6 个案例即可：交叉手臂、跪姿／起跑、俯视／低机位、两人相对站位等；最终保留实际效果合格的案例。
4. 说明能控制什么、哪些会漂移。比如机位和大体姿态可提供参考，手指、遮挡和高难度透视需检查。
5. 明确免费和付费边界、登录要求、实际生成所需积分。只有摆姿免费时，不把“免费”写成无限免费生成。
6. FAQ 回答真实问题：是否需要照片、能否多人、能否保留人物外观、能否直接生成视频、能否导出参考。按实际支持情况回答。
7. 链接到深入教程和案例；CTA 进入当前 Pose 工作台，避免用户进入普通默认模式后重新找功能。

最低技术条件：响应 200、无意外 noindex、正文无需登录即可阅读、独立且正确的 canonical、可抓取的图片及文字说明、导航与 sitemap 链接。3D 编辑器可以延迟加载；标题、说明和案例不要全部依赖 Canvas。公开内容页与登录工作台各有用途，不需要为了 SEO 给整个工作台开放索引。

建议把“不登录就能先拖几下／载入示例”作为体验实验。免费编辑属于获客和转化设计，不是免费就会提升排名的规则。

**博客：先改旧文，再写两篇解决具体问题的文章**

现有文章优先保留 URL 更新。将教程主体改为本站当前 Pose → Image 流程；如果保留 Anyposes + 外部视频工具方案，明确它是另一条工作流。删除正文里的 SEO 编辑草稿，并补充实际截图、输出、提示词、操作入口和限制。

推荐文章方向：

- `How to Control Poses in AI Images with a 3D Pose Editor`：可作为现有文章升级的主线，具体取决于是否保留 Seedance 视频主题；不要直接把历史视频教程改成同名但不同意图的内容。若意图变化很大，保留旧文并新增真正不同的图片教程，双方互链。
- `How to Control Camera Angles and Two-Character Composition in AI Images`：展示同一场景的正视、俯视与低机位，说明失败与修正。
- `3D Pose References vs Text Prompts: A Practical Test`：只在真实完成对照测试后发布。固定模型、角色描述和预算，公开尝试次数与失败，不伪造成功率。

视频链路接通后，再制作 `From a 3D Pose to an AI Video: A Complete Workflow`。若当前要先写这篇，就明确哪些步骤在站外完成，不写成本站已有的一键功能。

原始测试、示例和操作截图主要沉淀在本站。外部版本采用不同切入点的摘要、案例或体验报告，链接回具体工具／案例页；不必把同一篇全文批量复制到多个网站。

**比单篇文章更值得做的内容资产**

建立小型、人工筛选的案例集合。每个案例保存姿势参考、机位、提示词、所用模型、真实输出、失败说明和复用入口。首轮可以都放在功能页或一个案例集合页，避免为了凑页面而拆分。

“Use this pose”能直接载入具体姿势和机位会更有价值，但这是建议开发的能力，不能假设当前已支持分享／预设深链接。等有实际独立内容和搜索需求后，再给不同用例建立页面。用户任意保存的草稿或近重复生成图不宜默认全量收录。

这类内容兼顾体验、图片搜索与被他人引用的理由；无法通过改写一篇通用文章复制你的具体案例。Google 当前的 [AI 搜索优化指南](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)强调原创经验与有用图片／视频，也明确不存在必须添加的特殊 AI schema 或 llms.txt 排名捷径。

**投稿与外部分发的优先级**

| 顺序 | 渠道 | 建议交付 | 如何判断价值 |
| --- | --- | --- | --- |
| 1 | Anyposes 已有相关入口 | 截图后的具体案例／Pose 工作流入口；先核对双方关系与可调整范围 | 进入本站后是否摆姿、生成并复访 |
| 2 | 自有演示视频与目标创作者的视频体验 | 同一参考的完整操作演示；使用能表达任务的英文标题与字幕，链接到该功能页 | 是否带来目标用户、生成和品牌搜索；视频本身也可能获得搜索曝光 |
| 3 | AI 漫画、AI 影像等垂直社区 | 一个真实问题、一组前后对照、可复现步骤及失败说明 | 讨论质量、有效试用和后续反馈；披露开发者身份，并遵守具体社区的推广规则 |
| 4 | 相关教程站、创作者通讯的投稿／测评 | 独特案例、对照实验或可下载素材；由对方按读者需求决定是否刊登 | 相关受众和可验证的推荐流量，不能只看所谓 DA |
| 5 | 相关 AI 工具目录 | 少量准确的产品条目，能力与定价描述一致 | 是否带来实际访问与激活；不作为主要投入 |

Google `pose to video` 样本中出现的 Grafting Rayman 教程、`pose to image` AI Overview 中出现的 Fahd Mirza 教程，可以作为后续筛选教程作者的起点，但本次没有核验其最近更新频率、合作意愿或费用，不等于已确认的投稿渠道。

投稿主题示例：`How I blocked a two-character shot in 3D before generating the final image`。先有成品案例，再找与该主题匹配的作者／编辑。赞助测评可以买传播，不能购买排名保证；付费链接应按平台与 Google 要求标识。Google 的[链接垃圾政策](https://developers.google.com/search/docs/essentials/spam-policies#link-spam)明确区分正常广告与操纵排名的链接交易。

**Anyposes 是一个需要单独利用的现有资产**

官网截图区已经提示把参考图上传到 Seedance，并链接本站。因此，不必把“获得第一个相关入口”当成从零开始。但本次没有拿到该入口流量和转化数据，也不能声称它已经带来有效外链权重。

若 Anyposes 也是你运营：建议 Anyposes 主承接绘画参考、姿势库和人偶编辑需求，Seedance 主承接从参考到成品图／视频的生成需求；以具体工作流自然连接两个产品，减少同题同内容页面。不要为了互链批量建重复页，也不要把两站用户数据共享当成无需另行考虑的默认做法。

若已有合作：优先把现有入口连接到更匹配的功能页或案例，并按双方约定改进交接体验。

若无合作：将其视为已存在的第三方推荐入口；可在获授权后联系对方讨论流程改进。本次没有发送消息、投稿或修改任何第三方站点。

**两周执行顺序与后续验证**

| 时间 | 工作 | 完成标准 |
| --- | --- | --- |
| 第 1–3 天 | 核对当前能力、做 6 个真实案例、确定功能页定位 | 每个主张有实际结果；视频与图片的边界清楚 |
| 第 4–7 天 | 发布一个 Pose to Image 功能页；修订现有文章；补导航、内链和 sitemap | 页面可公开访问和抓取，工具入口准确；使用 Search Console 检查 URL |
| 第 8–10 天 | 完成 1–2 篇实操教程与 1–2 个演示视频 | 所有内容围绕不同问题，能带用户进入具体工作流 |
| 第 11–14 天 | 测试 Anyposes 入口；向少量匹配渠道提供原创案例 | 记录来源、点击、生成；不以发布数量作为成功标准 |

上述是建议的交付周期，不是两周内获得排名的承诺。具体工作量以素材质量和开发资源为准。

上线前记录基线，后续按页面、查询与用户来源看：

- Search Console：是否收录、实际选用 canonical、非品牌查询的展示、点击、CTR；区分国家、设备和查询类别，避免只盯整体平均排名。
- 产品漏斗：进入 Pose 页 → 打开编辑器 → 使用姿势 → 生成成功 → 后续付费。建议事件名如 `pose_editor_open`、`pose_reference_apply`、`image_generation_success`；这些是计划，未在本次新增埋点。
- 渠道：自然搜索、Anyposes、视频、社区分别跟踪。外部渠道可加 UTM；站内链接用事件统计，避免随意用 UTM 覆盖归因。
- 商业判断：如果绘画参考流量多、生成少，调整内容与 CTA，或让 Anyposes 承接这类需求；如果案例教程带来较高生成转化，就扩展相邻真实用例。
- 第 4 周检查抓取、意图和体验问题；约第 8–12 周按实际展示与转化决定扩大哪个主题。样本不足时延长观察，不凭单周波动推断效果。

如果追求 Google 视频结果资格，可以在有合适视频时制作以单个视频为主体的观看页，并补充字幕、稳定缩略图与 VideoObject。首页放一个循环演示不自动等于可以获得视频结果。[Google 视频 SEO 文档](https://developers.google.com/search/docs/appearance/video)

**建议立即采用的资源分配**

第一轮把大部分精力给功能页、真实案例和基础转化体验；其次给教程与演示；少量用于相关分发与投稿。先验证这个细分方向能带来有效生成，再扩展主题和预算。无需先购买泛站投稿套餐，也无需先写几十篇泛 AI 文章。

本次产物是研究与建议，未修改或发布网站功能、博客、sitemap 或外部内容。
