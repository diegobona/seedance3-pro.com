import concurrent.futures, urllib.request, urllib.error, json, re, pathlib
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).parent
class Parse(HTMLParser):
 def __init__(self): super().__init__(); self.links=[];self.meta=[];self.comments=[];self.text=[];self.cur=None
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='a': self.cur={**d,'text':'','tag':self.get_starttag_text()};self.links.append(self.cur)
  if t=='meta': self.meta.append(d)
 def handle_endtag(self,t):
  if t=='a': self.cur=None
 def handle_data(self,d):
  self.text.append(d)
  if self.cur is not None:self.cur['text']+=d
 def handle_comment(self,d):self.comments.append(d)
def fetch(item):
 name,url=item
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=35) as r:
   status=r.status;final=r.url;html=r.read().decode('utf-8',errors='replace');headers=dict(r.headers)
 except urllib.error.HTTPError as e:
  status=e.code;final=e.url;html=e.read().decode('utf-8',errors='replace');headers=dict(e.headers)
 except Exception as e:return {'name':name,'url':url,'error':str(e)}
 (ROOT/(name+'.html')).write_text(html,encoding='utf-8')
 p=Parse();p.feed(html)
 terms=r'ignore (?:all |any |the )?(?:previous|prior)|system prompt|AI (?:agents?|assistants?)|ChatGPT|LLM|large language model|hidden instruction|prompt injection|automated agent'
 suspicious=[html[max(0,m.start()-150):m.end()+200] for m in re.finditer(terms,html,re.I)]
 out={'name':name,'url':url,'final_url':final,'status':status,'bytes':len(html),'meta':p.meta,'links':p.links,'hidden_instruction_candidates':suspicious[:40],'text':' '.join(p.text)}
 (ROOT/(name+'.json')).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
 return {'name':name,'url':url,'status':status,'bytes':len(html),'links':len(p.links),'instruction_candidates':len(suspicious),'match_links':[x for x in p.links if re.search(r'runway|kling|seedance|submit|contact|add-ai|featured',x.get('href',''),re.I)][:20]}
urls=[
 ('futuretools_home','https://futuretools.io/'),
 ('futuretools_submit','https://futuretools.io/submit-a-tool'),
 ('futuretools_runway','https://futuretools.io/tools/runway'),
 ('futuretools_faq','https://futuretools.io/faq'),
 ('futurepedia_home','https://www.futurepedia.io/'),
 ('futurepedia_submit','https://www.futurepedia.io/submit-tool'),
 ('futurepedia_contact','https://www.futurepedia.io/contact'),
 ('futurepedia_video','https://www.futurepedia.io/ai-tools/video-generators'),
 ('toolify_submit','https://www.toolify.ai/submit'),
 ('toolify_runway','https://www.toolify.ai/tool/runwayml'),
 ('aixploria_submit','https://www.aixploria.com/en/submit-ai-tool-or-feature-company/'),
 ('aixploria_featured','https://www.aixploria.com/en/featured-on-aixploria/'),
 ('aixploria_runway','https://www.aixploria.com/en/runway-ml/')]
import sys
if len(sys.argv)>1: urls=json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
 print(json.dumps(list(ex.map(fetch,urls)),ensure_ascii=False,indent=2))
