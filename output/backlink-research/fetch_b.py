import urllib.request,urllib.error,json,re,concurrent.futures,pathlib
from html.parser import HTMLParser
class Parser(HTMLParser):
 def __init__(self):
  super().__init__();self.links=[];self.texts=[];self.title='';self.title_on=False;self.a=None;self.comments=[];self.hidden=[]
 def handle_starttag(self,t,attrs):
  d=dict(attrs)
  if t=='a': self.a={**d,'text':''};self.links.append(self.a)
  if t=='title':self.title_on=True
  if 'hidden' in d or re.search(r'display\s*:\s*none|visibility\s*:\s*hidden',d.get('style',''),re.I):self.hidden.append({'tag':t,'attrs':d})
 def handle_endtag(self,t):
  if t=='a':self.a=None
  if t=='title':self.title_on=False
 def handle_data(self,s):
  if self.title_on:self.title+=s
  if self.a is not None:self.a['text']+=s
  self.texts.append(s)
 def handle_comment(self,s):self.comments.append(s)
def fetch(u):
 try:
  req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'})
  r=urllib.request.urlopen(req,timeout=35);raw=r.read().decode('utf-8','replace');p=Parser();p.feed(raw)
  name=re.sub(r'[^a-zA-Z0-9]+','_',u).strip('_');base=pathlib.Path('output/backlink-research');(base/(name+'.html')).write_text(raw,encoding='utf-8')
  result={'url':u,'final':r.url,'status':r.status,'title':p.title,'links':p.links,'text':' '.join(p.texts),'comments':p.comments,'hidden':p.hidden}
  (base/(name+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
  return {'url':u,'status':r.status,'final':r.url,'title':p.title,'bytes':len(raw),'links':[a for a in p.links if re.search(r'submit|add.*tool|contact|kling|runway|seedance|hailuo|luma|vidu|terms|pricing|advertis',a.get('href','')+' '+a.get('text',''),re.I)][:40]}
 except Exception as e:return {'url':u,'error':str(e)}
if __name__=='__main__':
 import sys
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
  for r in ex.map(fetch,sys.argv[1:]):print(json.dumps(r,ensure_ascii=False))
