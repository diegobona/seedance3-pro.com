Object.freeze(["en", "zh"]);
function e(e = "/") {
	return e === "/zh" || e.startsWith("/zh/") ? "zh" : "en";
}
//#endregion
//#region app/i18n.mjs
var t = Object.freeze({
	"Your homepage draft is ready.": "已接续首页草稿，可继续编辑。",
	"Could not restore the reference image. Please choose it again.": "参考图暂时无法恢复，请重新选择图片。",
	"Choose a supported video aspect ratio.": "请选择支持的视频画幅。",
	"Could not prepare the reference image. Please choose it again.": "参考图处理失败，请重新选择图片。",
	"Generation preview": "生成预览",
	"Your result will appear here": "生成结果将在这里显示",
	"Describe what you want to create, then generate.": "描述你想创作的内容，然后开始生成。",
	"Continue checking": "继续查看进度",
	"Generation failed": "生成失败",
	"Try again": "重试",
	"Previous results on this page": "本页之前的结果",
	"View result": "查看结果",
	"Waiting {time}": "已等待 {time}",
	"{model} is ready · View result": "{model} 已生成 · 查看结果",
	"Submitting your request…": "正在提交生成请求…",
	"Uploading references…": "正在上传参考图片…",
	"Checking generation progress…": "正在查看生成进度…",
	"Queued for generation…": "已排队，等待生成…",
	"Generating your video…": "正在生成视频…",
	"Generating your images…": "正在生成图片…",
	"The video is still processing. Continue checking its progress.": "视频仍在处理中，可继续查看进度。",
	"Sign up": "注册",
	"Try for free. No sign-up or login required.": "无需注册和登录，即可免费试用",
	"Free trial used up": "游客免费体验额度已用完",
	"Free trial": "免费试用中",
	"No registration or login required.": "无需注册和登录",
	"GPT Image 2 and 2.5 share 2 free images.": "GPT Image 2 和 2.5 共用 2 张免费图片额度",
	"Generate {count} images · free": "免费生成 {count} 张图片",
	"Generate 1 image · free": "免费生成 1 张图片",
	"1 free image": "免费 1 张图片",
	"1 image remaining": "剩余 1 张图片",
	"AFTER GENERATION": "生成后预计剩余",
	REMAINING: "实际剩余",
	"{count} free images": "免费 {count} 张图片",
	"{count} images remaining": "剩余 {count} 张图片",
	"— images remaining": "剩余 — 张图片",
	"Your free images are used up. Sign up for 15 free credits every day.": "免费图片额度已用完，注册后每天赠送 15 积分。",
	"Image generated · {count} free images remaining.": "图片已生成 · 还剩 {count} 张免费图片额度。",
	"Choose fewer images or sign up to keep creating.": "请选择更少的图片数量，或注册后继续生成。",
	"Choose 5 or 10 seconds.": "可选 5 秒或 10 秒",
	"Free accounts get {credits} credits daily, shared across images and videos.": "免费账户每天获得 {credits} 积分，图片和视频共用。",
	"Sign up to keep creating": "注册后继续创作",
	"Generate video · {seconds}s free": "生成视频 · 免费 {seconds} 秒",
	"{seconds} free seconds": "免费 {seconds} 秒",
	"{seconds} seconds remaining": "剩余 {seconds} 秒",
	"— seconds remaining": "剩余 — 秒",
	"Video generated · {seconds} free seconds remaining.": "视频已生成 · 还剩 {seconds} 秒免费额度。",
	"Your free video seconds are used up. Sign up for 15 free credits every day.": "游客免费视频额度已用完，注册后每天赠送 15 积分。",
	"Not enough free video seconds for this duration. Choose 5 seconds or sign up to keep creating.": "剩余免费秒数不足，请选择 5 秒或注册后继续创作。",
	"Guest videos support 5 or 10 seconds at 480p.": "游客视频支持 5 秒或 10 秒，固定 480p。",
	"This network has already claimed the guest video trial. Sign up to keep creating.": "当前网络已领取过游客体验额度，请注册后继续创作。",
	"Guest video generation is temporarily unavailable. Please try again later.": "游客视频生成暂时不可用，请稍后重试。",
	"Create with GPT Image 2.5": "使用 GPT Image 2.5创作",
	"Describe the subject, composition and lighting, or add reference images to guide your edit.": "描述主体、构图和光线，也可以添加参考图来指导编辑。",
	"GPT Image 2.5 uses 5 trial credits per image.": "GPT Image 2.5试用每张消耗 5 积分。",
	"This image model supports up to {count} reference images.": "此图像模型最多支持 {count} 张参考图。",
	"Image model is not supported.": "不支持此图像模型。",
	"Image model does not match the request header.": "图像模型与请求参数不一致，请刷新后重试。",
	"Launching soon. Image generation at $0.01/image.": "即将正式上线，图片生成 0.01 美元/张",
	"Launching soon. Video generation at $0.01/second.": "即将正式上线，视频生成 0.01 美元/秒",
	"Expand menu": "展开菜单",
	"Collapse menu": "收起菜单",
	"Pose Studio": "姿势工作室",
	"AI VIDEO / TEXT-TO-VIDEO": "AI 视频 / 文生视频",
	"AI VIDEO / TEXT TO VIDEO": "AI 视频 / 文生视频",
	"AI VIDEO / REFERENCE TO VIDEO": "AI 视频 / 参考图生视频",
	"AI VIDEO / RELEASE TRACKER": "AI 视频 / 发布动态",
	"AI IMAGE / POSE CONTROL": "AI 图像 / 姿势控制",
	"AI IMAGE / FAST DRAFTS": "AI 图片 / 快速草稿",
	"AI IMAGE / GENERATE & EDIT": "AI 图像 / 生成与编辑",
	"Text-to-video": "文生视频",
	"Text to video": "文生视频",
	"Reference to video": "参考图生视频",
	"Release Updates": "发布动态",
	"Coming Soon": "即将发布",
	"Image generator": "图像生成器",
	"Cinematic story scene": "电影感故事场景",
	"Cinematic product reveal": "电影感产品展示",
	"Reference-led story scene": "参考素材驱动的故事场景",
	"Pose-first character image": "从姿态开始创作角色图片",
	"Fast campaign variants": "快速生成广告方案",
	"Brand-ready layout": "品牌视觉排版",
	"A clear subject, one action, camera movement, lighting, and a clean final shot.": "明确主体、一个动作、镜头运动、光线以及简洁的最终画面。",
	"A slow orbital camera, controlled reflections, native room tone, and a clean final composition.": "缓慢环绕镜头、受控反射、自然环境音以及简洁的最终构图。",
	"Plan character identity, camera movement, pacing, and sound as distinct reference roles.": "分别规划角色身份、镜头运动、节奏和声音所需的参考素材。",
	"Shape the body language and camera angle first, then describe the character, scene, lighting, and visual style.": "先设置身体姿态和镜头角度，再描述角色、场景、光线和视觉风格。",
	"Lock composition and product identity, then vary one background, palette, or crop at a time.": "固定构图与产品特征，每次只更换背景、配色或裁切中的一项。",
	"Specify format, hierarchy, exact copy, safe areas, and the visual elements that must remain unchanged.": "明确画面格式、信息层级、准确文案、安全区域和需要保留的视觉元素。",
	"Generate image · 5 credits": "生成图像 · 5 积分",
	"Generate {count} images · {cost} credits": "生成 {count} 张图片 · {cost} 积分",
	"Generate video · {cost} credits": "生成视频 · {cost} 积分",
	"Generate again · {cost} credits": "再次生成 · {cost} 积分",
	"Your free trial is complete. Full launch is coming soon — video generation at $0.01/sec.": "免费试用积分已用完。正式版即将上线，视频生成 $0.01/秒。",
	"Pose reference ready · describe the character, clothing, scene, and style.": "姿态参考图已就绪 · 请描述角色、服装、场景和风格。",
	"The 3D editor could not start. Refresh and try again.": "3D 编辑器无法启动，请刷新后重试。",
	"How should this image move? Describe the subject’s motion, camera movement, and what happens next…": "希望这张图片如何动起来？描述主体动作、镜头运动和接下来发生的事…",
	"Describe the subject, action, setting, camera movement, lighting, and final shot…": "描述主体、动作、环境、运镜、光线与最终镜头…",
	"Generation coming soon": "生成功能即将上线",
	"Video generation in progress…": "视频生成中…",
	"Generating…": "生成中…",
	"Reference images": "参考图",
	"Reference files": "参考文件",
	"Optional · enables image-to-image": "可选 · 添加后可使用图生图",
	"Preview only": "仅供预览",
	"Add reference images": "添加参考图",
	"Drop or choose reference media": "拖入或选择参考素材",
	"Optional · up to 16 images": "可选 · 最多 16 张图片",
	"Up to 16 images · 10 MB each · 24 MB total": "最多 16 张图片 · 每张 10 MB · 总计 24 MB",
	"Interface preview only—files are not uploaded": "仅预览界面，文件不会上传",
	"Image {number}": "图片 {number}",
	"Image {number}: {name}": "图片 {number}：{name}",
	"Reference image {number}": "参考图片 {number}",
	"Image {number} · Pose": "图片 {number} · 姿态",
	"Remove Image {number}": "移除图片 {number}",
	"Remove reference image {number}": "移除参考图片 {number}",
	"Generated image result {number}": "生成的图片 {number}",
	"Download image {number} →": "下载图片 {number} →",
	"Open / save image {number} →": "打开 / 保存图片 {number} →",
	"Animate this image ↗": "让这张图片动起来 ↗",
	"Animate this image {number}": "让图片 {number} 动起来",
	"Preparing image…": "正在准备图片…",
	"Saving your reference image for H3…": "正在为 H3 保存参考图片…",
	"GENERATED IMAGES": "生成的图像",
	"Provider image links may expire. Open or download each result when it is ready.": "服务商提供的图像链接可能会失效。结果就绪后，请及时打开或下载。",
	"Generated video": "生成的视频",
	"Open or download generated video →": "打开或下载生成的视频 →",
	"GENERATED VIDEO": "生成的视频",
	"Video result": "视频结果",
	"Video links may expire. Open or download your result when it is ready.": "视频链接可能过期，请及时打开或下载生成结果。",
	"Video queued. Waiting for generation to start…": "视频已进入队列，等待开始生成…",
	"Generating your video…": "正在生成视频…",
	"Video service is busy. Retrying safely…": "视频服务繁忙，正在重试…",
	"Resuming video generation status…": "正在恢复视频生成进度…",
	"Preparing your reference images…": "正在准备参考图片…",
	"Submitting your text-to-video prompt…": "正在提交文生视频提示词…",
	"Uploading reference image {index} of {total}…": "正在上传第 {index} 张参考图片，共 {total} 张…",
	"Video generated · {remaining} credits remaining.": "视频已生成 · 剩余 {remaining} 积分。",
	"Video generated.": "视频已生成。",
	"You need {cost} credits to generate.": "本次生成需要 {cost} 积分。",
	"Today’s free credits are used up. Your daily allowance will refresh at the next reset.": "今天的免费积分已用完，下次刷新时恢复每日额度。",
	"Today’s free credits are used up.": "今天的免费积分已用完。",
	"Today’s free credits are used up. Daily reset: {time} (local time).": "今天的免费积分已用完。每日 {time}（当地时间）刷新。",
	"Daily reset: {time} (local time). Unused credits expire at reset and do not accumulate.": "每日 {time}（当地时间）刷新，未用积分到时失效，不累积。",
	"Current balance: {remaining}.": "当前余额：{remaining} 积分。",
	"{count} image{plural} generated · {remaining} credits remaining.": "已生成 {count} 张图片 · 剩余 {remaining} 积分。",
	"{count} image{plural} generated.": "已生成 {count} 张图片。",
	"{count} / 16 · Optional": "{count} / 16 · 选填",
	"{count} / {limit} · Optional": "{count} / {limit} · 选填",
	"Reference images ready. Use Image 1, Image 2, etc. in your prompt.": "参考图片已就绪，可在提示词中使用 Image 1、Image 2 等编号。",
	"Loading your reference image…": "正在加载参考图片…",
	"Remove an image before adding the transferred reference.": "请先移除一张图片，再添加传入的参考图。",
	"Image ready. Describe the motion and camera movement, then generate when ready.": "图片已就绪，描述主体动作和镜头运动后即可生成。",
	"Could not load the image. Please upload it again.": "无法加载图片，请重新上传。",
	"Prompt structure added.": "已添加提示词结构。",
	"Example prompt loaded. Click again for another.": "已载入示例提示词，再次点击可切换示例。",
	"H3 supports only one reference image. Remove the current image before adding another.": "H3 只能上传一张参考图，请先移除当前图片再添加。",
	"Choose one valid reference image.": "请选择一张有效的参考图。",
	"Reference image ready.": "参考图已就绪。",
	"Reference images ready.": "参考图片已就绪。",
	"Creating from your pose reference…": "正在根据姿态参考图生成…",
	"Editing from your reference image…": "正在根据参考图片编辑…",
	"Creating an image from your prompt…": "正在根据提示词生成图片…",
	"{cost} credits": "{cost} 积分",
	"— credits": "— 积分",
	"You're on the launch list": "已加入上线通知名单",
	"Notify me & claim {credits} credits": "订阅上线通知并领取 {credits} 积分",
	"Log in to join the launch list.": "请登录后订阅上线通知。",
	"Launch notifications are temporarily unavailable.": "上线通知暂时不可用，请稍后重试。",
	"We'll email you when paid plans open.": "付费方案开放时，我们会发送邮件通知你。",
	"Joining the launch list…": "正在加入上线通知名单…",
	"You're in. We'll email you when paid plans open.": "订阅成功，付费方案开放时会通过邮件通知你。",
	"You can attach up to 16 reference images.": "最多可上传 16 张参考图片。",
	"Invalid reference image.": "参考图片无效。",
	"Choose PNG, JPEG or WebP images.": "请选择 PNG、JPEG 或 WebP 图片。",
	"Each reference image must be non-empty and no larger than 10 MB.": "每张参考图片不能为空，且不得超过 10 MB。",
	"Reference images must total no more than 24 MB.": "参考图片总大小不得超过 24 MB。",
	"Image service returned an invalid response.": "图片服务返回了无效响应，请重试。",
	"Image generation failed.": "图片生成失败，请重试。",
	"Image generation failed. Your credits were refunded.": "图片生成失败，积分已退还。",
	"Image generation did not return a usable image. Your credits were refunded.": "未返回可用图片，积分已退还。",
	"Log in to generate images.": "请登录后生成图片。",
	"Log in to generate videos.": "请登录后生成视频。",
	"Log in to check video generation.": "请登录后查看视频进度。",
	"Log in to upload reference images.": "请登录后上传参考图片。",
	"Log in to animate this image.": "请登录后让这张图片动起来。",
	"Free trial video generation supports 480p only.": "免费试用的视频分辨率仅支持 480p。",
	"Generation limit reached. Please wait a minute and try again.": "已达到生成频率限制，请等待一分钟后重试。",
	"Please wait a minute and try again.": "请等待一分钟后重试。",
	"Reference uploads are temporarily unavailable.": "参考图上传暂时不可用，请稍后重试。",
	"Reference upload failed. Please try again.": "参考图上传失败，请重试。",
	"Choose a PNG, JPEG or WebP image.": "请选择 PNG、JPEG 或 WebP 图片。",
	"Each reference image must be 10 MB or less.": "每张参考图片不得超过 10 MB。",
	"Too many uploads. Wait a minute and try again.": "上传过于频繁，请等待一分钟后重试。",
	"Image is empty.": "图片不能为空。",
	"The file is not a valid PNG, JPEG or WebP image.": "文件不是有效的 PNG、JPEG 或 WebP 图片。",
	"A reference image expired or is unavailable. Please upload it again.": "参考图片已过期或不可用，请重新上传。",
	"A reference image expired or is unavailable. Please remove it and upload it again.": "参考图片已过期或不可用，请移除后重新上传。",
	"Image transfer is temporarily unavailable.": "图片传入暂时不可用，请稍后重试。",
	"This image is unavailable. Save it and upload it in H3 instead.": "图片不可用，请保存后在 H3 中上传。",
	"Could not retrieve this image. Please try again or save and upload it in H3.": "无法获取图片，请重试或保存后在 H3 中上传。",
	"The image link expired. Save and upload the image in H3 instead.": "图片链接已过期，请保存后在 H3 中上传。",
	"Image service returned an invalid image URL.": "图片服务返回了无效图片链接。",
	"Image service returned invalid image data.": "图片服务返回了无效图片数据。",
	"Video polling was aborted.": "已停止检查视频生成进度。",
	"Video service returned an invalid response.": "视频服务返回了无效响应，请重试。",
	"Video service returned an invalid task.": "视频服务返回了无效任务。",
	"Video service returned an invalid video URL.": "视频服务返回了无效视频链接。",
	"Video generation failed.": "视频生成失败，请重试。",
	"Video generation is still running. Return later to resume checking it.": "视频仍在生成中，稍后返回可继续查看进度。",
	"Video generation failed. Your credits were refunded.": "视频生成失败，积分已退还。",
	"This video generation task expired. Your credits were refunded.": "视频生成任务已过期，积分已退还。",
	"Video submission could not be confirmed. Your credits were refunded.": "无法确认视频提交结果，积分已退还。",
	"Video submission failed. Your credits were refunded.": "视频提交失败，积分已退还。",
	"Video submission could not be safely recorded. Please try again later.": "无法保存视频提交记录，请稍后重试。",
	"Video generation is temporarily unavailable. Please try again later.": "视频生成暂时不可用，请稍后重试。",
	"Video generation task was not found.": "找不到此视频生成任务。",
	"Video service returned an invalid task status.": "视频服务返回了无效任务状态。",
	"Choose PNG, JPEG or WebP images, up to 10 MB each.": "请选择 PNG、JPEG 或 WebP 图片，每张不超过 10 MB。",
	"Reference upload returned an invalid response.": "参考图上传返回了无效响应，请重试。",
	"Could not transfer this image. Save it, then upload it as a reference in H3.": "无法传入这张图片，请保存后在 H3 中上传为参考图片。",
	"This image link is unavailable. Save and upload the image in H3 instead.": "图片链接不可用，请保存图片后在 H3 中上传。",
	"The reference must be a PNG, JPEG or WebP image up to 10 MB.": "参考图须为 PNG、JPEG 或 WebP 图片，大小不超过 10 MB。",
	"Image transfer failed. Please try again.": "图片传入失败，请重试。",
	"Invalid reference image link. Please choose an image again.": "参考图片链接无效，请重新选择图片。",
	"This reference image expired. Please upload it again.": "参考图片已过期，请重新上传。",
	"The reference image could not be loaded.": "无法加载参考图片。",
	"The pose could not be captured.": "无法截取姿态图片。",
	"Drag a joint to pose · Click another character to select it": "拖动关节调整姿态 · 点击其他角色以选中",
	"Drag an arrow or plane to move · Drag the center to move freely": "拖动箭头或平面移动 · 拖动中心可自由移动",
	"Drag a colored ring to rotate the selected object": "拖动彩色圆环旋转选中的物体",
	"Drag a scale handle to resize proportionally": "拖动缩放控制点按比例调整大小",
	"Pose change undone": "已撤销姿态修改",
	"Pose change restored": "已恢复姿态修改",
	"{actor} selected · choose Pose, Move, Rotate or Scale": "已选中 {actor} · 可调整姿态、移动、旋转或缩放",
	"Moving {joint} · release to set the pose": "正在移动 {joint} · 松开即可设置姿态",
	"Transform applied · drag again to refine · Undo to restore": "变换已应用 · 继续拖动可微调 · 撤销可恢复",
	"Click a character to select it · Left-drag empty space to orbit · Right-drag / Shift + left-drag to pan": "点击角色以选中 · 在空白处左键拖动旋转视角 · 右键或 Shift + 左键拖动平移",
	"Drag a joint handle · Right-drag / Shift + left-drag to pan · Scroll to zoom": "拖动关节控制点 · 右键或 Shift + 左键拖动平移 · 滚轮缩放",
	"Neutral pose restored · drag a handle to refine it": "已恢复初始姿态 · 拖动控制点继续调整",
	"{preset} · drag a handle to refine it": "{preset} · 拖动控制点继续调整",
	"Object removed · Undo to restore it": "物体已移除 · 撤销可恢复",
	"Choose a model and add a character to begin": "选择模型并添加角色即可开始",
	"{prop} added · use Move, Rotate or Scale to place it": "已添加{prop} · 使用移动、旋转或缩放调整位置",
	"Link copied · anyone with it can open and edit this scene": "链接已复制 · 获得链接的人可以打开和编辑此场景",
	"Your scene link is ready · copy the selected link": "场景链接已生成 · 请复制选中的链接",
	"Unable to create a link · try a smaller scene or a current browser": "无法创建链接 · 请减少场景物体或使用较新的浏览器",
	"Pose mirrored · Undo to restore": "姿态已镜像 · 撤销可恢复",
	"Camera view updated · drag empty space to fine-tune": "视角已更新 · 拖动空白处继续微调",
	"Capturing pose…": "正在截取姿态…",
	"Image copied · paste it into your image tool": "图片已复制 · 可粘贴到图片工具",
	"Clipboard unavailable · PNG downloaded instead": "剪贴板不可用 · 已改为下载 PNG",
	"PNG downloaded · ready to use anywhere": "PNG 已下载 · 可用于其他工具",
	"Pose reference captured · continue in the image workspace": "姿态参考图已截取 · 继续在图片工作区创作",
	"Copy unavailable · use Download PNG instead": "无法复制 · 请使用下载 PNG",
	"The pose could not be captured · please try again": "无法截取姿态图片 · 请重试",
	"Pose to Image": "姿势生图",
	"Loading character…": "正在加载角色…",
	"Drag handles to pose · Left-drag empty space to orbit · Right-drag / Shift + left-drag to pan · Scroll to zoom": "拖动控制点调整姿势 · 在空白处左键拖动旋转视角 · 右键拖动或 Shift + 左键拖动平移 · 滚轮缩放",
	"This character could not be loaded · click Add character to retry": "无法加载角色 · 点击添加角色以重试",
	"Scene opened · select any object to keep editing": "场景已打开 · 选择任意物体继续编辑",
	"This scene could not be opened · a fresh scene is ready": "无法打开此场景 · 已创建新场景",
	Female: "女性",
	Male: "男性",
	Cat: "猫",
	Dog: "狗",
	Horse: "马",
	Chair: "椅子",
	Stool: "凳子",
	Table: "桌子",
	Box: "方盒",
	Ball: "球",
	Staff: "长杆",
	Head: "头部",
	Chest: "胸部",
	Pelvis: "骨盆",
	Body: "身体",
	Tail: "尾巴",
	"L Shoulder": "左肩",
	"R Shoulder": "右肩",
	"L Elbow": "左肘",
	"R Elbow": "右肘",
	"L Hand": "左手",
	"R Hand": "右手",
	"L Knee": "左膝",
	"R Knee": "右膝",
	"L Foot": "左脚",
	"R Foot": "右脚",
	"Front Left knee": "左前膝",
	"Front Right knee": "右前膝",
	"Hind Left knee": "左后膝",
	"Hind Right knee": "右后膝",
	"Front Left paw": "左前爪",
	"Front Right paw": "右前爪",
	"Hind Left paw": "左后爪",
	"Hind Right paw": "右后爪",
	All: "全部",
	Standing: "站立",
	Movement: "运动",
	"Head & gestures": "头部与动作",
	Resting: "休息",
	Gesture: "手势",
	Action: "动作",
	Seated: "坐姿",
	Floor: "地面姿势",
	Neutral: "自然站姿",
	Relaxed: "放松站姿",
	"Arms out": "双臂展开",
	"Reach up": "向上伸手",
	Celebrate: "庆祝",
	"Point ahead": "向前指",
	"Crossed arms": "双臂交叉",
	Kneeling: "跪姿",
	Jogging: "慢跑",
	"T-pose": "T 字站姿",
	Wave: "挥手",
	Point: "指向",
	Present: "展示",
	"Hands up": "双手举起",
	"Hands on hips": "双手叉腰",
	Thinking: "思考",
	Walking: "行走",
	Sprint: "冲刺",
	Balance: "保持平衡",
	"Boxing guard": "拳击防守",
	Lunge: "弓步",
	"Seated reach": "坐姿前伸",
	"Wide seated": "宽腿坐姿",
	Squat: "深蹲",
	"Both knees": "双膝跪地",
	"Floor seated": "坐在地上",
	Attention: "立正",
	"One hand on hip": "单手叉腰",
	"Model stance": "模特站姿",
	Salute: "敬礼",
	"On the phone": "打电话",
	Shrug: "耸肩",
	"Overhead stretch": "向上伸展",
	"Straight punch": "直拳",
	"Front kick": "前踢",
	"Side lunge": "侧弓步",
	"Hands on lap": "双手放在膝上",
	"Seated lean": "坐姿前倾",
	Running: "奔跑",
	"Look left": "向左看",
	"Look right": "向右看",
	Alert: "警觉",
	Sniffing: "嗅闻",
	Sitting: "坐下",
	"Lying down": "躺下",
	"Raise paw": "抬爪",
	Stretching: "伸展",
	Crouching: "伏低",
	"Play bow": "邀玩姿势",
	"Tail to side": "尾巴偏向一侧",
	Grazing: "吃草",
	Trotting: "小跑",
	Cantering: "慢速奔跑",
	"Rest hind hoof": "后蹄放松"
});
function n() {
	return e(globalThis.window?.location?.pathname || globalThis.location?.pathname || "/");
}
function r(e, r = {}, i = n()) {
	let a = String(e ?? "");
	return (i === "zh" && Object.hasOwn(t, a) ? t[a] : a).replace(/\{([a-zA-Z][\w]*)\}/g, (e, t) => Object.hasOwn(r, t) ? String(r[t]) : e);
}
var i = Object.freeze({
	AUTH_REQUIRED: "Please log in to continue.",
	INSUFFICIENT_CREDITS: "Insufficient credits. Please check your balance.",
	RATE_LIMITED: "Too many requests. Please try again later.",
	IMAGE_RATE_LIMITED: "Too many requests. Please try again later.",
	VIDEO_RATE_LIMITED: "Too many requests. Please try again later.",
	IMAGE_GENERATION_FAILED: "Image generation failed.",
	VIDEO_GENERATION_FAILED: "Video generation failed.",
	VIDEO_TASK_EXPIRED: "Video generation failed. Your credits were refunded.",
	VIDEO_TASK_NOT_FOUND: "This video task could not be found.",
	SERVICE_UNAVAILABLE: "The generation service is temporarily unavailable. Please try again later.",
	IMAGE_SERVICE_UNAVAILABLE: "The generation service is temporarily unavailable. Please try again later.",
	VIDEO_SERVICE_UNAVAILABLE: "The generation service is temporarily unavailable. Please try again later."
}), a = Object.freeze({
	"Please log in to continue.": "请登录后继续。",
	"Insufficient credits. Please check your balance.": "积分不足，请查看余额。",
	"Too many requests. Please try again later.": "请求过于频繁，请稍后重试。",
	"This video task could not be found.": "找不到此视频任务。",
	"The generation service is temporarily unavailable. Please try again later.": "生成服务暂时不可用，请稍后重试。"
});
function o(e, o = "", s = "Image generation failed.", c = n()) {
	let l = String(e || s);
	if (c !== "zh") return l;
	if (Object.hasOwn(t, l)) return r(l, {}, c);
	let u = i[o];
	return u ? a[u] || r(u, {}, c) : /[\u3400-\u9fff]/u.test(l) ? l : r(s, {}, c);
}
//#endregion
//#region app/video-reference-frame.mjs
var s = Object.freeze({
	"16:9": {
		width: 864,
		height: 480
	},
	"9:16": {
		width: 480,
		height: 864
	},
	"1:1": {
		width: 480,
		height: 480
	}
});
function c(e) {
	if (typeof e != "string" || !Object.hasOwn(s, e)) throw RangeError(r("Choose a supported video aspect ratio."));
	return { ...s[e] };
}
function l(e, t, n) {
	let { width: i, height: a } = c(n);
	if (![e, t].every((e) => Number.isFinite(e) && e > 0)) throw RangeError(r("Could not prepare the reference image. Please choose it again."));
	let o = Math.min(i / e, a / t), s = e * o, l = t * o;
	return {
		width: i,
		height: a,
		drawX: Math.max(0, (i - s) / 2),
		drawY: Math.max(0, (a - l) / 2),
		drawWidth: s,
		drawHeight: l
	};
}
function u(e) {
	if (e?.aborted) throw e.reason instanceof Error ? e.reason : new DOMException(r("Video polling was aborted."), "AbortError");
}
async function d(e) {
	if (typeof globalThis.createImageBitmap == "function") {
		let t = await globalThis.createImageBitmap(e, { imageOrientation: "from-image" });
		return {
			image: t,
			width: t.width,
			height: t.height,
			close: () => t.close()
		};
	}
	let t = URL.createObjectURL(e);
	try {
		let e = new Image();
		return await new Promise((n, r) => {
			e.onload = n, e.onerror = r, e.src = t;
		}), e.onload = e.onerror = null, {
			image: e,
			width: e.naturalWidth,
			height: e.naturalHeight,
			close: () => URL.revokeObjectURL(t)
		};
	} catch (e) {
		throw URL.revokeObjectURL(t), e;
	}
}
async function f(e, { aspectRatio: t = "16:9", signal: n, decodeImage: i = d, createCanvas: a = () => document.createElement("canvas") } = {}) {
	u(n), c(t);
	let o, s;
	try {
		o = await i(e), u(n);
		let r = l(o.width, o.height, t);
		s = a(), s.width = r.width, s.height = r.height;
		let c = s.getContext("2d", { alpha: !1 });
		if (!c) throw Error("Canvas unavailable");
		c.fillStyle = "#000000", c.fillRect(0, 0, r.width, r.height), c.imageSmoothingEnabled = !0, c.imageSmoothingQuality = "high", c.drawImage(o.image, r.drawX, r.drawY, r.drawWidth, r.drawHeight);
		let d = await new Promise((e) => s.toBlob(e, "image/png"));
		if (u(n), !d || d.type !== "image/png" || !d.size || d.size > 10485760) throw Error("Image encoding failed");
		return d;
	} catch (e) {
		throw e?.name === "AbortError" ? e : Error(r("Could not prepare the reference image. Please choose it again."));
	} finally {
		try {
			o?.close?.();
		} finally {
			s && (s.width = 0, s.height = 0);
		}
	}
}
//#endregion
//#region app/video-generation.mjs
var p = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, m = /* @__PURE__ */ new Set([
	"succeeded",
	"failed",
	"expired",
	"submission_unknown"
]), h = /* @__PURE__ */ new Set([
	408,
	425,
	429,
	500,
	502,
	503,
	504
]);
function g(e, t = {}) {
	return Object.assign(Error(r(e)), t);
}
function _() {
	return new DOMException(r("Video polling was aborted."), "AbortError");
}
function v(e) {
	if (e?.aborted) throw e.reason instanceof Error ? e.reason : _();
}
function y(e) {
	let t = Number(e.headers.get("x-seedance-credit-cost")), n = Number(e.headers.get("x-seedance-credit-remaining")), r = e.headers.get("x-seedance-credit-scope");
	return Number.isSafeInteger(t) && t > 0 && Number.isSafeInteger(n) && n >= 0 ? {
		cost: t,
		remaining: n,
		...r === "guest-video" || r === "account" ? { context: r } : {}
	} : null;
}
async function b(e) {
	try {
		return await e.json();
	} catch {
		throw g(r("Video service returned an invalid response."), {
			status: e.status,
			code: "INVALID_VIDEO_RESPONSE",
			terminal: !1
		});
	}
}
function x(e) {
	let t = String(e || "");
	if (!p.test(t)) throw g(r("Video service returned an invalid task."), {
		code: "INVALID_VIDEO_TASK",
		terminal: !1
	});
	return t;
}
function S(e, t) {
	let n = x(e?.task?.id);
	if (t && n !== t) throw g(r("Video service returned an invalid task."), {
		code: "INVALID_VIDEO_TASK",
		terminal: !1
	});
	return n;
}
function C(e) {
	try {
		let t = new URL(String(e || ""));
		if (t.protocol !== "https:" || t.username || t.password) throw Error("unsafe");
		return t.href;
	} catch {
		throw g(r("Video service returned an invalid video URL."), {
			code: "INVALID_VIDEO_RESULT",
			terminal: !0,
			taskStatus: "succeeded"
		});
	}
}
function w(e, { nowImpl: t, maxRetryAfterMs: n }) {
	let r = e.headers.get("retry-after")?.trim();
	if (!r) return null;
	let i;
	if (/^\d+$/.test(r)) i = Number(r) * 1e3;
	else {
		let e = Date.parse(r);
		i = Number.isFinite(e) ? Math.max(0, e - t()) : NaN;
	}
	return Number.isSafeInteger(i) && i >= 0 && i <= n ? i : null;
}
function T(e, { signal: t } = {}) {
	return v(t), new Promise((n, r) => {
		let i = setTimeout(a, e);
		function a() {
			t?.removeEventListener("abort", o), n();
		}
		function o() {
			clearTimeout(i), t?.removeEventListener("abort", o), r(t.reason instanceof Error ? t.reason : _());
		}
		t?.addEventListener("abort", o, { once: !0 });
	});
}
function E(e, t, n) {
	let r = typeof t?.task?.status == "string" ? t.task.status : void 0;
	return g(o(t?.message, t?.code, "Video generation failed."), {
		status: e.status,
		code: String(t?.code || "VIDEO_GENERATION_FAILED"),
		...n ? { credits: n } : {},
		...r ? { taskStatus: r } : {},
		terminal: m.has(r)
	});
}
async function D({ taskId: e, fetchImpl: t = globalThis.fetch, waitImpl: n = T, nowImpl: i = Date.now, maxDurationMs: a = 6e5, initialDelayMs: o = 1e3, maxDelayMs: s = 8e3, maxRetryAfterMs: c = 3e4, signal: l, onStatus: u = () => {}, initialCredits: d = null } = {}) {
	let f = x(e), p = i(), _ = Math.max(0, Math.min(Number(o) || 1e3, Number(s) || 8e3)), D = Math.max(_, Number(s) || 8e3), O = Math.max(1, Number(a) || 6e5), k = d;
	async function A(e, t) {
		let a = i() - p, o = O - a;
		if (o <= 0) throw g(r("Video generation is still running. Return later to resume checking it."), {
			code: "VIDEO_CLIENT_TIMEOUT",
			terminal: !1,
			taskId: f
		});
		let s = t ? w(e, {
			nowImpl: i,
			maxRetryAfterMs: c
		}) ?? _ : _;
		await n(Math.min(s, o), { signal: l }), v(l), _ = Math.min(D, Math.max(1, _ * 2));
	}
	for (;;) {
		if (v(l), i() - p >= O) throw g(r("Video generation is still running. Return later to resume checking it."), {
			code: "VIDEO_CLIENT_TIMEOUT",
			terminal: !1,
			taskId: f
		});
		let e;
		try {
			e = await t(`/api/videos/status?task=${encodeURIComponent(f)}`, {
				method: "GET",
				credentials: "same-origin",
				headers: { accept: "application/json" },
				signal: l
			});
		} catch {
			v(l), u({
				status: "retrying",
				taskId: f,
				credits: k
			}), await A(new Response(null), !1);
			continue;
		}
		let n = y(e);
		n && (k = n);
		let a = await b(e), o = h.has(e.status);
		if (!e.ok || !a?.success) {
			if (o && !a?.task) {
				u({
					status: "retrying",
					taskId: f,
					credits: k
				}), await A(e, !0);
				continue;
			}
			throw a?.task?.id && S(a, f), E(e, a, n);
		}
		S(a, f);
		let s = String(a.task.status || "");
		if (s === "succeeded") return {
			taskId: f,
			status: s,
			videoUrl: C(a.task.resultUrl),
			...k ? { credits: k } : {}
		};
		if (m.has(s)) throw g(r("Video generation failed. Your credits were refunded."), {
			code: s === "expired" ? "VIDEO_TASK_EXPIRED" : "VIDEO_GENERATION_FAILED",
			taskStatus: s,
			terminal: !0,
			...k ? { credits: k } : {}
		});
		if (s !== "queued" && s !== "running" && s !== "submitting") throw g(r("Video service returned an invalid task status."), {
			code: "INVALID_VIDEO_RESPONSE",
			terminal: !1
		});
		let c = a.retriable === !0;
		u({
			status: c ? "retrying" : s,
			taskStatus: s,
			taskId: f,
			credits: k
		}), await A(e, c);
	}
}
async function O({ prompt: e, duration: t = 5, aspectRatio: n = "16:9", referenceFiles: i = [], prepareReferenceImpl: a = f, onUpload: o = () => {}, fetchImpl: s = globalThis.fetch, signal: c, onTask: l = () => {}, onStatus: u = () => {}, ...d } = {}) {
	v(c);
	let m = [];
	if (!Array.isArray(i) || i.length > 1) throw g(r("H3 supports only one reference image. Remove the current image before adding another."));
	for (let [e, t] of i.entries()) {
		if (![
			"image/png",
			"image/jpeg",
			"image/webp"
		].includes(t.type) || !t.size || t.size > 10485760) throw g(r("Choose PNG, JPEG or WebP images, up to 10 MB each."));
		o({
			index: e + 1,
			total: i.length
		});
		let l = await a(t, {
			aspectRatio: n,
			signal: c
		});
		v(c);
		let u = await s("/api/videos/references", {
			method: "POST",
			credentials: "same-origin",
			headers: {
				"content-type": l.type,
				accept: "application/json"
			},
			body: l,
			signal: c
		}), d = await b(u);
		if (!u.ok || !d?.success) throw E(u, d);
		if (!p.test(d.id)) throw g(r("Reference upload returned an invalid response."));
		m.push(d.id);
	}
	let h = await s("/api/videos/generate", {
		method: "POST",
		credentials: "same-origin",
		headers: {
			accept: "application/json",
			"content-type": "application/json"
		},
		body: JSON.stringify({
			prompt: String(e || "").trim(),
			duration: Number(t),
			resolution: "480p",
			aspectRatio: String(n || "16:9"),
			...m.length ? { referenceImageIds: m } : {}
		}),
		signal: c
	}), _ = y(h), x = await b(h);
	if (!h.ok || !x?.success) throw E(h, x, _);
	let C = S(x);
	return l(C), u({
		status: String(x.task.status || "queued"),
		taskId: C,
		credits: _
	}), D({
		...d,
		taskId: C,
		fetchImpl: s,
		signal: c,
		onStatus: u,
		initialCredits: _
	});
}
//#endregion
//#region app/studio-handoff.mjs
var k = "seedance:h3:handoff", A = "seedance:minimax-h3:active-task", j = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function M(e, t, n) {
	let r = await new Promise((e, t) => {
		let n = indexedDB.open("seedance-studio-handoff", 1);
		n.onupgradeneeded = () => n.result.createObjectStore("references"), n.onsuccess = () => e(n.result), n.onerror = () => t(n.error), n.onblocked = () => t(/* @__PURE__ */ Error("Reference transfer is busy. Please try again."));
	});
	try {
		return await new Promise((i, a) => {
			let o = r.transaction("references", e === "get" ? "readonly" : "readwrite"), s = o.objectStore("references"), c = e === "get" ? s.get(t) : e === "put" ? s.put(n, t) : s.delete(t);
			o.oncomplete = () => i(c.result), o.onerror = o.onabort = () => a(o.error || /* @__PURE__ */ Error("Reference transfer failed."));
		});
	} finally {
		r.close();
	}
}
async function N(e, { storage: t = sessionStorage, putFile: n = (e, t) => M("put", e, t), deleteFile: r = (e) => M("delete", e) } = {}) {
	let i;
	try {
		i = JSON.parse(t.getItem(k) || "null");
	} catch {}
	let a = e.file ? crypto.randomUUID() : null;
	a && await n(a, e.file);
	let o = {
		createdAt: Date.now(),
		prompt: String(e.prompt || "").slice(0, 2500),
		duration: [
			5,
			10,
			15
		].includes(Number(e.duration)) ? Number(e.duration) : 5,
		aspectRatio: [
			"16:9",
			"9:16",
			"1:1"
		].includes(e.aspectRatio) ? e.aspectRatio : "16:9",
		mode: e.mode === "reference" ? "reference" : "text",
		referenceKey: a,
		taskId: j.test(e.taskId || "") ? e.taskId : ""
	};
	try {
		t.setItem(k, JSON.stringify(o));
	} catch (e) {
		throw a && await r(a).catch(() => {}), e;
	}
	return j.test(i?.referenceKey || "") && await r(i.referenceKey).catch(() => {}), o;
}
async function P({ storage: e = sessionStorage, consume: t = !0, getFile: n = (e) => M("get", e), deleteFile: r = (e) => M("delete", e) } = {}) {
	let i;
	try {
		i = JSON.parse(e.getItem(k) || "null");
	} catch {
		return e.removeItem(k), null;
	}
	if (!i || !Number.isFinite(i.createdAt) || Date.now() - i.createdAt > 36e5 || ![
		"16:9",
		"9:16",
		"1:1"
	].includes(i.aspectRatio) || ![
		5,
		10,
		15
	].includes(i.duration) || typeof i.prompt != "string" || i.prompt.length > 2500 || i.taskId && !j.test(i.taskId) || i.referenceKey && !j.test(i.referenceKey)) return e.removeItem(k), null;
	let a = null;
	if (i.referenceKey) {
		if (a = await n(i.referenceKey), !(a instanceof Blob) || ![
			"image/png",
			"image/jpeg",
			"image/webp"
		].includes(a.type) || !a.size || a.size > 10485760) throw Error("The reference image could not be restored. Please choose it again.");
		a instanceof File || (a = new File([a], "reference-image", { type: a.type }));
	}
	return t && (e.removeItem(k), i.referenceKey && await r(i.referenceKey).catch(() => {})), {
		...i,
		file: a
	};
}
//#endregion
//#region app/home-video.mjs
var F = [
	{
		title: ["Cinematic scene", "电影感场景"],
		src: "/assets/h3-example-cinematic.mp4",
		prompt: "At blue hour on a windswept salt flat, a lone traveler in a saffron coat walks toward a glowing glass observatory. One continuous slow dolly-in shot; drifting dust, soft volumetric light, grounded realistic motion, film-grain, high-contrast cinematic color. No text, no logos."
	},
	{
		title: ["Product film", "产品短片"],
		src: "/assets/h3-example-product.mp4",
		prompt: "A sculptural matte-black ceramic espresso cup rotates above a pale limestone pedestal as warm morning sunlight slides across the rim. Macro lens, crisp reflections, gentle orbit camera, premium commercial film, clean minimal background. No text, no logos."
	},
	{
		title: ["Paper animation", "纸艺动画"],
		src: "/assets/h3-example-animation.mp4",
		prompt: "A tiny paper fox with folded origami fur leaps between floating lanterns over a moonlit forest pond. Handcrafted stop-motion paper texture, playful squash-and-stretch, smooth sideways tracking camera, saturated indigo and amber palette. No text, no logos."
	}
];
function I(e = document.querySelector("[data-home-video]"), { fetchImpl: t = fetch, requestImpl: n = O, pollImpl: r = D } = {}) {
	if (!e) return () => {};
	let i = document.documentElement.lang.startsWith("zh"), a = (e, t) => i ? t : e, o = (t) => e.querySelector(`[data-home-${t}]`), s = o("form"), l = o("prompt"), u = o("duration"), d = o("ratio"), f = o("file"), p = o("reference"), m = o("thumb"), h = o("generate"), g = o("status"), _ = o("player"), v = o("pending"), y = o("result"), b = o("examples"), x = null, S = "", C = "text", w = !1, T = !1, E = !0, k = null, j = "", M = !1, I = null, L = 0, R = !1, z = [], B = (e, t, n) => {
		e?.addEventListener(t, n), z.push(() => e?.removeEventListener(t, n));
	};
	function V(e, t = !1) {
		g.textContent = e, g.classList.toggle("is-error", t && !w);
	}
	let H = () => E && k !== null && k < 5;
	function U() {
		let t = H() && !w && !R, n = k !== null && k < Number(u.value);
		for (let e of u.options) e.disabled = E && k !== null && Number(e.value) > k;
		!w && n && k >= 5 && (u.value = "5"), h.disabled = w || R || !t && (!l.value.trim() || C === "reference" && !x || k !== null && k < 5), h.textContent = w ? a("Generating…", "正在生成…") : t ? a("Sign up to keep creating", "注册后继续创作") : E ? a("Generate for free ↗", "免费生成视频 ↗") : a("Generate video ↗", "生成视频 ↗"), o("exhausted").hidden = !t, u.disabled = d.disabled = l.disabled = f.disabled = o("model").disabled = w || R, e.querySelectorAll("[data-home-mode]").forEach((e) => {
			e.disabled = w, e.setAttribute("aria-pressed", String(e.dataset.homeMode === C));
		}), p.hidden = C !== "reference";
		let r = [...d.options].find((e) => e.value === "1:1");
		if (r && (r.disabled = C === "reference"), C === "reference" && d.value === "1:1" && (d.value = "16:9"), x) {
			let e = c(d.value);
			m.style.aspectRatio = `${e.width} / ${e.height}`;
		}
		o("balance").textContent = k === null ? a("10 free seconds · no sign-up or login", "10 秒免费额度 · 无需注册和登录") : E ? a(`${k} free seconds remaining`, `实际剩余 ${k} 秒免费额度`) : a(`${k} credits available`, `可用 ${k} 积分`), o("cost").textContent = E ? a(`This video: ${u.value}s free`, `本次免费 ${u.value} 秒`) : a(`This video: ${u.value} credits`, `本次 ${u.value} 积分`);
	}
	function W(e) {
		e && (k = e.remaining, e.context && (E = e.context === "guest-video"), U());
	}
	async function G() {
		try {
			let e = await t("/api/credits/balance?guest_video=1", { credentials: "same-origin" }), n = await e.json();
			!T && e.ok && n.credits && (E = n.credits.guest === !0, k = n.credits.remaining, U());
		} catch {}
	}
	function K(t, n = !1) {
		if (w || R) return;
		L = t;
		let r = F[t];
		M || (_.src = r.src, _.muted = !0, _.loop = !1, o("example-title").textContent = r.title[+!!i], _.play().catch(() => {})), o("example-count").textContent = `${String(t + 1).padStart(2, "0")} / ${String(F.length).padStart(2, "0")}`, n && (l.value = r.prompt, u.value = "5", d.value = "16:9", C = "text", U(), l.focus(), e.scrollIntoView({
			behavior: "smooth",
			block: "start"
		}));
	}
	function q(e) {
		return w ? !1 : e && (![
			"image/png",
			"image/jpeg",
			"image/webp"
		].includes(e.type) || !e.size || e.size > 10485760) ? (V(a("Choose PNG, JPEG or WebP, up to 10 MB.", "请选择不超过 10 MB 的 PNG、JPEG 或 WebP 图片。"), !0), !1) : (S && URL.revokeObjectURL(S), x = e, S = e ? URL.createObjectURL(e) : "", m.hidden = !e, o("remove").hidden = !e, e ? (m.src = S, o("filename").textContent = e.name) : (m.removeAttribute("src"), o("filename").textContent = a("Choose or paste one image", "选择或粘贴一张参考图")), U(), !0);
	}
	let J = () => ({
		prompt: l.value,
		duration: Number(u.value),
		aspectRatio: d.value,
		mode: C,
		file: C === "reference" ? x : null,
		taskId: j
	});
	async function Y(e) {
		e.preventDefault(), await X(e.currentTarget.href);
	}
	async function X(e) {
		try {
			await N(J()), I?.abort(), window.location.assign(e);
		} catch {
			V(a("Could not transfer the draft. Please try again.", "草稿暂时无法转入工作台，请重试。"), !0);
		}
	}
	document.querySelectorAll("[data-video-workbench]").forEach((e) => B(e, "click", Y));
	async function Z(e = "") {
		if (w || T) return;
		let i = J();
		e && (R = !0), w = !0, M = !1, I = new AbortController(), v.hidden = !1, y.hidden = !0, b.hidden = !0, _.hidden = !0, _.pause(), V(a(e ? "Checking your video…" : "Preparing your video…", e ? "正在查看生成进度…" : "正在准备生成…")), U(), matchMedia("(max-width: 760px)").matches && o("preview").scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
		try {
			e || await N(i).catch(() => {});
			let s = {
				fetchImpl: t,
				signal: I.signal,
				onStatus(e) {
					if (T) return;
					W(e.credits);
					let t = e.status === "queued" ? a("Queued for generation…", "已排队，等待生成…") : e.status === "running" ? a("Generating your video…", "正在生成视频…") : a("Checking generation progress…", "正在查看生成进度…");
					o("pending-text").textContent = t, V(t);
				}
			}, c = e ? await r({
				...s,
				taskId: e
			}) : await n({
				...s,
				prompt: i.prompt,
				duration: i.duration,
				aspectRatio: i.aspectRatio,
				referenceFiles: i.file ? [i.file] : [],
				onTask(e) {
					j = e, R = !0;
					try {
						sessionStorage.setItem(A, e), sessionStorage.setItem("seedance:video:active-model", "minimax-h3");
					} catch {}
				}
			});
			if (T) return;
			W(c.credits), M = !0, R = !1, _.src = c.videoUrl, _.muted = !1, _.loop = !1, _.hidden = !1, v.hidden = !0, y.hidden = !1, o("download").href = c.videoUrl, o("example-title").textContent = a("Your generated video", "你的生成结果"), sessionStorage.removeItem(A), sessionStorage.removeItem("seedance:video:active-model"), V(a("Your video is ready. Download it or continue in the workspace.", "视频已生成，可下载或进入工作台继续创作。"));
		} catch (e) {
			if (T || e.name === "AbortError") return;
			W(e.credits), (e.terminal || e.status === 404 || e.code === "INVALID_VIDEO_TASK") && (sessionStorage.removeItem(A), j = "", R = !1), v.hidden = !0, j ? (o("resume").hidden = !1, V(a("Your task is saved. Continue checking or open the workspace.", "任务已保存，可继续查看进度或进入工作台。"))) : (b.hidden = !1, _.hidden = !1, K(L), V(e.message || a("Please try again.", "请重试。")));
		} finally {
			w = !1, !M && !j && K(L), U(), T || G();
		}
	}
	B(s, "submit", (e) => {
		if (e.preventDefault(), !h.disabled) {
			if (H()) {
				X(o("signup").href);
				return;
			}
			j = "", Z();
		}
	}), B(l, "input", U), B(u, "change", U), B(d, "change", U), B(f, "change", () => {
		q(f.files?.[0] || null), f.value = "";
	}), B(o("choose"), "click", () => f.click()), B(o("remove"), "click", () => q(null)), B(o("resume"), "click", () => {
		o("resume").hidden = !0, Z(j);
	}), e.querySelectorAll("[data-home-mode]").forEach((e) => B(e, "click", () => {
		C = e.dataset.homeMode, C === "reference" && d.value === "1:1" && (d.value = "16:9"), U();
	})), B(_, "ended", () => {
		!w && !R && !M && !T && K((L + 1) % F.length);
	}), B(o("try"), "click", () => K(L, !0)), document.querySelectorAll("[data-home-focus]").forEach((t) => B(t, "click", (t) => {
		t.preventDefault(), e.scrollIntoView({
			behavior: "smooth",
			block: "start"
		}), !w && !R && l.focus({ preventScroll: !0 });
	})), B(e, "paste", (e) => {
		if (C !== "reference" || w) return;
		let t = [...e.clipboardData?.files || []].filter((e) => e.type.startsWith("image/"));
		t.length === 1 && q(t[0]) && e.preventDefault();
	});
	let Q = P({ consume: !1 }).then((e) => {
		e && !T && (l.value = e.prompt, u.value = String(e.duration === 15 ? 10 : e.duration), d.value = e.aspectRatio, C = e.mode, e.file && q(e.file), U());
	}).catch(() => {});
	K(0), U(), G(), Q.then(() => {
		let e = sessionStorage.getItem(A);
		e && !T && (j = e, Z(e));
	});
	let $ = () => {
		T = !0, I?.abort(), S && URL.revokeObjectURL(S), z.forEach((e) => e());
	};
	return B(window, "pagehide", $), $;
}
if (typeof document < "u") {
	let e = I();
	window.addEventListener("pageshow", (t) => {
		t.persisted && (e(), e = I());
	});
}
//#endregion
export { F as HOME_VIDEO_EXAMPLES, I as initializeHomeVideo };
