import urllib.request,urllib.error,json,pathlib
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):return None
opener=urllib.request.build_opener(NoRedirect)
url='https://futuretools.io/go/runway';out=[]
for i in range(6):
 try:r=opener.open(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25)
 except urllib.error.HTTPError as e:r=e
 except Exception as e:out.append({'url':url,'error':str(e)});break
 headers=dict(r.headers); out.append({'url':url,'status':r.status,'headers':headers})
 nxt=headers.get('Location') or headers.get('location')
 if not nxt:break
 url=urllib.parse.urljoin(url,nxt)
pathlib.Path('output/backlink-research/futuretools_redirect.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out,ensure_ascii=True,indent=2))
