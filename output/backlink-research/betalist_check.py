import urllib.request,urllib.error,json,pathlib
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args):return None
out=[]
for url in ['https://betalist.com/startups/aituber/visit','https://betalist.com/robots.txt']:
    try:
        r=urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30)
    except urllib.error.HTTPError as e:r=e
    out.append({'url':url,'status':r.status,'location':r.headers.get('Location'),'x_robots_tag':r.headers.get('X-Robots-Tag'),'body':r.read().decode('utf8','replace')[:12000]})
pathlib.Path(__file__).with_name('betalist_redirect_robots.json').write_text(json.dumps(out,indent=2),encoding='utf8')
print(json.dumps(out,indent=2))
