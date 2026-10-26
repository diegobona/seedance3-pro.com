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
	return String(e).replace(/\bMiniMax\s+H3\b/gi, "Seedance 2.5").replace(/\bGPT[\s-]*Image\s*2(?![.\d])/gi, "GPT Image 2.5");
}
function r(e) {
	return n(e).replace(/\bH3\b/g, "Seedance 2.5").replace(/\bG2\b(?!\.)/g, "G2.5");
}
//#endregion
//#region app/i18n.mjs
var i = Object.freeze({
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
	"Buy 500 credits · $4.99": "购买 500 积分 · $4.99",
	"500 seconds of video": "可生成总计 500 秒视频",
	"500 images or 500 seconds of video": "可生成 500 张图片或 500 秒视频",
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
	"Your free images are used up. Sign up for 5 free credits every day.": "免费图片额度已用完，注册后每天赠送 5 积分。",
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
	"Your free video seconds are used up. Sign up for 5 free credits every day.": "游客免费视频额度已用完，注册后每天赠送 5 积分。",
	"Not enough free video seconds for this duration. Choose 5 seconds or sign up to keep creating.": "剩余免费秒数不足，请选择 5 秒或注册后继续创作。",
	"Guest videos support 5 or 10 seconds at 768p.": "游客视频支持 5 秒或 10 秒，固定 768p。",
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
	FREE_BUDGET_EXCEEDED: "Today’s free generation budget is reached. Wait until reset, or explicitly choose purchased credits.",
	NETWORK_FREE_BUDGET_EXCEEDED: "This network’s daily free allowance is used up. It resets at 00:00 Asia/Shanghai. You can choose to use purchased credits.",
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
	if (u !== "zh") return r(t(d));
	if (Object.hasOwn(i, d)) return o(d, {}, u);
	let f = s[n];
	return f ? c[f] || o(f, {}, u) : /[\u3400-\u9fff]/u.test(d) ? r(t(d)) : o(l, {}, u);
}
//#endregion
//#region app/video-reference-frame.mjs
var u = Object.freeze({
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
function d(e) {
	if (typeof e != "string" || !Object.hasOwn(u, e)) throw RangeError(o("Choose a supported video aspect ratio."));
	return { ...u[e] };
}
function f(e, t, n) {
	let { width: r, height: i } = d(n);
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
function p(e) {
	if (e?.aborted) throw e.reason instanceof Error ? e.reason : new DOMException(o("Video polling was aborted."), "AbortError");
}
async function m(e) {
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
async function h(e, { aspectRatio: t = "16:9", signal: n, decodeImage: r = m, createCanvas: i = () => document.createElement("canvas") } = {}) {
	p(n), d(t);
	let a, s;
	try {
		a = await r(e), p(n);
		let o = f(a.width, a.height, t);
		s = i(), s.width = o.width, s.height = o.height;
		let c = s.getContext("2d", { alpha: !1 });
		if (!c) throw Error("Canvas unavailable");
		c.fillStyle = "#000000", c.fillRect(0, 0, o.width, o.height), c.imageSmoothingEnabled = !0, c.imageSmoothingQuality = "high", c.drawImage(a.image, o.drawX, o.drawY, o.drawWidth, o.drawHeight);
		let l = await new Promise((e) => s.toBlob(e, "image/png"));
		if (p(n), !l || l.type !== "image/png" || !l.size || l.size > 10485760) throw Error("Image encoding failed");
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
var g = "x-seedance-device", _ = [
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
function v(e) {
	let t = String(e || "").toLowerCase().trim();
	return /swiftshader|llvmpipe|software|microsoft basic|unknown/.test(t) ? "" : (t.startsWith("angle (") && (t = t.slice(7).split(",")[1]?.trim() || ""), t = t.replace(/^angle metal renderer:\s*/, ""), t = t.replace(/\(0x[0-9a-f]+\)/g, "").replace(/\b(?:direct3d|opengl|metal|vulkan).*$/, "").replace(/\/pcie.*$/, "").replace(/\((?:r|tm)\)/g, "").replace(/[^a-z0-9]+/g, " ").trim(), t.length >= 7 && /\d|radeon|intel.*(?:uhd|iris|hd graphics)/.test(t) ? t : "");
}
function y(e = globalThis) {
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
		], o = (e) => (i.font = `72px ${e}`, i.measureText("mmmmmmmmmmlliWW0123456789").width), s = a.map(o), c = _.filter((e) => a.some((t, n) => o(`"${e}",${t}`) !== s[n])), l = e.navigator.userAgent || "";
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
async function b(e, t = globalThis.crypto) {
	try {
		if (!e || !t?.subtle) return null;
		let n = v(e.renderer), [r, i, a] = e.screen || [], o = [...new Set(e.fonts || [])].sort();
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
var x;
async function S() {
	if (!globalThis.document) return {};
	x ??= b(y());
	let e = await x;
	return e ? { [g]: e } : {};
}
//#endregion
//#region app/video-generation.mjs
var C = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, w = /* @__PURE__ */ new Set([
	"succeeded",
	"failed",
	"expired",
	"submission_unknown"
]), T = /* @__PURE__ */ new Set([
	408,
	425,
	429,
	500,
	502,
	503,
	504
]);
function E(e, t = {}) {
	return Object.assign(Error(o(e)), t);
}
function ee(e, { existingCount: t = 0 } = {}) {
	if (!Array.isArray(e) || e.length + t > 9) throw E(o("Seedance 2.5 supports up to 9 reference images."));
	if (e.some((e) => ![
		"image/png",
		"image/jpeg",
		"image/webp"
	].includes(e?.type) || !e.size || e.size > 10485760)) throw E(o("Choose PNG, JPEG or WebP images, up to 10 MB each."));
}
function D() {
	return new DOMException(o("Video polling was aborted."), "AbortError");
}
function O(e) {
	if (e?.aborted) throw e.reason instanceof Error ? e.reason : D();
}
function k(e) {
	let t = Number(e.headers.get("x-seedance-credit-cost")), n = Number(e.headers.get("x-seedance-credit-remaining")), r = e.headers.get("x-seedance-credit-scope");
	return Number.isSafeInteger(t) && t > 0 && Number.isSafeInteger(n) && n >= 0 ? {
		cost: t,
		remaining: n,
		...r === "guest-video" || r === "account" ? { context: r } : {}
	} : null;
}
async function A(e) {
	try {
		return await e.json();
	} catch {
		throw E(o("Video service returned an invalid response."), {
			status: e.status,
			code: "INVALID_VIDEO_RESPONSE",
			terminal: !1
		});
	}
}
function j(e) {
	let t = String(e || "");
	if (!C.test(t)) throw E(o("Video service returned an invalid task."), {
		code: "INVALID_VIDEO_TASK",
		terminal: !1
	});
	return t;
}
function M(e, t) {
	let n = j(e?.task?.id);
	if (t && n !== t) throw E(o("Video service returned an invalid task."), {
		code: "INVALID_VIDEO_TASK",
		terminal: !1
	});
	return n;
}
function N(e) {
	try {
		let t = new URL(String(e || ""));
		if (t.protocol !== "https:" || t.username || t.password) throw Error("unsafe");
		return t.href;
	} catch {
		throw E(o("Video service returned an invalid video URL."), {
			code: "INVALID_VIDEO_RESULT",
			terminal: !0,
			taskStatus: "succeeded"
		});
	}
}
function te(e, { nowImpl: t, maxRetryAfterMs: n }) {
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
function P(e, { signal: t } = {}) {
	return O(t), new Promise((n, r) => {
		let i = setTimeout(a, e);
		function a() {
			t?.removeEventListener("abort", o), n();
		}
		function o() {
			clearTimeout(i), t?.removeEventListener("abort", o), r(t.reason instanceof Error ? t.reason : D());
		}
		t?.addEventListener("abort", o, { once: !0 });
	});
}
function F(e, t, n) {
	let r = typeof t?.task?.status == "string" ? t.task.status : void 0;
	return E(l(t?.message, t?.code, "Video generation failed."), {
		status: e.status,
		code: String(t?.code || "VIDEO_GENERATION_FAILED"),
		...n ? { credits: n } : {},
		...r ? { taskStatus: r } : {},
		terminal: w.has(r)
	});
}
async function ne({ taskId: e, fetchImpl: t = globalThis.fetch, waitImpl: n = P, nowImpl: r = Date.now, maxDurationMs: i = 6e5, initialDelayMs: a = 1e3, maxDelayMs: s = 8e3, maxRetryAfterMs: c = 3e4, signal: l, onStatus: u = () => {}, initialCredits: d = null } = {}) {
	let f = j(e), p = r(), m = Math.max(0, Math.min(Number(a) || 1e3, Number(s) || 8e3)), h = Math.max(m, Number(s) || 8e3), g = Math.max(1, Number(i) || 6e5), _ = d;
	async function v(e, t) {
		let i = r() - p, a = g - i;
		if (a <= 0) throw E(o("Video generation is still running. Return later to resume checking it."), {
			code: "VIDEO_CLIENT_TIMEOUT",
			terminal: !1,
			taskId: f
		});
		let s = t ? te(e, {
			nowImpl: r,
			maxRetryAfterMs: c
		}) ?? m : m;
		await n(Math.min(s, a), { signal: l }), O(l), m = Math.min(h, Math.max(1, m * 2));
	}
	for (;;) {
		if (O(l), r() - p >= g) throw E(o("Video generation is still running. Return later to resume checking it."), {
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
			O(l), u({
				status: "retrying",
				taskId: f,
				credits: _
			}), await v(new Response(null), !1);
			continue;
		}
		let n = k(e);
		n && (_ = n);
		let i = await A(e), a = T.has(e.status);
		if (!e.ok || !i?.success) {
			if (a && !i?.task) {
				u({
					status: "retrying",
					taskId: f,
					credits: _
				}), await v(e, !0);
				continue;
			}
			throw i?.task?.id && M(i, f), F(e, i, n);
		}
		M(i, f);
		let s = String(i.task.status || "");
		if (s === "succeeded") return {
			taskId: f,
			status: s,
			videoUrl: N(i.task.resultUrl),
			..._ ? { credits: _ } : {}
		};
		if (w.has(s)) throw E(o("Video generation failed. Your credits were refunded."), {
			code: s === "expired" ? "VIDEO_TASK_EXPIRED" : "VIDEO_GENERATION_FAILED",
			taskStatus: s,
			terminal: !0,
			..._ ? { credits: _ } : {}
		});
		if (s !== "queued" && s !== "running" && s !== "submitting") throw E(o("Video service returned an invalid task status."), {
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
async function re({ prompt: e, paidOnly: t = !1, duration: n = 5, aspectRatio: r = "16:9", referenceFiles: i = [], prepareReferenceImpl: a = h, onUpload: s = () => {}, fetchImpl: c = globalThis.fetch, signal: l, onTask: u = () => {}, onStatus: d = () => {}, ...f } = {}) {
	O(l);
	let p = [];
	ee(i);
	for (let [e, t] of i.entries()) {
		if (![
			"image/png",
			"image/jpeg",
			"image/webp"
		].includes(t.type) || !t.size || t.size > 10485760) throw E(o("Choose PNG, JPEG or WebP images, up to 10 MB each."));
		s({
			index: e + 1,
			total: i.length
		});
		let n = await a(t, {
			aspectRatio: r,
			signal: l
		});
		O(l);
		let u = await c("/api/videos/references", {
			method: "POST",
			credentials: "same-origin",
			headers: {
				...await S(),
				"content-type": n.type,
				accept: "application/json"
			},
			body: n,
			signal: l
		}), d = await A(u);
		if (!u.ok || !d?.success) throw F(u, d);
		if (!C.test(d.id)) throw E(o("Reference upload returned an invalid response."));
		p.push(d.id);
	}
	let m = await c("/api/videos/generate", {
		method: "POST",
		credentials: "same-origin",
		headers: {
			...await S(),
			accept: "application/json",
			...t === !0 ? { "x-seedance-credit-source": "paid" } : {},
			"content-type": "application/json"
		},
		body: JSON.stringify({
			prompt: String(e || "").trim(),
			duration: Number(n),
			resolution: "768p",
			aspectRatio: String(r || "16:9"),
			...p.length ? { referenceImageIds: p } : {}
		}),
		signal: l
	}), g = k(m), _ = await A(m);
	if (!m.ok || !_?.success) throw F(m, _, g);
	let v = M(_);
	return u(v), d({
		status: String(_.task.status || "queued"),
		taskId: v,
		credits: g
	}), ne({
		...f,
		taskId: v,
		fetchImpl: c,
		signal: l,
		onStatus: d,
		initialCredits: g
	});
}
//#endregion
//#region app/studio-handoff.mjs
var I = "seedance:h3:handoff", L = "seedance:minimax-h3:active-task", R = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function z(e, t, n) {
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
async function ie(e, { storage: t = sessionStorage, putFile: n = (e, t) => z("put", e, t), deleteFile: r = (e) => z("delete", e) } = {}) {
	let i;
	try {
		i = JSON.parse(t.getItem(I) || "null");
	} catch {}
	let a = e.files === void 0 ? e.file ? [e.file] : [] : e.files;
	ee(a);
	let o = a.map(() => crypto.randomUUID()), s = [];
	try {
		for (let [e, t] of a.entries()) s.push(o[e]), await n(o[e], t);
	} catch (e) {
		throw await Promise.allSettled(s.map((e) => r(e))), e;
	}
	let c = o[0] ?? null, l = {
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
		referenceKey: c,
		referenceKeys: o,
		taskId: R.test(e.taskId || "") ? e.taskId : ""
	};
	try {
		t.setItem(I, JSON.stringify(l));
	} catch (e) {
		throw await Promise.allSettled(o.map((e) => r(e))), e;
	}
	let u = new Set([...Array.isArray(i?.referenceKeys) ? i.referenceKeys : [], i?.referenceKey].filter((e) => R.test(e || "")));
	return await Promise.allSettled([...u].map((e) => r(e))), l;
}
async function ae({ storage: e = sessionStorage, consume: t = !0, maxAgeMs: n = 36e5, getFile: r = (e) => z("get", e), deleteFile: i = (e) => z("delete", e) } = {}) {
	let a;
	try {
		a = JSON.parse(e.getItem(I) || "null");
	} catch {
		return e.removeItem(I), null;
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
	].includes(a.duration) || typeof a.prompt != "string" || a.prompt.length > 2500 || a.taskId && !R.test(a.taskId) || a.referenceKeys !== void 0 && !Array.isArray(a.referenceKeys) || o.length > 9 || new Set(o).size !== o.length || o.some((e) => !R.test(e))) return e.removeItem(I), null;
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
	return t && (e.removeItem(I), await Promise.allSettled(o.map((e) => i(e)))), {
		...a,
		files: s,
		file: s[0] ?? null
	};
}
//#endregion
//#region assets/credit-checkout.mjs
var B = "seedance_credit_checkout_v1", oe = 6e5;
function se(e = "en") {
	return `${e === "zh" ? "/zh" : ""}/billing?checkout=start`;
}
async function V({ locale: e = "en", eventTarget: t = window, requestCheckout: n = U } = {}) {
	let r = t.open("about:blank", "_blank");
	if (!r) throw new H("POPUP_BLOCKED");
	r.opener = null;
	try {
		let t = await n({ locale: e });
		r.closed || r.location.replace(t);
	} catch (t) {
		if (r.closed) return;
		if (t?.code === "AUTH_REQUIRED") {
			r.location.replace(se(e));
			return;
		}
		throw r.close(), t;
	}
}
var H = class extends Error {
	constructor(e = "CHECKOUT_FAILED") {
		super("Could not open checkout."), this.code = e;
	}
};
async function U({ locale: e = "en", returnTo: t, fetchImpl: n = fetch } = {}) {
	let r = await n("/api/billing/checkout", {
		method: "POST",
		credentials: "same-origin",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			locale: e === "zh" ? "zh" : "en",
			...["/", "/zh/"].includes(t) ? { returnTo: t } : {}
		}),
		signal: AbortSignal.timeout(35e3)
	}), i = await r.json().catch(() => ({}));
	if (!r.ok) throw new H([
		"AUTH_REQUIRED",
		"BILLING_HOLD",
		"BILLING_UNAVAILABLE"
	].includes(i.code) ? i.code : "CHECKOUT_FAILED");
	let a;
	try {
		a = new URL(i.url);
	} catch {
		throw new H();
	}
	if (a.protocol !== "https:" || a.hostname !== "checkout.stripe.com" || a.username || a.password) throw new H();
	return a.href;
}
function W(e) {
	try {
		return e ?? globalThis.sessionStorage;
	} catch {
		return null;
	}
}
function G({ storage: e = null, path: t = "", now: n = Date.now() } = {}) {
	try {
		W(e)?.setItem(B, JSON.stringify({
			path: t,
			at: n
		}));
	} catch {}
}
function K(e = null) {
	try {
		W(e)?.removeItem(B);
	} catch {}
}
function q({ storage: e = null, path: t = "", now: n = Date.now() } = {}) {
	try {
		let r = JSON.parse(W(e)?.getItem(B) || "null");
		return !r || !Number.isSafeInteger(r.at) || n < r.at || n - r.at > oe ? (K(e), !1) : r.path === t;
	} catch {
		return K(e), !1;
	}
}
//#endregion
//#region app/daily-credits.mjs
var J = 864e5, ce = 288e5;
function Y(e, t, n = []) {
	if (e === "cancelled") return "cancelled";
	if (e !== "success") return null;
	let r = t && n.find((e) => e.sessionId === t);
	return r?.status === "paid" ? "paid" : r?.status === "reversed" ? "reversed" : "pending";
}
function le(e = Date.now()) {
	return J - (e + ce) % J + 1e3;
}
//#endregion
//#region app/home-purchase.mjs
function ue({ guest: e, remaining: t, duration: n, freeBudgetBlocked: r = !1, paidRemaining: i = 0 }) {
	return e ? t !== null && t < 5 ? "auth" : "generate" : r ? i >= Number(n) ? "paid-generate" : "buy" : t !== null && t < Number(n) ? "buy" : "generate";
}
function X({ locale: e = "en", path: t = "/", storage: n = null, saveDraft: r = async () => {}, requestCheckout: i = U, openAuth: a = async () => !1, navigate: o = () => {}, openPurchase: s = null, onBusy: c = () => {}, onMessage: l = () => {}, onAuthenticated: u = () => {}, callbackURL: d = "" } = {}) {
	let f = !1, p = !1, m = 0, h = (e) => {
		f = e, c(e);
	};
	async function g({ mode: e = "login", purchase: i = !1 } = {}) {
		if (f || p) return;
		p = !0;
		let o = m;
		K(n), i && G({
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
			K(n), t && (u(), p = !1, i && await _());
		} catch {
			K(n), l("auth-error");
		} finally {
			p = !1;
		}
	}
	async function _() {
		if (f || p) return;
		if (s) {
			K(n), h(!0), l("");
			try {
				await s();
			} catch {
				l("checkout-error");
			} finally {
				h(!1);
			}
			return;
		}
		let a = m;
		h(!0), l(""), K(n);
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
		m++, p = !1, h(!1), K(n);
	}
	return {
		buy: _,
		auth: g,
		reset: v
	};
}
function de({ eventTarget: e = window, doc: t = document, fetchImpl: n = fetch } = {}) {
	let r = t.documentElement.lang.startsWith("zh") ? "zh" : "en", i = r === "zh" ? "/zh/" : "/", a = (e, t) => r === "zh" ? t : e, o = (e) => {
		let n = {
			"draft-error": a("Could not save your draft. Please try again before leaving this page.", "无法保存草稿，请重试后再离开页面。"),
			"checkout-error": a("Could not open checkout. Please try again.", "无法打开付款页面，请重试。"),
			"auth-error": a("Could not open sign in. Please try again.", "无法打开登录窗口，请重试。"),
			hold: a("Your payment needs review. Please contact support.", "账户支付需要审核，请联系支持。"),
			pending: a("Waiting for payment confirmation. Your draft is saved.", "正在等待支付确认，你的草稿已保留。"),
			cancelled: a("Checkout cancelled. Your draft is still here.", "已取消付款，草稿已保留。"),
			reversed: a("This payment was reversed. Please check your billing history.", "此笔付款已撤销，请查看账单记录。"),
			"pending-long": a("Payment confirmation is taking longer. Refresh or check your billing history.", "支付仍待确认，请稍后刷新或查看账单记录。")
		}, r = t.querySelector("[data-home-payment-status]");
		r && (r.textContent = n[e] || "", r.hidden = !r.textContent);
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
	}, p = X({
		locale: r,
		path: i,
		saveDraft: s,
		callbackURL: c.href,
		openPurchase: () => V({
			locale: r,
			eventTarget: e,
			requestCheckout: (e) => U({
				...e,
				fetchImpl: n
			})
		}),
		requestCheckout: (e) => U({
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
		let t = e.target.closest("[data-home-buy]"), n = e.target.closest("[data-home-auth], [data-account-login]");
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
					let a = Y("success", S, Array.isArray(i.orders) ? i.orders : []);
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
		K(), f();
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
		let r = t?.token === b.get("auth_nonce") && t?.path === i && Number.isSafeInteger(t?.at) && Date.now() >= t.at && Date.now() - t.at <= 6e5 && q({ path: i });
		K(), f();
		let a = new URL(e.location.href);
		a.searchParams.delete("auth_return"), a.searchParams.delete("auth_nonce"), e.history.replaceState(e.history.state, "", a.href), n("/api/auth/get-session", {
			credentials: "same-origin",
			cache: "no-store"
		}).then((e) => e.ok ? e.json() : null).then((e) => {
			u(), r && e?.user?.id && p.buy();
		}).catch(() => K());
	} else K(), f();
	return () => {
		p.reset(), _++, clearTimeout(v), y?.abort(), t.removeEventListener("click", m), e.removeEventListener("seedance:home-buy", h), e.removeEventListener("seedance:home-auth", g), e.removeEventListener("pageshow", T), e.removeEventListener("seedance:auth-changed", w), e.removeEventListener("seedance:account-changed", w);
	};
}
//#endregion
//#region app/home-video.mjs
var Z = [
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
function Q(e = document.querySelector("[data-home-video]"), { fetchImpl: t = fetch, requestImpl: n = re, pollImpl: r = ne } = {}) {
	if (!e) return () => {};
	let i = document.documentElement.lang.startsWith("zh"), a = (e, t) => i ? t : e, o = (t) => e.querySelector(`[data-home-${t}]`), s = o("form"), c = o("prompt"), l = o("duration"), u = o("ratio"), f = o("file"), p = o("reference"), m = o("reference-grid") || Object.assign(document.createElement("div"), { className: "home-reference-grid" });
	m.parentNode || (m.dataset.homeReferenceGrid = "", p.append(m)), f.multiple = !0, o("thumb")?.remove(), o("remove")?.remove();
	let h = o("generate"), g = o("status"), _ = o("player"), v = o("pending"), y = o("result"), b = o("examples"), x = [], C = "text", w = !1, T = !1, E = !1, D = !0, O = null, k = "", A = !1, j = null, M = 0, N = !1, te = 0, P = !1, F = !1, I = 0, R, z, B = Promise.resolve(), oe = !1, se = [], V = (e, t, n) => {
		e?.addEventListener(t, n), se.push(() => e?.removeEventListener(t, n));
	};
	function H(e, t = !1) {
		g.textContent = e, g.classList.toggle("is-error", t && !w);
	}
	let U = () => D && O !== null && O < 5, W = () => ue({
		guest: D,
		remaining: O,
		duration: l.value,
		freeBudgetBlocked: P,
		paidRemaining: te
	});
	function G() {
		let t = U() && !w && !N;
		for (let e of l.options) e.disabled = O !== null && Number(e.value) > O;
		!w && O !== null && O < Number(l.value) && O >= 5 && (l.value = "5");
		let n = W();
		h.disabled = w || N || F || (n === "generate" || n === "paid-generate") && (!c.value.trim() || C === "reference" && !x.length), h.textContent = F ? a("Opening checkout…", "正在打开付款…") : w ? a("Generating…", "正在生成…") : n === "auth" ? a("Register / log in to continue", "注册 / 登录后继续") : n === "buy" ? a("Buy 500 credits · US$4.99", "购买 500 积分 · US$4.99") : n === "paid-generate" ? a(`Generate with purchased credits · ${l.value} credits`, `使用购买积分生成 · ${l.value} 积分`) : D ? a("Generate for free ↗", "免费生成视频 ↗") : a("Generate video ↗", "生成视频 ↗"), o("exhausted").hidden = !t;
		let r = o("account-notice");
		r && (r.hidden = D || !["buy", "paid-generate"].includes(n), r.textContent = P ? a("Today’s free allowance is used up. Wait for the daily reset, or use purchased credits.", "今日免费额度已用完，可等待积分每日重置，或使用购买积分继续。") : a("Not enough credits. Purchased credits never expire.", "积分不足，购买积分永久有效。")), l.disabled = u.disabled = c.disabled = f.disabled = o("model").disabled = w || N || F, e.querySelectorAll("[data-home-mode]").forEach((e) => {
			e.disabled = w || N || F, e.setAttribute("aria-pressed", String(e.dataset.homeMode === C));
		}), o("choose").disabled = w || N || F || x.length >= 9, m.querySelectorAll("button").forEach((e) => {
			e.disabled = w || N || F;
		}), p.hidden = C !== "reference";
		let i = [...u.options].find((e) => e.value === "1:1");
		i && (i.disabled = !1);
		let s = d(u.value);
		m.querySelectorAll("img").forEach((e) => {
			e.style.aspectRatio = `${s.width} / ${s.height}`;
		}), o("reference-count") && (o("reference-count").textContent = `${x.length} / 9`), o("filename").textContent = x.length ? a("Add more images", "继续添加参考图") : a("Choose or paste images", "选择或粘贴参考图"), o("balance").textContent = O === null ? a("10 free seconds · no sign-up or login", "10 秒免费额度 · 无需注册和登录") : D ? a(`${O} free seconds remaining`, `实际剩余 ${O} 秒免费额度`) : a(`${O} credits available`, `可用 ${O} 积分`), o("cost").textContent = D ? a(`This video: ${l.value}s free`, `本次免费 ${l.value} 秒`) : a(`This video: ${l.value} credits`, `本次 ${l.value} 积分`);
	}
	function K(e) {
		e && (O = e.remaining, e.context && (D = e.context === "guest-video"), e.context === "account" && window.dispatchEvent(new CustomEvent("seedance:credits-updated", { detail: e })), G());
	}
	async function q() {
		let e = ++I;
		R?.abort();
		let n = new AbortController();
		R = n;
		try {
			let r = await t("/api/credits/balance?guest_video=1", {
				headers: await S(),
				credentials: "same-origin",
				cache: "no-store",
				signal: n.signal
			}), i = await r.json();
			if (!T && e === I && r.ok && Number.isSafeInteger(i.credits?.remaining)) {
				D = i.credits.guest === !0, O = i.credits.remaining, te = i.credits.paidRemaining || 0, G(), clearTimeout(z), D || (z = setTimeout(() => {
					P = !1, q();
				}, le()));
				let e = document.querySelector(".home-intro-copy");
				e && (e.querySelector(".home-free-badge").textContent = D ? a("10 FREE SECONDS", "首次共 10 秒免费额度") : a("5 DAILY FREE CREDITS", "每日 5 免费积分"), e.querySelector(".home-guest-benefit strong").textContent = D ? a("No sign-up or login required", "无需注册或登录，即可试用") : a("Credits reset daily and do not accumulate.", "积分每日重置，不累积。"), e.querySelector(".home-member-offer").hidden = !D);
			}
		} catch {}
	}
	function J(t, n = !1) {
		if (w || N || F) return;
		M = t;
		let r = Z[t];
		A || (_.src = r.src, _.muted = !0, _.loop = !1, o("example-title").textContent = r.title[+!!i], _.play().catch(() => {})), o("example-count").textContent = `${String(t + 1).padStart(2, "0")} / ${String(Z.length).padStart(2, "0")}`, n && (E = !0, c.value = r.prompt, l.value = "5", u.value = "16:9", C = "text", G(), c.focus(), e.scrollIntoView({
			behavior: "smooth",
			block: "start"
		}));
	}
	function ce() {
		m.replaceChildren();
		for (let [e, t] of x.entries()) {
			let n = Object.assign(document.createElement("div"), { className: "home-reference-item" }), r = Object.assign(document.createElement("img"), {
				src: t.url,
				alt: a(`Image ${e + 1}: ${t.file.name}`, `参考图 ${e + 1}：${t.file.name}`)
			}), i = Object.assign(document.createElement("span"), { textContent: a(`Image ${e + 1}`, `参考图 ${e + 1}`) }), o = Object.assign(document.createElement("button"), {
				type: "button",
				textContent: "×"
			});
			o.dataset.homeRemoveReference = String(e), o.setAttribute("aria-label", a(`Remove reference image ${e + 1}`, `移除参考图 ${e + 1}`)), n.append(r, i, o), m.append(n);
		}
	}
	function Y(e, { restoring: t = !1 } = {}) {
		if (w || N || F && !t || !e.length) return !1;
		try {
			ee(e, { existingCount: x.length });
		} catch (e) {
			return H(e.message, !0), !1;
		}
		return x.push(...e.map((e) => ({
			file: e,
			url: URL.createObjectURL(e)
		}))), t || (E = !0), H(a("Reference images ready.", "参考图已就绪。")), ce(), G(), !0;
	}
	let X = () => ({
		prompt: c.value,
		duration: Number(l.value),
		aspectRatio: u.value,
		mode: C,
		files: x.map((e) => e.file),
		taskId: k
	});
	V(window, "seedance:home-before-leave", (e) => {
		e.detail.promises.push(B.then(() => {
			if (w && !k) throw Error("Wait for the current submission");
			if (oe && !E) throw Error("Restore the references before leaving");
			return ie(X());
		}));
	}), V(window, "seedance:home-purchase-state", (e) => {
		F = e.detail.busy, G();
	}), V(window, "seedance:auth-changed", () => {
		P = !1, O = null, q();
	}), V(window, "seedance:account-changed", () => {
		P = !1, O = null, q();
	}), V(window, "seedance:payment-verified", () => {
		q();
	}), V(window, "focus", () => {
		q();
	});
	async function de(e) {
		e.preventDefault(), await Q(e.currentTarget.href);
	}
	async function Q(e) {
		try {
			await ie(X()), j?.abort(), window.location.assign(e);
		} catch {
			H(a("Could not transfer the draft. Please try again.", "草稿暂时无法转入工作台，请重试。"), !0);
		}
	}
	document.querySelectorAll("[data-video-workbench]").forEach((e) => V(e, "click", de));
	async function fe(e = "", i = !1) {
		if (w || T) return;
		let s = X();
		e && (N = !0), w = !0, A = !1, j = new AbortController(), v.hidden = !1, y.hidden = !0, b.hidden = !0, _.hidden = !0, _.pause(), H(a(e ? "Checking your video…" : "Preparing your video…", e ? "正在查看生成进度…" : "正在准备生成…")), G(), matchMedia("(max-width: 760px)").matches && o("preview").scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
		try {
			e || await ie(s).catch(() => {});
			let c = {
				fetchImpl: t,
				signal: j.signal,
				onStatus(e) {
					if (T) return;
					K(e.credits);
					let t = e.status === "queued" ? a("Queued for generation…", "已排队，等待生成…") : e.status === "running" ? a("Generating your video…", "正在生成视频…") : a("Checking generation progress…", "正在查看生成进度…");
					o("pending-text").textContent = t, H(t);
				}
			}, l = e ? await r({
				...c,
				taskId: e
			}) : await n({
				...c,
				prompt: s.prompt,
				duration: s.duration,
				aspectRatio: s.aspectRatio,
				referenceFiles: s.mode === "reference" ? s.files : [],
				paidOnly: i,
				onTask(e) {
					k = e, N = !0;
					try {
						sessionStorage.setItem(L, e), sessionStorage.setItem("seedance:video:active-model", "minimax-h3");
					} catch {}
				}
			});
			if (T) return;
			K(l.credits), A = !0, N = !1, _.src = l.videoUrl, _.muted = !1, _.loop = !1, _.hidden = !1, v.hidden = !0, y.hidden = !1, o("download").href = l.videoUrl, o("example-title").textContent = a("Your generated video", "你的生成结果"), sessionStorage.removeItem(L), sessionStorage.removeItem("seedance:video:active-model"), H(a("Your video is ready. Download it or continue in the workspace.", "视频已生成，可下载或进入工作台继续创作。"));
		} catch (e) {
			if (T || e.name === "AbortError") return;
			K(e.credits), ["FREE_BUDGET_EXCEEDED", "NETWORK_FREE_BUDGET_EXCEEDED"].includes(e.code) && (P = !0), e.code === "AUTH_REQUIRED" && window.dispatchEvent(new CustomEvent("seedance:home-auth", { detail: { mode: "login" } })), (e.terminal || e.status === 404 || e.code === "INVALID_VIDEO_TASK") && (sessionStorage.removeItem(L), k = "", N = !1), v.hidden = !0, k ? (o("resume").hidden = !1, H(a("Your task is saved. Continue checking or open the workspace.", "任务已保存，可继续查看进度或进入工作台。"))) : (b.hidden = !1, _.hidden = !1, J(M), H(e.message || a("Please try again.", "请重试。")));
		} finally {
			w = !1, !A && !k && J(M), G(), T || q();
		}
	}
	V(s, "submit", (e) => {
		if (e.preventDefault(), h.disabled) return;
		let t = W();
		if (t === "auth") {
			window.dispatchEvent(new CustomEvent("seedance:home-auth", { detail: { mode: "register" } }));
			return;
		}
		if (t === "buy") {
			window.dispatchEvent(new Event("seedance:home-buy"));
			return;
		}
		k = "", fe("", t === "paid-generate");
	});
	let $ = () => {
		E = !0, G();
	};
	V(c, "input", $), V(l, "change", $), V(u, "change", $), V(f, "change", () => {
		Y([...f.files || []]), f.value = "";
	}), V(o("choose"), "click", () => f.click()), V(m, "click", (e) => {
		let t = e.target.closest("[data-home-remove-reference]");
		if (!t || w || N || F) return;
		let n = Number(t.dataset.homeRemoveReference);
		Number.isInteger(n) && x[n] && (URL.revokeObjectURL(x[n].url), x.splice(n, 1), E = !0, ce(), G());
	}), V(o("resume"), "click", () => {
		o("resume").hidden = !0, fe(k);
	}), e.querySelectorAll("[data-home-mode]").forEach((e) => V(e, "click", () => {
		C = e.dataset.homeMode, $();
	})), V(_, "ended", () => {
		!w && !N && !A && !T && J((M + 1) % Z.length);
	}), V(o("try"), "click", () => J(M, !0)), document.querySelectorAll("[data-home-focus]").forEach((t) => V(t, "click", (t) => {
		t.preventDefault(), e.scrollIntoView({
			behavior: "smooth",
			block: "start"
		}), !w && !N && c.focus({ preventScroll: !0 });
	})), V(e, "paste", (e) => {
		if (C !== "reference" || w || N || F) return;
		let t = [...e.clipboardData?.files || []].filter((e) => e.type.startsWith("image/"));
		t.length && Y(t) && e.preventDefault();
	});
	let pe = ae({
		consume: !1,
		maxAgeMs: 864e5
	}).then((e) => {
		if (!e || T || E) return;
		c.value = e.prompt, l.value = String(e.duration === 15 ? 10 : e.duration), u.value = e.aspectRatio, C = e.mode;
		let t = e.files ?? (e.file ? [e.file] : []);
		t.length && Y(t, { restoring: !0 }), G();
	}).catch(() => {
		oe = !0, H(a("Could not restore your draft. Please reselect your reference images.", "无法恢复草稿，请重新选择参考图。"), !0);
	});
	B = pe, J(0), G(), q(), pe.then(() => {
		let e = sessionStorage.getItem(L);
		e && !T && (k = e, fe(e));
	});
	let me = () => {
		T = !0, j?.abort(), I++, R?.abort(), clearTimeout(z), x.forEach((e) => URL.revokeObjectURL(e.url)), se.forEach((e) => e());
	};
	return V(window, "pagehide", me), me;
}
if (typeof document < "u") {
	de();
	let e = Q();
	window.addEventListener("pageshow", (t) => {
		t.persisted && (e(), e = Q());
	});
}
//#endregion
export { Z as HOME_VIDEO_EXAMPLES, Q as initializeHomeVideo };
