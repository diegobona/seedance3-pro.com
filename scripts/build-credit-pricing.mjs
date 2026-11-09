import {readFile,writeFile} from 'node:fs/promises';
import {CREDIT_PACKS,pricingDescription} from '../assets/credit-packs.mjs';
import {renderPricingPack,creditPackFootnote,creditPackTerms} from '../assets/credit-pack-cards.mjs';
import {promotionBootstrap} from '../assets/credit-pack-offer.mjs';
for(const locale of ['en','zh']) {
 const path=locale==='zh'?'zh/pricing.html':'pricing.html',zh=locale==='zh';
 let html=await readFile(path,'utf8');
 const main=`<main class="credit-pricing-main" id="main-content">
 <header class="credit-pricing-heading"><p>US$0.01/second</p><h1>${zh?'积分包':'Credit packs'}</h1><p class="credit-pack-terms-summary">${creditPackTerms(locale)}</p></header>
 <div class="credit-pricing-packs">${CREDIT_PACKS.map(pack=>renderPricingPack(pack,locale)).join('\n')}</div>
 <p class="credit-pricing-footnote">${creditPackFootnote(locale)}</p>
 </main>`;
 if(!/<main class="credit-pricing-main"[^>]*>/.test(html))throw new Error('Missing pricing section');
 html=html.replace(/<main class="credit-pricing-main"[^>]*>[\s\S]*?<\/main>/,()=>main);
 html=html.replace(/<script data-promo-bootstrap>[\s\S]*?<\/script>/g,'');
 html=html.replace('</main>',()=>`</main><script data-promo-bootstrap>${promotionBootstrap()}</script>`);
 html=html.replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"/g,(_,prefix)=>`${prefix}${pricingDescription(locale)}"`);
 html=html.replace(/\s*<link rel="stylesheet" href="\/assets\/credit-pricing\.css[^\"]*">/g,'');
 html=html.replace('</head>','  <link rel="stylesheet" href="/assets/credit-pricing.css?v=20261107-brand-blue">\n</head>');
 await writeFile(path,html);
}
