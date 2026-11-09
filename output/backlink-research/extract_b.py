from html.parser import HTMLParser
import pathlib,re
class Text(HTMLParser):
 def __init__(self):super().__init__();self.skip=0;self.bits=[]
 def handle_starttag(self,t,a):
  if t in ('script','style'):self.skip+=1
 def handle_endtag(self,t):
  if t in ('script','style'):self.skip=max(0,self.skip-1)
 def handle_data(self,s):
  if not self.skip:self.bits.append(s)
p=pathlib.Path('output/backlink-research')
for name in ['https_theresanaiforthat_com_launch.html','https_aitoptools_com_claim_your_tool.html','https_www_aitoolnet_com_submit.html']:
 raw=(p/name).read_text(encoding='utf-8'); h=Text();h.feed(raw);s=' '.join(' '.join(h.bits).split());(p/name.replace('.html','.txt')).write_text(s,encoding='utf-8');print(name);print('\n'.join(m.group(0) for m in re.finditer(r'.{0,75}(?:\$49|\$437|\$59|one.time|refund|free submission|backlink|badge|reject|accept|Submit).{0,150}',s,re.I))[:6500]);print('AI_INSTRUCTION_MATCHES', [m.group(0)[:350] for m in re.finditer(r'.{0,60}(?:ignore.{0,20}(?:previous|instructions)|(?:AI agents?|LLMs?).{0,25}(?:must|should|ignore)|system prompt|prompt injection|AI assistants?).{0,80}',raw,re.I)][:20])
