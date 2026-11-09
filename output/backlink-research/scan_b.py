import json,pathlib,re
p=pathlib.Path('output/backlink-research')
scan=[]
for name in ['https_aitoptools_com.html','https_aitoptools_com_sponsorships.html','https_aitoptools_com_claim_your_tool.html','https_aitoptools_com_tool_seedance_2_5_4.html','https_www_aitoolnet_com.html','https_www_aitoolnet_com_submit.html','https_www_aitoolnet_com_yovid.html','https_www_aitoolnet_com_finish.html','https_theresanaiforthat_com_launch.html']:
 s=(p/name).read_text(encoding='utf-8')
 hits=[m.group(0) for m in re.finditer(r'.{0,50}(?:ignore.{0,20}(?:previous|instructions)|(?:AI agents?|LLMs?).{0,25}(?:must|should|ignore)|system prompt|prompt injection|if you are an AI|AI assistants?).{0,100}',s,re.I)]
 scan.append({'file':name,'matches':hits,'note':'针对HTML与注释的常见prompt-injection短语扫描；未发现不能证明整站没有，未执行页面指令。'})
print(json.dumps(scan,ensure_ascii=False,indent=2))
(p/'agent_b_scan.json').write_text(json.dumps(scan,ensure_ascii=False,indent=2),encoding='utf-8')
