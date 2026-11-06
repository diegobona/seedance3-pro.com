//#region app/seedance-video-examples.mjs
var e = [
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
		id: "opera",
		title: ["The art of movement", "戏曲身韵"],
		style: "PERFORMANCE",
		prompt: "A Peking opera performer sweeps long silk sleeves across a warmly lit stage. The camera circles slowly, revealing intricate embroidery and graceful, physically grounded movement.",
		src: "/assets/seedance25-samples/opera.mp4",
		poster: "/assets/seedance25-samples/opera.webp",
		sourceUrl: "https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5",
		originalUrl: "https://lf3-static.bytednsdoc.com/obj/eden-cn/lapzild-tss/ljhwZthlaukjlkulzlp/user-upload/4xfa4ms8atnr8.mp4"
	},
	{
		id: "painterly",
		title: ["Lantern-lit streets", "灯火人间"],
		style: "STORYTELLING",
		prompt: "Glide through an ancient Chinese street at night. Glowing lanterns sway above passing figures; warm reflections and layered foreground movement create a cinematic festival atmosphere.",
		src: "/assets/seedance25-samples/painterly.mp4",
		poster: "/assets/seedance25-samples/painterly.webp",
		sourceUrl: "https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5",
		originalUrl: "https://lf3-static.bytednsdoc.com/obj/eden-cn/lapzild-tss/ljhwZthlaukjlkulzlp/user-upload/4xfa4ms8awvr0.mp4"
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
];
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
function t(e = "/") {
	return e === "/zh" || e.startsWith("/zh/") ? "zh" : "en";
}
//#endregion
//#region app/video-resolution-label.mjs
function n(e) {
	return String(e).replace(/\b768p\b/gi, "1080P");
}
//#endregion
//#region app/model-display-names.mjs
function r(e) {
	return String(e).replace(/\bMiniMax\s+H3(?:\s+Max\s+Turbo)?\b/gi, "Seedance 2.5").replace(/\bGPT[\s-]*Image\s*2(?![.\d])/gi, "GPT Image 2.5");
}
function i(e) {
	return r(e).replace(/\bH3\b/g, "Seedance 2.5").replace(/\bG2\b(?!\.)/g, "G2.5");
}
//#endregion
//#region app/i18n.mjs
var a = Object.freeze({
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
	"Two free videos, 5 seconds each. 10 seconds total.": "免费试用 2 次，每次 5 秒，共 10 秒。",
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
	"Buy 1,100 credits · $11.90": "购买 1,100 积分 · $11.90",
	"1,100 seconds of video": "可生成总计 1,100 秒视频",
	"1,100 images or 1,100 seconds of video": "可生成 1,100 张图片或 1,100 秒视频",
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
	"Each free video is 5 seconds.": "每次免费视频固定 5 秒。",
	"Free accounts get {credits} credits daily, shared across images and videos.": "免费账户每天获得 {credits} 积分，图片和视频共用。",
	"Sign up to keep creating": "注册后继续创作",
	"Generate video · {seconds}s free": "生成视频 · 免费 {seconds} 秒",
	"{seconds} free seconds": "免费 {seconds} 秒",
	"{seconds} seconds remaining": "剩余 {seconds} 秒",
	"— seconds remaining": "剩余 — 秒",
	"Video generated · {seconds} free seconds remaining.": "视频已生成 · 还剩 {seconds} 秒免费额度。",
	"Your free video seconds are used up. Sign up for 5 free credits every day.": "游客免费视频额度已用完，注册后每天赠送 5 积分。",
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
function o() {
	return t(globalThis.window?.location?.pathname || globalThis.location?.pathname || "/");
}
function s(e, t = {}, r = o()) {
	let s = String(e ?? "");
	return i(n((r === "zh" && Object.hasOwn(a, s) ? a[s] : s).replace(/\{([a-zA-Z][\w]*)\}/g, (e, n) => Object.hasOwn(t, n) ? String(t[n]) : e)));
}
var c = Object.freeze({
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
}), l = Object.freeze({
	"Please log in to continue.": "请登录后继续。",
	"Insufficient credits. Please check your balance.": "积分不足，请查看余额。",
	"Too many requests. Please try again later.": "请求过于频繁，请稍后重试。",
	"This video task could not be found.": "找不到此视频任务。",
	"The generation service is temporarily unavailable. Please try again later.": "生成服务暂时不可用，请稍后重试。"
});
function u(e, t = "", r = "Image generation failed.", u = o()) {
	let d = String(e || r);
	if (t === "FREE_BUDGET_EXCEEDED") return s(c[t], {}, u);
	if (u !== "zh") return i(n(d));
	if (Object.hasOwn(a, d)) return s(d, {}, u);
	let f = c[t];
	return f ? l[f] || s(f, {}, u) : /[\u3400-\u9fff]/u.test(d) ? i(n(d)) : s(r, {}, u);
}
//#endregion
//#region app/video-reference-frame.mjs
var d = Object.freeze({
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
function f(e) {
	if (typeof e != "string" || !Object.hasOwn(d, e)) throw RangeError(s("Choose a supported video aspect ratio."));
	return { ...d[e] };
}
function p(e, t, n) {
	let { width: r, height: i } = f(n);
	if (![e, t].every((e) => Number.isFinite(e) && e > 0)) throw RangeError(s("Could not prepare the reference image. Please choose it again."));
	let a = Math.min(r / e, i / t), o = e * a, c = t * a;
	return {
		width: r,
		height: i,
		drawX: Math.max(0, (r - o) / 2),
		drawY: Math.max(0, (i - c) / 2),
		drawWidth: o,
		drawHeight: c
	};
}
function m(e) {
	if (e?.aborted) throw e.reason instanceof Error ? e.reason : new DOMException(s("Video polling was aborted."), "AbortError");
}
async function h(e) {
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
async function g(e, { aspectRatio: t = "16:9", signal: n, decodeImage: r = h, createCanvas: i = () => document.createElement("canvas") } = {}) {
	m(n), f(t);
	let a, o;
	try {
		a = await r(e), m(n);
		let s = p(a.width, a.height, t);
		o = i(), o.width = s.width, o.height = s.height;
		let c = o.getContext("2d", { alpha: !1 });
		if (!c) throw Error("Canvas unavailable");
		c.fillStyle = "#000000", c.fillRect(0, 0, s.width, s.height), c.imageSmoothingEnabled = !0, c.imageSmoothingQuality = "high", c.drawImage(a.image, s.drawX, s.drawY, s.drawWidth, s.drawHeight);
		let l = await new Promise((e) => o.toBlob(e, "image/png"));
		if (m(n), !l || l.type !== "image/png" || !l.size || l.size > 10485760) throw Error("Image encoding failed");
		return l;
	} catch (e) {
		throw e?.name === "AbortError" ? e : Error(s("Could not prepare the reference image. Please choose it again."));
	} finally {
		try {
			a?.close?.();
		} finally {
			o && (o.width = 0, o.height = 0);
		}
	}
}
//#endregion
//#region assets/guest-device.mjs
var _ = "x-seedance-device", v = [
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
function y(e) {
	let t = String(e || "").toLowerCase().trim();
	return /swiftshader|llvmpipe|software|microsoft basic|unknown/.test(t) ? "" : (t.startsWith("angle (") && (t = t.slice(7).split(",")[1]?.trim() || ""), t = t.replace(/^angle metal renderer:\s*/, ""), t = t.replace(/\(0x[0-9a-f]+\)/g, "").replace(/\b(?:direct3d|opengl|metal|vulkan).*$/, "").replace(/\/pcie.*$/, "").replace(/\((?:r|tm)\)/g, "").replace(/[^a-z0-9]+/g, " ").trim(), t.length >= 7 && /\d|radeon|intel.*(?:uhd|iris|hd graphics)/.test(t) ? t : "");
}
function b(e = globalThis) {
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
		], o = (e) => (i.font = `72px ${e}`, i.measureText("mmmmmmmmmmlliWW0123456789").width), s = a.map(o), c = v.filter((e) => a.some((t, n) => o(`"${e}",${t}`) !== s[n])), l = e.navigator.userAgent || "";
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
async function x(e, t = globalThis.crypto) {
	try {
		if (!e || !t?.subtle) return null;
		let n = y(e.renderer), [r, i, a] = e.screen || [], o = [...new Set(e.fonts || [])].sort();
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
var S;
async function C() {
	if (!globalThis.document) return {};
	S ??= x(b());
	let e = await S;
	return e ? { [_]: e } : {};
}
//#endregion
//#region app/guest-video-verification-ui.mjs
var w = "seedance-verification-styles", T = Object.freeze({
	shield: "<svg viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"m12 3 8 3v5c0 4.5-3.2 8-8 10-4.8-2-8-5.5-8-10V6l8-3Z\"/><path d=\"m8.5 11.5 2.4 2.4 4.6-4.8\"/></svg>",
	check: "<svg viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"m5 12 4.5 4.5L19 7\"/></svg>",
	close: "<svg viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"m7 7 10 10M17 7 7 17\"/></svg>",
	arrow: "<svg viewBox=\"0 0 24 24\" fill=\"none\" aria-hidden=\"true\"><path d=\"M5 12h14m-5-5 5 5-5 5\"/></svg>"
});
function ee() {
	if (document.getElementById(w)) return;
	let e = document.createElement("style");
	e.id = w, e.textContent = "\n    .sv-card,.sv-card *{box-sizing:border-box}\n    .sv-card{position:relative;color:#edf3f4;background:linear-gradient(145deg,#192227,#12191e 68%);border:1px solid #314147;border-radius:24px;padding:28px;font:400 15px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif;box-shadow:0 28px 90px #0005;isolation:isolate}\n    .sv-card::before{content:\"\";position:absolute;top:-1px;left:28px;right:28px;height:1px;background:linear-gradient(90deg,transparent,#78ded477,transparent);pointer-events:none}\n    dialog.sv-card{width:400px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 32px);margin:auto;overflow:auto}\n    dialog.sv-card::backdrop{background:#05090db8;backdrop-filter:blur(8px)}\n    .sv-heading{display:flex;align-items:center;gap:13px;margin:0 30px 20px 0}\n    .sv-mark{display:flex;align-items:center;justify-content:center;flex:none;width:42px;height:46px;color:#81e3d9;background:linear-gradient(150deg,#78ded41e,#78ded405);border-radius:13px}\n    .sv-mark svg{width:27px;height:27px;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}\n    .sv-eyebrow{color:#89a5ac;font-size:10px;line-height:1.4;font-weight:650;letter-spacing:.15em;margin:0 0 3px}\n    .sv-card .sv-title{font:650 22px/1.3 Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif;color:#f1f6f7;letter-spacing:-.02em;margin:0}\n    .sv-card .sv-description{color:#aabcc2;font-size:14px;line-height:1.7;margin:0 0 20px}\n    .sv-close{position:absolute;right:17px;top:17px;display:grid;place-items:center;width:32px;height:32px;padding:6px;background:none;border:0;border-radius:8px;color:#81979f;cursor:pointer}\n    .sv-close:hover{color:#eef6f6;background:#ffffff0a}\n    .sv-close svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}\n    .sv-widget{display:flex;justify-content:center;align-items:center;min-height:68px;max-width:100%;margin:2px 0 18px}\n    .sv-widget-loading{display:flex;align-items:center;gap:9px;color:#91a7ae;font-size:13px}\n    .sv-spinner{width:14px;height:14px;border:1.5px solid #78ded42e;border-top-color:#78ded4;border-radius:50%;animation:sv-spin .8s linear infinite;flex:none}\n    .sv-foot{display:flex;align-items:center;gap:7px;color:#7e969e;font-size:12px;line-height:1.6;margin:0}\n    .sv-foot svg{width:15px;height:15px;flex:none;stroke:#6ca59f;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}\n    .sv-actions{display:flex;justify-content:flex-end;align-items:center;margin:20px 0 -7px;padding-top:14px;border-top:1px solid #ffffff0a}\n    .sv-cancel{padding:7px 0 7px 14px;color:#a1b4ba;background:transparent;border:0;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;line-height:1.4}\n    .sv-cancel:hover{color:#f2f8f8}\n    .sv-card button:focus-visible,.sv-card a:focus-visible,.sv-page a:focus-visible{outline:2px solid #78ded4;outline-offset:4px}\n    .sv-page{margin:0;min-height:100dvh;background:radial-gradient(ellipse at 50% 36%,#203d4138,transparent 58%),#0c1115;color:#edf3f4;font:400 14px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif;display:grid;grid-template-rows:auto 1fr auto}\n    .sv-page-header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:26px 36px}\n    .sv-brand{display:flex;align-items:center;gap:10px;color:#edf3f4;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:.02em}\n    .sv-brand img{width:27px;height:27px;object-fit:contain}\n    .sv-back{color:#91a7ae;text-decoration:none;font-size:12px;white-space:nowrap}\n    .sv-back:hover{color:#81e3d9}\n    .sv-page-main{display:grid;place-items:center;padding:32px 20px 72px}\n    .sv-page-main>.sv-card{width:100%;max-width:424px;padding:30px}\n    .sv-page-main>.sv-card .sv-heading{margin-bottom:24px}\n    .sv-primary{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;padding:13px 18px;min-height:48px;border:1px solid #ffffff0d;border-radius:12px;background:#315bd4;color:#fff;text-decoration:none;font:600 15px/1.4 Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 18px #244bb325;transition:background .16s,transform .16s}\n    .sv-primary:hover{background:#3d69e8;transform:translateY(-1px)}\n    .sv-primary:disabled{opacity:.65;cursor:wait;transform:none}\n    .sv-primary svg{width:17px;height:17px;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}\n    .sv-note{color:#81989f;font-size:12px;line-height:1.7;margin:17px 0 0;text-align:center}\n    .sv-result{margin:0 0 22px}\n    .sv-result-row{display:flex;align-items:center;gap:9px;color:#c4d8d8;font-size:13px;padding:7px 0}\n    .sv-result-row svg{width:17px;height:17px;flex:none;stroke:#81e3d9;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}\n    .sv-trial-note{font-size:13px;line-height:1.7;color:#d6bf93;margin:0 0 22px;padding-top:14px;border-top:1px solid #ffffff0a}\n    .sv-page-footer{text-align:center;color:#536d76;font-size:11px;padding:0 20px 22px;letter-spacing:.04em}\n    .sv-card [hidden]{display:none!important}\n    @keyframes sv-spin{to{transform:rotate(360deg)}}\n    @media(max-width:480px){.sv-page-header{padding:20px}.sv-page-main{padding:20px 16px 54px}.sv-page-main>.sv-card{padding:25px 22px;border-radius:21px}dialog.sv-card{padding:24px 20px;border-radius:21px}}\n    @media(prefers-reduced-motion:reduce){.sv-spinner{animation:none}.sv-primary{transition:none}}\n  ", document.head.append(e);
}
//#endregion
//#region app/guest-video-verification.mjs
var te, ne = !1;
function re() {
	return globalThis.turnstile?.render ? Promise.resolve(globalThis.turnstile) : te || (te = new Promise((e, t) => {
		let n = document.createElement("script"), r = setTimeout(() => i(Error(s("Verification could not load. Please try again."))), 15e3);
		function i(i) {
			clearTimeout(r), n.onload = n.onerror = null, i ? (n.remove(), te = void 0, t(i)) : e(globalThis.turnstile);
		}
		n.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", n.async = !0, n.onload = () => globalThis.turnstile?.render ? i() : i(Error(s("Verification could not load. Please try again."))), n.onerror = () => i(Error(s("Verification could not load. Please try again."))), document.head.append(n);
	}), te);
}
async function E({ siteKey: e, action: t, signal: n }) {
	if (n?.throwIfAborted(), ne) throw Error(s("Please complete the security check to continue."));
	if (!e || !["guest_video_generate", "guest_video_reference"].includes(t)) throw Error(s("Verification failed. Please try again."));
	ne = !0, ee();
	let r = document.activeElement, i = document.createElement("dialog");
	i.className = "sv-card", i.setAttribute("aria-label", s("Security check"));
	let a = document.createElement("div");
	a.className = "sv-heading";
	let o = document.createElement("span");
	o.className = "sv-mark", o.innerHTML = T.shield;
	let c = document.createElement("div"), l = document.createElement("p");
	l.className = "sv-eyebrow", l.textContent = "SEEDANCE";
	let u = document.createElement("h2");
	u.className = "sv-title", u.textContent = s("Security check"), c.append(l, u), a.append(o, c);
	let d = document.createElement("p");
	d.className = "sv-description", d.id = "sv-verification-description", d.textContent = s("Please complete the security check to continue."), i.setAttribute("aria-describedby", d.id);
	let f = document.createElement("button");
	f.type = "button", f.className = "sv-close", f.setAttribute("aria-label", s("Cancel")), f.innerHTML = T.close;
	let p = document.createElement("div");
	p.className = "sv-widget";
	let m = document.createElement("span");
	m.className = "sv-widget-loading", m.setAttribute("role", "status");
	let h = document.createElement("span");
	h.className = "sv-spinner", h.setAttribute("aria-hidden", "true"), m.append(h, s("Loading security check…")), p.append(m);
	let g = document.createElement("p");
	g.className = "sv-foot", g.innerHTML = T.check, g.append(s("You will continue automatically after verification."));
	let _ = document.createElement("div");
	_.className = "sv-actions";
	let v = document.createElement("button");
	v.type = "button", v.className = "sv-cancel", v.textContent = s("Back to creating"), _.append(v), i.append(f, a, d, p, g, _), document.body.append(i), i.showModal();
	let y, b, x, S;
	try {
		return await new Promise((r, a) => {
			let o = !1, c = (e, t) => {
				o || (o = !0, e ? a(e) : r(t));
			}, l = () => c(Object.assign(Error(s("Verification cancelled. Please try again.")), { code: "GUEST_VERIFICATION_CANCELLED" }));
			if (S = () => c(n.reason || new DOMException("Aborted", "AbortError")), n?.addEventListener("abort", S, { once: !0 }), n?.aborted) {
				S();
				return;
			}
			v.onclick = l, f.onclick = l, i.addEventListener("cancel", (e) => {
				e.preventDefault(), l();
			}), x = setTimeout(() => c(Error(s("Verification timed out. Please try again."))), 12e4), re().then((n) => {
				o || (y = n, m.remove(), b = y.render(p, {
					sitekey: e,
					action: t,
					theme: "dark",
					size: matchMedia("(max-width: 365px)").matches ? "compact" : "flexible",
					callback: (e) => c(null, e),
					"error-callback": () => (c(Error(s("Verification failed. Please try again."))), !0),
					"expired-callback": () => c(Error(s("Verification timed out. Please try again."))),
					"timeout-callback": () => c(Error(s("Verification timed out. Please try again.")))
				}));
			}).catch((e) => c(e));
		});
	} finally {
		if (clearTimeout(x), S && n?.removeEventListener("abort", S), b !== void 0) try {
			y.remove(b);
		} catch {}
		i.close(), i.remove(), ne = !1, r?.isConnected && r.focus();
	}
}
async function D(e, t, n = fetch, r = E) {
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
var O = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, k = /* @__PURE__ */ new Set([
	"succeeded",
	"failed",
	"expired",
	"submission_unknown"
]), A = /* @__PURE__ */ new Set([
	408,
	425,
	429,
	500,
	502,
	503,
	504
]);
function j(e, t = {}) {
	return Object.assign(Error(s(e)), t);
}
function ie(e, { existingCount: t = 0 } = {}) {
	if (!Array.isArray(e) || e.length + t > 9) throw j(s("Seedance 2.5 supports up to 9 reference images."));
	if (e.some((e) => ![
		"image/png",
		"image/jpeg",
		"image/webp"
	].includes(e?.type) || !e.size || e.size > 10485760)) throw j(s("Choose PNG, JPEG or WebP images, up to 10 MB each."));
}
function M() {
	return new DOMException(s("Video polling was aborted."), "AbortError");
}
function N(e) {
	if (e?.aborted) throw e.reason instanceof Error ? e.reason : M();
}
function P(e) {
	let t = Number(e.headers.get("x-seedance-credit-cost")), n = Number(e.headers.get("x-seedance-credit-remaining")), r = e.headers.get("x-seedance-credit-scope");
	return Number.isSafeInteger(t) && t > 0 && Number.isSafeInteger(n) && n >= 0 ? {
		cost: t,
		remaining: n,
		...r === "guest-video" || r === "account" ? { context: r } : {}
	} : null;
}
async function F(e) {
	try {
		return await e.json();
	} catch {
		throw j(s("Video service returned an invalid response."), {
			status: e.status,
			code: "INVALID_VIDEO_RESPONSE",
			terminal: !1
		});
	}
}
function I(e) {
	let t = String(e || "");
	if (!O.test(t)) throw j(s("Video service returned an invalid task."), {
		code: "INVALID_VIDEO_TASK",
		terminal: !1
	});
	return t;
}
function L(e, t) {
	let n = I(e?.task?.id);
	if (t && n !== t) throw j(s("Video service returned an invalid task."), {
		code: "INVALID_VIDEO_TASK",
		terminal: !1
	});
	return n;
}
function ae(e) {
	try {
		let t = new URL(String(e || ""));
		if (t.protocol !== "https:" || t.username || t.password) throw Error("unsafe");
		return t.href;
	} catch {
		throw j(s("Video service returned an invalid video URL."), {
			code: "INVALID_VIDEO_RESULT",
			terminal: !0,
			taskStatus: "succeeded"
		});
	}
}
function oe(e, { nowImpl: t, maxRetryAfterMs: n }) {
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
function R(e, { signal: t } = {}) {
	return N(t), new Promise((n, r) => {
		let i = setTimeout(a, e);
		function a() {
			t?.removeEventListener("abort", o), n();
		}
		function o() {
			clearTimeout(i), t?.removeEventListener("abort", o), r(t.reason instanceof Error ? t.reason : M());
		}
		t?.addEventListener("abort", o, { once: !0 });
	});
}
function z(e, t, n) {
	let r = typeof t?.task?.status == "string" ? t.task.status : void 0;
	return j(u(t?.message, t?.code, "Video generation failed."), {
		status: e.status,
		code: String(t?.code || "VIDEO_GENERATION_FAILED"),
		...n ? { credits: n } : {},
		...r ? { taskStatus: r } : {},
		terminal: k.has(r)
	});
}
async function se({ taskId: e, fetchImpl: t = globalThis.fetch, waitImpl: n = R, nowImpl: r = Date.now, maxDurationMs: i = 6e5, initialDelayMs: a = 1e3, maxDelayMs: o = 8e3, maxRetryAfterMs: c = 3e4, signal: l, onStatus: u = () => {}, initialCredits: d = null } = {}) {
	let f = I(e), p = r(), m = Math.max(0, Math.min(Number(a) || 1e3, Number(o) || 8e3)), h = Math.max(m, Number(o) || 8e3), g = Math.max(1, Number(i) || 6e5), _ = d;
	async function v(e, t) {
		let i = r() - p, a = g - i;
		if (a <= 0) throw j(s("Video generation is still running. Return later to resume checking it."), {
			code: "VIDEO_CLIENT_TIMEOUT",
			terminal: !1,
			taskId: f
		});
		let o = t ? oe(e, {
			nowImpl: r,
			maxRetryAfterMs: c
		}) ?? m : m;
		await n(Math.min(o, a), { signal: l }), N(l), m = Math.min(h, Math.max(1, m * 2));
	}
	for (;;) {
		if (N(l), r() - p >= g) throw j(s("Video generation is still running. Return later to resume checking it."), {
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
			N(l), u({
				status: "retrying",
				taskId: f,
				credits: _
			}), await v(new Response(null), !1);
			continue;
		}
		let n = P(e);
		n && (_ = n);
		let i = await F(e), a = A.has(e.status);
		if (!e.ok || !i?.success) {
			if (a && !i?.task) {
				u({
					status: "retrying",
					taskId: f,
					credits: _
				}), await v(e, !0);
				continue;
			}
			throw i?.task?.id && L(i, f), z(e, i, n);
		}
		L(i, f);
		let o = String(i.task.status || "");
		if (o === "succeeded") return {
			taskId: f,
			status: o,
			videoUrl: ae(i.task.resultUrl),
			..._ ? { credits: _ } : {}
		};
		if (k.has(o)) throw j(s("Video generation failed. Your credits were refunded."), {
			code: o === "expired" ? "VIDEO_TASK_EXPIRED" : "VIDEO_GENERATION_FAILED",
			taskStatus: o,
			terminal: !0,
			..._ ? { credits: _ } : {}
		});
		if (o !== "queued" && o !== "running" && o !== "submitting") throw j(s("Video service returned an invalid task status."), {
			code: "INVALID_VIDEO_RESPONSE",
			terminal: !1
		});
		let c = i.retriable === !0;
		u({
			status: c ? "retrying" : o,
			taskStatus: o,
			taskId: f,
			credits: _
		}), await v(e, c);
	}
}
async function ce({ prompt: e, paidOnly: t = !1, duration: n = 5, aspectRatio: r = "16:9", referenceFiles: i = [], prepareReferenceImpl: a = g, onUpload: o = () => {}, fetchImpl: c = globalThis.fetch, signal: l, onTask: u = () => {}, onStatus: d = () => {}, ...f } = {}) {
	N(l);
	let p = [], m;
	ie(i);
	for (let [e, t] of i.entries()) {
		if (![
			"image/png",
			"image/jpeg",
			"image/webp"
		].includes(t.type) || !t.size || t.size > 10485760) throw j(s("Choose PNG, JPEG or WebP images, up to 10 MB each."));
		o({
			index: e + 1,
			total: i.length
		});
		let n = await a(t, {
			aspectRatio: r,
			signal: l
		});
		if (N(l), i.length === 1) {
			m = n;
			continue;
		}
		let u = await D("/api/videos/references", {
			method: "POST",
			credentials: "same-origin",
			headers: {
				...await C(),
				"content-type": n.type,
				accept: "application/json"
			},
			body: n,
			signal: l
		}, c), d = await F(u);
		if (!u.ok || !d?.success) throw z(u, d);
		if (!O.test(d.id)) throw j(s("Reference upload returned an invalid response."));
		p.push(d.id);
	}
	let h = JSON.stringify({
		prompt: String(e || "").trim(),
		duration: Number(n),
		resolution: "768p",
		aspectRatio: String(r || "16:9"),
		...p.length ? { referenceImageIds: p } : {}
	}), _ = h;
	m && (_ = new FormData(), _.append("payload", h), _.append("reference", m, "reference"));
	let v = await D("/api/videos/generate", {
		method: "POST",
		credentials: "same-origin",
		headers: {
			...await C(),
			accept: "application/json",
			...t === !0 ? { "x-seedance-credit-source": "paid" } : {},
			...m ? {} : { "content-type": "application/json" }
		},
		body: _,
		signal: l
	}, c), y = P(v), b = await F(v);
	if (!v.ok || !b?.success) throw z(v, b, y);
	let x = L(b);
	return u(x), d({
		status: String(b.task.status || "queued"),
		taskId: x,
		credits: y
	}), se({
		...f,
		taskId: x,
		fetchImpl: c,
		signal: l,
		onStatus: d,
		initialCredits: y
	});
}
//#endregion
//#region app/studio-handoff.mjs
var B = "seedance:h3:handoff", le = "seedance:minimax-h3:active-task", V = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function H(e, t, n) {
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
async function ue(e, { storage: t = sessionStorage, putFile: n = (e, t) => H("put", e, t), deleteFile: r = (e) => H("delete", e) } = {}) {
	let i;
	try {
		i = JSON.parse(t.getItem(B) || "null");
	} catch {}
	let a = e.files === void 0 ? e.file ? [e.file] : [] : e.files;
	ie(a);
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
		taskId: V.test(e.taskId || "") ? e.taskId : ""
	};
	try {
		t.setItem(B, JSON.stringify(l));
	} catch (e) {
		throw await Promise.allSettled(o.map((e) => r(e))), e;
	}
	let u = new Set([...Array.isArray(i?.referenceKeys) ? i.referenceKeys : [], i?.referenceKey].filter((e) => V.test(e || "")));
	return await Promise.allSettled([...u].map((e) => r(e))), l;
}
async function de({ storage: e = sessionStorage, consume: t = !0, maxAgeMs: n = 36e5, getFile: r = (e) => H("get", e), deleteFile: i = (e) => H("delete", e) } = {}) {
	let a;
	try {
		a = JSON.parse(e.getItem(B) || "null");
	} catch {
		return e.removeItem(B), null;
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
	].includes(a.duration) || typeof a.prompt != "string" || a.prompt.length > 2500 || a.taskId && !V.test(a.taskId) || a.referenceKeys !== void 0 && !Array.isArray(a.referenceKeys) || o.length > 9 || new Set(o).size !== o.length || o.some((e) => !V.test(e))) return e.removeItem(B), null;
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
	return t && (e.removeItem(B), await Promise.allSettled(o.map((e) => i(e)))), {
		...a,
		files: s,
		file: s[0] ?? null
	};
}
//#endregion
//#region assets/credit-packs.mjs
var U = Object.freeze([
	Object.freeze({
		id: "starter-1190",
		name: "Starter",
		amount: 1190,
		credits: 1100,
		bonus: 100,
		popular: !1
	}),
	Object.freeze({
		id: "creator-2490",
		name: "Creator",
		amount: 2490,
		credits: 3e3,
		bonus: 500,
		popular: !1
	}),
	Object.freeze({
		id: "pro-4990",
		name: "Pro",
		amount: 4990,
		credits: 6500,
		bonus: 1500,
		popular: !0
	})
]), W = U[0].id;
Object.freeze([Object.freeze({
	amount: 499,
	credits: 500
}), Object.freeze({
	amount: 999,
	credits: 1100
})]);
function fe(e = W) {
	return U.find((t) => t.id === e) ?? null;
}
function pe(e) {
	let t = e.credits - e.bonus, n = U[0];
	return {
		base: t,
		bonusPercent: Math.round(e.bonus / t * 100),
		price: (e.amount / 100).toFixed(2),
		unitPrice: (e.amount / 100 / e.credits).toFixed(4),
		savingsPercent: Math.max(0, (1 - e.amount / e.credits / (n.amount / n.credits)) * 100).toFixed(1),
		videoSeconds: e.credits,
		minutes: Math.floor(e.credits / 60),
		seconds: e.credits % 60,
		clips: Math.floor(e.credits / 5)
	};
}
//#endregion
//#region assets/credit-pack-cards.mjs
var me = [
	"<path d=\"m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z\"/><path d=\"M21 2v4m-2-2h4\"/>",
	"<path d=\"m13 2-9 12h7l-1 8 10-13h-7l1-7Z\"/>",
	"<path d=\"M14 5c3-3 7-3 7-3s0 4-3 7l-7 7-5-5 8-6Z\"/><path d=\"m6 11-3 1 1-5 7-1m0 10-1 5 5-1 1-7M7 17c0 3-4 4-4 4s1-4 4-4Z\"/>"
];
function he(e, t = "en", { radio: n = !1 } = {}) {
	let r = t === "zh", i = (e, t) => r ? t : e, a = pe(e), o = (e) => e.toLocaleString("en-US"), s = U.findIndex((t) => t.id === e.id), c = r ? `${a.minutes} 分${a.seconds ? ` ${a.seconds} 秒` : "钟"}` : `${a.minutes} min${a.seconds ? ` ${a.seconds} sec` : ""}`, l = i(`${e.name} Pack`, [
		"入门积分包",
		"创作积分包",
		"专业积分包"
	][s]), u = `${e.popular ? `<span class="credit-tier-popular">☆ ${i("MOST POPULAR", "最受欢迎")}</span>` : ""}<span class="credit-tier-heading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${me[s]}</svg><span>${l}</span>${n ? "<span class=\"credit-picker-check\" aria-hidden=\"true\">✓</span>" : ""}</span>
    <span class="credit-tier-pricing"><strong>$${a.price}</strong><span>$${a.unitPrice}/${i("credit", "积分")}</span></span>
    <span class="credit-tier-expiry">${i("Credits never expire", "积分永久有效")}</span>
    <span class="credit-tier-total"><strong>${o(e.credits)}</strong> ${i("credits", "积分")}</span>
    <span class="credit-tier-breakdown">${i(`${o(a.base)} base + <b>${o(e.bonus)} bonus credits</b>`, `${o(a.base)} 基础 + <b>${o(e.bonus)} 赠送积分</b>`)}</span>
    <span class="credit-tier-bonus">+${a.bonusPercent}% ${i("bonus credits", "积分赠送")}</span>
    <span class="credit-tier-output"><span>${i("TOTAL VIDEO GENERATION", "累计视频生成时长")}</span><strong>${o(a.videoSeconds)} <small>${i("seconds", "秒")}</small></strong><span>${c} · ${i(`${o(a.clips)} × 5-second videos`, `${o(a.clips)} 条 5 秒视频`)}</span></span>
    <span class="credit-tier-savings">${s ? i(`Save <b>${a.savingsPercent}%</b> per credit vs. Starter`, `每积分单价比入门包<b>节省 ${a.savingsPercent}%</b>`) : i("A smaller pack to get started", "轻量起步，按需创作")}</span>
    <span class="credit-tier-terms">${i("One-time payment · No subscription", "一次购买 · 无订阅")}</span>`;
	return n ? `<label class="credit-picker-option"><input type="radio" name="credit-pack" value="${e.id}"><span class="credit-tier credit-tier-${s}" data-pack-id="${e.id}">${u}</span></label>` : `<article class="credit-tier credit-tier-${s}" data-credit-pack-card data-pack-id="${e.id}" aria-label="${l}">${u}<a class="credit-tier-buy" href="${r ? "/zh" : ""}/checkout?pack=${e.id}" data-credit-pack-buy data-pack-id="${e.id}" target="_blank" rel="noopener noreferrer">${i("Get", "购买")} ${o(e.credits)} ${i("credits", "积分")} <span aria-hidden="true">↗</span></a></article>`;
}
function G(e = "en") {
	return e === "zh" ? "视频额度按 1 积分 / 秒、全部积分用于视频计算，为多次生成的累计时长。积分也可用于图片；用于图片后，视频额度相应减少。赠送比例以各档基础积分计算；节省比例以入门包每积分单价计算。所有价格均为美元。" : "Video totals assume all credits are used for video at 1 credit per second, across multiple generations. Credits can also be used for images, reducing the available video allowance. Bonuses are relative to each pack’s base credits; savings compare the price per credit with Starter. All prices are in USD.";
}
//#endregion
//#region assets/credit-pack-picker.mjs
var ge = /* @__PURE__ */ new WeakMap();
function K({ locale: e = "en", eventTarget: t = window, selectedPack: n = W, onPurchase: r, errorMessage: i }) {
	let a = t.document;
	if (ge.has(a)) return ge.get(a);
	let o = (t, n) => e === "zh" ? n : t;
	for (let e of ["credit-pack-cards", "credit-pack-picker"]) if (!a.querySelector(`link[data-credit-style="${e}"]`)) {
		let t = a.createElement("link");
		t.rel = "stylesheet", t.href = `/assets/${e}.css?v=20261105-tiers`, t.dataset.creditStyle = e, a.head.append(t);
	}
	let s = a.activeElement, c = a.createElement("dialog");
	c.className = "credit-picker", c.setAttribute("aria-labelledby", "credit-picker-title"), c.innerHTML = `<button type="button" class="credit-picker-close" aria-label="${o("Close", "关闭")}">×</button>
    <header><h2 id="credit-picker-title">${o("Choose your credit pack", "选择适合你的积分包")}</h2>
      <p>${o("Buy once. Create at your own pace.", "一次购买，按你的节奏创作。")}</p></header>
    <fieldset class="credit-picker-options"><legend class="credit-picker-sr">${o("Credit pack", "积分包")}</legend>
      ${U.map((t) => he(t, e, { radio: !0 })).join("")}</fieldset>
    <p class="credit-picker-note">${G(e)}</p>
    <p class="credit-picker-error" role="alert" hidden></p>
    <button type="button" class="credit-picker-buy"></button>`, a.body.append(c);
	let l = [...c.querySelectorAll("input[type=\"radio\"]")], u = c.querySelector(".credit-picker-buy"), d = c.querySelector(".credit-picker-error"), f = fe(n) || U[0], p = !1, m = !1, h = () => {
		l.forEach((e) => {
			e.checked = e.value === f.id, e.disabled = p;
		}), u.disabled = p, u.textContent = p ? o("Opening checkout…", "正在打开付款…") : o(`Buy ${f.credits.toLocaleString("en-US")} credits · US$${(f.amount / 100).toFixed(2)} →`, `购买 ${f.credits.toLocaleString("en-US")} 积分 · US$${(f.amount / 100).toFixed(2)} →`);
	};
	l.forEach((e) => e.addEventListener("change", () => {
		f = fe(e.value), d.hidden = !0, h();
	}));
	let g, _ = new Promise((e) => {
		g = e;
	});
	ge.set(a, _);
	let v = (e) => {
		m || (m = !0, c.close(), c.remove(), ge.delete(a), a.documentElement.style.overflow = y, s?.focus?.(), g(e));
	};
	c.querySelector(".credit-picker-close").addEventListener("click", () => v(!1)), c.addEventListener("cancel", (e) => {
		e.preventDefault(), v(!1);
	}), c.addEventListener("click", (e) => {
		if (e.target === c) {
			let t = c.getBoundingClientRect();
			(e.clientX < t.left || e.clientX > t.right || e.clientY < t.top || e.clientY > t.bottom) && v(!1);
		}
	}), u.addEventListener("click", async () => {
		if (!p) {
			p = !0, d.hidden = !0, h();
			try {
				await r(f.id), v(!0);
			} catch (t) {
				if (m) return;
				d.textContent = i(t, e), d.hidden = !1, p = !1, h();
			}
		}
	});
	let y = a.documentElement.style.overflow;
	return a.documentElement.style.overflow = "hidden", h(), c.showModal(), l.find((e) => e.checked)?.focus(), _;
}
//#endregion
//#region assets/credit-return.mjs
var q = "https://checkout-return.invalid", _e = /* @__PURE__ */ new Set([
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
function ve(e) {
	if (typeof e != "string" || e.length > 2048 || !e.startsWith("/") || e.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(e)) return null;
	let t = e.split(/[?#]/, 1)[0];
	if (/%(?:2f|5c|2e|25|0[0-9a-f]|1[0-9a-f]|7f)/i.test(t)) return null;
	try {
		let n = decodeURIComponent(t), r = new URL(e, q);
		if (r.origin !== q || r.pathname !== t || /^\/(?:zh\/)?(?:api|admin|assets|app-assets|_serverFn|_build|\.well-known)(?:\/|$)/i.test(n) || /\.(?:m?js|css|json|xml|txt|png|jpe?g|webp|svg|ico|mp4|webm|woff2?)$/i.test(n)) return null;
		for (let e of [...r.searchParams.keys()]) _e.has(e.toLowerCase()) && r.searchParams.delete(e);
		return [...new URLSearchParams(r.hash.slice(1)).keys()].some((e) => _e.has(e.toLowerCase())) && (r.hash = ""), r.pathname + r.search + r.hash;
	} catch {
		return null;
	}
}
function J(e = globalThis.location) {
	return !e || typeof e.pathname != "string" ? null : ve(e.pathname + (e.search || "") + (e.hash || ""));
}
//#endregion
//#region assets/credit-checkout.mjs
var ye = "seedance_credit_checkout_v1", be = 6e5;
function Y(e, t = "en") {
	let n = t === "zh";
	return e?.code === "BILLING_HOLD" ? n ? "此账户的购买权限暂时受限，请联系支持。" : "This account is temporarily restricted from purchasing. Please contact support." : e?.code === "BILLING_UNAVAILABLE" ? n ? "付款服务暂时不可用，请稍后重试。" : "The payment service is temporarily unavailable. Please try again later." : e?.code === "POPUP_BLOCKED" ? n ? "浏览器拦截了付款窗口，请允许本站打开新窗口后重试。" : "Your browser blocked the checkout window. Allow pop-ups for this site and try again." : n ? "无法打开付款页面，请重试。" : "Could not open checkout. Please try again.";
}
function xe(e = "en", t = J(), n = null) {
	let r = ve(t), i = new URLSearchParams();
	return r && i.set("return_to", r), n && i.set("pack", n), `${e === "zh" ? "/zh" : ""}/checkout${i.size ? "?" + i : ""}`;
}
function X({ locale: e = "en", eventTarget: t = window, requestCheckout: n = Q, returnTo: r = J(t.location), selectedPack: i = W } = {}) {
	return K({
		locale: e,
		eventTarget: t,
		selectedPack: i,
		errorMessage: Y,
		onPurchase: (i) => Z({
			locale: e,
			eventTarget: t,
			requestCheckout: n,
			returnTo: r,
			packId: i
		})
	});
}
async function Z({ locale: e = "en", eventTarget: t = window, requestCheckout: n = Q, returnTo: r = J(t.location), packId: i = W } = {}) {
	let a = t.open("about:blank", "_blank");
	if (!a) throw new Se("POPUP_BLOCKED");
	a.opener = null;
	try {
		let t = ve(r), o = await n({
			locale: e,
			packId: i,
			...t ? { returnTo: t } : {}
		});
		a.closed || a.location.replace(o);
	} catch (t) {
		if (a.closed) return;
		if (t?.code === "AUTH_REQUIRED") {
			a.location.replace(xe(e, r, i));
			return;
		}
		throw a.close(), t;
	}
}
var Se = class extends Error {
	constructor(e = "CHECKOUT_FAILED") {
		super("Could not open checkout."), this.code = e;
	}
};
async function Q({ locale: e = "en", returnTo: t = J(), fetchImpl: n = fetch, packId: r = W } = {}) {
	let i = ve(t), a = await n("/api/billing/checkout", {
		method: "POST",
		credentials: "same-origin",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			locale: e === "zh" ? "zh" : "en",
			packId: r,
			...i ? { returnTo: i } : {}
		}),
		signal: AbortSignal.timeout(35e3)
	}), o = await a.json().catch(() => ({}));
	if (!a.ok) throw new Se([
		"AUTH_REQUIRED",
		"BILLING_HOLD",
		"BILLING_UNAVAILABLE"
	].includes(o.code) ? o.code : "CHECKOUT_FAILED");
	let s;
	try {
		s = new URL(o.url);
	} catch {
		throw new Se();
	}
	if (s.protocol !== "https:" || s.hostname !== "checkout.stripe.com" || s.username || s.password) throw new Se();
	return s.href;
}
function Ce(e) {
	try {
		return e ?? globalThis.sessionStorage;
	} catch {
		return null;
	}
}
function we({ storage: e = null, path: t = "", now: n = Date.now() } = {}) {
	try {
		Ce(e)?.setItem(ye, JSON.stringify({
			path: t,
			at: n
		}));
	} catch {}
}
function $(e = null) {
	try {
		Ce(e)?.removeItem(ye);
	} catch {}
}
function Te({ storage: e = null, path: t = "", now: n = Date.now() } = {}) {
	try {
		let r = JSON.parse(Ce(e)?.getItem(ye) || "null");
		return !r || !Number.isSafeInteger(r.at) || n < r.at || n - r.at > be ? ($(e), !1) : r.path === t;
	} catch {
		return $(e), !1;
	}
}
function Ee(e, t, n = []) {
	if (e === "cancelled") return "cancelled";
	if (e !== "success") return null;
	let r = t && n.find((e) => e.sessionId === t);
	return r?.status === "paid" ? "paid" : r?.status === "reversed" ? "reversed" : "pending";
}
//#endregion
//#region app/home-purchase.mjs
function De({ guest: e, remaining: t, duration: n, freeBudgetBlocked: r = !1, paidRemaining: i = 0 }) {
	return e ? t !== null && t < 5 ? "auth" : "generate" : r ? i >= Number(n) ? "paid-generate" : "buy" : t !== null && t < Number(n) ? "buy" : "generate";
}
function Oe({ locale: e = "en", path: t = "/", storage: n = null, saveDraft: r = async () => {}, requestCheckout: i = Q, openAuth: a = async () => !1, navigate: o = () => {}, openPurchase: s = null, onBusy: c = () => {}, onMessage: l = () => {}, onAuthenticated: u = () => {}, callbackURL: d = "" } = {}) {
	let f = !1, p = !1, m = 0, h = (e) => {
		f = e, c(e);
	};
	async function g({ mode: e = "login", purchase: i = !1 } = {}) {
		if (f || p) return;
		p = !0;
		let o = m;
		$(n), i && we({
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
function ke({ eventTarget: e = window, doc: t = document, fetchImpl: n = fetch } = {}) {
	let r = t.documentElement.lang.startsWith("zh") ? "zh" : "en", i = r === "zh" ? "/zh/" : "/", a = (e, t) => r === "zh" ? t : e, o = (e) => {
		let n = {
			"draft-error": a("Could not save your draft. Please try again before leaving this page.", "无法保存草稿，请重试后再离开页面。"),
			"checkout-error": a("Could not open checkout. Please try again.", "无法打开付款页面，请重试。"),
			"auth-error": a("Could not open sign in. Please try again.", "无法打开登录窗口，请重试。"),
			hold: Y({ code: "BILLING_HOLD" }, r),
			unavailable: Y({ code: "BILLING_UNAVAILABLE" }, r),
			popup: Y({ code: "POPUP_BLOCKED" }, r),
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
	}, p = Oe({
		locale: r,
		path: i,
		saveDraft: s,
		callbackURL: c.href,
		openPurchase: () => X({
			locale: r,
			eventTarget: e,
			requestCheckout: (e) => Q({
				...e,
				fetchImpl: n
			})
		}),
		requestCheckout: (e) => Q({
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
					let a = Ee("success", S, Array.isArray(i.orders) ? i.orders : []);
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
		let r = t?.token === b.get("auth_nonce") && t?.path === i && Number.isSafeInteger(t?.at) && Date.now() >= t.at && Date.now() - t.at <= 6e5 && Te({ path: i });
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
//#region app/guest-video.mjs
function Ae(e, t, n) {
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
//#region app/video-completion-notification.mjs
function je({ host: e, before: t = null, zh: n = !1, documentImpl: r = e.ownerDocument, windowImpl: i = r.defaultView, NotificationImpl: a = i?.Notification }) {
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
var Me = "seedance:video:wait-start";
function Ne({ host: e, before: t = null, isAuthenticated: n, zh: r = !1, onElapsed: i = () => {}, documentImpl: a = e.ownerDocument, storage: o, now: s = Date.now, setIntervalImpl: c = setInterval, clearIntervalImpl: l = clearInterval }) {
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
	let h = je({
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
		let e = g !== null && y && n();
		h.setActive(e), u.hidden = !e || s() - _ < 6e4, i(e ? Math.max(0, s() - _) : null);
	}, C = () => {
		x && a.title === x && (a.title = b), x = "";
	}, w = () => {
		a.visibilityState !== "hidden" && C();
	};
	a.addEventListener?.("visibilitychange", w);
	function T({ clearSaved: e = !1, completed: t = !1, onReadyClick: s } = {}) {
		if (g !== null && l(g), g = null, u.hidden = !0, h.setActive(!1), t && n() && h.complete(v, s), i(null), e) try {
			let e = JSON.parse(o?.getItem("seedance:video:wait-start") || "null");
			v && e?.taskId === v && o?.removeItem(Me);
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
				o?.setItem(Me, JSON.stringify({
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
function Pe(e, t, n = !1) {
	let r = Math.max(0, Math.floor((t - e) / 1e3)), i = r - (n && r >= 125 ? 60 : 0);
	return `${Math.floor(i / 60)}:${String(i % 60).padStart(2, "0")}`;
}
//#endregion
//#region app/home-video.mjs
var Fe = e.slice(0, 3);
function Ie(e = document.querySelector("[data-home-video]"), { fetchImpl: t = fetch, requestImpl: r = ce, pollImpl: a = se } = {}) {
	if (!e) return () => {};
	let o = document.documentElement.lang.startsWith("zh"), s = (e, t) => o ? t : e, c = (t) => e.querySelector(`[data-home-${t}]`), l = c("form"), u = c("prompt"), d = c("duration"), p = c("ratio"), m = c("file"), h = c("reference"), g = c("reference-grid") || Object.assign(document.createElement("div"), { className: "home-reference-grid" });
	g.parentNode || (g.dataset.homeReferenceGrid = "", h.append(g)), m.multiple = !0, c("thumb")?.remove(), c("remove")?.remove();
	let _ = c("generate"), v = c("status"), y = c("player"), b = c("pending"), x = c("result"), S = c("examples"), w = [...c("model").options].find((e) => e.value === "minimax-h3") || c("model").options[0], T = w.textContent, ee = e.querySelector(".home-resolution strong"), te = ee?.textContent, ne = c("choose").querySelector("small"), re = ne?.textContent, E = [], D = "text", O = !1, k = !1, A = !1, j = !0, M = null, N = "", P = !1, F = null, I = 0, L = !1, ae = 0, oe = !1, R = !1, z = 0, B, V, H = "", U = 9, W = "", fe = Promise.resolve(), pe = !1, me = e.querySelector(".home-live-dot"), he = me?.textContent, G = Ne({
		host: c("preview"),
		before: c("example-pagination") || x,
		isAuthenticated: () => !j,
		zh: o,
		onElapsed: (e) => {
			me && (me.textContent = e === null ? he : s("Waiting ", "已等待 ") + Pe(0, e, !0), me.style.fontVariantNumeric = "tabular-nums");
		}
	}), ge = [], K = (e, t, n) => {
		e?.addEventListener(t, n), ge.push(() => e?.removeEventListener(t, n));
	};
	function q(e, t = !1) {
		v.textContent = e, v.classList.toggle("is-error", t && !O);
	}
	let _e = () => j && M !== null && M < 5, ve = () => De({
		guest: j,
		remaining: M,
		duration: d.value,
		freeBudgetBlocked: oe,
		paidRemaining: ae
	}), J = () => j ? U : 9, ye = () => s("This trial supports 1 reference image. Remove extra images to continue.", "本次试用支持 1 张参考图，请移除多余图片后继续。"), be = () => J() === 1 ? ye() : s("Seedance 2.5 supports up to 9 reference images.", "Seedance 2.5 最多支持 9 张参考图。");
	function Y() {
		let t = _e() && !O && !L;
		c("example-source") && (c("example-source").hidden = O || L || P), c("example-pagination") && (c("example-pagination").hidden = O || L || P), Ae(d, j, (e) => s(`${e} seconds`, `${e} 秒`)), c("duration-hint") && (c("duration-hint").hidden = !j);
		for (let e of d.options) e.disabled = j && Number(e.value) !== 5 || M !== null && Number(e.value) > M;
		j && !O && !L && (d.value = "5"), !O && M !== null && M < Number(d.value) && M >= 5 && (d.value = "5");
		let r = ve(), a = r === "generate" || r === "paid-generate", o = D === "reference" && E.length > J();
		_.disabled = O || L || R || a && (!u.value.trim() || D === "reference" && !E.length || o), _.textContent = R ? s("Opening checkout…", "正在打开付款…") : O ? s("Generating…", "正在生成…") : r === "auth" ? s("Log in and buy credits to continue", "登录并购买积分后继续") : r === "buy" ? s("Buy Credits", "购买积分") : r === "paid-generate" ? s(`Generate with purchased credits · ${d.value} credits`, `使用购买积分生成 · ${d.value} 积分`) : j ? s("Generate for free ↗", "免费生成视频 ↗") : s("Generate video ↗", "生成视频 ↗"), c("exhausted").hidden = !t;
		let l = c("account-notice");
		l && (l.hidden = j || !["buy", "paid-generate"].includes(r), l.textContent = s("Not enough credits. Purchased credits never expire.", "积分不足，购买积分永久有效。")), d.disabled = p.disabled = u.disabled = m.disabled = c("model").disabled = O || L || R, e.querySelectorAll("[data-home-mode]").forEach((e) => {
			e.disabled = O || L || R, e.setAttribute("aria-pressed", String(e.dataset.homeMode === D));
		}), c("choose").disabled = O || L || R || E.length >= J(), m.multiple = J() > 1, w.textContent = i(j && H || T), ee && (ee.textContent = n(j && W || te)), g.querySelectorAll("button").forEach((e) => {
			e.disabled = O || L || R;
		}), h.hidden = D !== "reference";
		let y = [...p.options].find((e) => e.value === "1:1");
		y && (y.disabled = !1);
		let b = f(p.value);
		g.querySelectorAll("img").forEach((e) => {
			e.style.aspectRatio = `${b.width} / ${b.height}`;
		}), c("reference-count") && (c("reference-count").textContent = `${E.length} / ${J()}`), c("filename").textContent = J() === 1 ? s("Choose or paste one image", "选择或粘贴一张参考图") : E.length ? s("Add more images", "继续添加参考图") : s("Choose or paste images", "选择或粘贴参考图"), ne && (ne.textContent = J() === 1 ? s("1 first-frame image · PNG / JPEG / WebP · 10 MB", "1 张首帧参考图 · PNG / JPEG / WebP · 最大 10 MB") : re), o && !O && !L ? q(be(), !0) : [ye(), be()].includes(v.textContent) && q(s("Reference images ready.", "参考图已就绪。")), c("balance").textContent = M === null ? s("10 free seconds · no sign-up or login", "10 秒免费额度 · 无需注册和登录") : j ? s(`${M} free seconds remaining`, `实际剩余 ${M} 秒免费额度`) : s(`${M} credits available`, `可用 ${M} 积分`), c("balance").classList.toggle("is-insufficient", M !== null && M < Number(d.value) && !O && !L), c("cost").textContent = j ? s(`This video: ${d.value}s free`, `本次免费 ${d.value} 秒`) : s(`This video: ${d.value} credits`, `本次 ${d.value} 积分`);
	}
	function xe(e) {
		e && (M = e.remaining, e.context && (j = e.context === "guest-video"), (e.context === "account" || e.context === "guest-video") && window.dispatchEvent(new CustomEvent("seedance:credits-updated", { detail: e })), Y());
	}
	async function X() {
		let n = ++z;
		B?.abort();
		let r = new AbortController();
		B = r;
		try {
			let i = await t("/api/credits/balance?guest_video=1", {
				headers: await C(),
				credentials: "same-origin",
				cache: "no-store",
				signal: r.signal
			}), a = await i.json();
			if (!k && n === z && i.ok && Number.isSafeInteger(a.credits?.remaining)) {
				j = a.credits.guest === !0, M = a.credits.remaining, H = j && typeof a.credits.videoModelName == "string" ? a.credits.videoModelName : "", U = j && a.credits.maxReferences === 1 ? 1 : 9, W = j && a.credits.videoResolutionLabel === "768P" ? "768P" : "", ae = a.credits.paidRemaining || 0, Y(), clearTimeout(V);
				let t = document.querySelector(".home-intro-copy");
				if (t) {
					t.dataset.trialState = j ? "guest" : "account";
					let n = t.querySelector("[data-home-offer-value]");
					n && (n.textContent = j ? "10" : "500"), t.querySelector(".home-free-badge").textContent = j ? s("FREE VIDEO SECONDS", "秒视频免费体验") : s("CREDITS PER PACK", "积分／包"), t.querySelector(".home-guest-benefit strong").textContent = j ? s("No sign-up or login required", "无需注册或登录，即可试用") : s("Purchased credits never expire.", "购买积分永久有效。"), t.querySelector(".home-member-offer").hidden = !0;
					let r = t.querySelector(".home-member-purchase");
					r && (r.hidden = !j);
					let i = e.querySelector(".home-network-limit");
					i && (i.hidden = !0);
				}
			}
		} catch {}
	}
	function Z(t, n = !1) {
		if (O || L || R) return;
		I = t;
		let r = Fe[t];
		P || (y.src = r.src, y.poster = r.poster, y.muted = !0, y.loop = !1, c("example-title").textContent = r.title[+!!o], y.play().catch(() => {})), c("example-count").textContent = `${String(t + 1).padStart(2, "0")} / ${String(Fe.length).padStart(2, "0")}`, e.querySelectorAll("[data-home-example-dot]").forEach((e) => {
			e.setAttribute("aria-pressed", String(Number(e.dataset.homeExampleDot) === t));
		}), n && (A = !0, u.value = r.prompt, d.value = "5", p.value = "16:9", D = "text", Y(), u.focus(), e.scrollIntoView({
			behavior: "smooth",
			block: "start"
		}));
	}
	function Se() {
		g.replaceChildren();
		for (let [e, t] of E.entries()) {
			let n = Object.assign(document.createElement("div"), { className: "home-reference-item" }), r = Object.assign(document.createElement("img"), {
				src: t.url,
				alt: s(`Image ${e + 1}: ${t.file.name}`, `参考图 ${e + 1}：${t.file.name}`)
			}), i = Object.assign(document.createElement("span"), { textContent: s(`Image ${e + 1}`, `参考图 ${e + 1}`) }), a = Object.assign(document.createElement("button"), {
				type: "button",
				textContent: "×"
			});
			a.dataset.homeRemoveReference = String(e), a.setAttribute("aria-label", s(`Remove reference image ${e + 1}`, `移除参考图 ${e + 1}`)), n.append(r, i, a), g.append(n);
		}
	}
	function Q(e, { restoring: t = !1 } = {}) {
		if (O || L || R && !t || !e.length) return !1;
		if (e.length + E.length > J()) return q(be(), !0), !1;
		try {
			ie(e, { existingCount: E.length });
		} catch (e) {
			return q(e.message, !0), !1;
		}
		return E.push(...e.map((e) => ({
			file: e,
			url: URL.createObjectURL(e)
		}))), t || (A = !0), q(s("Reference images ready.", "参考图已就绪。")), Se(), Y(), !0;
	}
	let Ce = () => ({
		prompt: u.value,
		duration: Number(d.value),
		aspectRatio: p.value,
		mode: D,
		files: E.map((e) => e.file),
		taskId: N
	});
	K(window, "seedance:home-before-leave", (e) => {
		e.detail.promises.push(fe.then(() => {
			if (O && !N) throw Error("Wait for the current submission");
			if (pe && !A) throw Error("Restore the references before leaving");
			return ue(Ce());
		}));
	}), K(window, "seedance:home-purchase-state", (e) => {
		R = e.detail.busy, Y();
	}), K(window, "seedance:auth-changed", () => {
		oe = !1, M = null, X();
	}), K(window, "seedance:account-changed", () => {
		oe = !1, M = null, X();
	}), K(window, "seedance:payment-verified", () => {
		X();
	}), K(window, "focus", () => {
		X();
	});
	async function we(e) {
		e.preventDefault(), await $(e.currentTarget.href);
	}
	async function $(e) {
		try {
			await ue(Ce()), F?.abort(), window.location.assign(e);
		} catch {
			q(s("Could not transfer the draft. Please try again.", "草稿暂时无法转入工作台，请重试。"), !0);
		}
	}
	document.querySelectorAll("[data-video-workbench]").forEach((e) => K(e, "click", we));
	async function Te(e = "", n = !1) {
		if (O || k) return;
		let i = Ce();
		e && (L = !0), O = !0, P = !1, F = new AbortController(), G.start(e), b.hidden = !1, x.hidden = !0, S.hidden = !0, y.hidden = !0, y.pause(), q(s(e ? "Checking your video…" : "Preparing your video…", e ? "正在查看生成进度…" : "正在准备生成…")), Y(), matchMedia("(max-width: 760px)").matches && c("preview").scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
		try {
			e || await ue(i).catch(() => {});
			let o = {
				fetchImpl: t,
				signal: F.signal,
				onStatus(e) {
					if (k) return;
					xe(e.credits);
					let t = e.status === "queued" ? s("Queued for generation…", "已排队，等待生成…") : e.status === "running" ? s("Generating your video…", "正在生成视频…") : s("Checking generation progress…", "正在查看生成进度…");
					c("pending-text").textContent = t, q(t);
				}
			}, l = e ? await a({
				...o,
				taskId: e
			}) : await r({
				...o,
				prompt: i.prompt,
				duration: i.duration,
				aspectRatio: i.aspectRatio,
				referenceFiles: i.mode === "reference" ? i.files : [],
				paidOnly: n || !j,
				onTask(e) {
					N = e, L = !0, G.bindTask(e);
					let t = b.querySelector("[data-creation-recovery]") || document.createElement("a");
					t.dataset.creationRecovery = "", t.hidden = j, t.href = s("/creations", "/zh/creations"), t.textContent = s("You can return later · My creations ↗", "可稍后回来查看 · 我的作品 ↗"), b.append(t);
					try {
						sessionStorage.setItem(le, e), sessionStorage.setItem("seedance:video:active-model", "minimax-h3");
					} catch {}
				}
			});
			if (k) return;
			xe(l.credits), P = !0, L = !1, G.stop({
				clearSaved: !0,
				completed: !0,
				onReadyClick: () => c("preview").scrollIntoView({
					behavior: "smooth",
					block: "center"
				})
			}), y.src = l.videoUrl, y.muted = !1, y.loop = !1, y.hidden = !1, b.hidden = !0, x.hidden = !1, c("download").href = l.videoUrl, c("example-title").textContent = s("Your generated video", "你的生成结果"), sessionStorage.removeItem(le), sessionStorage.removeItem("seedance:video:active-model"), q(s("Your video is ready. Download it or continue in the workspace.", "视频已生成，可下载或进入工作台继续创作。"));
		} catch (e) {
			if (k || e.name === "AbortError") return;
			xe(e.credits), G.stop({ clearSaved: !(!e.terminal && e.status !== 404 && e.code !== "INVALID_VIDEO_TASK" && N) }), ["FREE_BUDGET_EXCEEDED", "NETWORK_FREE_BUDGET_EXCEEDED"].includes(e.code) && (oe = !0), e.code === "AUTH_REQUIRED" && window.dispatchEvent(new CustomEvent("seedance:home-auth", { detail: { mode: "login" } })), (e.terminal || e.status === 404 || e.code === "INVALID_VIDEO_TASK") && (sessionStorage.removeItem(le), N = "", L = !1), b.hidden = !0, N ? (c("resume").hidden = !1, q(s("Your task is saved. Continue checking or open the workspace.", "任务已保存，可继续查看进度或进入工作台。"))) : (S.hidden = !1, y.hidden = !1, Z(I), q(e.message || s("Please try again.", "请重试。")));
		} finally {
			O = !1, !P && !N && Z(I), Y(), k || X();
		}
	}
	K(l, "submit", (e) => {
		if (e.preventDefault(), _.disabled) return;
		let t = ve();
		if (t === "auth") {
			window.dispatchEvent(new CustomEvent("seedance:home-auth", { detail: { mode: "register" } }));
			return;
		}
		if (t === "buy") {
			window.dispatchEvent(new Event("seedance:home-buy"));
			return;
		}
		G.prepareNotifications(), N = "", Te("", t === "paid-generate");
	});
	let Ee = () => {
		A = !0, Y();
	};
	K(u, "input", Ee), K(d, "change", Ee), K(p, "change", Ee), K(m, "change", () => {
		Q([...m.files || []]), m.value = "";
	}), K(c("choose"), "click", () => m.click()), K(g, "click", (e) => {
		let t = e.target.closest("[data-home-remove-reference]");
		if (!t || O || L || R) return;
		let n = Number(t.dataset.homeRemoveReference);
		Number.isInteger(n) && E[n] && (URL.revokeObjectURL(E[n].url), E.splice(n, 1), A = !0, Se(), Y());
	}), K(c("resume"), "click", () => {
		G.prepareNotifications(), c("resume").hidden = !0, Te(N);
	}), e.querySelectorAll("[data-home-mode]").forEach((e) => K(e, "click", () => {
		D = e.dataset.homeMode, Ee();
	})), K(y, "ended", () => {
		!O && !L && !P && !k && Z((I + 1) % Fe.length);
	}), K(c("try"), "click", () => Z(I, !0)), e.querySelectorAll("[data-home-example-dot]").forEach((e) => {
		K(e, "click", () => {
			P || Z(Number(e.dataset.homeExampleDot));
		});
	}), document.querySelectorAll("[data-home-focus]").forEach((t) => K(t, "click", (t) => {
		t.preventDefault(), e.scrollIntoView({
			behavior: "smooth",
			block: "start"
		}), !O && !L && u.focus({ preventScroll: !0 });
	})), K(e, "paste", (e) => {
		if (D !== "reference" || O || L || R) return;
		let t = [...e.clipboardData?.files || []].filter((e) => e.type.startsWith("image/"));
		t.length && Q(t) && e.preventDefault();
	});
	let Oe = de({
		consume: !1,
		maxAgeMs: 864e5
	}).then((e) => {
		if (!e || k || A) return;
		u.value = e.prompt, d.value = String(e.duration === 15 ? 10 : e.duration), p.value = e.aspectRatio, D = e.mode;
		let t = e.files ?? (e.file ? [e.file] : []);
		t.length && !Q(t, { restoring: !0 }) && (pe = !0), Y();
	}).catch(() => {
		pe = !0, q(s("Could not restore your draft. Please reselect your reference images.", "无法恢复草稿，请重新选择参考图。"), !0);
	});
	fe = Oe, Z(0), Y(), X(), Oe.then(() => {
		let e = sessionStorage.getItem(le);
		e && !k && (N = e, Te(e));
	});
	let ke = () => {
		k = !0, F?.abort(), G.destroy(), z++, B?.abort(), clearTimeout(V), E.forEach((e) => URL.revokeObjectURL(e.url)), ge.forEach((e) => e());
	};
	return K(window, "pagehide", ke), ke;
}
if (typeof document < "u") {
	ke();
	let e = Ie();
	window.addEventListener("pageshow", (t) => {
		t.persisted && (e(), e = Ie());
	});
}
//#endregion
export { Fe as HOME_VIDEO_EXAMPLES, Ie as initializeHomeVideo };
