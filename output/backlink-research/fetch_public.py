import urllib.request, urllib.error, json, re, sys, pathlib, concurrent.futures
from html.parser import HTMLParser

OUT=pathlib.Path(__file__).parent
class Parse(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.meta=[]; self.text=[]; self.comments=[]; self.cur=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='a':
            self.cur={'href':a.get('href',''),'rel':a.get('rel',''),'text':'','html':self.get_starttag_text()}; self.links.append(self.cur)
        if tag=='meta':self.meta.append(a)
    def handle_endtag(self,tag):
        if tag=='a':self.cur=None
    def handle_data(self,data):
        self.text.append(data)
        if self.cur:self.cur['text']+=data
    def handle_comment(self,data):self.comments.append(data)

def fetch(item):
    key,url=item
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=35) as r:
            raw=r.read().decode('utf-8','replace'); status=r.status; final=r.url; headers=dict(r.headers)
        (OUT/(key+'.html')).write_text(raw,encoding='utf-8')
        p=Parse(); p.feed(raw)
        instruction=re.compile(r'ignore (?:all |previous |prior |the )?instructions|system prompt|if you are an? (?:ai|llm|agent)|AI (?:agents?|assistants?)|language model|ChatGPT|submit with your agent',re.I)
        hits=[raw[max(0,m.start()-180):m.end()+350] for m in instruction.finditer(raw)][:20]
        data={'key':key,'url':url,'final_url':final,'status':status,'bytes':len(raw),'links':p.links,'meta':p.meta,'x_robots_tag':headers.get('X-Robots-Tag'),'instruction_pattern_hits':hits,'comments':p.comments[:30],'text':' '.join(p.text)}
        (OUT/(key+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
        return {'key':key,'status':status,'bytes':len(raw),'links':len(p.links),'meta':p.meta,'instruction_hits':hits}
    except Exception as e:return {'key':key,'url':url,'error':str(e)}

if __name__=='__main__':
    items=json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        print(json.dumps(list(ex.map(fetch,items)),ensure_ascii=False,indent=2))
