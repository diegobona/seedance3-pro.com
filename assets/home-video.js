Object.freeze({
	"/app/video/minimax-h3": "/app/video/seedance-2-5",
	"/app/image/gpt-image-2": "/app/image/gpt-image-2-5",
	"/minimax-h3-ai-video-generator": "/app/video/seedance-2-5",
	"/minimax-h3-ai-video-generator.html": "/app/video/seedance-2-5",
	"/gpt-image-2": "/app/image/gpt-image-2-5",
	"/gpt-image-2.html": "/app/image/gpt-image-2-5"
}), Object.freeze({
	"/minimax-h3-prompts": "/seedance-2-5-prompts",
	"/gpt-image-2-prompts": "/gpt-image-2-5-prompts",
	"/prompts/minimax-h3/videos": "/seedance-2-5-prompts",
	"/prompts/gpt-image-2/images": "/gpt-image-2-5-prompts"
}), Object.freeze(["en", "zh"]);
function e(e = "/") {
	return e === "/zh" || e.startsWith("/zh/") ? "zh" : "en";
}
//#endregion
//#region app/video-resolution-label.mjs
function t(e) {
	return String(e).replace(/\b768p\b/gi, "1080P");
}
//#endregion
//#region app/model-display-names.mjs
function n(e) {
	return String(e).replace(/\bMiniMax\s+H3(?:\s+Max\s+Turbo)?\b/gi, "Seedance 2.5").replace(/\bGPT[\s-]*Image\s*2(?![.\d])/gi, "GPT Image 2.5");
}
function r(e) {
	return n(e).replace(/\bH3\b/g, "Seedance 2.5").replace(/\bG2\b(?!\.)/g, "G2.5");
}
//#endregion
//#region app/i18n.mjs
var i = Object.freeze({
	"Security check": "安全验证",
	"Loading security check…": "正在加载安全验证…",
	"You will continue automatically after verification.": "验证通过后将自动继续",
	"Back to creating": "返回创作",
	Cancel: "取消",
	"Please complete the security check to continue.": "请完成安全验证后继续。",
	"Verification is temporarily unavailable. Please try again later.": "安全验证暂时不可用，请稍后重试。",
	"Verification failed. Please try again.": "安全验证未通过，请重试。",
	"Verification could not load. Please try again.": "安全验证加载失败，请重试。",
	"Verification cancelled. Please try again.": "已取消安全验证，请重试。",
	"Verification timed out. Please try again.": "安全验证已超时，请重试。",
	"Your credits are used up. Buy credits to keep creating.": "积分已用完，请购买积分后继续创作。",
	"Purchased credits never expire.": "购买积分永久有效。",
	"Buy credits to keep creating. Purchased credits never expire.": "购买积分后继续创作，购买积分永久有效。",
	"Guests get a one-time free trial.": "游客可获得一次免费体验。",
	"Two free videos, 5 seconds each.": "免费生成 2 条视频，每条 5 秒。",
	"Free trial: 5 seconds per video.": "免费试用每次固定生成 5 秒。",
	"5 seconds": "5 秒",
	"10 seconds": "10 秒",
	"15 seconds": "15 秒",
	"Your free images are used up. Sign up or log in, then buy credits to keep creating.": "免费图片额度已用完。注册或登录后购买积分，继续创作。",
	"Your free video seconds are used up. Sign up or log in, then buy credits to keep creating.": "免费视频额度已用完。注册或登录后购买积分，继续创作。",
	"Sign up or log in, then buy credits to continue": "注册或登录后购买积分，继续创作",
	"Not enough credits. Buy credits to keep creating. Purchased credits never expire.": "积分不足，请购买积分后继续创作。购买积分永久有效。",
	"Not enough free video seconds for this duration. Choose 5 seconds, or log in and buy credits to continue.": "剩余免费秒数不足以生成此时长。请选择 5 秒，或登录并购买积分继续。",
	"Choose fewer images, or log in and buy credits to continue.": "请减少图片数量，或登录并购买积分继续。",
	"Next generation: {paid} purchased credits.": "下次生成扣费：{paid} 购买积分。",
	"Balance: {paid} purchased credits": "当前余额：{paid} 购买积分",
	"The free trial is temporarily unavailable on this network. Log in and buy credits to continue.": "当前网络暂时无法使用免费体验。请登录并购买积分后继续。",
	"Free generation is temporarily limited by a safety budget. This attempt was not charged; your remaining allowance is unchanged.": "免费生成暂时受到安全预算限制。本次未扣除额度，剩余体验额度保持不变。",
	"Try two 5-second videos at 768p without signing in (10 free seconds in total, once). After the trial, log in and buy credits to continue.": "无需登录即可免费生成两次 768p 视频，每次固定 5 秒，共 10 秒，仅可领取一次；用完后请登录并购买积分继续。",
	"This network’s daily free allowance is used up. It resets at 00:00 Asia/Shanghai. You can choose to use purchased credits.": "当前网络的每日免费额度已用完，将于北京时间 00:00 重置。你可以主动选择使用购买积分。",
	"Each network shares a daily limit of 10 free credits across guest and registered image/video generation.": "同一网络每天共享 10 积分免费额度，游客和注册用户生成图片、视频均计入。",
	Pricing: "价格",
	"Not enough credits.": "额度不足。",
	"Credits reset daily and do not accumulate.": "积分每日重置，不累积。",
	"Daily credits": "每日积分",
	"Purchased credits": "购买积分",
	"Daily: resets at 00:00 Asia/Shanghai. Purchased: never expires.": "每日积分：北京时间 00:00 重置。购买积分：永久有效。",
	"Buy credits & billing": "购买积分与账单",
	"Loading credit breakdown…": "正在加载积分明细…",
	"Next generation: {daily} daily + {paid} purchased credits.": "下次生成扣费：{daily} 每日积分 + {paid} 购买积分。",
	"Balance: {daily} daily · {paid} purchased": "当前余额：{daily} 每日积分 · {paid} 购买积分",
	"Use purchased credits only for this generation": "本次生成仅使用购买积分",
	"Today’s free generation budget is reached. Wait until reset, or explicitly choose purchased credits.": "今日免费生成预算已达上限。请等待重置，或主动选择使用购买积分。",
	"Buy Credits": "购买积分",
	"Buy {credits} credits · ${price}": "购买 {credits} 积分 · ${price}",
	"{credits} images or {videoExamples}": "{credits} 张图片，或 {videoExamples}",
	"1 credit": "1 积分",
	"Generate image · 1 credit": "生成图片 · 1 积分",
	"Generate again · 1 credit": "再次生成 · 1 积分",
	"GPT Image 2.5 uses 1 credit per image.": "GPT Image 2.5 每张图片消耗 1 积分。",
	"All signed-in accounts get {credits} credits {daily}, shared across images and videos.": "所有登录账户{daily}获得 {credits} 积分，图片与视频共用。",
	"Daily credits reset at 00:00 Asia/Shanghai ({time} local time) and do not accumulate. Purchased credits never expire.": "每日积分在北京时间 00:00（当地时间 {time}）重置，不累积。购买积分永久有效。",
	"One credit per image": "每张图片 1 积分",
	"The trial costs one credit per image. Review the total for your selected image count and sign in to generate.": "每张图片消耗 1 积分。请先查看所选图片数量对应的总积分。",
	"TRIAL · 768P": "试用 · 768P",
	"1–9 images · PNG, JPEG or WebP · max 10 MB each": "1–9 张图 · PNG、JPEG 或 WebP · 每张最大 10 MB",
	"Describe the role of each reference image, then describe the motion and camera movement.": "说明每张参考图的用途，再描述主体动作和镜头运动。",
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
	"Daily free credits": "每日免费积分",
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
	"Your free images are used up. Sign up for 5 free credits every day.": "免费图片额度已用完，注册后每天获得 5 积分。",
	"Image generated · {count} free images remaining.": "图片已生成 · 还剩 {count} 张免费图片额度。",
	"Choose fewer images or sign up to keep creating.": "请选择更少的图片数量，或注册后继续生成。",
	"Each free video is 5 seconds.": "每次免费视频固定 5 秒。",
	"Free accounts get {credits} credits daily, shared across images and videos.": "免费账户每天获得 {credits} 积分，图片和视频共用。",
	"Sign up to keep creating": "注册后继续创作",
	"Generate video · {seconds}s free": "生成视频 · 免费 {seconds} 秒",
	"{seconds} free seconds": "免费 {seconds} 秒",
	"{seconds} seconds remaining": "剩余 {seconds} 秒",
	"— seconds remaining": "剩余 — 秒",
	"Video generated · {seconds} free seconds remaining.": "视频已生成 · 还剩 {seconds} 秒免费额度。",
	"Your free video seconds are used up. Sign up for 5 free credits every day.": "游客免费视频额度已用完，注册后每天获得 5 积分。",
	"Not enough free video seconds for this duration. Choose 5 seconds or sign up to keep creating.": "剩余免费秒数不足，请选择 5 秒或注册后继续创作。",
	"Guest videos support 5 seconds per generation at 768p.": "游客视频每次固定生成 5 秒，固定 768p。",
	"This network has already claimed the guest video trial. Sign up to keep creating.": "当前网络已领取过游客体验额度，请注册后继续创作。",
	"This device or network has already claimed the guest video trial. Sign up to keep creating.": "当前设备或网络已领取过游客视频额度，请注册后继续创作。",
	"This device or network has already claimed the guest image trial. Sign up to keep creating.": "当前设备或网络已领取过游客图片额度，请注册后继续创作。",
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
	"Saving your reference image for Seedance 2.5…": "正在为 Seedance 2.5 保存参考图片…",
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
	"Seedance 2.5 supports only one reference image. Remove the current image before adding another.": "Seedance 2.5 只能上传一张参考图，请先移除当前图片再添加。",
	"Seedance 2.5 supports up to 9 reference images.": "Seedance 2.5 最多支持 9 张参考图。",
	"Choose 1 to 9 valid reference images.": "请选择 1 至 9 张有效的参考图。",
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
	"Free trial video generation supports 768p only.": "免费试用的视频分辨率仅支持 768p。",
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
	"This image is unavailable. Save it and upload it in Seedance 2.5 instead.": "图片不可用，请保存后在 Seedance 2.5 中上传。",
	"Could not retrieve this image. Please try again or save and upload it in Seedance 2.5.": "无法获取图片，请重试或保存后在 Seedance 2.5 中上传。",
	"The image link expired. Save and upload the image in Seedance 2.5 instead.": "图片链接已过期，请保存后在 Seedance 2.5 中上传。",
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
	"Could not transfer this image. Save it, then upload it as a reference in Seedance 2.5.": "无法传入这张图片，请保存后在 Seedance 2.5 中上传为参考图片。",
	"This image link is unavailable. Save and upload the image in Seedance 2.5 instead.": "图片链接不可用，请保存图片后在 Seedance 2.5 中上传。",
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
function a() {
	return e(globalThis.window?.location?.pathname || globalThis.location?.pathname || "/");
}
function o(e, n = {}, o = a()) {
	let s = String(e ?? "");
	return r(t((o === "zh" && Object.hasOwn(i, s) ? i[s] : s).replace(/\{([a-zA-Z][\w]*)\}/g, (e, t) => Object.hasOwn(n, t) ? String(n[t]) : e)));
}
var s = Object.freeze({
	FREE_BUDGET_EXCEEDED: "Free generation is temporarily limited by a safety budget. This attempt was not charged; your remaining allowance is unchanged.",
	NETWORK_FREE_BUDGET_EXCEEDED: "The free trial is temporarily unavailable on this network. Log in and buy credits to continue.",
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
}), c = Object.freeze({
	"Please log in to continue.": "请登录后继续。",
	"Insufficient credits. Please check your balance.": "积分不足，请查看余额。",
	"Too many requests. Please try again later.": "请求过于频繁，请稍后重试。",
	"This video task could not be found.": "找不到此视频任务。",
	"The generation service is temporarily unavailable. Please try again later.": "生成服务暂时不可用，请稍后重试。"
});
function l(e, n = "", l = "Image generation failed.", u = a()) {
	let d = String(e || l);
	if (n === "FREE_BUDGET_EXCEEDED") return o(s[n], {}, u);
	if (u !== "zh") return r(t(d));
	if (Object.hasOwn(i, d)) return o(d, {}, u);
	let f = s[n];
	return f ? c[f] || o(f, {}, u) : /[\u3400-\u9fff]/u.test(d) ? r(t(d)) : o(l, {}, u);
}
//#endregion
//#region app/guest-video-input.mjs
function u(e, t) {
	return !Number.isInteger(t) || t < 0 ? !1 : e === void 0 ? t <= 1 : e === "text" ? t === 0 : e === "reference" ? t >= 1 && t <= 5 : e === "frames" && t >= 1 && t <= 2;
}
//#endregion
//#region app/reference-mentions.mjs
var d = () => /(?<![a-zA-Z0-9_])@(?:Image\s*|图片\s*|图\s*)(\d+)(?!\d)|<Picture\s*(\d+)>/giu;
function f(e, t) {
	return String(e || "").replace(d(), (e, n, r) => {
		let i = Number(n || r);
		if (i < 1 || i > t) throw Error("A referenced image is missing. Check the image numbers in your prompt.");
		return `<Picture ${i}>`;
	});
}
function p(e, t) {
	let n = t + 1;
	return [...e.matchAll(d())].some((e) => Number(e[1] || e[2]) === n) ? null : e.replace(d(), (e, t, r) => Number(t || r) > n ? e.replace(/\d+/, String(Number(t || r) - 1)) : e);
}
function m(e, t) {
	let n = e.slice(0, t).match(/(?<![a-zA-Z0-9_])@((?:I(?:m(?:a(?:g(?:e)?)?)?)?|图(?:片)?)?\s*\d*)$/iu);
	return n ? {
		start: t - n[0].length,
		query: n[1].trim()
	} : null;
}
function h(e, { zh: t = !1, onError: n = () => {} } = {}) {
	let r = (e, n) => t ? n : e, i = document.createElement("small");
	i.className = "reference-mention-hint", i.textContent = r("Type @ to reference an image.", "输入 @ 选择参考图。");
	let a = document.createElement("div");
	if (a.className = "reference-mention-menu", a.hidden = !0, a.id = `reference-mentions-${Math.random().toString(36).slice(2)}`, a.setAttribute("role", "listbox"), a.setAttribute("aria-label", r("Reference images", "参考图")), e.after(a, i), !document.getElementById("reference-mention-style")) {
		let e = document.createElement("style");
		e.id = "reference-mention-style", e.textContent = ".reference-mention-menu[hidden],.reference-mention-hint[hidden]{display:none!important}.reference-mention-hint{display:block;color:#94aab9;font:12px/1.5 sans-serif;margin:7px 0}.reference-mention-menu{position:relative;z-index:5;max-height:240px;overflow:auto;margin-top:6px;padding:6px;background:#13212c;border:1px solid #375d6c;border-radius:12px;box-shadow:0 12px 28px #0006}.reference-mention-menu button{display:flex;align-items:center;gap:12px;width:100%;padding:8px;border:0;border-radius:7px;background:transparent;color:#f1f6fb;text-align:left;font:500 14px/1.4 sans-serif;cursor:pointer}.reference-mention-menu button[aria-selected=true]{background:#284858}.reference-mention-menu img{width:48px;height:40px;object-fit:contain;border-radius:5px;background:#080d12}", document.head.append(e);
	}
	let o = [], s = !1, c = 0, l = null, u = [], d, f = new Map([
		"role",
		"aria-autocomplete",
		"aria-controls",
		"aria-expanded",
		"aria-activedescendant"
	].map((t) => [t, e.getAttribute(t)]));
	function h() {
		a.hidden = !0, e.setAttribute("aria-expanded", "false"), e.removeAttribute("aria-activedescendant");
	}
	function g(t) {
		if (!l || !u[t]) return;
		let n = u[t].number;
		e.setRangeText(`@Image ${n} `, l.start, e.selectionStart, "end"), h(), e.focus({ preventScroll: !0 }), e.dispatchEvent(new Event("input", { bubbles: !0 }));
	}
	function _() {
		[...a.children].forEach((e, t) => e.setAttribute("aria-selected", String(t === c)));
		let t = a.children[c];
		t && e.setAttribute("aria-activedescendant", t.id);
	}
	function v() {
		if (!s || e.disabled || document.activeElement !== e || e.selectionStart !== e.selectionEnd || (clearTimeout(d), l = m(e.value, e.selectionStart), !l)) return h();
		let t = l.query.match(/\d+/)?.[0];
		if (u = o.map((e, t) => ({
			...e,
			number: t + 1
		})).filter((e) => !t || String(e.number).startsWith(t)), !u.length) return h();
		c = 0, a.replaceChildren(), u.forEach((e, t) => {
			let n = document.createElement("button");
			n.type = "button", n.id = `${a.id}-${t}`, n.setAttribute("role", "option");
			let i = document.createElement("img");
			i.src = e.url, i.alt = "", n.append(i, document.createTextNode(r(`Image ${e.number}`, `参考图 ${e.number}`))), n.onpointerdown = (e) => e.preventDefault(), n.onclick = () => g(t), a.append(n);
		}), a.hidden = !1, e.setAttribute("aria-expanded", "true"), _();
	}
	function y(e) {
		e.isComposing || a.hidden || (["ArrowDown", "ArrowUp"].includes(e.key) ? (e.preventDefault(), c = (c + (e.key === "ArrowDown" ? 1 : u.length - 1)) % u.length, _(), a.children[c]?.scrollIntoView({ block: "nearest" })) : e.key === "Enter" ? (e.preventDefault(), g(c)) : e.key === "Escape" && (e.preventDefault(), h()));
	}
	let b = () => {
		d = setTimeout(h, 120);
	};
	for (let t of [
		"input",
		"click",
		"focus"
	]) e.addEventListener(t, v);
	return e.addEventListener("keydown", y), e.addEventListener("blur", b), {
		update(t) {
			if (o = t.references, s = t.enabled, i.hidden = !s, s) e.setAttribute("role", "combobox"), e.setAttribute("aria-autocomplete", "list"), e.setAttribute("aria-controls", a.id);
			else {
				h();
				for (let [t, n] of f) n === null ? e.removeAttribute(t) : e.setAttribute(t, n);
			}
			v();
		},
		beforeRemove(t) {
			if (!s) return !0;
			let i = p(e.value, t);
			return i === null ? (n(r(`Remove the reference to Image ${t + 1} from your prompt first.`, `请先删除提示词中对参考图 ${t + 1} 的引用，再移除图片。`)), !1) : (e.value = i, e.dispatchEvent(new Event("input", { bubbles: !0 })), !0);
		},
		destroy() {
			clearTimeout(d), a.remove(), i.remove();
			for (let t of [
				"input",
				"click",
				"focus"
			]) e.removeEventListener(t, v);
			e.removeEventListener("keydown", y), e.removeEventListener("blur", b);
			for (let [t, n] of f) n === null ? e.removeAttribute(t) : e.setAttribute(t, n);
		}
	};
}
//#endregion
//#region app/video-reference-frame.mjs
var g = Object.freeze({
	"16:9": {
		width: 1344,
		height: 768
	},
	"9:16": {
		width: 768,
		height: 1344
	},
	"1:1": {
		width: 768,
		height: 768
	}
});
function _(e) {
	if (typeof e != "string" || !Object.hasOwn(g, e)) throw RangeError(o("Choose a supported video aspect ratio."));
	return { ...g[e] };
}
function v(e, t, n) {
	let { width: r, height: i } = _(n);
	if (![e, t].every((e) => Number.isFinite(e) && e > 0)) throw RangeError(o("Could not prepare the reference image. Please choose it again."));
	let a = Math.min(r / e, i / t), s = e * a, c = t * a;
	return {
		width: r,
		height: i,
		drawX: Math.max(0, (r - s) / 2),
		drawY: Math.max(0, (i - c) / 2),
		drawWidth: s,
		drawHeight: c
	};
}
function y(e) {
	if (e?.aborted) throw e.reason instanceof Error ? e.reason : new DOMException(o("Video polling was aborted."), "AbortError");
}
async function b(e) {
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
async function x(e, { aspectRatio: t = "16:9", signal: n, decodeImage: r = b, createCanvas: i = () => document.createElement("canvas") } = {}) {
	y(n), _(t);
	let a, s;
	try {
		a = await r(e), y(n);
		let o = v(a.width, a.height, t);
		s = i(), s.width = o.width, s.height = o.height;
		let c = s.getContext("2d", { alpha: !1 });
		if (!c) throw Error("Canvas unavailable");
		c.fillStyle = "#000000", c.fillRect(0, 0, o.width, o.height), c.imageSmoothingEnabled = !0, c.imageSmoothingQuality = "high", c.drawImage(a.image, o.drawX, o.drawY, o.drawWidth, o.drawHeight);
		let l = await new Promise((e) => s.toBlob(e, "image/png"));
		if (y(n), !l || l.type !== "image/png" || !l.size || l.size > 10485760) throw Error("Image encoding failed");
		return l;
	} catch (e) {
		throw e?.name === "AbortError" ? e : Error(o("Could not prepare the reference image. Please choose it again."));
	} finally {
		try {
			a?.close?.();
		} finally {
			s && (s.width = 0, s.height = 0);
		}
	}
}
//#endregion
//#region assets/guest-device.mjs
var S = "x-seedance-device", C = [
	"Arial",
	"Arial Black",
	"Calibri",
	"Cambria",
	"Candara",
	"Consolas",
	"Courier New",
	"Georgia",
	"Helvetica Neue",
	"Menlo",
	"Microsoft YaHei",
	"Noto Sans CJK SC",
	"Noto Sans",
	"PingFang SC",
	"Segoe UI",
	"SimSun",
	"Tahoma",
	"Times New Roman",
	"Ubuntu",
	"Verdana"
];
function w(e) {
	let t = String(e || "").toLowerCase().trim();
	return /swiftshader|llvmpipe|software|microsoft basic|unknown/.test(t) ? "" : (t.startsWith("angle (") && (t = t.slice(7).split(",")[1]?.trim() || ""), t = t.replace(/^angle metal renderer:\s*/, ""), t = t.replace(/\(0x[0-9a-f]+\)/g, "").replace(/\b(?:direct3d|opengl|metal|vulkan).*$/, "").replace(/\/pcie.*$/, "").replace(/\((?:r|tm)\)/g, "").replace(/[^a-z0-9]+/g, " ").trim(), t.length >= 7 && /\d|radeon|intel.*(?:uhd|iris|hd graphics)/.test(t) ? t : "");
}
function T(e = globalThis) {
	let t;
	try {
		if (!e.document?.createElement || !e.screen || !e.navigator) return null;
		t = e.document.createElement("canvas").getContext("webgl");
		let n = t?.getExtension("WEBGL_debug_renderer_info");
		if (!n) return null;
		let r = t.getParameter(n.UNMASKED_RENDERER_WEBGL), i = e.document.createElement("canvas").getContext("2d");
		if (!i) return null;
		let a = [
			"monospace",
			"sans-serif",
			"serif"
		], o = (e) => (i.font = `72px ${e}`, i.measureText("mmmmmmmmmmlliWW0123456789").width), s = a.map(o), c = C.filter((e) => a.some((t, n) => o(`"${e}",${t}`) !== s[n])), l = e.navigator.userAgent || "";
		return {
			platform: /android/i.test(l) ? "android" : /iphone|ipad|ipod/i.test(l) ? "ios" : /windows/i.test(l) ? "windows" : /mac/i.test(l) ? "mac" : /linux|cros/i.test(l) ? "linux" : "",
			renderer: r,
			fonts: c,
			screen: [
				e.screen.width,
				e.screen.height,
				e.screen.colorDepth
			],
			cores: e.navigator.hardwareConcurrency,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
		};
	} catch {
		return null;
	} finally {
		try {
			t?.getExtension("WEBGL_lose_context")?.loseContext();
		} catch {}
	}
}
async function E(e, t = globalThis.crypto) {
	try {
		if (!e || !t?.subtle) return null;
		let n = w(e.renderer), [r, i, a] = e.screen || [], o = [...new Set(e.fonts || [])].sort();
		if (!n || ![
			"windows",
			"mac",
			"linux",
			"android",
			"ios"
		].includes(e.platform) || ![
			r,
			i,
			a,
			e.cores
		].every((e) => Number.isSafeInteger(e) && e > 0) || o.length < 3 || !e.timezone) return null;
		let s = [
			"v1",
			e.platform,
			n,
			[r, i].sort((e, t) => e - t),
			a,
			e.cores,
			e.timezone,
			o
		], c = await t.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(s)));
		return `v1:${Array.from(new Uint8Array(c), (e) => e.toString(16).padStart(2, "0")).join("")}`;
	} catch {
		return null;
	}
}
var D;
async function ee() {
	if (!globalThis.document) return {};
	D ??= E(T());
	let e = await D;
	return e ? { [S]: e } : {};
}
//#endregion
//#region app/guest-video-verification-ui.mjs
var O = "seedance-verification-styles", te = Object.freeze({
	shield: "<svg viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"m12 3 8 3v5c0 4.5-3.2 8-8 10-4.8-2-8-5.5-8-10V6l8-3Z\"/><path d=\"m8.5 11.5 2.4 2.4 4.6-4.8\"/></svg>",
	check: "<svg viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"m5 12 4.5 4.5L19 7\"/></svg>",
	close: "<svg viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"m7 7 10 10M17 7 7 17\"/></svg>",
	arrow: "<svg viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"M5 12h14m-5-5 5 5-5 5\"/></svg>"
});
function ne() {
	if (document.getElementById(O)) return;
	let e = document.createElement("style");
	e.id = O, e.textContent = "\n    .sv-card,.sv-card *{box-sizing:border-box}\n    .sv-card{position:relative;color:#edf3f4;background:linear-gradient(145deg,#192227,#12191e 68%);border:1px solid #314147;border-radius:24px;padding:28px;font:400 15px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif;box-shadow:0 28px 90px #0005;isolation:isolate}\n    .sv-card::before{content:\"\";position:absolute;top:-1px;left:28px;right:28px;height:1px;background:linear-gradient(90deg,transparent,#78ded477,transparent);pointer-events:none}\n    dialog.sv-card{width:400px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 32px);margin:auto;overflow:auto}\n    dialog.sv-card::backdrop{background:#05090db8;backdrop-filter:blur(8px)}\n    .sv-heading{display:flex;align-items:center;gap:13px;margin:0 30px 20px 0}\n    .sv-mark{display:flex;align-items:center;justify-content:center;flex:none;width:42px;height:46px;color:#81e3d9;background:linear-gradient(150deg,#78ded41e,#78ded405);border-radius:13px}\n    .sv-mark svg{width:27px;height:27px;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}\n    .sv-eyebrow{color:#89a5ac;font-size:10px;line-height:1.4;font-weight:650;letter-spacing:.15em;margin:0 0 3px}\n    .sv-card .sv-title{font:650 22px/1.3 Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif;color:#f1f6f7;letter-spacing:-.02em;margin:0}\n    .sv-card .sv-description{color:#aabcc2;font-size:14px;line-height:1.7;margin:0 0 20px}\n    .sv-close{position:absolute;right:17px;top:17px;display:grid;place-items:center;width:32px;height:32px;padding:6px;background:none;border:0;border-radius:8px;color:#81979f;cursor:pointer}\n    .sv-close:hover{color:#eef6f6;background:#ffffff0a}\n    .sv-close svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}\n    .sv-widget{display:flex;justify-content:center;align-items:center;min-height:68px;max-width:100%;margin:2px 0 18px}\n    .sv-widget-loading{display:flex;align-items:center;gap:9px;color:#91a7ae;font-size:13px}\n    .sv-spinner{width:14px;height:14px;border:1.5px solid #78ded42e;border-top-color:#78ded4;border-radius:50%;animation:sv-spin .8s linear infinite;flex:none}\n    .sv-foot{display:flex;align-items:center;gap:7px;color:#7e969e;font-size:12px;line-height:1.6;margin:0}\n    .sv-foot svg{width:15px;height:15px;flex:none;stroke:#6ca59f;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}\n    .sv-actions{display:flex;justify-content:flex-end;align-items:center;margin:20px 0 -7px;padding-top:14px;border-top:1px solid #ffffff0a}\n    .sv-cancel{padding:7px 0 7px 14px;color:#a1b4ba;background:transparent;border:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;line-height:1.4}\n    .sv-cancel:hover{color:#f2f8f8}\n    .sv-card button:focus-visible,.sv-card a:focus-visible,.sv-page a:focus-visible{outline:2px solid #78ded4;outline-offset:4px}\n    .sv-page{margin:0;min-height:100dvh;background:radial-gradient(ellipse at 50% 36%,#203d4138,transparent 58%),#0c1115;color:#edf3f4;font:400 14px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif;display:grid;grid-template-rows:auto 1fr auto}\n    .sv-page-header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:26px 36px}\n    .sv-brand{display:flex;align-items:center;gap:10px;color:#edf3f4;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:.02em}\n    .sv-brand img{width:27px;height:27px;object-fit:contain}\n    .sv-back{color:#91a7ae;text-decoration:none;font-size:12px;white-space:nowrap}\n    .sv-back:hover{color:#81e3d9}\n    .sv-page-main{display:grid;place-items:center;padding:32px 20px 72px}\n    .sv-page-main>.sv-card{width:100%;max-width:424px;padding:30px}\n    .sv-page-main>.sv-card .sv-heading{margin-bottom:24px}\n    .sv-primary{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;padding:13px 18px;min-height:48px;border:1px solid #ffffff0d;border-radius:12px;background:#315bd4;color:#fff;text-decoration:none;font:600 15px/1.4 Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 18px #244bb325;transition:background .16s,transform .16s}\n    .sv-primary:hover{background:#3d69e8;transform:translateY(-1px)}\n    .sv-primary:disabled{opacity:.65;cursor:wait;transform:none}\n    .sv-primary svg{width:17px;height:17px;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}\n    .sv-note{color:#81989f;font-size:12px;line-height:1.7;margin:17px 0 0;text-align:center}\n    .sv-result{margin:0 0 22px}\n    .sv-result-row{display:flex;align-items:center;gap:9px;color:#c4d8d8;font-size:13px;padding:7px 0}\n    .sv-result-row svg{width:17px;height:17px;flex:none;stroke:#81e3d9;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}\n    .sv-trial-note{font-size:13px;line-height:1.7;color:#d6bf93;margin:0 0 22px;padding-top:14px;border-top:1px solid #ffffff0a}\n    .sv-page-footer{text-align:center;color:#536d76;font-size:11px;padding:0 20px 22px;letter-spacing:.04em}\n    .sv-card [hidden]{display:none!important}\n    @keyframes sv-spin{to{transform:rotate(360deg)}}\n    @media(max-width:480px){.sv-page-header{padding:20px}.sv-page-main{padding:20px 16px 54px}.sv-page-main>.sv-card{padding:25px 22px;border-radius:21px}dialog.sv-card{padding:24px 20px;border-radius:21px}}\n    @media(prefers-reduced-motion:reduce){.sv-spinner{animation:none}.sv-primary{transition:none}}\n  ", document.head.append(e);
}
//#endregion
//#region app/guest-video-verification.mjs
var re, ie = !1;
function ae() {
	return globalThis.turnstile?.render ? Promise.resolve(globalThis.turnstile) : re || (re = new Promise((e, t) => {
		let n = document.createElement("script"), r = setTimeout(() => i(Error(o("Verification could not load. Please try again."))), 15e3);
		function i(i) {
			clearTimeout(r), n.onload = n.onerror = null, i ? (n.remove(), re = void 0, t(i)) : e(globalThis.turnstile);
		}
		n.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", n.async = !0, n.onload = () => globalThis.turnstile?.render ? i() : i(Error(o("Verification could not load. Please try again."))), n.onerror = () => i(Error(o("Verification could not load. Please try again."))), document.head.append(n);
	}), re);
}
async function oe({ siteKey: e, action: t, signal: n }) {
	if (n?.throwIfAborted(), ie) throw Error(o("Please complete the security check to continue."));
	if (!e || ![
		"guest_video_generate",
		"guest_video_reference",
		"guest_image_generate"
	].includes(t)) throw Error(o("Verification failed. Please try again."));
	ie = !0, ne();
	let r = document.activeElement, i = document.createElement("dialog");
	i.className = "sv-card", i.setAttribute("aria-label", o("Security check"));
	let a = document.createElement("div");
	a.className = "sv-heading";
	let s = document.createElement("span");
	s.className = "sv-mark", s.innerHTML = te.shield;
	let c = document.createElement("div"), l = document.createElement("p");
	l.className = "sv-eyebrow", l.textContent = "SEEDANCE";
	let u = document.createElement("h2");
	u.className = "sv-title", u.textContent = o("Security check"), c.append(l, u), a.append(s, c);
	let d = document.createElement("p");
	d.className = "sv-description", d.id = "sv-verification-description", d.textContent = o("Please complete the security check to continue."), i.setAttribute("aria-describedby", d.id);
	let f = document.createElement("button");
	f.type = "button", f.className = "sv-close", f.setAttribute("aria-label", o("Cancel")), f.innerHTML = te.close;
	let p = document.createElement("div");
	p.className = "sv-widget";
	let m = document.createElement("span");
	m.className = "sv-widget-loading", m.setAttribute("role", "status");
	let h = document.createElement("span");
	h.className = "sv-spinner", h.setAttribute("aria-hidden", "true"), m.append(h, o("Loading security check…")), p.append(m);
	let g = document.createElement("p");
	g.className = "sv-foot", g.innerHTML = te.check, g.append(o("You will continue automatically after verification."));
	let _ = document.createElement("div");
	_.className = "sv-actions";
	let v = document.createElement("button");
	v.type = "button", v.className = "sv-cancel", v.textContent = o("Back to creating"), _.append(v), i.append(f, a, d, p, g, _), document.body.append(i), i.showModal();
	let y, b, x, S;
	try {
		return await new Promise((r, a) => {
			let s = !1, c = (e, t) => {
				s || (s = !0, e ? a(e) : r(t));
			}, l = () => c(Object.assign(Error(o("Verification cancelled. Please try again.")), { code: "GUEST_VERIFICATION_CANCELLED" }));
			if (S = () => c(n.reason || new DOMException("Aborted", "AbortError")), n?.addEventListener("abort", S, { once: !0 }), n?.aborted) {
				S();
				return;
			}
			v.onclick = l, f.onclick = l, i.addEventListener("cancel", (e) => {
				e.preventDefault(), l();
			}), x = setTimeout(() => c(Error(o("Verification timed out. Please try again."))), 12e4), ae().then((n) => {
				s || (y = n, m.remove(), b = y.render(p, {
					sitekey: e,
					action: t,
					theme: "dark",
					size: matchMedia("(max-width: 365px)").matches ? "compact" : "flexible",
					callback: (e) => c(null, e),
					"error-callback": () => (c(Error(o("Verification failed. Please try again."))), !0),
					"expired-callback": () => c(Error(o("Verification timed out. Please try again."))),
					"timeout-callback": () => c(Error(o("Verification timed out. Please try again.")))
				}));
			}).catch((e) => c(e));
		});
	} finally {
		if (clearTimeout(x), S && n?.removeEventListener("abort", S), b !== void 0) try {
			y.remove(b);
		} catch {}
		i.close(), i.remove(), ie = !1, r?.isConnected && r.focus();
	}
}
async function se(e, t, n = fetch, r = oe) {
	let i = await n(e, t);
	if (i.status !== 403) return i;
	let a = await i.clone().json().catch(() => null);
	if (a?.code !== "GUEST_VERIFICATION_REQUIRED" || !a.verification?.siteKey) return i;
	let o = await r({
		...a.verification,
		signal: t.signal
	});
	t.signal?.throwIfAborted();
	let s = new Headers(t.headers);
	return s.set("x-seedance-verification", o), n(e, {
		...t,
		headers: s
	});
}
//#endregion
//#region app/video-generation.mjs
var k = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, A = /* @__PURE__ */ new Set([
	"succeeded",
	"failed",
	"expired",
	"submission_unknown"
]), j = /* @__PURE__ */ new Set([
	408,
	425,
	429,
	500,
	502,
	503,
	504
]);
function M(e, t = {}) {
	return Object.assign(Error(o(e)), t);
}
function ce(e, { existingCount: t = 0 } = {}) {
	if (!Array.isArray(e) || e.length + t > 9) throw M(o("Seedance 2.5 supports up to 9 reference images."));
	if (e.some((e) => ![
		"image/png",
		"image/jpeg",
		"image/webp"
	].includes(e?.type) || !e.size || e.size > 10485760)) throw M(o("Choose PNG, JPEG or WebP images, up to 10 MB each."));
}
function N() {
	return new DOMException(o("Video polling was aborted."), "AbortError");
}
function P(e) {
	if (e?.aborted) throw e.reason instanceof Error ? e.reason : N();
}
function F(e) {
	let t = Number(e.headers.get("x-seedance-credit-cost")), n = Number(e.headers.get("x-seedance-credit-remaining")), r = e.headers.get("x-seedance-credit-scope");
	return Number.isSafeInteger(t) && t > 0 && Number.isSafeInteger(n) && n >= 0 ? {
		cost: t,
		remaining: n,
		...r === "guest-video" || r === "account" ? { context: r } : {}
	} : null;
}
async function I(e) {
	try {
		return await e.json();
	} catch {
		throw M(o("Video service returned an invalid response."), {
			status: e.status,
			code: "INVALID_VIDEO_RESPONSE",
			terminal: !1
		});
	}
}
function L(e) {
	let t = String(e || "");
	if (!k.test(t)) throw M(o("Video service returned an invalid task."), {
		code: "INVALID_VIDEO_TASK",
		terminal: !1
	});
	return t;
}
function R(e, t) {
	let n = L(e?.task?.id);
	if (t && n !== t) throw M(o("Video service returned an invalid task."), {
		code: "INVALID_VIDEO_TASK",
		terminal: !1
	});
	return n;
}
function le(e) {
	try {
		let t = new URL(String(e || ""));
		if (t.protocol !== "https:" || t.username || t.password) throw Error("unsafe");
		return t.href;
	} catch {
		throw M(o("Video service returned an invalid video URL."), {
			code: "INVALID_VIDEO_RESULT",
			terminal: !0,
			taskStatus: "succeeded"
		});
	}
}
function z(e, { nowImpl: t, maxRetryAfterMs: n }) {
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
function ue(e, { signal: t } = {}) {
	return P(t), new Promise((n, r) => {
		let i = setTimeout(a, e);
		function a() {
			t?.removeEventListener("abort", o), n();
		}
		function o() {
			clearTimeout(i), t?.removeEventListener("abort", o), r(t.reason instanceof Error ? t.reason : N());
		}
		t?.addEventListener("abort", o, { once: !0 });
	});
}
function de(e, t, n) {
	let r = typeof t?.task?.status == "string" ? t.task.status : void 0;
	return M(l(t?.message, t?.code, "Video generation failed."), {
		status: e.status,
		code: String(t?.code || "VIDEO_GENERATION_FAILED"),
		...n ? { credits: n } : {},
		...r ? { taskStatus: r } : {},
		terminal: A.has(r)
	});
}
async function fe({ taskId: e, fetchImpl: t = globalThis.fetch, waitImpl: n = ue, nowImpl: r = Date.now, maxDurationMs: i = 6e5, initialDelayMs: a = 1e3, maxDelayMs: s = 8e3, maxRetryAfterMs: c = 3e4, signal: l, onStatus: u = () => {}, initialCredits: d = null } = {}) {
	let f = L(e), p = r(), m = Math.max(0, Math.min(Number(a) || 1e3, Number(s) || 8e3)), h = Math.max(m, Number(s) || 8e3), g = Math.max(1, Number(i) || 6e5), _ = d;
	async function v(e, t) {
		let i = r() - p, a = g - i;
		if (a <= 0) throw M(o("Video generation is still running. Return later to resume checking it."), {
			code: "VIDEO_CLIENT_TIMEOUT",
			terminal: !1,
			taskId: f
		});
		let s = t ? z(e, {
			nowImpl: r,
			maxRetryAfterMs: c
		}) ?? m : m;
		await n(Math.min(s, a), { signal: l }), P(l), m = Math.min(h, Math.max(1, m * 2));
	}
	for (;;) {
		if (P(l), r() - p >= g) throw M(o("Video generation is still running. Return later to resume checking it."), {
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
			P(l), u({
				status: "retrying",
				taskId: f,
				credits: _
			}), await v(new Response(null), !1);
			continue;
		}
		let n = F(e);
		n && (_ = n);
		let i = await I(e), a = j.has(e.status);
		if (!e.ok || !i?.success) {
			if (a && !i?.task) {
				u({
					status: "retrying",
					taskId: f,
					credits: _
				}), await v(e, !0);
				continue;
			}
			throw i?.task?.id && R(i, f), de(e, i, n);
		}
		R(i, f);
		let s = String(i.task.status || "");
		if (s === "succeeded") return {
			taskId: f,
			status: s,
			videoUrl: le(i.task.resultUrl),
			..._ ? { credits: _ } : {}
		};
		if (A.has(s)) throw M(o("Video generation failed. Your credits were refunded."), {
			code: s === "expired" ? "VIDEO_TASK_EXPIRED" : "VIDEO_GENERATION_FAILED",
			taskStatus: s,
			terminal: !0,
			..._ ? { credits: _ } : {}
		});
		if (s !== "queued" && s !== "running" && s !== "submitting") throw M(o("Video service returned an invalid task status."), {
			code: "INVALID_VIDEO_RESPONSE",
			terminal: !1
		});
		let c = i.retriable === !0;
		u({
			status: c ? "retrying" : s,
			taskStatus: s,
			taskId: f,
			credits: _
		}), await v(e, c);
	}
}
async function pe({ prompt: e, paidOnly: t = !1, optimizePrompt: n, inputMode: r, onPromptOptimization: i = () => {}, duration: a = 5, aspectRatio: s = "16:9", referenceFiles: c = [], prepareReferenceImpl: l = x, onUpload: d = () => {}, fetchImpl: p = globalThis.fetch, signal: m, onTask: h = () => {}, onStatus: g = () => {}, ..._ } = {}) {
	P(m);
	let v = [], y = [];
	if (ce(c), r !== void 0 && !u(r, c.length)) throw M("Choose up to 5 reference images, or a first frame with an optional last frame.");
	let b = r === "reference" ? f(e, c.length) : e;
	for (let [e, t] of c.entries()) {
		if (![
			"image/png",
			"image/jpeg",
			"image/webp"
		].includes(t.type) || !t.size || t.size > 10485760) throw M(o("Choose PNG, JPEG or WebP images, up to 10 MB each."));
		d({
			index: e + 1,
			total: c.length
		});
		let n = await l(t, {
			aspectRatio: s,
			signal: m
		});
		if (P(m), r !== void 0 || c.length === 1) {
			y.push(n);
			continue;
		}
		let i = await se("/api/videos/references", {
			method: "POST",
			credentials: "same-origin",
			headers: {
				...await ee(),
				"content-type": n.type,
				accept: "application/json"
			},
			body: n,
			signal: m
		}, p), a = await I(i);
		if (!i.ok || !a?.success) throw de(i, a);
		if (!k.test(a.id)) throw M(o("Reference upload returned an invalid response."));
		v.push(a.id);
	}
	let S = JSON.stringify({
		prompt: String(b || "").trim(),
		duration: Number(a),
		resolution: "768p",
		aspectRatio: String(s || "16:9"),
		...typeof n == "boolean" ? { optimizePrompt: n } : {},
		...r === void 0 ? {} : { inputMode: r },
		...v.length ? { referenceImageIds: v } : {}
	}), C = S;
	y.length && (C = new FormData(), C.append("payload", S), y.forEach((e, t) => C.append("reference", e, `reference-${t + 1}`)));
	let w = await se("/api/videos/generate", {
		method: "POST",
		credentials: "same-origin",
		headers: {
			...await ee(),
			accept: "application/json",
			...t === !0 ? { "x-seedance-credit-source": "paid" } : {},
			...y.length ? {} : { "content-type": "application/json" }
		},
		body: C,
		signal: m
	}, p), T = F(w), E = await I(w);
	if (!w.ok || !E?.success) throw de(w, E, T);
	let D = R(E), O = w.headers.get("x-seedance-prompt-optimization");
	return i(O, O === "optimized" && E.promptOptimization?.status === "optimized" && typeof E.promptOptimization.prompt == "string" && E.promptOptimization.prompt.length <= 6e3 ? E.promptOptimization.prompt : void 0), h(D), g({
		status: String(E.task.status || "queued"),
		taskId: D,
		credits: T
	}), fe({
		..._,
		taskId: D,
		fetchImpl: p,
		signal: m,
		onStatus: g,
		initialCredits: T
	});
}
//#endregion
//#region app/video-frame-inputs.mjs
function me({ before: e, zh: t = !1, onChange: n = () => {}, onError: r = () => {} }) {
	let i = (e, n) => t ? n : e;
	if (!document.getElementById("guest-video-frame-style")) {
		let e = document.createElement("style");
		e.id = "guest-video-frame-style", e.textContent = ".guest-video-frames[hidden]{display:none!important}.guest-video-frames{margin:18px 0}.guest-video-frame-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.guest-video-frame-slot{min-width:0;padding:14px;border:1px solid #294452;border-radius:18px;background:#101820}.guest-video-frame-slot strong{display:block;color:#eef6fc;font:600 14px/1.5 sans-serif;margin-bottom:10px}.guest-video-frame-slot button{cursor:pointer;color:#83dfd9;background:transparent;border:1px dashed #315460;border-radius:12px;width:100%;min-height:90px;padding:12px;font:500 14px/1.4 sans-serif}.guest-video-frame-slot button:focus-visible{outline:2px solid #77ded5;outline-offset:3px}.guest-video-frame-slot button:disabled{cursor:default;opacity:.55}.guest-video-frame-slot img{display:block;width:100%;height:125px;object-fit:contain;margin-bottom:8px}.guest-video-frame-slot [data-frame-remove]{min-height:32px;padding:5px;border:0;color:#b5c4ce}.guest-video-frames p{color:#9fb2bf;font:400 13px/1.5 sans-serif;margin:10px 0 0}", document.head.append(e);
	}
	let a = document.createElement("section");
	a.className = "guest-video-frames", a.hidden = !0;
	let o = document.createElement("div");
	o.className = "guest-video-frame-grid", a.append(o);
	let s = document.createElement("p");
	s.textContent = i("First frame required. Last frame optional. PNG, JPEG or WebP · max 10 MB each.", "首帧必选，尾帧可选。PNG、JPEG 或 WebP · 每张最大 10 MB。"), a.append(s), e.before(a);
	let c = !1, l = 0, u = [null, null], d = [null, null], f = [0, 1].map((e) => {
		let t = document.createElement("div");
		t.className = "guest-video-frame-slot";
		let n = document.createElement("strong");
		n.textContent = e ? i("Last frame · Optional", "尾帧 · 可选") : i("First frame · Required", "首帧 · 必选");
		let r = document.createElement("button");
		r.type = "button", r.dataset.frameChoose = e ? "last" : "first";
		let a = document.createElement("input");
		a.type = "file", a.accept = "image/png,image/jpeg,image/webp", a.hidden = !0, a.dataset.frameFile = e ? "last" : "first", a.setAttribute("aria-label", n.textContent);
		let s = document.createElement("button");
		return s.type = "button", s.dataset.frameRemove = e ? "last" : "first", s.textContent = i("Remove", "移除"), s.hidden = !0, r.onclick = () => {
			l = e, a.click();
		}, a.onchange = () => {
			a.files?.[0] && m(e, a.files[0]), a.value = "";
		}, s.onclick = () => m(e, null), r.ondragover = (e) => {
			c || e.preventDefault();
		}, r.ondrop = (t) => {
			t.preventDefault(), !c && t.dataTransfer?.files[0] && m(e, t.dataTransfer.files[0]);
		}, t.append(n, a, r, s), o.append(t), {
			button: r,
			input: a,
			remove: s
		};
	});
	function p() {
		f.forEach(({ button: e, input: t, remove: n }, r) => {
			if (e.replaceChildren(), u[r]) {
				let t = document.createElement("img");
				t.src = d[r], t.alt = r ? i("Last frame preview", "尾帧预览") : i("First frame preview", "首帧预览"), e.append(t);
			}
			e.append(document.createTextNode(u[r] ? i("Change image", "更换图片") : i("＋ Upload image", "＋ 上传图片"))), e.disabled = t.disabled = n.disabled = c, n.hidden = !u[r];
		});
	}
	function m(e, t) {
		if (c) return !1;
		try {
			t && ce([t]);
		} catch (e) {
			return r(e.message), !1;
		}
		return d[e] && URL.revokeObjectURL(d[e]), u[e] = t, d[e] = t ? URL.createObjectURL(t) : null, p(), n(), !0;
	}
	return p(), {
		root: a,
		get valid() {
			return !!u[0];
		},
		get files() {
			return u[0] ? u.filter(Boolean) : [];
		},
		update({ visible: e, disabled: t = !1 }) {
			a.hidden = !e, c = t, f.forEach(({ button: e, input: t, remove: n }) => {
				e.disabled = t.disabled = n.disabled = c;
			});
		},
		setFiles(e) {
			m(0, e[0] || null), m(1, e[1] || null);
		},
		paste(e) {
			return !e.length || c ? !1 : m(u[0] ? u[1] ? l : 1 : 0, e[0]);
		},
		destroy() {
			d.forEach((e) => {
				e && URL.revokeObjectURL(e);
			}), a.remove();
		}
	};
}
//#endregion
//#region app/seedance-video-examples.mjs
var B = [
	{
		id: "front-row-confidence",
		title: ["Front-row confidence", "前排焦点"],
		style: "CINEMATIC",
		prompt: "A 10-second photorealistic fashion-event video, 16:9, one continuous shot in bright natural daylight. An adult woman with long, loose dark hair sits cross-legged in a cream upholstered armchair with polished metal armrests. She wears an elegant black halter-neck, wide-leg jumpsuit and a delicate gold bracelet. Oversized black sunglasses rest on her head. A large, softly defocused crowd behind a dark waist-high barrier applauds, raises phones and cameras, and reacts enthusiastically. A broad concrete grandstand fills the upper background.\n0–1.2s: Eye-level, centered medium shot. She rests both forearms on the chair, looks directly into the lens and makes a subtle, confident head movement. Keep her expression relaxed and self-assured; a light breeze moves a few strands of hair.\n1.2–3.4s: She raises her right hand, grips the upper corner of the sunglasses, and smoothly slides them from the top of her head onto her face. Track the fingers and glasses naturally without changing their shape. Her other arm stays relaxed on the armrest.\n3.4–5.2s: Still holding the frame, she lowers the sunglasses slightly down her nose, tilts her head and looks over the lenses at the camera with a restrained, playful smile. Maintain sharp eyes and natural skin texture while the audience continues moving softly behind her.\n5.2–6.7s: She takes the sunglasses off and leans toward the camera. Her face briefly fills more of the frame; her hair swings forward with the motion. Keep the lens perspective natural, with no sudden cut or facial distortion.\n6.7–10s: She rises smoothly from the chair. The camera rapidly but steadily dollies backward to reveal her full outfit, several matching cream chairs and the cheering audience. She shifts her weight, sways her shoulders and takes a small, poised step, ending in a relaxed standing pose.\nLook: premium live-action fashion footage, warm neutral skin tones, realistic black fabric folds, soft background bokeh and coherent sunlit shadows. Preserve the same face, outfit, chair and crowd throughout. Natural hands, stable sunglasses, continuous movement; no cuts, captions or added graphics.",
		promptZh: "10 秒写实时尚活动视频，16:9 横构图，明亮自然日光，全程一个连续镜头。成年女性留着自然披散的深色长发，身穿黑色挂脖阔腿连体裤，手腕佩戴细金色手链，交叠双腿坐在米白色软包扶手椅中，扶手为抛光金属。宽大的黑色墨镜架在头顶。身后深色半高隔挡外是热情鼓掌、举起手机和相机的观众，上方可见宽阔的混凝土看台；背景适度虚化，人物保持清晰。\n0–1.2 秒：平视、居中的中景。她双臂自然搭在扶手上，直视镜头，轻微转头，表情从容、自信；微风带动几缕头发。\n1.2–3.4 秒：她抬起右手，指尖捏住墨镜上角，将墨镜从头顶顺势滑到眼前戴上。镜框形状保持稳定，手指动作连贯；另一只手仍放松地搭在扶手上。\n3.4–5.2 秒：保持捏着镜框，将墨镜略微下移至鼻梁，轻轻偏头，从镜片上方看向镜头，露出克制、俏皮的微笑。保持眼睛清晰、肤质真实，后排观众持续自然地鼓掌。\n5.2–6.7 秒：取下墨镜并向镜头前倾，脸部逐渐占据更大画幅，长发随动作轻摆。镜头透视自然，不切镜，不拉伸五官。\n6.7–10 秒：她从座椅中流畅起身，摄影机同时快速、平稳地向后移动，由近景拉开至全身，露出黑色阔腿裤、多张同款米白座椅及身后的观众。她轻轻转移重心、摆动肩部、迈出一小步，以自然自信的站姿收尾。\n画面要求：高质感真人时尚短片，暖中性色调，自然皮肤纹理，黑色布料褶皱清晰，日照阴影连贯。全程保持面孔、服装、座椅和观众空间一致；手指与墨镜结构稳定，动作有真实惯性，不加入字幕或额外图形。",
		src: "/assets/seedance25-samples/front-row-confidence.mp4",
		poster: "/assets/seedance25-samples/front-row-confidence.webp",
		durationSeconds: 10,
		sourceType: "user-provided",
		publisher: "User-provided video",
		promptReconstructed: !0,
		sourceUrl: "",
		originalUrl: "",
		trialPrompt: "A 5-second photorealistic fashion-event video, 16:9, one continuous eye-level shot in bright natural daylight. An adult woman with long, loose dark hair sits cross-legged in a cream upholstered armchair with polished metal armrests. She wears an elegant black halter-neck, wide-leg jumpsuit and a delicate gold bracelet. Oversized black sunglasses rest on her head. Behind a dark waist-high barrier, a large crowd applauds and raises phones and cameras. A concrete grandstand fills the upper background. Keep the woman sharp and the audience softly defocused.\n0–1.2s: Centered medium shot. Her forearms rest naturally on the chair. She looks directly into the lens with a calm, confident expression, making a small head movement as a light breeze stirs her hair.\n1.2–3.3s: She raises her right hand, grips the upper corner of the sunglasses and smoothly slides them from the top of her head onto her face. Her other arm stays relaxed on the armrest. Keep her fingers and the glasses structurally stable.\n3.3–5s: Still holding the frame, she lowers the glasses slightly down her nose, tilts her head and looks over the lenses toward the camera with a restrained, playful smile. Finish on this seated look, with subtle natural breathing and background applause gestures.\nUse a steady camera with only a subtle forward drift, warm neutral skin tones, natural skin texture, realistic black fabric folds and coherent daylight shadows. Maintain the same face, outfit, chair and crowd. The whole clip stays seated: no removing the glasses, standing up, walking, dancing or pullback to a full-body view. No cuts, captions or added graphics.",
		trialPromptZh: "5 秒写实时尚活动视频，16:9 横构图，明亮自然日光，全程平视中景、一镜到底。成年女性留着自然披散的深色长发，身穿黑色挂脖阔腿连体裤，佩戴细金色手链，交叠双腿坐在米白色软包扶手椅中，扶手为抛光金属，宽大黑色墨镜架在头顶。身后深色半高隔挡外是鼓掌、举起手机和相机的观众，上方可见混凝土看台；人物清晰，背景适度虚化。\n0–1.2 秒：居中的中景，她双臂自然搭在扶手上，直视镜头，轻微转头，表情平静、自信，微风带动几缕头发。\n1.2–3.3 秒：抬起右手，指尖捏住墨镜上角，将墨镜从头顶顺势滑到眼前戴上。另一只手放松地留在扶手上，手指与镜框形状保持稳定，动作连贯。\n3.3–5 秒：保持捏着镜框，将墨镜略微下移至鼻梁，轻轻偏头，从镜片上方看向镜头，露出克制、俏皮的微笑。以这个坐姿眼神收尾，保留自然呼吸和背景观众的鼓掌动作。\n镜头稳定，仅有轻微向前移动；暖中性色调，自然肤质、真实布料褶皱、连贯日照阴影。人物、服装、座椅和空间保持一致。整个片段保持坐姿，不取下墨镜、不起身、不走动、不跳舞、不拉远到全身。不切镜，不加字幕或额外图形。"
	},
	{
		id: "fire-and-shadow-duel",
		title: ["Fire and shadow", "烈焰与暗影"],
		style: "ANIMATION",
		prompt: "A 10-second high-energy 2D anime fight, 16:9 widescreen, with crisp hand-drawn linework, detailed cel shading and fluid action animation. Two young adult male fighters battle on a vast, dark, cracked stone platform beneath a smoky gray sky with a muted pink horizon. Fighter A has spiky orange hair, a loose ivory hooded jacket over black clothing, dark trousers and boots; bright orange-gold fire wraps around his fist. Fighter B has spiky dark hair with burgundy highlights, a torn black outer layer over a pale shirt and dark trousers; black ink-like energy ribbons with vivid violet cores stream from his body. Keep both designs consistent.\n0–1.2s: Low, wide side view as both fighters sprint toward each other and trade a close-range strike. Their feet kick up pale dust across the tiles. Orange flame arcs sweep from the left, meeting black-and-purple energy from the right; sparks burst between them. Use strong directional motion and readable silhouettes.\n1.2–2.6s: Rapid close-up cuts: orange-haired fighter leaning forward with a determined grin and fire illuminating his sleeve; then an oblique close-up of the dark-haired fighter, jaw clenched and eyes focused, with his opponent and burning fist still readable behind him. Track alongside their motion.\n2.6–4.3s: Return to a dynamic side view. The orange-haired fighter swings a broad, blazing punch; his opponent ducks low and rushes past, one hand skimming near the stone floor. Long orange fire trails and jagged black-violet ribbons describe their opposing paths. Cloth, hair, dust and fragments follow the momentum.\n4.3–6.7s: A fast rising, rotating camera follows their clash upward. Briefly look down over sweeping energy arcs, then track the two fighters crossing in midair. Use foreshortening, speed streaks, sharp silhouette changes and a few deliberate motion-smear frames; keep their positions intelligible.\n6.7–8.8s: The orange-haired fighter launches toward the lens, blazing fist leading. Pull backward rapidly with radial speed lines, then reveal his low dash over the stone platform and a thin dust wake.\n8.8–10s: Build into a final collision: a short high-contrast black-and-white impact flash and explosive radial strokes, followed by the fighters converging amid orange sparks and violet-black energy.\nUse punchy cuts and forceful camera moves, not a continuous take. Keep impacts non-graphic. No subtitles or added graphic overlays.",
		promptZh: "10 秒高强度二维动漫战斗短片，16:9 横构图，清晰手绘线稿、细致赛璐珞阴影、流畅且富有力量感的动作。场景为广阔、暗色、带裂缝的石砖平台，上方是灰暗烟云，地平线泛着低饱和粉灰色。两名成年男性角色对战：角色 A 为橙色刺猬短发，穿宽松米白色连帽外套、黑色内搭、深色长裤与靴子，拳头包裹明亮的橙金火焰；角色 B 为带酒红高光的深色刺猬短发，穿破损黑色外套、浅色内搭与深色长裤，周身拖曳墨迹般的黑色能量带，内部闪着鲜明紫光。角色外形全程一致。\n0–1.2 秒：低机位侧面广角，两人疾冲接近并近身交锋，踏地掀起浅色尘雾。左侧橙色火焰弧与右侧黑紫能量相撞，中央迸出火花，运动方向明确，人物剪影清楚。\n1.2–2.6 秒：快速切入角色特写。先拍橙发角色前倾、目光坚定、略带笑意，火光照亮拳头与衣袖；再切深发角色侧前方特写，他咬紧牙关，目光锁定对手，后方仍能看到橙发角色及燃烧的拳头。摄影机贴着人物横向运动。\n2.6–4.3 秒：切回动态侧面镜头。橙发角色挥出大幅度火焰拳，另一人压低重心闪避并掠过，手掌贴近石面，身后拖出锯齿状黑紫能量。火焰、衣摆、头发、尘埃与细碎石屑均沿真实运动方向延展。\n4.3–6.7 秒：摄影机快速上升并旋转，短暂俯视两股能量形成的弧线，再跟随两人在空中交错。运用强透视、速度线、少量有意设计的动作拖影帧，保持双方空间关系可读，不让角色凭空变形。\n6.7–8.8 秒：橙发角色举着燃烧的拳头朝镜头突进，镜头高速后退，周边出现放射状速度线，随后展示其贴近石砖平台的低姿态冲刺，脚后拖出细长尘尾。\n8.8–10 秒：动作推向碰撞高潮，以短促黑白高反差冲击帧、向外放射的笔触强调撞击，再回到橙色火花与黑紫能量交汇的双方身影。\n整体强调紧凑剪辑、有力度的镜头运动、清楚的动作衔接与一致的角色设计；使用多镜头，不做一镜到底。不表现血腥细节，不加入字幕或额外界面图形。",
		src: "/assets/seedance25-samples/fire-and-shadow-duel.mp4",
		poster: "/assets/seedance25-samples/fire-and-shadow-duel.webp",
		durationSeconds: 10,
		sourceType: "user-provided",
		publisher: "User-provided video",
		promptReconstructed: !0,
		sourceUrl: "",
		originalUrl: "",
		trialPrompt: "A 5-second high-energy 2D anime fight, 16:9, crisp hand-drawn linework, detailed cel shading and fluid close-range combat. Two young adult male fighters face off on a vast, dark, cracked stone platform under smoky gray clouds and a muted pink horizon. Fighter A has spiky orange hair, a loose ivory hooded jacket over black clothing, dark trousers and boots; orange-gold flames wrap around his fist. Fighter B has spiky dark hair with burgundy highlights, a torn black outer layer over a pale shirt and dark trousers; black ink-like energy ribbons with vivid violet cores trail from him. Preserve both character designs.\n0–1.2s: Low, wide side view. Both sprint toward each other and exchange a close-range strike. Their feet kick up pale dust. An orange flame arc meets black-purple energy, scattering sparks between clearly readable silhouettes.\n1.2–2.5s: Two quick tracking close-ups: the orange-haired fighter leans forward with a determined grin, fire lighting his sleeve; then the dark-haired fighter clenches his jaw and focuses on his opponent, whose burning fist remains visible behind him. Preserve the established action direction.\n2.5–4.3s: Return to a dynamic side view. The orange-haired fighter swings a broad blazing punch. His opponent ducks low and darts past, one hand close to the tiles. Orange fire trails and jagged black-violet ribbons show the opposing trajectories; hair, clothing and dust follow their momentum.\n4.3–5s: Follow through on that same exchange with a short rising camera move. Let the fire and shadow trails sweep across the frame as the fighters pass one another; end before another attack begins.\nUse forceful but readable cuts, sharp silhouettes, restrained motion-smear frames and consistent anatomy. Keep this to the opening exchange: no extended aerial fight, charge toward the lens, finishing collision or black-and-white impact finale. Non-graphic action; no subtitles or added graphic overlays.",
		trialPromptZh: "5 秒高强度二维动漫近身战斗，16:9 横构图，清晰手绘线稿、细致赛璐珞阴影、流畅有力的动作。场景为广阔、暗色、带裂缝的石砖平台，天空是灰暗烟云，地平线为低饱和粉灰色。两名成年男性对战：角色 A 为橙色刺猬短发，穿宽松米白色连帽外套、黑色内搭、深色长裤与靴子，拳头包裹橙金火焰；角色 B 为带酒红高光的深色刺猬短发，穿破损黑色外套、浅色内搭与深色长裤，周身拖曳内部闪着紫光的墨迹状黑色能量带。角色造型保持一致。\n0–1.2 秒：低机位侧面广角，两人疾冲接近并近身交锋，脚步扬起浅色尘雾。橙色火焰弧与黑紫能量相撞，中央迸出火花，运动方向和人物剪影清楚。\n1.2–2.5 秒：快速切入两个跟拍特写。先拍橙发角色前倾、目光坚定、略带笑意，火光照亮衣袖；再拍深发角色咬紧牙关、锁定对手，背景仍可辨认燃烧的拳头。延续前一镜头的交锋方向。\n2.5–4.3 秒：切回动态侧面。橙发角色挥出大幅火焰拳，对手压低重心闪避、贴近石面掠过。橙色火焰与锯齿状黑紫能量清楚勾勒相反轨迹，衣摆、头发和尘埃跟随动作惯性。\n4.3–5 秒：镜头短暂上升，跟完这一次交错动作，让火焰与暗影尾迹扫过画面；在下一轮攻击开始前结束。\n保持剪辑有力、动作可读、人物结构和空间关系稳定，可使用少量有意设计的动作拖影帧。只表现开场交锋，不加入持续空中缠斗、朝镜头突进、最终碰撞或黑白爆发收尾。不表现血腥细节，不加字幕或额外界面图形。"
	},
	{
		id: "backstage",
		title: ["Behind the curtain", "幕后光影"],
		style: "CINEMATIC",
		prompt: "A singer turns from her dressing-room mirror toward the stage. Follow her in one smooth camera move through warm theatrical light, with realistic fabric and natural expressions.",
		src: "/assets/seedance25-samples/backstage.mp4",
		poster: "/assets/seedance25-samples/backstage.webp",
		sourceUrl: "https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5",
		originalUrl: "https://lf3-static.bytednsdoc.com/obj/eden-cn/lapzild-tss/ljhwZthlaukjlkulzlp/user-upload/4xfa4ms8egv8p.mp4"
	},
	{
		id: "clockwork",
		title: ["Clockwork worlds", "机械幻想之旅"],
		style: "CINEMATIC",
		prompt: "Follow a tiny brass flying machine through interlocking clockwork gears and a canyon of antique books. Smooth forward camera movement, warm golden light, intricate miniature details and cinematic depth of field.",
		src: "/assets/seedance25-samples/clockwork.mp4",
		poster: "/assets/seedance25-samples/clockwork.webp",
		sourceUrl: "https://github.com/Evolink-AI/awesome-seedance-2.5-guides",
		originalUrl: "https://ark-common-storage-prod-cn-beijing.tos-cn-beijing.volces.com/presets/experience/gen_video/model-promotion/seedance-2-5/firstScreen/group2/2.mp4"
	},
	{
		id: "desert-museum",
		title: ["Museum above the dunes", "沙丘上的艺术馆"],
		style: "STORYTELLING",
		prompt: "A lone visitor walks through a sunlit desert art museum. Translucent silk drifts beside a floating sculpture as the camera slowly reveals golden dunes beyond the open gallery. Soft architectural light and calm, natural movement.",
		src: "/assets/seedance25-samples/desert-museum.mp4",
		poster: "/assets/seedance25-samples/desert-museum.webp",
		previewRatio: "1 / 1",
		sourceUrl: "https://github.com/Evolink-AI/awesome-seedance-2.5-guides",
		originalUrl: "https://ark-common-storage-prod-cn-beijing.tos-cn-beijing.volces.com/presets/experience/gen_video/model-promotion/seedance-2-5/ugc/1-1/11-2.mp4"
	},
	{
		id: "orchestra",
		title: ["A night at the concert hall", "金色音乐厅"],
		style: "MUSIC",
		prompt: "A sweeping camera move reveals a grand concert hall and orchestra under warm golden lighting. Musicians move naturally while the camera settles into an intimate stage view.",
		src: "/assets/seedance25-samples/orchestra.mp4",
		poster: "/assets/seedance25-samples/orchestra.webp",
		sourceUrl: "https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5",
		originalUrl: "https://lf3-static.bytednsdoc.com/obj/eden-cn/lapzild-tss/ljhwZthlaukjlkulzlp/user-upload/4xfa4ms8au6q0.mp4"
	},
	{
		id: "chase",
		title: ["A story in motion", "流动的叙事"],
		style: "CINEMATIC",
		prompt: "Inside a moving subway carriage, a passenger notices a football rolling past. Track the ball with a low camera, then reveal a curious reaction in soft natural light.",
		src: "/assets/seedance25-samples/chase.mp4",
		poster: "/assets/seedance25-samples/chase.webp",
		sourceUrl: "https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5",
		originalUrl: "https://lf3-static.bytednsdoc.com/obj/eden-cn/lapzild-tss/ljhwZthlaukjlkulzlp/user-upload/4xfa4ms8athfv.mp4"
	},
	{
		id: "stage",
		title: ["Into the spotlight", "走进聚光灯"],
		style: "PERFORMANCE",
		prompt: "A singer steps from backstage into colorful spotlights. A steady tracking shot follows her confident movement as the stage opens up, with realistic lighting and expressive performance.",
		src: "/assets/seedance25-samples/stage.mp4",
		poster: "/assets/seedance25-samples/stage.webp",
		sourceUrl: "https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5",
		originalUrl: "https://lf3-static.bytednsdoc.com/obj/eden-cn/lapzild-tss/ljhwZthlaukjlkulzlp/user-upload/4xfa4ms8egv8p.mp4"
	}
], he = Object.freeze([
	Object.freeze({
		id: "starter",
		name: "Starter",
		amount: 999,
		originalAmount: 1998,
		credits: 700,
		bonusCredits: 0,
		videoCount: 140,
		popular: !1,
		bestValue: !1
	}),
	Object.freeze({
		id: "creator",
		name: "Creator",
		amount: 1999,
		originalAmount: 3998,
		credits: 1600,
		bonusCredits: 150,
		videoCount: 320,
		popular: !0,
		bestValue: !1
	}),
	Object.freeze({
		id: "studio",
		name: "Studio",
		amount: 4999,
		originalAmount: 9998,
		credits: 4500,
		bonusCredits: 850,
		videoCount: 900,
		popular: !1,
		bestValue: !0
	})
]), ge = "creator";
Object.freeze([
	{
		amount: 499,
		credits: 500
	},
	{
		amount: 999,
		credits: 1100
	},
	{
		amount: 1190,
		credits: 1100
	},
	{
		amount: 2490,
		credits: 3e3
	},
	{
		amount: 4990,
		credits: 6500
	},
	{
		amount: 1999,
		credits: 1450
	},
	{
		amount: 4999,
		credits: 3650
	}
].map((e) => Object.freeze(e)));
function _e(e) {
	return {
		price: (e.amount / 100).toFixed(2),
		originalPrice: (e.originalAmount / 100).toFixed(2),
		unitPrice: (e.amount / 100 / e.credits).toFixed(3),
		videoPrice: (e.amount / 100 / e.videoCount).toFixed(4),
		videoSeconds: e.credits,
		minutes: (e.credits / 60).toFixed(1),
		clips: e.videoCount,
		tenSecondClips: e.credits / 10
	};
}
//#endregion
//#region app/studio-handoff.mjs
var V = "seedance:h3:handoff", ve = "seedance:minimax-h3:active-task", ye = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function be(e, t, n) {
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
async function xe(e, { storage: t = sessionStorage, putFile: n = (e, t) => be("put", e, t), deleteFile: r = (e) => be("delete", e) } = {}) {
	let i;
	try {
		i = JSON.parse(t.getItem(V) || "null");
	} catch {}
	let a = e.files === void 0 ? e.file ? [e.file] : [] : e.files;
	ce(a);
	let o = a.map(() => crypto.randomUUID()), s = [];
	try {
		for (let [e, t] of a.entries()) s.push(o[e]), await n(o[e], t);
	} catch (e) {
		throw await Promise.allSettled(s.map((e) => r(e))), e;
	}
	let c = o[0] ?? null, l = {
		...typeof e.optimizePrompt == "boolean" ? { optimizePrompt: e.optimizePrompt } : {},
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
		mode: ["reference", "frames"].includes(e.mode) ? e.mode : "text",
		referenceKey: c,
		referenceKeys: o,
		taskId: ye.test(e.taskId || "") ? e.taskId : ""
	};
	try {
		t.setItem(V, JSON.stringify(l));
	} catch (e) {
		throw await Promise.allSettled(o.map((e) => r(e))), e;
	}
	let u = new Set([...Array.isArray(i?.referenceKeys) ? i.referenceKeys : [], i?.referenceKey].filter((e) => ye.test(e || "")));
	return await Promise.allSettled([...u].map((e) => r(e))), l;
}
async function Se({ storage: e = sessionStorage, consume: t = !0, maxAgeMs: n = 36e5, getFile: r = (e) => be("get", e), deleteFile: i = (e) => be("delete", e) } = {}) {
	let a;
	try {
		a = JSON.parse(e.getItem(V) || "null");
	} catch {
		return e.removeItem(V), null;
	}
	let o = Array.isArray(a?.referenceKeys) ? a.referenceKeys : a?.referenceKey ? [a.referenceKey] : [];
	if (!a || !Number.isFinite(a.createdAt) || Date.now() - a.createdAt > Math.min(864e5, Math.max(0, n)) || ![
		"16:9",
		"9:16",
		"1:1"
	].includes(a.aspectRatio) || ![
		5,
		10,
		15
	].includes(a.duration) || typeof a.prompt != "string" || a.prompt.length > 2500 || a.taskId && !ye.test(a.taskId) || a.referenceKeys !== void 0 && !Array.isArray(a.referenceKeys) || o.length > 9 || new Set(o).size !== o.length || o.some((e) => !ye.test(e))) return e.removeItem(V), null;
	let s = [];
	for (let [e, t] of o.entries()) {
		let n = await r(t);
		if (!(n instanceof Blob) || ![
			"image/png",
			"image/jpeg",
			"image/webp"
		].includes(n.type) || !n.size || n.size > 10485760) throw Error("The reference image could not be restored. Please choose it again.");
		n instanceof File || (n = new File([n], `reference-image-${e + 1}`, { type: n.type })), s.push(n);
	}
	return t && (e.removeItem(V), await Promise.allSettled(o.map((e) => i(e)))), {
		...a,
		files: s,
		file: s[0] ?? null
	};
}
//#endregion
//#region assets/credit-pack-offer.mjs
var H = Date.UTC(2026, 10, 20, 23, 59, 0);
function Ce(e, t) {
	let n = Math.max(0, Math.ceil((t - e) / 1e3)), r = (e) => String(e).padStart(2, "0");
	return {
		active: e < t,
		days: r(Math.floor(n / 86400)),
		hours: r(Math.floor(n % 86400 / 3600)),
		minutes: r(Math.floor(n % 3600 / 60)),
		seconds: r(n % 60)
	};
}
function we(e, t, n) {
	let r = () => {
		let r = n(Date.now(), t);
		e.querySelectorAll("[data-promo-only]").forEach((e) => {
			e.hidden = !r.active;
		}), e.querySelectorAll("[data-promo-countdown]").forEach((e) => {
			e.textContent = `${r.days} days ${r.hours}:${r.minutes}:${r.seconds}`;
		});
	};
	r();
	let i = setInterval(r, 1e3);
	return () => clearInterval(i);
}
function Te(e = Date.now()) {
	let t = Ce(e, H);
	return `<div class="credit-tier-promo" data-promo-only${t.active ? "" : " hidden"}><b>50% OFF</b><span role="timer" data-promo-countdown>${t.days} days ${t.hours}:${t.minutes}:${t.seconds}</span></div>`;
}
//#endregion
//#region assets/credit-pack-cards.mjs
function Ee(e, t = "en", { purchaseButton: n = !1, detailsOnly: r = !1, now: i = Date.now() } = {}) {
	let a = (e, n) => t === "zh" ? n : e, o = _e(e), s = he.indexOf(e), c = Ce(i, H).active, l = e.popular ? a("Most popular", "最受欢迎") : e.bestValue ? a("Best value", "最划算") : "", u = he[0], d = Math.max(0, Math.ceil(100 * (1 - e.amount * u.credits / (e.credits * u.amount)))), f = `${Te(i)}<div class="credit-tier-heading"><h2>${e.name}</h2>${l ? `<span class="credit-tier-tag">${l}</span>` : ""}</div>
 <div class="credit-tier-pricing"><del data-promo-only${c ? "" : " hidden"}>US$${o.originalPrice}</del><strong>US$${o.price}</strong></div>
 <div class="credit-tier-output"><strong>${a(`${e.videoCount} × 5s videos`, `${e.videoCount} × 5 秒视频`)}</strong><span class="credit-tier-alternative">5s · 10s · 15s</span></div>
 <p class="credit-tier-credits"><span class="credit-tier-credit-total">${e.credits} ${a("credits", "积分")}${d ? `<span class="credit-tier-savings">${a(`Save ≈${d}% per credit vs. Starter`, `每积分比 Starter 约省 ${d}%`)}</span>` : ""}</span><span class="credit-tier-unit-price"><strong>US$${o.unitPrice}</strong><span>${a("per second", "/ 秒")}</span></span></p>`;
	if (r) return f;
	let p = `${a("Buy", "购买")} ${e.credits} ${a("credits", "积分")} · US$${o.price}`, m = n ? `<button type="button" class="credit-tier-buy" data-credit-pack-buy data-pack-id="${e.id}">${p}</button>` : `<a class="credit-tier-buy" href="${t === "zh" ? "/zh" : ""}/checkout?pack=${e.id}&amp;purchase=1" data-credit-pack-buy data-pack-id="${e.id}" target="_blank" rel="noopener noreferrer">${p}</a>`;
	return `<article class="credit-tier credit-tier-${s}" data-credit-pack-card data-pack-id="${e.id}">${f}${m}</article>`;
}
function U(e, t = "en", n = {}) {
	return Ee(e, t, n).replace(/(<strong>)US\$(\d+\.\d{2})(<\/strong>)/, "$1<span class=\"credit-tier-currency\">US$</span>$2$3");
}
function De(e = "en") {
	return e === "zh" ? "1 积分 = 1 秒 1080p 视频。" : "1 credit = 1 second of 1080p video.";
}
function W(e = "en") {
	return e === "zh" ? "永久有效。无需订阅。一次性购买。" : "Never expires. No subscription. One-time purchase.";
}
//#endregion
//#region assets/credit-pack-picker.mjs
var G = /* @__PURE__ */ new WeakMap(), Oe = /* @__PURE__ */ new WeakMap();
function ke(e) {
	if (Oe.has(e)) return Oe.get(e);
	let t = Promise.all([
		"credit-pack-cards",
		"credit-pack-picker",
		"credit-pricing"
	].map((t) => {
		let n = e.querySelector(`link[data-credit-style="${t}"]`);
		if (n?.sheet) return Promise.resolve();
		let r = n || e.createElement("link");
		return new Promise((i, a) => {
			let o = () => {
				clearTimeout(l), r.removeEventListener("load", s), r.removeEventListener("error", c);
			}, s = () => {
				o(), i();
			}, c = () => {
				o(), r.remove(), a(Object.assign(/* @__PURE__ */ Error("Credit pack styles did not load."), { code: "PACKS_UNAVAILABLE" }));
			}, l = setTimeout(c, 15e3);
			r.addEventListener("load", s), r.addEventListener("error", c), n || (r.rel = "stylesheet", r.href = `/assets/${t}.css?v=20261107-unified-purchase`, r.dataset.creditStyle = t, e.head.append(r));
		});
	}));
	return Oe.set(e, t), t.catch(() => {
		Oe.get(e) === t && Oe.delete(e);
	}), t;
}
typeof document < "u" && ke(document).catch(() => {});
function K({ locale: e = "en", eventTarget: t = window, onPurchase: n, errorMessage: r }) {
	let i = t.document;
	if (G.has(i)) return G.get(i);
	let a = (t, n) => e === "zh" ? n : t, o = ke(i), s = i.activeElement, c = i.createElement("dialog");
	c.className = "credit-picker", c.setAttribute("aria-labelledby", "credit-picker-title"), c.innerHTML = `<button type="button" class="credit-picker-close" aria-label="${a("Close", "关闭")}">×</button>
    <header><h2 id="credit-picker-title">${a("Credit packs", "积分包")}</h2>
      <p class="credit-pack-terms-summary">${W(e)}</p></header>
    <div class="credit-picker-options" role="group" aria-label="${a("Credit packs", "积分包")}">
      ${he.map((t) => U(t, e, { purchaseButton: !0 })).join("")}</div>
    <p class="credit-picker-note">${De(e)}</p>
    <p class="credit-picker-error" role="alert" hidden></p>`, i.body.append(c);
	let l = we(c, H, Ce), u = [...c.querySelectorAll("button[data-credit-pack-buy]")], d = c.querySelector(".credit-picker-error"), f = !1, p = !1, m, h, g, _ = new Promise((e, t) => {
		m = e, h = t;
	});
	G.set(i, _);
	let v = (e, t = null) => {
		p || (p = !0, l(), c.open && c.close(), c.remove(), G.delete(i), g !== void 0 && (i.documentElement.style.overflow = g), s?.focus?.(), t ? h(t) : m(e));
	};
	return c.querySelector(".credit-picker-close").addEventListener("click", () => v(!1)), c.addEventListener("cancel", (e) => {
		e.preventDefault(), v(!1);
	}), c.addEventListener("click", (e) => {
		if (e.target === c) {
			let t = c.getBoundingClientRect();
			(e.clientX < t.left || e.clientX > t.right || e.clientY < t.top || e.clientY > t.bottom) && v(!1);
		}
	}), u.forEach((t) => t.addEventListener("click", async () => {
		if (f) return;
		f = !0, d.hidden = !0;
		let i = t.textContent;
		u.forEach((e) => {
			e.disabled = !0;
		}), t.textContent = a("Opening checkout…", "正在打开付款…");
		try {
			await n(t.dataset.packId), v(!0);
		} catch (n) {
			if (p) return;
			d.textContent = r(n, e), d.hidden = !1, f = !1, u.forEach((e) => {
				e.disabled = !1;
			}), t.textContent = i;
		}
	})), o.then(() => {
		p || (g = i.documentElement.style.overflow, i.documentElement.style.overflow = "hidden", c.showModal(), u[0]?.focus());
	}).catch((e) => v(!1, e)), _;
}
//#endregion
//#region assets/credit-return.mjs
var Ae = "https://checkout-return.invalid", je = /* @__PURE__ */ new Set([
	"checkout",
	"session_id",
	"return_to",
	"returnto",
	"auth",
	"auth_return",
	"auth_nonce",
	"auth_cancelled",
	"code",
	"state",
	"error",
	"error_description",
	"access_token",
	"id_token",
	"refresh_token",
	"token",
	"token_type",
	"next",
	"redirect",
	"redirect_uri",
	"redirectto",
	"callbackurl"
]);
function q(e) {
	if (typeof e != "string" || e.length > 2048 || !e.startsWith("/") || e.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(e)) return null;
	let t = e.split(/[?#]/, 1)[0];
	if (/%(?:2f|5c|2e|25|0[0-9a-f]|1[0-9a-f]|7f)/i.test(t)) return null;
	try {
		let n = decodeURIComponent(t), r = new URL(e, Ae);
		if (r.origin !== Ae || r.pathname !== t || /^\/(?:zh\/)?(?:api|admin|assets|app-assets|_serverFn|_build|\.well-known)(?:\/|$)/i.test(n) || /\.(?:m?js|css|json|xml|txt|png|jpe?g|webp|svg|ico|mp4|webm|woff2?)$/i.test(n)) return null;
		for (let e of [...r.searchParams.keys()]) je.has(e.toLowerCase()) && r.searchParams.delete(e);
		return [...new URLSearchParams(r.hash.slice(1)).keys()].some((e) => je.has(e.toLowerCase())) && (r.hash = ""), r.pathname + r.search + r.hash;
	} catch {
		return null;
	}
}
function J(e = globalThis.location) {
	return !e || typeof e.pathname != "string" ? null : q(e.pathname + (e.search || "") + (e.hash || ""));
}
//#endregion
//#region assets/credit-checkout.mjs
var Y = "seedance_credit_checkout_v1", X = 6e5;
function Me(e, t = "en") {
	let n = t === "zh";
	return e?.code === "PACKS_UNAVAILABLE" ? n ? "套餐暂时无法加载，请重试。" : "Could not load credit packs. Please try again." : e?.code === "BILLING_HOLD" ? n ? "此账户的购买权限暂时受限，请联系支持。" : "This account is temporarily restricted from purchasing. Please contact support." : e?.code === "BILLING_UNAVAILABLE" ? n ? "付款服务暂时不可用，请稍后重试。" : "The payment service is temporarily unavailable. Please try again later." : e?.code === "POPUP_BLOCKED" ? n ? "浏览器拦截了付款窗口，请允许本站打开新窗口后重试。" : "Your browser blocked the checkout window. Allow pop-ups for this site and try again." : n ? "无法打开付款页面，请重试。" : "Could not open checkout. Please try again.";
}
function Ne(e = "en", t = J(), n = null, r = !1) {
	let i = q(t), a = new URLSearchParams();
	return i && a.set("return_to", i), n && a.set("pack", n), r && a.set("purchase", "1"), `${e === "zh" ? "/zh" : ""}/checkout${a.size ? "?" + a : ""}`;
}
function Pe({ locale: e = "en", eventTarget: t = window, requestCheckout: n = Z, returnTo: r = J(t.location) } = {}) {
	return K({
		locale: e,
		eventTarget: t,
		errorMessage: Me,
		onPurchase: (i) => Fe({
			locale: e,
			eventTarget: t,
			requestCheckout: n,
			returnTo: r,
			packId: i
		})
	});
}
async function Fe({ locale: e = "en", eventTarget: t = window, requestCheckout: n = Z, returnTo: r = J(t.location), packId: i = ge } = {}) {
	let a = t.open(`/assets/checkout-loading?lang=${e === "zh" ? "zh" : "en"}`, "_blank");
	if (!a) throw new Ie("POPUP_BLOCKED");
	a.opener = null;
	try {
		let t = q(r), o = await n({
			locale: e,
			packId: i,
			...t ? { returnTo: t } : {}
		});
		a.closed || a.location.replace(o);
	} catch (t) {
		if (a.closed) return;
		if (t?.code === "AUTH_REQUIRED") {
			a.location.replace(Ne(e, r, i, !0));
			return;
		}
		throw a.close(), t;
	}
}
var Ie = class extends Error {
	constructor(e = "CHECKOUT_FAILED") {
		super("Could not open checkout."), this.code = e;
	}
};
async function Z({ locale: e = "en", returnTo: t = J(), fetchImpl: n = fetch, packId: r = ge } = {}) {
	let i = q(t), a = await n(`/api/billing/checkout?${new URLSearchParams({
		locale: e === "zh" ? "zh" : "en",
		...i ? { returnTo: i } : {}
	})}`, {
		method: "POST",
		credentials: "same-origin",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ packId: r }),
		signal: AbortSignal.timeout(35e3)
	}), o = await a.json().catch(() => ({}));
	if (!a.ok) throw new Ie([
		"AUTH_REQUIRED",
		"BILLING_HOLD",
		"BILLING_UNAVAILABLE"
	].includes(o.code) ? o.code : "CHECKOUT_FAILED");
	let s;
	try {
		s = new URL(o.url);
	} catch {
		throw new Ie();
	}
	if (s.protocol !== "https:" || s.hostname !== "checkout.stripe.com" || s.username || s.password) throw new Ie();
	return s.href;
}
function Q(e) {
	try {
		return e ?? globalThis.sessionStorage;
	} catch {
		return null;
	}
}
function Le({ storage: e = null, path: t = "", now: n = Date.now() } = {}) {
	try {
		Q(e)?.setItem(Y, JSON.stringify({
			path: t,
			at: n
		}));
	} catch {}
}
function $(e = null) {
	try {
		Q(e)?.removeItem(Y);
	} catch {}
}
function Re({ storage: e = null, path: t = "", now: n = Date.now() } = {}) {
	try {
		let r = JSON.parse(Q(e)?.getItem(Y) || "null");
		return !r || !Number.isSafeInteger(r.at) || n < r.at || n - r.at > X ? ($(e), !1) : r.path === t;
	} catch {
		return $(e), !1;
	}
}
function ze(e, t, n = []) {
	if (e === "cancelled") return "cancelled";
	if (e !== "success") return null;
	let r = t && n.find((e) => e.sessionId === t);
	return r?.status === "paid" ? "paid" : r?.status === "reversed" ? "reversed" : "pending";
}
//#endregion
//#region app/home-purchase.mjs
function Be({ guest: e, remaining: t, duration: n, freeBudgetBlocked: r = !1, paidRemaining: i = 0 }) {
	return e ? t !== null && t < 5 ? "auth" : "generate" : r ? i >= Number(n) ? "paid-generate" : "buy" : t !== null && t < Number(n) ? "buy" : "generate";
}
function Ve({ locale: e = "en", path: t = "/", storage: n = null, saveDraft: r = async () => {}, requestCheckout: i = Z, openAuth: a = async () => !1, navigate: o = () => {}, openPurchase: s = null, onBusy: c = () => {}, onMessage: l = () => {}, onAuthenticated: u = () => {}, callbackURL: d = "" } = {}) {
	let f = !1, p = !1, m = 0, h = (e) => {
		f = e, c(e);
	};
	async function g({ mode: e = "login", purchase: i = !1 } = {}) {
		if (f || p) return;
		p = !0;
		let o = m;
		$(n), i && Le({
			storage: n,
			path: t
		});
		try {
			let t = await a({
				mode: e,
				callbackURL: d,
				beforeRedirect: r
			});
			if (o !== m) return;
			$(n), t && (u(), p = !1, i && await _());
		} catch {
			$(n), l("auth-error");
		} finally {
			p = !1;
		}
	}
	async function _() {
		if (f || p) return;
		if (s) {
			$(n), h(!0), l("");
			try {
				await s();
			} catch (e) {
				l(e?.code === "BILLING_HOLD" ? "hold" : e?.code === "BILLING_UNAVAILABLE" ? "unavailable" : e?.code === "POPUP_BLOCKED" ? "popup" : "checkout-error");
			} finally {
				h(!1);
			}
			return;
		}
		let a = m;
		h(!0), l(""), $(n);
		let c = "draft";
		try {
			if (await r(), a !== m) return;
			c = "checkout";
			let n = await i({
				locale: e,
				returnTo: t
			});
			a === m && o(n);
		} catch (e) {
			if (a !== m) return;
			if (h(!1), e.code === "AUTH_REQUIRED") {
				await g({ purchase: !0 });
				return;
			}
			l(c === "draft" ? "draft-error" : e.code === "BILLING_HOLD" ? "hold" : "checkout-error");
		}
	}
	function v() {
		m++, p = !1, h(!1), $(n);
	}
	return {
		buy: _,
		auth: g,
		reset: v
	};
}
function He({ eventTarget: e = window, doc: t = document, fetchImpl: n = fetch } = {}) {
	let r = t.documentElement.lang.startsWith("zh") ? "zh" : "en", i = r === "zh" ? "/zh/" : "/", a = (e, t) => r === "zh" ? t : e, o = (e) => {
		let n = {
			"draft-error": a("Could not save your draft. Please try again before leaving this page.", "无法保存草稿，请重试后再离开页面。"),
			"checkout-error": a("Could not open checkout. Please try again.", "无法打开付款页面，请重试。"),
			"auth-error": a("Could not open sign in. Please try again.", "无法打开登录窗口，请重试。"),
			hold: Me({ code: "BILLING_HOLD" }, r),
			unavailable: Me({ code: "BILLING_UNAVAILABLE" }, r),
			popup: Me({ code: "POPUP_BLOCKED" }, r),
			pending: a("Waiting for payment confirmation. Your draft is saved.", "正在等待支付确认，你的草稿已保留。"),
			cancelled: a("Checkout cancelled. Your draft is still here.", "已取消付款，草稿已保留。"),
			reversed: a("This payment was reversed. Please check your billing history.", "此笔付款已撤销，请查看账单记录。"),
			"pending-long": a("Payment confirmation is taking longer. Refresh or check your billing history.", "支付仍待确认，请稍后刷新或查看账单记录。")
		}, i = t.querySelector("[data-home-payment-status]");
		i && (i.textContent = n[e] || "", i.hidden = !i.textContent);
	};
	async function s() {
		let t = { promises: [] };
		e.dispatchEvent(new CustomEvent("seedance:home-before-leave", { detail: t })), await Promise.all(t.promises);
	}
	let c = new URL(i, e.location.origin);
	c.searchParams.set("auth_return", "1"), c.searchParams.set("lang", r), c.hash = "create";
	let l = new URL(i, e.location.origin);
	l.searchParams.set("auth_cancelled", "1"), l.searchParams.set("lang", r), l.hash = "create";
	let u = () => e.dispatchEvent(new Event("seedance:auth-changed")), d = "seedance:home:oauth-return", f = () => {
		try {
			e.sessionStorage.removeItem(d);
		} catch {}
	}, p = Ve({
		locale: r,
		path: i,
		saveDraft: s,
		callbackURL: c.href,
		openPurchase: () => Pe({
			locale: r,
			eventTarget: e,
			requestCheckout: (e) => Z({
				...e,
				fetchImpl: n
			})
		}),
		requestCheckout: (e) => Z({
			...e,
			fetchImpl: n
		}),
		openAuth: async (t) => {
			let n = crypto.randomUUID(), r = new URL(t.callbackURL);
			r.searchParams.set("auth_nonce", n);
			try {
				return await (await import(
					/* @vite-ignore */
					"/assets/home-auth.js?v=20261024-google-only"
)).openHomeAuth({
					...t,
					callbackURL: r.href,
					errorCallbackURL: l.href,
					beforeRedirect: async () => {
						await t.beforeRedirect(), e.sessionStorage.setItem(d, JSON.stringify({
							token: n,
							path: i,
							at: Date.now()
						}));
					}
				});
			} finally {
				f();
			}
		},
		navigate: (t) => e.location.assign(t),
		onMessage: o,
		onBusy: (n) => {
			t.querySelectorAll("[data-home-buy]").forEach((e) => {
				e.setAttribute("aria-busy", String(n)), e.tagName === "BUTTON" && (e.disabled = n);
			}), e.dispatchEvent(new CustomEvent("seedance:home-purchase-state", { detail: { busy: n } }));
		}
	}), m = (e) => {
		if (e.target.closest(".auth-dialog-backdrop") || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		let t = e.target.closest("[data-home-buy], .home-member-purchase"), n = e.target.closest("[data-home-auth], [data-account-login]");
		t ? (e.preventDefault(), p.buy()) : n && (e.preventDefault(), p.auth({ mode: n.dataset.homeAuth || "login" }));
	};
	t.addEventListener("click", m);
	let h = () => {
		p.buy();
	}, g = (e) => {
		p.auth({ mode: e.detail?.mode || "register" });
	};
	e.addEventListener("seedance:home-buy", h), e.addEventListener("seedance:home-auth", g);
	let _ = 0, v, y, b = new URLSearchParams(e.location.search), x = b.get("checkout"), S = b.get("session_id");
	async function C() {
		if (x !== "success" || !/^cs_[A-Za-z0-9_]{1,240}$/.test(S || "")) return;
		let t = ++_;
		clearTimeout(v), y?.abort(), y = new AbortController();
		let r = 0;
		o("pending");
		let i = async () => {
			if (t === _) {
				try {
					let r = await n("/api/billing/history", {
						credentials: "same-origin",
						cache: "no-store",
						signal: y.signal
					});
					if (!r.ok) throw Error("history");
					let i = await r.json();
					if (t !== _) return;
					let a = ze("success", S, Array.isArray(i.orders) ? i.orders : []);
					if (a === "paid" || a === "reversed") {
						o(a), a === "paid" && e.dispatchEvent(new Event("seedance:payment-verified"));
						return;
					}
				} catch {
					if (t !== _) return;
				}
				++r < 12 ? v = setTimeout(i, 5e3) : o("pending-long");
			}
		};
		i();
	}
	let w = () => {
		x === "success" && C();
	};
	e.addEventListener("seedance:auth-changed", w), e.addEventListener("seedance:account-changed", w), x === "cancelled" ? o("cancelled") : x === "success" && C();
	let T = (e) => {
		e.persisted && (p.reset(), t.querySelector(".auth-dialog-close")?.click(), u(), x === "success" && C());
	};
	if (e.addEventListener("pageshow", T), b.get("auth_cancelled") === "1") {
		$(), f();
		let t = new URL(e.location.href);
		for (let e of [
			"auth_cancelled",
			"auth_return",
			"auth_nonce",
			"error",
			"error_description"
		]) t.searchParams.delete(e);
		e.history.replaceState(e.history.state, "", t.href), u();
	} else if (b.get("auth_return") === "1") {
		let t;
		try {
			t = JSON.parse(e.sessionStorage.getItem(d) || "null");
		} catch {}
		let r = t?.token === b.get("auth_nonce") && t?.path === i && Number.isSafeInteger(t?.at) && Date.now() >= t.at && Date.now() - t.at <= 6e5 && Re({ path: i });
		$(), f();
		let a = new URL(e.location.href);
		a.searchParams.delete("auth_return"), a.searchParams.delete("auth_nonce"), e.history.replaceState(e.history.state, "", a.href), n("/api/auth/get-session", {
			credentials: "same-origin",
			cache: "no-store"
		}).then((e) => e.ok ? e.json() : null).then((e) => {
			u(), r && e?.user?.id && p.buy();
		}).catch(() => $());
	} else $(), f();
	return () => {
		p.reset(), _++, clearTimeout(v), y?.abort(), t.removeEventListener("click", m), e.removeEventListener("seedance:home-buy", h), e.removeEventListener("seedance:home-auth", g), e.removeEventListener("pageshow", T), e.removeEventListener("seedance:auth-changed", w), e.removeEventListener("seedance:account-changed", w);
	};
}
//#endregion
//#region app/prompt-optimization-policy.mjs
var Ue = 80, We = 150, Ge = /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Hangul}]/u, Ke = /[\p{L}\p{N}]/u, qe = /[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’][\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*/gu;
function Je(e, t) {
	if (typeof t == "boolean") return t;
	let n = 0;
	return (Array.from(String(e ?? "").normalize("NFC"), (e) => Ge.test(e) && Ke.test(e) ? (n += 1, " ") : e).join("").match(qe) ?? []).length * We + n * Ue < 12e3;
}
//#endregion
//#region app/prompt-optimization.mjs
function Ye(e, { zh: t = !1 } = {}) {
	let n = e.ownerDocument;
	e.nextElementSibling?.matches("[data-prompt-optimization]") && e.nextElementSibling.remove();
	let r = n.createElement("div");
	r.dataset.promptOptimization = "", r.hidden = !0, r.style.cssText = "margin:10px 0 16px;font:inherit;font-size:13px;color:#bbcbd6;";
	let i = n.createElement("label");
	i.style.cssText = "display:inline-flex;align-items:center;gap:8px;cursor:pointer;font:inherit;";
	let a = n.createElement("input");
	a.type = "checkbox", a.checked = !0, a.style.cssText = "width:16px;height:16px;margin:0;padding:0;accent-color:#78dcd3;", i.append(a, n.createTextNode(t ? "提示词优化" : "Optimize prompt"));
	let o = n.createElement("small");
	o.dataset.promptOptimizationHint = "", o.textContent = t ? "较长提示词默认保留原文，可手动开启优化。" : "Longer prompts use your original text by default. You can turn optimization on.", o.style.cssText = "display:none;margin-top:6px;font-size:12px;line-height:1.5;color:#a4b6c4;";
	let s;
	function c() {
		a.checked = Je(e.value, s), o.hidden = typeof s == "boolean" || a.checked, o.style.display = o.hidden ? "none" : "block";
	}
	let l = n.createElement("small");
	l.setAttribute("role", "status"), l.style.cssText = "display:none;margin-top:6px;font-size:12px;color:#a4b6c4;", l.hidden = !0;
	let u = n.createElement("details");
	u.hidden = !0, u.style.cssText = "margin-top:8px;font-size:12px;";
	let d = n.createElement("summary");
	d.textContent = t ? "✓ 已优化 · 查看本次提示词" : "✓ Optimized · View prompt used", d.style.cssText = "cursor:pointer;color:#78dcd3;padding:4px 0;";
	let f = n.createElement("div");
	f.style.cssText = "margin-top:8px;padding:12px;border:1px solid #293d4b;border-radius:10px;background:#101922;";
	let p = n.createElement("pre");
	p.style.cssText = "margin:0 0 10px;max-height:220px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.6;color:#dbe7ee;user-select:text;";
	let m = n.createElement("button");
	m.type = "button";
	let h = t ? "复制" : "Copy";
	m.textContent = h, m.setAttribute("aria-live", "polite"), m.style.cssText = "font:inherit;padding:5px 12px;border:1px solid #385266;border-radius:6px;background:#1a2b3a;color:#fff;cursor:pointer;";
	let g = 0, _ = !1;
	m.addEventListener("click", async () => {
		let e = g, r = p.textContent;
		if (r) try {
			await n.defaultView.navigator.clipboard.writeText(r), g === e && (m.textContent = t ? "已复制" : "Copied");
		} catch {
			g === e && (m.textContent = t ? "请选择文本复制" : "Select text to copy");
		}
	}), f.append(p, m), u.append(d, f), r.append(i, o, l, u), e.after(r);
	function v() {
		g += 1, _ = !1, l.hidden = !0, l.style.display = "none", l.textContent = "", u.hidden = !0, u.open = !1, p.textContent = "", m.textContent = h;
	}
	return a.addEventListener("change", () => {
		s = a.checked, c(), v();
	}), e.addEventListener("input", c), c(), {
		get enabled() {
			return Je(e.value, s);
		},
		get choice() {
			return s;
		},
		set choice(e) {
			s = typeof e == "boolean" ? e : void 0, c();
		},
		update({ guest: e, busy: t }) {
			c(), r.hidden = !e, a.disabled = t, !t && _ && v();
		},
		start({ pending: n = !0 } = {}) {
			v(), n && !r.hidden && Je(e.value, s) && (_ = !0, l.hidden = !1, l.style.display = "block", l.textContent = t ? "正在准备生成，优化完成后可在此查看提示词。" : "Preparing your video. The optimized prompt will appear here when ready.");
		},
		result(e, n) {
			if (v(), e === "optimized" && typeof n == "string" && n.trim()) {
				p.textContent = n, u.hidden = !1;
				return;
			}
			l.hidden = e !== "fallback", l.style.display = e === "fallback" ? "block" : "none", l.textContent = e === "fallback" ? t ? "提示词优化暂不可用，本次使用原提示词生成。" : "Optimization unavailable. Using your original prompt." : "";
		},
		destroy() {
			e.removeEventListener("input", c), r.remove();
		}
	};
}
//#endregion
//#region app/guest-video.mjs
function Xe(e, t, n) {
	let r = t ? [5] : [
		5,
		10,
		15
	];
	if ([...e.options].map((e) => Number(e.value)).join() === r.join()) return;
	let i = e.value;
	e.replaceChildren(...r.map((t) => {
		let r = e.ownerDocument.createElement("option");
		return r.value = String(t), r.textContent = n(t), r;
	})), e.value = r.includes(Number(i)) ? i : "5";
}
//#endregion
//#region app/video-example-prompt.mjs
function Ze(e, t = 5, n = "en") {
	let r = Number(t) <= 5 && typeof e.trialPrompt == "string", i = r ? e.trialPrompt : e.prompt, a = r ? e.trialPromptZh : e.promptZh;
	return n === "zh" && typeof a == "string" ? a : i;
}
function Qe(e, t, n = "en") {
	let r = B.find((t) => t.trialPrompt && [
		t.prompt,
		t.promptZh,
		t.trialPrompt,
		t.trialPromptZh
	].some((t) => typeof t == "string" && t === e));
	return r ? Ze(r, t, n) : e;
}
//#endregion
//#region app/video-completion-notification.mjs
function $e({ host: e, before: t = null, zh: n = !1, documentImpl: r = e.ownerDocument, windowImpl: i = r.defaultView, NotificationImpl: a = i?.Notification }) {
	let o = r.createElement("div");
	o.className = "video-completion-reminder", o.hidden = !0;
	let s = r.createElement("span");
	o.append(s), t ? e.insertBefore(o, t) : e.append(o);
	let c = !1, l = !1, u = !1, d = !1, f = !1, p, m = () => typeof a == "function" && i?.isSecureContext !== !1, h = () => m() ? a.permission : "unsupported";
	function g() {
		if (l) return;
		o.hidden = !c;
		let e = h(), t = e === "granted" ? n ? "桌面提醒已开启，可切换标签页，请保持此页面打开。" : "Desktop reminders enabled. You can switch tabs; keep this page open." : e === "denied" ? n ? "通知已被禁用。请在地址栏的网站设置中允许通知；视频也会保存到“我的作品”。" : "Notifications are blocked. Allow them in your browser’s site settings, or check My creations." : e === "unsupported" ? n ? "此浏览器暂不支持桌面提醒，完成后请在“我的作品”查看。" : "Desktop reminders are unavailable in this browser. Check My creations for your video." : d ? n ? "未能开启通知，请检查浏览器的网站权限。" : "Could not enable notifications. Check your browser’s site permissions." : n ? "允许浏览器通知后，切换标签页也能收到提醒。" : "Allow browser notifications to get a reminder while using another tab.";
		s.textContent !== t && (s.textContent = t);
	}
	async function _() {
		if (!(l || u || h() !== "default")) {
			u = !0, d = !1, g();
			try {
				await a.requestPermission();
			} catch {
				d = !0;
			} finally {
				g();
			}
		}
	}
	function v() {
		try {
			p?.close();
		} catch {}
		p = null;
	}
	return i?.addEventListener?.("focus", g), {
		requestPermission: _,
		setActive(e) {
			c = e, g();
		},
		reset() {
			v(), f = !1, d = !1;
		},
		complete(e, t = () => {}) {
			if (!(l || f) && (f = !0, !(h() !== "granted" || r.visibilityState !== "hidden" && r.hasFocus?.() !== !1))) try {
				p = new a(n ? "视频已生成 · SEEDANCE 3.0" : "Your video is ready · SEEDANCE 3.0", {
					body: n ? "点击返回查看和下载视频。" : "Click to view and download your video.",
					tag: "seedance-video-ready-" + (e || "current")
				}), p.onclick = () => {
					try {
						i?.focus?.();
					} catch {}
					v(), l || t();
				};
			} catch {}
		},
		destroy() {
			l = !0, v(), i?.removeEventListener?.("focus", g), o.remove();
		}
	};
}
var et = "seedance:video:wait-start";
function tt({ host: e, before: t = null, isAuthenticated: n, zh: r = !1, onElapsed: i = () => {}, documentImpl: a = e.ownerDocument, storage: o, now: s = Date.now, setIntervalImpl: c = setInterval, clearIntervalImpl: l = clearInterval }) {
	try {
		o ??= globalThis.sessionStorage;
	} catch {}
	let u = a.createElement("aside");
	u.className = "video-wait-notice", u.hidden = !0, u.setAttribute("role", "status"), u.setAttribute("aria-live", "polite");
	let d = a.createElement("strong");
	d.textContent = r ? "高峰期稍慢" : "Taking a little longer during peak hours";
	let f = a.createElement("p");
	f.textContent = r ? "5秒视频约需1分钟多、10秒视频3分多、15秒视频5分多。" : "A 5-second video takes about 1+ minute, 10 seconds about 3+ minutes, and 15 seconds about 5+ minutes.";
	let p = a.createElement("p");
	p.textContent = r ? "可以切换到其他标签页，允许浏览器通知后，完成时会自动提醒您。" : "You can use another tab. Once browser notifications are allowed, we’ll automatically notify you when your video is ready.";
	let m = a.createElement("small");
	m.textContent = r ? "请保持此页面打开，视频也会保存到“我的作品”。" : "Keep this page open. Your video will also be saved to My creations.", u.append(d, f, p, m), t ? e.insertBefore(u, t) : e.append(u);
	let h = $e({
		host: e,
		before: t,
		zh: r,
		documentImpl: a
	});
	if (a.head && !a.querySelector("[data-video-wait-styles]")) {
		let e = a.createElement("link");
		e.rel = "stylesheet", e.href = "/assets/video-wait-notice.css?v=20261101-notifications", e.setAttribute("data-video-wait-styles", ""), a.head.append(e);
	}
	let g = null, _ = 0, v = "", y = !0, b = "", x = "", S = () => {
		let e = g !== null && y, t = e && n();
		h.setActive(t), u.hidden = !t || s() - _ < 6e4, i(e ? Math.max(0, s() - _) : null);
	}, C = () => {
		x && a.title === x && (a.title = b), x = "";
	}, w = () => {
		a.visibilityState !== "hidden" && C();
	};
	a.addEventListener?.("visibilitychange", w);
	function T({ clearSaved: e = !1, completed: t = !1, onReadyClick: s } = {}) {
		if (g !== null && l(g), g = null, u.hidden = !0, h.setActive(!1), t && n() && h.complete(v, s), i(null), e) try {
			let e = JSON.parse(o?.getItem("seedance:video:wait-start") || "null");
			v && e?.taskId === v && o?.removeItem(et);
		} catch {}
		t && n() && a.visibilityState === "hidden" && (b = a.title, x = (r ? "✓ 视频已生成 — " : "✓ Video ready — ") + b, a.title = x);
	}
	return {
		prepareNotifications() {
			n() && h.requestPermission();
		},
		start(e = "") {
			T(), C(), h.reset(), v = e, _ = s();
			try {
				let t = JSON.parse(o?.getItem("seedance:video:wait-start") || "null");
				e && t?.taskId === e && Number.isFinite(t.startedAt) && t.startedAt <= _ && _ - t.startedAt < 864e5 && (_ = t.startedAt);
			} catch {}
			g = c(S, 1e3), S();
		},
		bindTask(e) {
			v = e;
			try {
				o?.setItem(et, JSON.stringify({
					taskId: v,
					startedAt: _
				}));
			} catch {}
		},
		setVisible(e) {
			y = e, S();
		},
		stop: T,
		destroy() {
			T(), C(), h.destroy(), a.removeEventListener?.("visibilitychange", w), u.remove();
		}
	};
}
//#endregion
//#region app/generation-preview.mjs
function nt(e, t, n = !1) {
	let r = Math.max(0, Math.floor((t - e) / 1e3)), i = r - (n && r >= 125 ? 60 : 0);
	return `${Math.floor(i / 60)}:${String(i % 60).padStart(2, "0")}`;
}
//#endregion
//#region app/home-video.mjs
var rt = B.slice(0, 3);
function it(e = document.querySelector("[data-home-video]"), { fetchImpl: n = fetch, requestImpl: i = pe, pollImpl: a = fe } = {}) {
	if (!e) return () => {};
	let o = document.documentElement.lang.startsWith("zh"), s = (e, t) => o ? t : e, c = (t) => e.querySelector(`[data-home-${t}]`), l = c("form"), u = c("prompt"), d = c("duration"), f = c("ratio"), p = Ye(u, { zh: o }), m = h(u, {
		zh: o,
		onError: (e) => G(e, !0)
	}), g = c("file"), v = c("reference"), y = c("reference-grid") || Object.assign(document.createElement("div"), { className: "home-reference-grid" });
	y.parentNode || (y.dataset.homeReferenceGrid = "", v.append(y));
	let b = e.querySelector("[data-home-mode=\"reference\"]"), x = b.textContent, S = b.cloneNode(!1);
	S.dataset.homeMode = "frames", S.textContent = s("First & last frame", "首尾帧"), S.hidden = !0, b.after(S);
	let C = me({
		before: v,
		zh: o,
		onChange: () => {
			N = !0, q();
		},
		onError: (e) => G(e, !0)
	});
	g.multiple = !0, c("thumb")?.remove(), c("remove")?.remove();
	let w = c("generate"), T = c("status"), E = c("player"), D = c("pending"), O = c("result"), te = c("examples"), ne = [...c("model").options].find((e) => e.value === "minimax-h3") || c("model").options[0], re = ne.textContent, ie = e.querySelector(".home-resolution strong"), ae = ie?.textContent, oe = c("choose").querySelector("small"), se = oe?.textContent, k = [], A = "text", j = !1, M = !1, N = !1, P = !0, F = null, I = "", L = !1, R = null, le = 0, z = !1, ue = 0, de = !1, B = !1, ge = 0, V, ye, be = "", H = 5, Ce = "", we = Promise.resolve(), Te = !1, Ee = e.querySelector(".home-live-dot"), U = tt({
		host: c("preview"),
		before: c("example-pagination") || O,
		isAuthenticated: () => !P,
		zh: o,
		onElapsed: (e) => {
			Ee && (Ee.hidden = e === null, Ee.textContent = e === null ? "" : s("Waiting ", "已等待 ") + nt(0, e, !P), Ee.style.fontVariantNumeric = "tabular-nums");
		}
	}), De = [], W = (e, t, n) => {
		e?.addEventListener(t, n), De.push(() => e?.removeEventListener(t, n));
	};
	function G(e, t = !1) {
		T.textContent = e, T.classList.toggle("is-error", t && !j);
	}
	let Oe = () => P && F !== null && F < 5, ke = () => Be({
		guest: P,
		remaining: F,
		duration: d.value,
		freeBudgetBlocked: de,
		paidRemaining: ue
	}), K = () => P ? H : 9, Ae = () => s("This trial supports 1 reference image. Remove extra images to continue.", "本次试用支持 1 张参考图，请移除多余图片后继续。"), je = () => P && K() === 5 ? s("Use up to 5 reference images.", "最多上传 5 张参考图。") : K() === 1 ? Ae() : s("Seedance 2.5 supports up to 9 reference images.", "Seedance 2.5 最多支持 9 张参考图。");
	function q() {
		!P && A === "frames" && (A = "text"), S.hidden = !P || H !== 5, b.textContent = P && H === 5 ? s("Multi-image reference", "多图参考") : x, C.update({
			visible: P && A === "frames",
			disabled: j || z || B
		});
		let n = Oe() && !j && !z;
		c("example-source") && (c("example-source").hidden = j || z || L), c("example-pagination") && (c("example-pagination").hidden = j || z || L), Xe(d, P, (e) => s(`${e} seconds`, `${e} 秒`)), c("duration-hint") && (c("duration-hint").hidden = !P);
		for (let e of d.options) e.disabled = P && Number(e.value) !== 5 || F !== null && Number(e.value) > F;
		P && !j && !z && (d.value = "5"), !j && F !== null && F < Number(d.value) && F >= 5 && (d.value = "5"), !j && !z && (u.value = Qe(u.value, d.value, o ? "zh" : "en")), p.update({
			guest: P,
			busy: j || z || B
		}), m.update({
			enabled: P && H === 5 && A === "reference" && !j && !z && !B,
			references: k
		});
		let i = ke(), a = i === "generate" || i === "paid-generate", l = A === "reference" && k.length > K();
		w.disabled = j || z || B || a && (!u.value.trim() || A === "reference" && !k.length || l || A === "frames" && !C.valid), w.textContent = B ? s("Opening checkout…", "正在打开付款…") : j ? s("Generating…", "正在生成…") : i === "auth" ? s("Log in and buy credits to continue", "登录并购买积分后继续") : i === "buy" ? s("Buy Credits", "购买积分") : i === "paid-generate" ? s(`Generate with purchased credits · ${d.value} credits`, `使用购买积分生成 · ${d.value} 积分`) : P ? s("Generate for free ↗", "免费生成视频 ↗") : s("Generate video ↗", "生成视频 ↗"), c("exhausted").hidden = !n;
		let h = c("account-notice");
		h && (h.hidden = P || !["buy", "paid-generate"].includes(i), h.textContent = s("Not enough credits. Purchased credits never expire.", "积分不足，购买积分永久有效。")), d.disabled = f.disabled = u.disabled = g.disabled = c("model").disabled = j || z || B, e.querySelectorAll("[data-home-mode]").forEach((e) => {
			e.disabled = j || z || B, e.setAttribute("aria-pressed", String(e.dataset.homeMode === A));
		}), c("choose").disabled = j || z || B || k.length >= K(), g.multiple = K() > 1, ne.textContent = r(P && be || re), ie && (ie.textContent = t(P && Ce || ae)), y.querySelectorAll("button").forEach((e) => {
			e.disabled = j || z || B;
		}), v.hidden = A !== "reference";
		let E = [...f.options].find((e) => e.value === "1:1");
		E && (E.disabled = !1);
		let D = _(f.value);
		y.querySelectorAll("img").forEach((e) => {
			e.style.aspectRatio = `${D.width} / ${D.height}`;
		}), c("reference-count") && (c("reference-count").textContent = `${k.length} / ${K()}`), c("filename").textContent = K() === 1 ? s("Choose or paste one image", "选择或粘贴一张参考图") : k.length ? s("Add more images", "继续添加参考图") : s("Choose or paste images", "选择或粘贴参考图"), oe && (oe.textContent = K() === 1 ? s("1 first-frame image · PNG / JPEG / WebP · 10 MB", "1 张首帧参考图 · PNG / JPEG / WebP · 最大 10 MB") : P ? s("1–5 images · PNG / JPEG / WebP · 10 MB each", "1–5 张参考图 · PNG / JPEG / WebP · 每张最大 10 MB") : se), l && !j && !z ? G(je(), !0) : [Ae(), je()].includes(T.textContent) && G(s("Reference images ready.", "参考图已就绪。")), c("balance").textContent = F === null ? s("2 free videos · 5 seconds each · no sign-up or login", "2 条免费视频 · 每条 5 秒 · 无需注册和登录") : P ? s(`${F} free seconds remaining`, `实际剩余 ${F} 秒免费额度`) : s(`${F} credits available`, `可用 ${F} 积分`), c("balance").classList.toggle("is-insufficient", F !== null && F < Number(d.value) && !j && !z), c("cost").textContent = P ? s(`This video: ${d.value}s free`, `本次免费 ${d.value} 秒`) : s(`This video: ${d.value} credits`, `本次 ${d.value} 积分`);
	}
	function J(e) {
		e && (F = e.remaining, e.context && (P = e.context === "guest-video"), (e.context === "account" || e.context === "guest-video") && window.dispatchEvent(new CustomEvent("seedance:credits-updated", { detail: e })), q());
	}
	async function Y() {
		let t = ++ge;
		V?.abort();
		let r = new AbortController();
		V = r;
		try {
			let i = await n("/api/credits/balance?guest_video=1", {
				headers: await ee(),
				credentials: "same-origin",
				cache: "no-store",
				signal: r.signal
			}), a = await i.json();
			if (!M && t === ge && i.ok && Number.isSafeInteger(a.credits?.remaining)) {
				P = a.credits.guest === !0, F = a.credits.remaining, be = P && typeof a.credits.videoModelName == "string" ? a.credits.videoModelName : "", H = P ? a.credits.maxReferences === 1 ? 1 : 5 : 9, Ce = P && a.credits.videoResolutionLabel === "768P" ? "768P" : "", ue = a.credits.paidRemaining || 0, q(), clearTimeout(ye);
				let t = document.querySelector(".home-intro-copy");
				if (t) {
					t.dataset.trialState = P ? "guest" : "account";
					let n = t.querySelector(".home-trial-offer");
					n && (n.hidden = !P);
					let r = t.querySelector("[data-home-account-offer]");
					r && (r.querySelector("[data-home-pack-price]").textContent = `US$${_e(he[0]).price}`, r.hidden = P);
					let i = t.querySelector(".home-member-offer");
					i && (i.hidden = !0);
					let a = e.querySelector(".home-network-limit");
					a && (a.hidden = !0);
				}
			}
		} catch {}
	}
	function X(t, n = !1) {
		if (j || z || B) return;
		le = t;
		let r = rt[t];
		if (L || (E.src = r.src, E.poster = r.poster, E.muted = !0, E.loop = !1, c("example-title").textContent = r.title[+!!o], c("example-label") && (c("example-label").textContent = r.sourceType === "user-provided" ? s("VIDEO REFERENCE", "视频参考") : s("MADE WITH Seedance 2.5", "由 Seedance 2.5 生成")), E.play().catch(() => {})), c("example-count").textContent = `${String(t + 1).padStart(2, "0")} / ${String(rt.length).padStart(2, "0")}`, e.querySelectorAll("[data-home-example-dot]").forEach((e) => {
			e.setAttribute("aria-pressed", String(Number(e.dataset.homeExampleDot) === t));
		}), n) {
			N = !0;
			let t = String(r.durationSeconds || 5);
			d.value = Array.from(d.options).some((e) => e.value === t && !e.disabled) ? t : "5", u.value = Ze(r, d.value, o ? "zh" : "en"), f.value = "16:9", A = "text", q(), u.focus(), e.scrollIntoView({
				behavior: "smooth",
				block: "start"
			});
		}
	}
	function Me() {
		y.replaceChildren();
		for (let [e, t] of k.entries()) {
			let n = Object.assign(document.createElement("div"), { className: "home-reference-item" }), r = Object.assign(document.createElement("img"), {
				src: t.url,
				alt: s(`Image ${e + 1}: ${t.file.name}`, `参考图 ${e + 1}：${t.file.name}`)
			}), i = Object.assign(document.createElement("span"), { textContent: s(`Image ${e + 1}`, `参考图 ${e + 1}`) }), a = Object.assign(document.createElement("button"), {
				type: "button",
				textContent: "×"
			});
			a.dataset.homeRemoveReference = String(e), a.setAttribute("aria-label", s(`Remove reference image ${e + 1}`, `移除参考图 ${e + 1}`)), n.append(r, i, a), y.append(n);
		}
	}
	function Ne(e, { restoring: t = !1 } = {}) {
		if (j || z || B && !t || !e.length) return !1;
		if (e.length + k.length > K()) return G(je(), !0), !1;
		try {
			ce(e, { existingCount: k.length });
		} catch (e) {
			return G(e.message, !0), !1;
		}
		return k.push(...e.map((e) => ({
			file: e,
			url: URL.createObjectURL(e)
		}))), t || (N = !0), G(s("Reference images ready.", "参考图已就绪。")), Me(), q(), !0;
	}
	let Pe = () => ({
		prompt: u.value,
		duration: Number(d.value),
		aspectRatio: f.value,
		mode: A,
		optimizePrompt: p.choice,
		files: A === "frames" ? C.files : k.map((e) => e.file),
		taskId: I
	});
	W(window, "seedance:home-before-leave", (e) => {
		e.detail.promises.push(we.then(() => {
			if (j && !I) throw Error("Wait for the current submission");
			if (Te && !N) throw Error("Restore the references before leaving");
			return xe(Pe());
		}));
	}), W(window, "seedance:home-purchase-state", (e) => {
		B = e.detail.busy, q();
	}), W(window, "seedance:auth-changed", () => {
		de = !1, F = null, Y();
	}), W(window, "seedance:account-changed", () => {
		de = !1, F = null, Y();
	}), W(window, "seedance:payment-verified", () => {
		Y();
	}), W(window, "focus", () => {
		Y();
	});
	async function Fe(e) {
		e.preventDefault(), await Ie(e.currentTarget.href);
	}
	async function Ie(e) {
		try {
			await xe(Pe()), R?.abort(), window.location.assign(e);
		} catch {
			G(s("Could not transfer the draft. Please try again.", "草稿暂时无法转入工作台，请重试。"), !0);
		}
	}
	document.querySelectorAll("[data-video-workbench]").forEach((e) => W(e, "click", Fe));
	async function Z(e = "", t = !1) {
		if (j || M) return;
		let r = Pe();
		p.start({ pending: !e }), e && (z = !0), j = !0, L = !1, R = new AbortController(), U.start(e), D.hidden = !1, O.hidden = !0, te.hidden = !0, E.hidden = !0, E.pause(), G(s(e ? "Checking your video…" : "Preparing your video…", e ? "正在查看生成进度…" : "正在准备生成…")), q(), matchMedia("(max-width: 760px)").matches && c("preview").scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
		try {
			e || await xe(r).catch(() => {});
			let o = {
				fetchImpl: n,
				signal: R.signal,
				onStatus(e) {
					if (M) return;
					J(e.credits);
					let t = e.status === "queued" ? s("Queued for generation…", "已排队，等待生成…") : e.status === "running" ? s("Generating your video…", "正在生成视频…") : s("Checking generation progress…", "正在查看生成进度…");
					c("pending-text").textContent = t, G(t);
				}
			}, l = e ? await a({
				...o,
				taskId: e
			}) : await i({
				...o,
				optimizePrompt: P ? r.optimizePrompt : void 0,
				inputMode: P && H === 5 ? r.mode : void 0,
				onPromptOptimization: (e, t) => p.result(e, t),
				prompt: r.prompt,
				duration: r.duration,
				aspectRatio: r.aspectRatio,
				referenceFiles: r.mode === "text" ? [] : r.files,
				paidOnly: t || !P,
				onTask(e) {
					I = e, z = !0, U.bindTask(e);
					let t = D.querySelector("[data-creation-recovery]") || document.createElement("a");
					t.dataset.creationRecovery = "", t.hidden = P, t.href = s("/creations", "/zh/creations"), t.textContent = s("You can return later · My creations ↗", "可稍后回来查看 · 我的作品 ↗"), D.append(t);
					try {
						sessionStorage.setItem(ve, e), sessionStorage.setItem("seedance:video:active-model", "minimax-h3");
					} catch {}
				}
			});
			if (M) return;
			J(l.credits), L = !0, z = !1, U.stop({
				clearSaved: !0,
				completed: !0,
				onReadyClick: () => c("preview").scrollIntoView({
					behavior: "smooth",
					block: "center"
				})
			}), E.src = l.videoUrl, E.muted = !1, E.loop = !1, E.hidden = !1, D.hidden = !0, O.hidden = !1, c("download").href = l.videoUrl, c("example-title").textContent = s("Your generated video", "你的生成结果"), sessionStorage.removeItem(ve), sessionStorage.removeItem("seedance:video:active-model"), G(s("Your video is ready. Download it or continue in the workspace.", "视频已生成，可下载或进入工作台继续创作。"));
		} catch (e) {
			if (M || e.name === "AbortError") return;
			J(e.credits), U.stop({ clearSaved: !(!e.terminal && e.status !== 404 && e.code !== "INVALID_VIDEO_TASK" && I) }), ["FREE_BUDGET_EXCEEDED", "NETWORK_FREE_BUDGET_EXCEEDED"].includes(e.code) && (de = !0), e.code === "AUTH_REQUIRED" && window.dispatchEvent(new CustomEvent("seedance:home-auth", { detail: { mode: "login" } })), (e.terminal || e.status === 404 || e.code === "INVALID_VIDEO_TASK") && (sessionStorage.removeItem(ve), I = "", z = !1), D.hidden = !0, I ? (c("resume").hidden = !1, G(s("Your task is saved. Continue checking or open the workspace.", "任务已保存，可继续查看进度或进入工作台。"))) : (te.hidden = !1, E.hidden = !1, X(le), G(e.message || s("Please try again.", "请重试。")));
		} finally {
			j = !1, !L && !I && X(le), q(), M || Y();
		}
	}
	W(l, "submit", (e) => {
		if (e.preventDefault(), w.disabled) return;
		let t = ke();
		if (t === "auth") {
			window.dispatchEvent(new CustomEvent("seedance:home-auth", { detail: { mode: "register" } }));
			return;
		}
		if (t === "buy") {
			window.dispatchEvent(new Event("seedance:home-buy"));
			return;
		}
		U.prepareNotifications(), I = "", Z("", t === "paid-generate");
	});
	let Q = () => {
		N = !0, q();
	};
	W(u, "input", Q), W(d, "change", Q), W(f, "change", Q), W(g, "change", () => {
		Ne([...g.files || []]), g.value = "";
	}), W(c("choose"), "click", () => g.click()), W(y, "click", (e) => {
		let t = e.target.closest("[data-home-remove-reference]");
		if (!t || j || z || B) return;
		let n = Number(t.dataset.homeRemoveReference);
		Number.isInteger(n) && k[n] && m.beforeRemove(n) && (URL.revokeObjectURL(k[n].url), k.splice(n, 1), N = !0, Me(), q());
	}), W(c("resume"), "click", () => {
		U.prepareNotifications(), c("resume").hidden = !0, Z(I);
	}), e.querySelectorAll("[data-home-mode]").forEach((e) => W(e, "click", () => {
		A = e.dataset.homeMode, Q();
	})), W(E, "ended", () => {
		!j && !z && !L && !M && X((le + 1) % rt.length);
	}), W(c("try"), "click", () => X(le, !0)), e.querySelectorAll("[data-home-example-dot]").forEach((e) => {
		W(e, "click", () => {
			L || X(Number(e.dataset.homeExampleDot));
		});
	}), document.querySelectorAll("[data-home-focus]").forEach((t) => W(t, "click", (t) => {
		t.preventDefault(), e.scrollIntoView({
			behavior: "smooth",
			block: "start"
		}), !j && !z && u.focus({ preventScroll: !0 });
	})), W(e, "paste", (e) => {
		if (A === "text" || j || z || B) return;
		let t = [...e.clipboardData?.files || []].filter((e) => e.type.startsWith("image/"));
		t.length && (A === "frames" ? C.paste(t) : Ne(t)) && e.preventDefault();
	});
	let Le = Se({
		consume: !1,
		maxAgeMs: 864e5
	}).then((e) => {
		if (!e || M || N) return;
		u.value = e.prompt, d.value = String(e.duration === 15 ? 10 : e.duration), f.value = e.aspectRatio, A = e.mode, p.choice = e.optimizePrompt;
		let t = e.files ?? (e.file ? [e.file] : []);
		A === "frames" ? C.setFiles(t) : t.length && !Ne(t, { restoring: !0 }) && (Te = !0), q();
	}).catch(() => {
		Te = !0, G(s("Could not restore your draft. Please reselect your reference images.", "无法恢复草稿，请重新选择参考图。"), !0);
	});
	we = Le, X(0), q(), Y(), Le.then(() => {
		let e = sessionStorage.getItem(ve);
		e && !M && (I = e, Z(e));
	});
	let $ = () => {
		m.destroy(), C.destroy(), S.remove(), b.textContent = x, p.destroy(), M = !0, R?.abort(), U.destroy(), ge++, V?.abort(), clearTimeout(ye), k.forEach((e) => URL.revokeObjectURL(e.url)), De.forEach((e) => e());
	};
	return W(window, "pagehide", $), $;
}
if (typeof document < "u") {
	He();
	let e = it();
	window.addEventListener("pageshow", (t) => {
		t.persisted && (e(), e = it());
	});
}
//#endregion
export { rt as HOME_VIDEO_EXAMPLES, it as initializeHomeVideo };
