import fs from 'node:fs/promises';
const dir=new URL('./',import.meta.url);
const read=async n=>JSON.parse(await fs.readFile(new URL(n,dir),'utf8'));
const a=(await read('agent_a.json')).rows;
const b=(await read('agent_b.json')).rows;
const c=(await read('agent_resources.json')).candidates;
const headers=['站名','网址','提交页','类型(目录/资源页/投稿/发布站)','DR','月流量','dofollow','费用','相关度','结论(可交/联系站长/付费/剔除)','原因'];
const row=(name,url,submit,type,dr,traffic,follow,cost,relevance,verdict,reason)=>[name,url,submit,type,dr,traffic,follow,cost,relevance,verdict,reason];
const date='核验2026-11-07。';
const metrics=(url)=>' 指标来源：'+url;
const main=[];
for(const name of ['Futurepedia']){
 const v=a.find(x=>x['站名']===name);
 main.push(row(name,v['网址'],v['提交页'],'目录','未直测DR；Semrush AS39',v['月流量'],'是（样例主产品直链，rel=noopener noreferrer）',v['费用'],'高：AI目录，有视频生成分类','联系站长',date+'首页/联系页正常。旧/submit-tool为404，须向编辑确认当前收录与费用；Runway和invideo主链接均可跟随，样例 https://www.futurepedia.io/tool/runway 。未见该类产品禁令。有限源码扫描未发现隐藏AI指令。'+metrics(v.traffic.source)));
}
const top=b.find(x=>x.name==='TopAI.tools');
main.push(row(top.name,top.url,top.submission_url,'目录','未直测DR；Semrush AS39','385120（Semrush，2026-09，总访问量估算）','是（Try Now主按钮rel为空；同页价格链接nofollow）','US$47一次；US$229含7天推广；未见强制徽章/回链','高：AI目录，有视频生成分类','付费',date+'浏览器成功打开提交页与 https://topai.tools/t/kling4-tv 。主按钮直达https://kling4.tv/?via=topaitools；meta index,follow。需产品已有可用AI功能、人工审核，不录用退款。提交页有限DOM扫描未见隐藏AI指令。'+metrics(top.traffic_source)));
const net=b.find(x=>x.name==='Aitoolnet');
main.push(row(net.name,net.url,net.submission_url,'目录','未直测DR；Semrush AS28','62000（Semrush，2026-09，总访问量估算）',net.dofollow,'PRO US$9.9一次；Business US$49.9一次、推广7天。付费未见强制回链；另有回链+邮件申请路线需确认','高：AI目录，含Seedance视频工具','付费',date+'首页/提交/详情HTTP200。样例 https://www.aitoolnet.com/yovid 的主链接直达yovid.ai，无rel，robots未禁该详情；推荐卡为nofollow。源码免费套餐被hidden隐藏，不能当可操作免费入口。回链路线 https://www.aitoolnet.com/finish 。有限源码扫描未见隐藏AI指令。'+metrics(net.traffic_source)));
const td=c.find(x=>x.name==='AI Tools Directory');
main.push(row(td.name,td.url,td.submit_url,'目录','未直测DR；第三方转引DR50（2026-10），不与AS混排','113100（Similarweb，2026-09，总访问量估算）','是（Runway主链接rel=external noopener；直链）','免费人工审核；US$99可选加速；未见强制徽章/回链','高：AI目录，有视频生成分类','可交',date+'提交表单及 https://aitoolsdirectory.com/tool/runway 正常；主链接直达runwayml.com，页面index,follow且robots允许。要求真人原创描述、透明价格、产品可用，拒绝AI撰写描述是可见文案规则，不是拒收AI工具。有限源码扫描未见隐藏AI指令。'+metrics(td.traffic_source)+' DR转引来源：'+td.DR_source));
const ft=a.find(x=>x['站名']==='Future Tools');
main.push(row(ft['站名'],ft['网址'],ft['提交页'],'目录','未直测DR；Semrush AS42',ft['月流量'],'未确认有效follow：锚点无nofollow，但/go/被robots禁止抓取',ft['费用'],'高：AI目录，有视频生成分类','可交',date+'首页/表单正常。https://futuretools.io/tools/runway 主按钮rel=noopener noreferrer，经/go/runway 302到产品；https://futuretools.io/robots.txt 明确禁止/go/。免费人工筛选，不保证收录；作为引流候选，不能算已确认真dofollow。有限源码扫描未见隐藏AI指令。'+metrics(ft.traffic.source)));
const dang=c.find(x=>x.name==='Dang.ai');
main.push(row(dang.name,dang.url,dang.submit_url,'目录','未直测DR；第三方转引DR82（2026-10-17），不与AS混排','470800（Similarweb，2026-09，总访问量估算）','未确认有效follow：锚点可跟随，短链302有X-Robots-Tag:none',dang.fees+' 免费必须回链，付费不要求。','高：AI目录，已有Seedance同类站','联系站长',date+'站点与价格页正常。样例 https://dang.ai/tool/seedance-3-0-ai-video-generator-2 的rel=noopener noreferrer，但https://l.dang.ai/c4wn跳转响应为X-Robots-Tag:none；最终目标seedance3.si是竞品，不能误认为本产品已收录。付费前确认直链。有限源码扫描未见隐藏AI指令。'+metrics(dang.traffic_source)+' DR转引来源：'+dang.DR_source));
const aix=a.find(x=>x['站名']==='AIxploria');
main.push(row('AIxploria',aix['网址'],'https://www.aixploria.com/en/submit-ai-tool-or-feature-company/#submit','目录','未直测DR；Semrush AS42',aix['月流量'],'否（实测rel=nofollow noopener，站方也明确全部nofollow）','US$79一次基础；US$279认证；无免费收录；未见强制徽章/回链','高：AI目录，含视频工具','付费',date+'浏览器确认实际报价79/279，未采用旧页面冲突价格。https://www.aixploria.com/en/jev-typesafe-ai/ 主链接经/out/Jev且nofollow。仅考虑引流价值。禁止NSFW、垃圾/重复站，未禁止一般AI视频工具；提交描述须原创。有限DOM扫描未见隐藏AI指令，非全站保证。'+metrics(aix.traffic.source)));
const unite=c.find(x=>x.name==='Unite.AI');
main.push(row(unite.name,unite.url,unite.submit_url,'投稿','未直测DR；Semrush AS46','333350（Semrush，2026-09，总访问量估算）','作者简介公司链接可跟随；拟投稿链接待确认；产品榜单nofollow sponsored',unite.fees,'中高：AI媒体，需原创从业经验','联系站长',date+'https://www.unite.ai/ai-price-increases-business-dependency/ 作者简介公司链接无rel；不能承诺未来产品链接相同。https://www.unite.ai/guidelines/ 允许从业者原创观点、正文不得宣传自家产品；联系页不接未经邀请guest-post请求，仅作编辑邀稿/采访合作候选，不可直接投推广稿。有限源码扫描未见隐藏AI指令。'+metrics(unite.traffic_source)));
main.push(row('BetaList','https://betalist.com/','https://betalist.com/submissions/new','发布站','未直测DR；Semrush AS42（Exploding Topics展示）','361900（Semrush/Exploding Topics，2026-09，总访问量估算）','是（Visit Site主按钮无rel，301到产品；图片按钮nofollow）','全部付费；金额在表单末尾，未创建账户，当前金额未知；徽章可选，未见强制回链','中：初创发布站，已有AI视频工具','付费',date+'提交页/ https://betalist.com/startups/aituber HTTP200。主按钮/startups/aituber/visit为301，Location指向aituber.app，无X-Robots-Tag，robots未禁止；同页图片nofollow。https://betalist.com/help/ 明确无免费方案、拒收退款。提交页有可见代理操作文案，已记录未执行；所查源码未见隐藏AI指令。'+metrics('https://analytics.explodingtopics.com/website/betalist.com')));
main.push(row('SaaSHub','https://www.saashub.com/','https://www.saashub.com/services/submit','目录','未直测DR；Semrush AS37','493980（Semrush，2026-09，总访问量估算）','否（Pollo.ai主链接rel=nofollow）','普通提交页面未标收费；推广另付费；未见强制回链/徽章，提交末步再确认','中：综合软件目录，含AI视频分类','可交',date+'浏览器实开提交页和 https://www.saashub.com/pollo-ai 。拒收未上线/仅候补名单、免费子域名、非英文产品，当前可用工具需如实描述。提交页有可见AI代理提示，要求建议人类手动提交；仅作文字记录，不作为拒收AI工具依据。原始HTML403，完整隐藏指令扫描未完成。'+metrics('https://www.semrush.com/website/saashub.com/overview/')));
const pending=[];
const aitop=b.find(x=>x.name==='AITopTools');
pending.push(row(aitop.name,aitop.url,aitop.submission_url,'目录','未核验；DR57+仅站方自报','117503（HypeStat估算；月份未明确，非同月可比数据）',aitop.dofollow,aitop.cost+'；徽章可选，未见强制回链','高：AI目录，含Seedance视频工具','联系站长',date+'待补DR/AS及流量统计月份，暂不进入主清单。首页/提交/收费/ https://aitoptools.com/tool/seedance-2-5-4/ HTTP200，主链接可跟随。旧名单nofollow/$69与当前HTML不符。有限源码扫描未见隐藏AI指令。'+metrics(aitop.traffic_source)));
for(const name of ["There's An AI For That (TAAFT)"]){const v=b.find(x=>x.name===name);pending.push(row(v.name,v.url,v.submission_url,'目录',v.authority_display,`${v.monthly_visits}（Semrush，2026-09，总访问量估算）`,'未核验（详情页HTTP403及浏览器安全验证）',v.cost+'；已查说明未见强制回链/徽章',v.relevance,'联系站长',date+'待补真实产品链接rel；不能把站方或名单承诺当成实测。launch HTML200，已核对费用；HeyGen详情浏览器仍是安全验证页。提交源码未见常见隐藏AI指令，详情未完成扫描。'+metrics(v.traffic_source)));}
const t=a.find(x=>x['站名']==='Toolify');
pending.push(row(t['站名'],t['网址'],t['提交页'],'目录',t['DR'],t['月流量'],'未核验（详情页HTTP403及浏览器安全验证）',t['费用'],t['相关度'],'联系站长',date+'站方$99套餐声称至少6条dofollow，但 https://www.toolify.ai/tool/runwayml 浏览器停在安全验证，不能验证产品rel；隐藏指令扫描及强制徽章条款仍待补。'+metrics(t.traffic.source)));
await fs.writeFile(new URL('final_data.json',dir),JSON.stringify({headers,main,pending,sort_note:'没有Ahrefs直测DR。主表按领域相关度、已验证主链接可跟随程度排列；同层有Semrush AS者按AS降序，AS并列按流量；只有第三方DR者另列于该层末尾，不把AS与DR混成同一分数。'},null,2));
console.log(JSON.stringify({main:main.length,pending:pending.length}));
