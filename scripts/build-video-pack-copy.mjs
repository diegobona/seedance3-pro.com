import {readFile,writeFile} from 'node:fs/promises';
import {CREDIT_PACKS,creditPackValue} from '../assets/credit-packs.mjs';

const pack=CREDIT_PACKS[0],value=creditPackValue(pack);
for(const locale of ['en','zh']){
 const zh=locale==='zh',path=`${zh?'zh/':''}seedance-3-0-release-date.html`;
 const text=(en,cn)=>zh?cn:en;
 let html=await readFile(path,'utf8');
 const purchase=`<div class="release-purchase-block" aria-label="${text('Video credit pack','视频积分包')}">
                <p class="release-pack-value"><strong>US$${value.price}</strong><span>${text('one-time purchase','一次性购买')}</span></p>
                <p class="release-tools-title"><strong>${text(`${pack.videoCount} × 5s videos`,`${pack.videoCount} × 5 秒视频`)}</strong></p>
                <p class="release-pack-duration">5s · 10s · 15s</p>
                <p class="release-pack-rate">${pack.credits} ${text('credits','积分')} · <strong>US$0.01/second</strong></p>
                <p class="release-paid-detail">${text('Credits never expire. No subscription.','积分永久有效，无订阅。')}</p>
                <p class="release-buy-action"><a class="button primary" data-credit-pack-buy data-pack-id="${pack.id}" href="${zh?'/zh':''}/checkout?pack=${pack.id}" target="_blank" rel="noopener noreferrer">${text(`Buy ${pack.videoCount} videos ↗`,`购买 ${pack.videoCount} 条视频 ↗`)}</a></p>
              </div>`;
 if(!html.includes('class="release-purchase-block"'))throw Error(`Missing purchase block: ${path}`);
 html=html.replace(/<div class="release-purchase-block"[^>]*>[\s\S]*?<\/div>/,()=>purchase);
 html=html.replace(/<p class="release-trial-detail">[\s\S]*?<\/p>/,()=>`<p class="release-trial-detail"><strong>${text('No login. No sign-up.','无需登录 · 无需注册')}</strong><span><b>2</b> ${text('free videos','条免费视频')}<small>${text('5 seconds each','每条 5 秒')}</small></span></p>`);
 await writeFile(path,html);
}
