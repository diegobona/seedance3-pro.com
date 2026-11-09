import urllib.request,json,re,sys
from html.parser import HTMLParser
from pathlib import Path
class P(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.text=[];self.comments=[];self.hidden=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='a':self.links.append(d)
  if 'hidden' in d or 'display:none' in d.get('style','').replace(' ','') or d.get('aria-hidden')=='true': self.hidden.append({'tag':t,'attrs':d})
 def handle_data(self,d):self.text.append(d)
 def handle_comment(self,d):self.comments.append(d)
urls=sys.argv[1:]
out=[]
for i,u in enumerate(urls):
 try:
  with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=40) as r:
   html=r.read().decode('utf-8','replace');status=r.status;url=r.url
  p=P();p.feed(html);stem=re.sub(r'[^a-zA-Z0-9]+','_',u.replace('https://',''))
  Path('output/backlink-research/'+stem+'.html').write_text(html,encoding='utf-8')
  sus=[{'offset':m.start(),'text':html[max(0,m.start()-160):m.end()+300]} for m in re.finditer(r'ignore.{0,35}(previous|instructions)|system.?prompt|AI\s+(agents?|assistants?).{0,100}(must|should|instructions)|LLM.{0,60}(instructions|must|ignore)',html,re.I)]
  result={'input':u,'final':url,'status':status,'links':p.links,'text':' '.join(p.text),'comment_count':len(p.comments),'hidden_elements':p.hidden[:30],'suspicious':sus[:20]}
  Path('output/backlink-research/'+stem+'.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
  out.append({'url':u,'final':url,'status':status,'links':p.links[:5],'suspicious':sus[:5],'file':stem+'.json'})
 except Exception as e:out.append({'url':u,'error':str(e)})
print(json.dumps(out,ensure_ascii=False,indent=2))
