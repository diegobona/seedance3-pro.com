import { policies as refundPolicies } from './refund-policy-content.mjs';
import { REGISTERED_FREE_CREDITS_ENABLED } from './credit-policy.mjs';
import { SITE_OPERATOR, SUPPORT_EMAIL, POLICY_UPDATED_AT } from './site-trust.mjs';
import { localizedPath } from './site-locale.mjs';

const mail = `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`;
const link = (path, label, locale) => `<a href="${localizedPath(path, locale)}">${label}</a>`;
const section = (id, title, content) => ({ id, title, content });

export const LEGAL_PAGE_SLUGS = Object.freeze(['about', 'privacy', 'refund-policy', 'terms']);

export function getLegalContent(slug, locale = 'en') {
  const zh = locale === 'zh';
  const pages = zh ? chinesePages() : englishPages();
  const page = pages[slug];
  if (!page) throw new Error(`Unknown policy page: ${slug}`);
  if (slug === 'refund-policy') return { ...page, ...refundPolicies[zh ? 'zh' : 'en'], description: zh ? '积分包全额与部分退款、申请方式、处理状态和到账时间。' : 'Full and partial credit pack refunds, how to apply, request status and processing times.', lead: zh ? '了解积分包退款与积分返还，以及如何提交退款申请。' : 'Learn about credit pack refunds, credit returns and how to submit a refund request.', slug, locale, updatedAt: '2026-11-01' };
  return { ...page, slug, locale, updatedAt: ['terms', 'refund-policy'].includes(slug) ? '2026-10-26' : ['privacy', 'about'].includes(slug) ? '2026-10-24' : POLICY_UPDATED_AT };
}

