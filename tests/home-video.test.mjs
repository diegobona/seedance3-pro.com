import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { saveVideoHandoff, readVideoHandoff } from '../app/studio-handoff.mjs';

test('homepage preserves the localized video error instead of relabeling personal budget failures as network failures', async () => {
  const source = await readFile('app/home-video.mjs', 'utf8');
  assert.doesNotMatch(source, /The free trial is temporarily unavailable on this network/);
  assert.match(source, /message\(error\.message \|\| text\('Please try again\.'/);
});

test('homepage handoff keeps the original reference, draft settings and accepted task without submitting anything', async () => {
  const values = new Map(), files = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const options = { storage, putFile: async (key, file) => files.set(key, file), getFile: async key => files.get(key), deleteFile: async key => files.delete(key) };
  const file = new File(['original reference'], 'near-square.jpg', { type: 'image/jpeg' });
  const taskId = '11111111-1111-4111-8111-111111111111';
  await saveVideoHandoff({ prompt: 'Keep this prompt', duration: 10, aspectRatio: '9:16', mode: 'reference', file, taskId }, options);
  const metadata = [...values.values()][0];
  assert.ok(!metadata.includes('original reference'), 'image bytes never go into URLs or session metadata');
  const restored = await readVideoHandoff(options);
  assert.equal(restored.prompt, 'Keep this prompt'); assert.equal(restored.duration, 10);
  assert.equal(restored.aspectRatio, '9:16'); assert.equal(restored.taskId, taskId);
  assert.equal(await restored.file.text(), 'original reference');
  assert.equal(values.size, 0); assert.equal(files.size, 0);
});

test('homepage handoff preserves frames mode and first/last image order', async () => {
  const values = new Map(), files = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const options = { storage, putFile: async (key, file) => files.set(key, file), getFile: async key => files.get(key), deleteFile: async key => files.delete(key) };
  const references = ['first', 'last'].map(name => new File([name], `${name}.png`, { type: 'image/png' }));
  await saveVideoHandoff({ prompt: 'Move between frames', mode: 'frames', files: references, duration: 5 }, options);
  const restored = await readVideoHandoff(options);
  assert.equal(restored.mode, 'frames');
  assert.deepEqual(await Promise.all(restored.files.map(file => file.text())), ['first', 'last']);
  assert.equal(files.size, 0);
});

test('replacing a draft releases its old reference and malformed task identifiers are discarded', async () => {
  const values = new Map(), files = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const options = { storage, putFile: async (key, file) => files.set(key, file), getFile: async key => files.get(key), deleteFile: async key => files.delete(key) };
  await saveVideoHandoff({ file: new File(['one'], 'one.png', { type: 'image/png' }), taskId: 'provider-id' }, options);
  await saveVideoHandoff({ prompt: 'new', aspectRatio: '16:9' }, options);
  assert.equal(files.size, 0);
  assert.equal((await readVideoHandoff(options)).taskId, '');
});

test('homepage handoff preserves all nine ordered references and consumes every stored file', async () => {
  const values = new Map(), files = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) };
  const options = { storage, putFile: async (key,file) => files.set(key,file), getFile: async key => files.get(key), deleteFile: async key => files.delete(key) };
  const references = Array.from({length:9},(_,i) => new File([`reference-${i}`],`${i}.png`,{type:'image/png'}));
  await saveVideoHandoff({prompt:'Nine references',mode:'reference',files:references,duration:10},options);
  assert.equal(files.size,9);
  const restored = await readVideoHandoff({...options,consume:false});
  assert.deepEqual(await Promise.all(restored.files.map(file => file.text())),references.map((_,i)=>`reference-${i}`));
  assert.equal(files.size,9);
  assert.equal((await readVideoHandoff(options)).files.length,9);
  assert.equal(files.size,0);
  assert.equal(values.size,0);
});

test('a failed multi-file save cleans new blobs and preserves the previous usable draft', async () => {
  const values = new Map(), files = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) };
  let fail = false, writes = 0;
  const options = {storage,putFile:async(key,file)=>{if(fail&&++writes===2)throw Error('quota');files.set(key,file)},getFile:async key=>files.get(key),deleteFile:async key=>files.delete(key)};
  await saveVideoHandoff({prompt:'Keep original',file:new File(['old'],'old.png',{type:'image/png'})},options);
  fail=true;
  await assert.rejects(saveVideoHandoff({files:[new File(['a'],'a.png',{type:'image/png'}),new File(['b'],'b.png',{type:'image/png'})]},options),/quota/);
  assert.equal(files.size,1);
  const restored=await readVideoHandoff(options);
  assert.equal(restored.prompt,'Keep original');
  assert.equal(await restored.files[0].text(),'old');
});

test('legacy single-reference drafts still restore into the multi-reference workspace contract', async () => {
  const key='11111111-1111-4111-8111-111111111111';
  const file=new File(['legacy'],'legacy.webp',{type:'image/webp'});
  const metadata={createdAt:Date.now(),prompt:'Legacy',duration:5,aspectRatio:'16:9',mode:'reference',referenceKey:key,taskId:''};
  const restored=await readVideoHandoff({storage:{getItem:()=>JSON.stringify(metadata),removeItem:()=>{}},getFile:async()=>file,deleteFile:async()=>{}});
  assert.equal(restored.files.length,1);
  assert.equal(await restored.files[0].text(),'legacy');
});

test('homepage checkout drafts can survive a longer payment visit while workspace handoffs retain their shorter default', async () => {
  const metadata={createdAt:Date.now()-2*60*60*1000,prompt:'Longer checkout',duration:10,aspectRatio:'9:16',mode:'text',referenceKeys:[],taskId:''};
  const options={storage:{getItem:()=>JSON.stringify(metadata),removeItem:()=>{}},consume:false};
  assert.equal(await readVideoHandoff(options),null);
  assert.equal((await readVideoHandoff({...options,maxAgeMs:24*60*60*1000})).prompt,'Longer checkout');
});

test('both homepages retain one keyword H1 and structured SEO while showing the generator before examples and Pose', async () => {
  for (const file of ['index.html', 'zh/index.html']) {
    const html = await readFile(file, 'utf8');
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /<h1 class="display">SEEDANCE 3\.0/);
    assert.match(html, /<link rel="canonical"/); assert.match(html, /application\/ld\+json/);
    assert.match(html, />AI Video<\/a>/); assert.match(html, />AI Image<\/a>/);
    assert.match(html, /app\/image\/gpt-image-2-5-1k/);
    assert.match(html, /class="home-resolution">[\s\S]*?<strong>1080P<\/strong>/);
    assert.ok(html.indexOf('id="create"') < html.indexOf('id="showcase"'));
    assert.ok(html.indexOf('id="showcase"') < html.indexOf('id="pose-control"'));
    const pageContent=html.replace(/<!-- SITE_PROMO_START -->[\s\S]*?<!-- SITE_PROMO_END -->/g,'');
    assert.doesNotMatch(pageContent, /christmas-feature|\$0\.01\/sec/);
    assert.match(html, /<h2[^>]*>Get Inspired|<h2[^>]*>创作灵感/);
  }
});