function englishPages() {
  return {
    about: {
      title: 'About & contact',
      description: 'Who operates seedance3-pro.com, what the service offers, and how to contact support.',
      lead: 'Tools for creating images, generating videos, and preparing pose references in one workspace.',
      sections: [
        section('operator', 'Who operates this website', `<p>seedance3-pro.com is operated by <strong>${SITE_OPERATOR}</strong> (ColdStone 科技有限公司). This company is responsible for the website, credit purchases, and customer support.</p>`),
        section('service', 'What you can do here', `<p>The workspace brings together AI image and video generation and pose reference tools. You can prepare reference images, choose an available model, and use credits for generation.</p><p>Model availability, supported inputs, output settings, and credit costs are shown in the ${link('/app', 'current workspace', 'en')} and on our ${link('/pricing', 'pricing page', 'en')}. Model and product names identify the capabilities offered; their names and trademarks belong to their respective owners.</p>`),
        section('support', 'Contact support', `<div class="trust-callout"><address><strong>Support and policy requests</strong><br>${mail}</address><p>Please include a clear description and, for a purchase issue, your account email and order reference. Never send your full card number, security code, password, or login token.</p></div><p>For generation problems, a task ID and approximate time can help us investigate. Please avoid attaching sensitive personal information unless it is necessary for your request.</p>`),
        section('policies', 'Before you purchase', `<p>Read our ${link('/refund-policy', 'refund policy', 'en')} for unused credit packs and payment issues, ${link('/terms', 'terms of service', 'en')} for credit and service rules, and ${link('/privacy', 'privacy policy', 'en')} for how information is handled.</p>`),
      ],
    },
    privacy: {
      title: 'Privacy policy',
      description: 'How ColdStone Technology Co., Ltd. handles account, generation, payment, and browser information on seedance3-pro.com.',
      lead: 'This policy explains what information our service handles, why we use it, and how to contact us about it.',
      sections: [
        section('responsibility', '1. Operator and contact', `<p>${SITE_OPERATOR} operates seedance3-pro.com. For privacy questions or requests, email ${mail}.</p>`),
        section('information', '2. Information we handle', `<p><strong>Guest trials before registration:</strong> we record guest identifiers, trial usage, and pseudonymous network identifiers derived from your IP address to manage free allowances and prevent abuse. We also use a best-effort device fingerprint based on browser-exposed system, graphics, screen, processor, time-zone and font characteristics. These characteristics are hashed in your browser; the server stores a keyed hash to help prevent repeat trial claims across browsers or networks. We do not receive the raw characteristics or use the fingerprint to grant access to your account or creations. Similar devices may match, and privacy settings can prevent identification. Signed guest-trial cookies can remain for up to <strong>1 year</strong>. When you register or sign in, guest usage can be linked to your account to reconcile the free allowance.</p><ul><li><strong>Account and sign-in information:</strong> name, email address, profile image, login provider identifiers and tokens, and authentication sessions. Google sign-in is optional. Sessions can include an IP address and browser or device user-agent information.</li><li><strong>Generation information:</strong> prompts, uploaded reference images, selected model and generation settings, task identifiers and status, output links, and related usage or error information. Some of this information is sent to generation providers rather than stored as a complete prompt history in our task database.</li><li><strong>Credits and purchases:</strong> credit balances and transactions, order and payment references, amounts, currency, payment status, and refund or dispute records.</li><li><strong>Visit and referral information:</strong> random visitor and visit identifiers, entry page paths, referral source, and visit times. This helps attribute visits and understand how people reach the service.</li></ul>`),
        section('purposes', '3. How we use it', `<p>We use this information to sign you in, process generation requests, display and reconcile credits, verify payments, investigate failures and disputes, respond to support requests, protect the service against abuse, and understand referral traffic.</p><p>Please provide only information you are authorized to use. Avoid uploading confidential or sensitive personal material that is unnecessary for generation.</p>`),
        section('providers', '4. Service providers and sharing', `<p>Our service relies on third-party infrastructure and generation services:</p><ul><li><strong>Cloudflare:</strong> website and API infrastructure, D1 account and service records, and R2 storage used for uploaded video reference images.</li><li><strong>Generation providers:</strong> image requests are routed through Tuzi; video requests use AutoDL or CompShare according to the selected workflow. Relevant prompts, reference images, and generation settings are shared to complete a request.</li><li><strong>Stripe:</strong> payment checkout and payment, refund, and dispute processing. Payment information is entered in Stripe checkout; our service uses payment references and status to manage your order.</li><li><strong>Google:</strong> if you choose Google sign-in, Google handles its part of authentication and provides the account information needed to sign you in.</li></ul><p>These providers handle information under their own terms and privacy practices, which may differ from ours. Their processing and retention can depend on the service used. Historical records or backups may also remain in the Neon database used before our database migration.</p><p>Information needed for a support request is also handled through our support email. We may disclose relevant records when required by applicable law or to address fraud, security incidents, or a payment dispute.</p>`),
        section('browser', '5. Cookies and browser storage', `<p>We use cookies for sign-in and language preferences. Referral tracking uses a random visitor cookie with a lifetime of up to <strong>1 year</strong> and a visit/source cookie of about <strong>30 minutes</strong>.</p><p>The browser also stores information needed by the workspace: IndexedDB can hold reference images while handing them from the homepage to the workspace, sessionStorage can hold drafts and task identifiers, and localStorage can carry sign-in events between tabs. Closing a tab does not guarantee that every local item has been removed.</p><p>You can manage cookies and website storage in your browser. Clearing them may sign you out, remove local drafts or references, or interrupt a generation handoff.</p>`),
        section('retention', '6. Storage and retention', `<p>We retain account, credit, order, and service records for operating the service and handling support, accounting, fraud prevention, and disputes. Retention depends on the type of record and the reason it is needed; there is no single automatic deletion period for all data.</p><p>Uploaded video reference links usually stop being accessible after about <strong>24 hours</strong>. Link expiry does not mean the underlying file has been physically deleted at that moment; storage cleanup may occur later. Generation output links can also depend on the provider's availability and retention.</p><p>Browser copies, provider records, historical databases, and backups can have different retention periods. Save any outputs you wish to keep.</p>`),
        section('requests', '7. Your choices and requests', `<p>Email ${mail} to request access to, correction of, or deletion of your personal information, or to raise a privacy concern. Include the email associated with your account and describe what you need. We may ask for information necessary to verify your identity.</p><p>We review requests manually. Some records may need to be retained for transactions, disputes, security, or applicable obligations. We will explain relevant limitations when responding.</p>`),
        section('changes', '8. Changes to this policy', `<p>We will publish updates on this page with a revised date. For questions about the service or payment rules, see ${link('/about', 'About & contact', 'en')}, the ${link('/refund-policy', 'refund policy', 'en')}, and the ${link('/terms', 'terms of service', 'en')}.</p>`),
      ],
    },
    'refund-policy': {
      title: 'Refund policy',
      description: 'Conditions for unused credit pack refunds, duplicate charges, non-delivery, and generation credit returns.',
      lead: 'A failed generation credit return and a refund of a payment are different processes. Here is how each is handled.',
      sections: [
        section('unused', '1. Completely unused credit packs', `<div class="trust-callout"><p>You can request a full refund within <strong>7 calendar days of purchase</strong> if the purchased credit pack is <strong>completely unused</strong>.</p></div><p>If any purchased credits from that pack have been used, we do not routinely offer a partial refund for the remaining credits. ${REGISTERED_FREE_CREDITS_ENABLED ? 'Free daily credits and purchased credits are separate balances; we review the usage attributable to the purchased pack.' : 'We review the usage attributable to the purchased pack.'}</p><p>Duplicate charges and verified non-delivery are reviewed separately from this unused-pack rule. Please contact us even if the 7-day period has passed when either of those problems applies.</p>`),
        section('generation', '2. Failed generations and credit returns', `<p>Confirmed generation failures return credits to their original credit source under the service's generation rules. ${REGISTERED_FREE_CREDITS_ENABLED ? "Daily credits that have already expired are not added to a new day's allowance. " : ''}For multiple-image requests, charges are based on the images delivered.</p><p>A generation credit return changes your credit balance; it does not send money back to your payment method. If a task is stuck or a credit return appears missing, contact support with the task ID and approximate generation time so we can review it.</p>`),
        section('request', '3. How to request a payment refund', `<p>Email ${mail} with:</p><ul><li>The email address on your account.</li><li>Your order reference or payment receipt reference.</li><li>The purchase date and the reason for your request.</li></ul><p>If you believe there is a duplicate charge or that purchased credits were not delivered, describe the issue and include the relevant order references. <strong>Do not send your full card number, card security code, password, or login token.</strong></p>`),
        section('review', '4. Credits during a refund or dispute', `<p>When a refund or payment dispute is recorded, the <strong>full credit pack associated with that payment is revoked</strong>, including any remaining credits. <strong>Purchases and generation are paused pending manual review.</strong> ${REGISTERED_FREE_CREDITS_ENABLED ? 'This process does not revoke daily free credits, although generation remains paused during the review. ' : ''}Previously used purchased credits can leave a shortfall that needs to be reviewed.</p><p>If a refund fails or is canceled, or a dispute is resolved, credit access may still require support review. Contact us rather than assuming that credits or account access will restore automatically.</p>`),
        section('timing', '5. Approved refunds and timing', `<p>Approved refunds are returned through the <strong>original payment method</strong>. They generally take <strong>5–10 business days</strong> to appear, depending on Stripe, your bank, and the payment method. Some cases can take longer.</p><p>If an approved refund has not appeared after the expected processing period, reply to the support conversation with your order reference so we can check its status.</p>`),
        section('rights', '6. Your statutory rights', `<p>This policy does not limit any mandatory consumer rights or remedies available under applicable law.</p><p>For related information, read the ${link('/terms', 'terms of service', 'en')} and ${link('/privacy', 'privacy policy', 'en')}, or visit ${link('/about', 'About & contact', 'en')}.</p>`),
      ],
    },
    terms: {
      title: 'Terms of service',
      description: 'Service, account, credit, and generation rules for seedance3-pro.com, operated by ColdStone Technology Co., Ltd.',
      lead: 'These terms describe how to use the workspace and its credit-based generation service.',
      sections: [
        section('service', '1. The service and operator', `<p>seedance3-pro.com is operated by ${SITE_OPERATOR}. By using the service, you agree to these terms. Contact ${mail} for service or billing questions.</p><p>The service provides access to available image and video generation workflows and pose reference tools. Check the current workspace for supported models, settings, and costs. Model availability and provider capabilities can change.</p>`),
        section('account', '2. Your account and content', `<p>Provide accurate account information and keep your sign-in credentials secure. You are responsible for activity you authorize through your account and for having the rights and permissions needed to submit your prompts, reference images, and other content.</p><p>Use the service lawfully. Do not upload unlawful or infringing material, violate another person's privacy, attempt to bypass access or credit controls, disrupt the service, or use it for fraud or abuse. We may restrict access when reasonably needed to investigate misuse, protect the service, or comply with applicable obligations.</p>`),
        section('credits', '3. Credits and payment', `<p>Generation uses credits at the rate displayed in the workspace. ${REGISTERED_FREE_CREDITS_ENABLED ? 'Daily free credits and purchased credits share the service but have separate balances. Daily credits are used first; unused daily credits expire at the daily reset and do not accumulate.' : 'Guests can use the existing one-time trial. After the trial is used up, sign in and purchase a credit pack to continue generating.'}</p><p>Credit packs are one-time purchases with no subscription or automatic renewal. Purchased credits never expire. Prices and pack details are shown on the ${link('/pricing', 'pricing page', 'en')} and before checkout. Credits are added after server-side payment verification.</p><p>Keep your payment receipt and consult your billing page for orders and credit records. Contact support if payment succeeds but your credits do not appear.</p>`),
        section('generation', '4. Generation and outputs', `<p>AI outputs can vary and may contain errors or unexpected content. Review outputs before using or publishing them, including for accuracy, suitability, and any rights or permissions your use requires. An output is not a guarantee of originality or suitability for a particular purpose.</p><p>Generation time and availability depend on the selected workflow and service providers. Confirmed failures return credits to the original credit source${REGISTERED_FREE_CREDITS_ENABLED ? '; expired daily credits are not carried into a new day.' : '.'} Multiple-image requests are charged for delivered images. Contact support about unresolved tasks or missing credit returns.</p><p>Save outputs that you want to keep. The availability of stored files and provider output links can vary.</p>`),
        section('refunds', '5. Refunds and payment review', `<p>The ${link('/refund-policy', 'refund policy', 'en')} explains the 7-calendar-day refund condition for a completely unused purchased pack and the separate review of duplicate charges or verified non-delivery.</p><p>A recorded refund or dispute revokes the full pack associated with a payment and pauses purchases and generation pending manual review. ${REGISTERED_FREE_CREDITS_ENABLED ? 'Daily free credits are not revoked by this process. ' : ''}Failed or canceled refunds and resolved disputes may require support review before access is restored. Mandatory consumer rights remain available.</p>`),
        section('privacy', '6. Privacy and changes', `<p>The ${link('/privacy', 'privacy policy', 'en')} explains account, generation, payment, and browser data handling, including third-party providers. We will publish revised terms here when these terms change.</p><p>For support, email ${mail}. See ${link('/about', 'About & contact', 'en')} for what to include in your request.</p>`),
      ],
    },
  };
}

function chinesePages() {
  return {
    about: {
      title: '关于与联系',
      description: '了解 seedance3-pro.com 的运营主体、图片与视频生成服务，以及客服联系方式。',
      lead: '在同一个工作区内生成图片与视频，并准备姿势参考素材。',
      sections: [
        section('operator', '网站由谁运营', `<p>seedance3-pro.com 由 <strong>${SITE_OPERATOR}</strong>（ColdStone 科技有限公司）运营。该公司负责网站运营、积分购买与客户支持。</p>`),
        section('service', '我们提供的服务', `<p>工作区提供 AI 图片生成、视频生成和姿势参考工具。你可以准备参考图、选择可用模型，并使用积分发起生成。</p><p>可用模型、支持的输入、输出设置与积分费用，以${link('/app', '当前工作区', 'zh')}和${link('/pricing', '价格页面', 'zh')}展示的信息为准。页面中的模型与产品名称用于说明可用能力，其名称及商标归各自权利人所有。</p>`),
        section('support', '联系客服', `<div class="trust-callout"><address><strong>客服与政策申请邮箱</strong><br>${mail}</address><p>请清楚描述问题；涉及购买时，请提供账户邮箱与订单编号。请勿发送完整银行卡号、安全码、密码或登录令牌。</p></div><p>生成问题可以附上任务编号和大致发生时间，方便我们排查。除非处理请求确有必要，请避免在附件中加入敏感个人信息。</p>`),
        section('policies', '购买前了解', `<p>请阅读${link('/refund-policy', '退款政策', 'zh')}了解未使用积分包和支付问题的处理方式，阅读${link('/terms', '服务条款', 'zh')}了解积分与服务规则，并通过${link('/privacy', '隐私政策', 'zh')}了解信息处理方式。</p>`),
      ],
    },
    privacy: {
      title: '隐私政策',
      description: 'ColdStone Technology Co., Ltd. 在 seedance3-pro.com 处理账户、生成、支付和浏览器信息的方式。',
      lead: '本政策说明服务会处理哪些信息、处理目的，以及你可以如何联系我们。',
      sections: [
        section('responsibility', '1. 运营主体与联系方式', `<p>seedance3-pro.com 由 ${SITE_OPERATOR}（ColdStone 科技有限公司）运营。如有隐私问题或申请，请发送邮件至 ${mail}。</p>`),
        section('information', '2. 我们处理的信息', `<p><strong>注册前的游客试用：</strong>为管理免费额度和防范滥用，我们会记录游客标识、试用用量，以及由 IP 地址生成的非直接识别网络标识。我们也会根据浏览器提供的系统、显卡、屏幕、处理器、时区和字体特征，生成用于辅助判断的设备指纹。特征在浏览器内经过哈希处理，服务端保存再次加密处理后的标识，用于防范跨浏览器或更换网络后重复领取。我们不会接收原始特征，也不会通过设备指纹授予账户或生成内容的访问权限。配置相近的设备可能被识别为相同设备，隐私设置也可能使识别失效。带签名的游客试用 Cookie 最长可保留 <strong>1 年</strong>。注册或登录时，游客用量可能与账户关联，以核对免费额度。</p><ul><li><strong>账户与登录信息：</strong>姓名、邮箱、头像、登录服务方标识与令牌，以及登录会话。Google 登录为可选方式。会话记录可能包括 IP 地址和浏览器或设备的 User-Agent 信息。</li><li><strong>生成信息：</strong>提示词、上传的参考图、所选模型与生成参数、任务编号与状态、结果链接，以及相关用量或错误信息。其中部分信息会发送给生成服务商，并非全部作为完整提示词历史保存在我们的任务数据库中。</li><li><strong>积分与购买信息：</strong>积分余额与变动、订单与支付编号、金额、币种、支付状态，以及退款或争议记录。</li><li><strong>访问与来源信息：</strong>随机访客标识、访问标识、入口页面路径、访问来源与时间，用于来源归因和了解用户如何访问服务。</li></ul>`),
        section('purposes', '3. 信息用途', `<p>我们使用这些信息完成登录、处理生成请求、展示和核对积分、验证付款、排查失败与争议、回复客服请求、防范滥用，以及了解访问来源。</p><p>请仅提交你有权使用的信息，并避免上传生成所不需要的机密资料或敏感个人信息。</p>`),
        section('providers', '4. 服务商与信息共享', `<p>服务使用第三方基础设施与生成服务：</p><ul><li><strong>Cloudflare：</strong>提供网站和 API 基础设施，D1 用于账户与服务记录，R2 用于视频参考图等上传存储。</li><li><strong>生成服务商：</strong>图片请求经由 Tuzi 处理；视频请求根据所选流程使用 AutoDL 或 CompShare。为完成请求，我们会向相应服务商发送所需的提示词、参考图和生成参数。</li><li><strong>Stripe：</strong>提供支付结账以及支付、退款和争议处理。支付信息在 Stripe 结账页面填写；我们使用支付编号与状态管理订单。</li><li><strong>Google：</strong>当你选择 Google 登录时，Google 处理其身份验证环节，并提供完成登录所需的账户信息。</li></ul><p>这些服务商按照各自的条款与隐私做法处理信息，其处理和保留方式可能与我们不同，也取决于使用的服务。数据库迁移前使用的 Neon 数据库中，也可能保留历史记录或备份。</p><p>客服请求所需信息也会通过客服邮箱处理。在适用法律要求，或处理欺诈、安全事件和支付争议时，我们可能提供相关记录。</p>`),
        section('browser', '5. Cookie 与浏览器存储', `<p>我们使用 Cookie 维持登录和语言偏好。访问来源追踪使用最长约 <strong>1 年</strong>的随机访客 Cookie，以及约 <strong>30 分钟</strong>的访问或来源 Cookie。</p><p>浏览器也会保存工作区运行所需的信息：IndexedDB 可在首页向工作区交接参考图时暂存图片；sessionStorage 可保存草稿与任务编号；localStorage 可用于在标签页之间传递登录状态事件。关闭标签页不代表所有本地数据都已清除。</p><p>你可以通过浏览器设置管理 Cookie 和网站存储。清除后可能需要重新登录，也可能移除本地草稿或参考图，或中断生成素材的交接。</p>`),
        section('retention', '6. 存储与保留时间', `<p>我们会为服务运行、客服、账务、反欺诈和争议处理保留必要的账户、积分、订单与服务记录。保留时间取决于记录类型和用途；目前并非所有数据都适用同一个自动删除期限。</p><p>上传的视频参考图链接通常在约 <strong>24 小时</strong>后无法访问。链接过期不代表文件已在同一时刻从存储中物理删除，实际清理可能延后。生成结果链接的可用时间也可能取决于服务商。</p><p>浏览器副本、服务商记录、历史数据库和备份可能有不同的保留时间。请自行保存需要长期保留的生成结果。</p>`),
        section('requests', '7. 你的选择与申请', `<p>如需申请访问、更正或删除个人信息，或提出隐私问题，请发送邮件至 ${mail}，提供账户关联邮箱并说明申请内容。我们可能要求提供核验身份所必需的信息。</p><p>相关请求由人工审核。交易、争议、安全或适用义务所需的部分记录可能仍需保留；回复时我们会说明相关限制。</p>`),
        section('changes', '8. 政策更新', `<p>本政策有变更时，我们会在此页面公布。服务与支付规则可参阅${link('/about', '关于与联系', 'zh')}、${link('/refund-policy', '退款政策', 'zh')}和${link('/terms', '服务条款', 'zh')}。</p>`),
      ],
    },
    'refund-policy': {
      title: '退款政策',
      description: '了解未使用积分包退款、重复扣款、积分未到账，以及生成失败后积分返还的处理方式。',
      lead: '生成失败后的积分返还，与购买款项退回支付方式，是两种不同的处理流程。',
      sections: [
        section('unused', '1. 完全未使用的积分包', `<div class="trust-callout"><p>如果购买的积分包<strong>完全未使用</strong>，你可以在<strong>购买后 7 个自然日内</strong>申请整包全额退款。</p></div><p>如果该积分包中的购买积分已有使用，我们通常不对剩余积分提供部分退款。${REGISTERED_FREE_CREDITS_ENABLED ? '每日免费积分与购买积分是不同余额；审核时会核对与该购买积分包相关的使用记录。' : '审核时会核对与该购买积分包相关的使用记录。'}</p><p>重复扣款和经核实的积分未到账问题会单独审核。如果遇到这两类问题，即使已超过 7 天，也请联系客服。</p>`),
        section('generation', '2. 生成失败与积分返还', `<p>经确认的生成失败，会按生成规则将积分退回原积分来源。${REGISTERED_FREE_CREDITS_ENABLED ? '已过期的每日积分不会补入新一天的额度。' : ''}一次生成多张图片时，按实际交付的图片计费。</p><p>积分返还只调整积分余额，不会将购买款项退回支付方式。如果任务长时间未完成或积分返还有误，请提供任务编号和大致生成时间，交由客服审核。</p>`),
        section('request', '3. 如何申请款项退款', `<p>请发送邮件至 ${mail}，并提供：</p><ul><li>账户使用的邮箱地址。</li><li>订单编号或付款凭证编号。</li><li>购买日期与申请原因。</li></ul><p>如果存在重复扣款或购买积分未到账，请说明具体情况并附上相关订单编号。<strong>请勿发送完整银行卡号、安全码、密码或登录令牌。</strong></p>`),
        section('review', '4. 退款或支付争议期间的积分', `<p>系统记录退款或支付争议时，会撤销<strong>该笔付款对应的整包积分</strong>，包括其中的剩余积分，并<strong>暂停购买与生成，等待人工审核</strong>。${REGISTERED_FREE_CREDITS_ENABLED ? '此处理不会撤销每日免费积分，但审核期间生成仍会暂停。' : ''}已使用的购买积分可能形成需要审核的积分缺口。</p><p>如果退款失败、被取消，或支付争议已解决，积分与账户使用权限仍可能需要客服审核后恢复。请联系客服确认，不要假定系统会自动恢复。</p>`),
        section('timing', '5. 退款方式与到账时间', `<p>获批的退款将退回<strong>原支付方式</strong>。通常需要 <strong>5–10 个工作日</strong>到账，具体取决于 Stripe、银行及支付方式，部分情况可能需要更长时间。</p><p>如果已批准的退款在预计处理期后仍未到账，请回复原客服邮件并提供订单编号，我们会协助查询状态。</p>`),
        section('rights', '6. 法定权利', `<p>本政策不限制适用法律赋予你的任何强制性消费者权利或救济。</p><p>相关信息请参阅${link('/terms', '服务条款', 'zh')}、${link('/privacy', '隐私政策', 'zh')}和${link('/about', '关于与联系', 'zh')}。</p>`),
      ],
    },
    terms: {
      title: '服务条款',
      description: 'ColdStone Technology Co., Ltd. 运营的 seedance3-pro.com 的账户、积分、生成与服务规则。',
      lead: '这些条款说明工作区和积分生成服务的使用规则。',
      sections: [
        section('service', '1. 服务与运营主体', `<p>seedance3-pro.com 由 ${SITE_OPERATOR}（ColdStone 科技有限公司）运营。使用本服务即表示你同意这些条款。如有服务或账单问题，请联系 ${mail}。</p><p>服务提供当前可用的图片、视频生成流程与姿势参考工具。支持的模型、设置与费用以当前工作区展示为准；模型可用性与服务商能力可能变化。</p>`),
        section('account', '2. 账户与提交内容', `<p>请提供准确的账户信息并妥善保护登录凭证。你需对授权通过账户进行的活动负责，并确保自己拥有提交提示词、参考图及其他内容所需的权利与许可。</p><p>请合法使用服务。不得上传违法或侵权内容、侵犯他人隐私、绕过访问或积分控制、干扰服务，或进行欺诈和滥用。为调查滥用、保护服务或履行适用义务，我们可能在合理必要的范围内限制访问。</p>`),
        section('credits', '3. 积分与付款', `<p>生成按工作区展示的费率消耗积分。${REGISTERED_FREE_CREDITS_ENABLED ? '每日免费积分与购买积分可用于同一服务，但余额分别记录。系统优先使用每日积分；当日未使用的每日积分在每日重置时过期，不会累积。' : '游客可使用现有的一次性试用额度。试用额度用完后，请登录并购买积分包继续生成。'}</p><p>积分包为一次性购买，不包含订阅或自动续费。购买积分永久不过期。价格与积分包内容在${link('/pricing', '价格页面', 'zh')}和结账前展示，积分在服务端验证付款后发放。</p><p>请保留付款凭证，并在账单页查看订单与积分记录。如果付款成功但积分未到账，请联系客服。</p>`),
        section('generation', '4. 生成与结果使用', `<p>AI 生成结果可能变化，也可能出现错误或不符合预期的内容。使用或发布前，请检查其准确性、适用性，以及使用时所需的权利与许可。生成结果不构成对原创性或特定用途适用性的保证。</p><p>生成耗时与可用性取决于所选流程和服务商。经确认的生成失败会将积分退回原来源${REGISTERED_FREE_CREDITS_ENABLED ? '；过期的每日积分不补入新一天。' : '。'}多图请求按实际交付图片计费。对于未解决的任务或缺失的积分返还，请联系客服。</p><p>请自行保存需要保留的结果。存储文件与服务商结果链接的可用时间可能变化。</p>`),
        section('refunds', '5. 退款与支付审核', `<p>${link('/refund-policy', '退款政策', 'zh')}说明了购买后 7 个自然日内、完全未使用积分包的退款条件，以及重复扣款和经核实的积分未到账问题的单独审核方式。</p><p>系统记录退款或争议时，会撤销对应付款的整包积分，并暂停购买与生成，等待人工审核。${REGISTERED_FREE_CREDITS_ENABLED ? '此处理不会撤销每日免费积分。' : ''}退款失败、取消或争议解决后，使用权限可能仍需客服审核恢复。适用的强制性消费者权利不受影响。</p>`),
        section('privacy', '6. 隐私与条款变更', `<p>${link('/privacy', '隐私政策', 'zh')}说明账户、生成、支付与浏览器数据的处理方式，包括第三方服务商。条款变更时，我们会在本页面公布。</p><p>客服邮箱为 ${mail}。提交请求时所需的信息可参阅${link('/about', '关于与联系', 'zh')}。</p>`),
      ],
    },
  };
}
