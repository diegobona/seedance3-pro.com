// Offline conversion of attributed animal meshes; see shipped CREDITS.md.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as T from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer';
import { ANIMAL_CATALOG } from '../app/pose-animals.mjs';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();}); }
  readAsDataURL(blob) { blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.();}); }
};
globalThis.window={innerWidth:1024,innerHeight:1024};
T.TextureLoader.prototype.load=()=>new T.Texture();
const cache=new URL('../.animal-asset-work/references/',import.meta.url);
const out=new URL('../app/pose-assets/animals/',import.meta.url);
await mkdir(cache,{recursive:true});await mkdir(out,{recursive:true});await MeshoptSimplifier.ready;
const sources={cat:'86110_rigged_and_animated_cat/cat.fbx',horse:'76528_horse/horse.fbx'};
const bodyMaterial=new T.MeshStandardMaterial({name:'Reference clay',color:'#d9d9d9',roughness:.75});
const darkMaterial=new T.MeshStandardMaterial({name:'Eyes, nose and hooves',color:'#303437',roughness:.55});darkMaterial.userData.fixedColor=true;
// Authored anatomical joint positions in normalized model coordinates. Revision 2 migrates v1 scenes.
const anatomy={
  cat:{root:[0,1.22,-.25],neck:[0,1.37,.57],head:[0,1.68,.93],front:[[.20,1.20,.40],[.20,.63,.32],[.21,.11,.45]],hind:[[.24,1.16,-.90],[.22,.39,-1.04],[.22,.09,-.72]],tail:[[0,1.51,-1.08],[0,2.04,-1.23],[0,2.57,-1.24]]},
  dog:{root:[0,2.521,-.772],neck:[0,2.59,.899],head:[0,3.032,1.626],front:[[.362,1.921,1.102],[.395,.989,.730],[.406,.233,.864]],hind:[[.367,1.955,-1.942],[.368,.794,-2.453],[.366,.180,-2.507]],tail:[[0,2.615,-1.943],[0,3.04,-2.187],[0,3.37,-2.254]]},
  horse:{root:[0,3.8,-1.25],neck:[0,4.25,1.05],head:[0,5.90,2.85],front:[[.58,3.50,.85],[.53,1.83,.83],[.53,.30,.85]],hind:[[.65,3.45,-2.8],[.56,1.82,-3.22],[.55,.30,-2.83]],tail:[[0,4.50,-3.47],[0,3.10,-3.72],[0,1.40,-3.82]]},
};
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b),vec=p=>new T.Vector3(...p);
function rig(kind){
  const a=anatomy[kind],group=new T.Group(),bones=[];
  function add(name,parent,world){const bone=new T.Bone();bone.name=name;bone.position.copy(vec(world));if(parent.isBone)bone.position.sub(parent.getWorldPosition(new T.Vector3()));parent.add(bone);group.updateMatrixWorld(true);bones.push(bone);return bone;}
  const root=add('AnimalRoot',group,a.root),neck=add('AnimalNeck',root,a.neck);add('AnimalHead',neck,a.head);
  for(const [prefix,points]of[['Front',a.front],['Hind',a.hind]])for(const [side,sign]of[['Left',-1],['Right',1]]){
    let parent=root;['Upper','Lower','Paw'].forEach((suffix,i)=>{parent=add(prefix+side+suffix,parent,[points[i][0]*sign,...points[i].slice(1)]);});
  }
  let parent=root;['TailBase','TailMid','TailTip'].forEach((name,i)=>{parent=add(name,parent,a.tail[i]);});return{group,bones};
}
function compact(geometry,triangleLimit){
  for(const name of Object.keys(geometry.attributes))if(!['position','normal'].includes(name))geometry.deleteAttribute(name);
  geometry.clearGroups();geometry=mergeVertices(geometry,1e-5);
  let indices=new Uint32Array(geometry.index.array);const positions=geometry.attributes.position.array,normals=geometry.attributes.normal.array;
  if(indices.length>triangleLimit*3){const [reduced,error]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,normals,3,[.1,.1,.1],null,triangleLimit*3,.0015,['Permissive']);indices=reduced;console.log(`  simplification error: ${(error*100).toFixed(3)}%`);}
  const [remap,count]=MeshoptSimplifier.compactMesh(indices),points=new Float32Array(count*3),norms=new Float32Array(count*3);
  for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff){points.set(positions.subarray(i*3,i*3+3),remap[i]*3);norms.set(normals.subarray(i*3,i*3+3),remap[i]*3);}
  const result=new T.BufferGeometry();result.setAttribute('position',new T.BufferAttribute(points,3));result.setAttribute('normal',new T.BufferAttribute(norms,3));result.setIndex(new T.BufferAttribute(indices,1));return result;
}
async function sourceGeometry(kind){
  let source;
  if(kind==='dog') source=new OBJLoader().parse(await readFile(new URL('../.animal-asset-work/sources/dog-smooth.obj',import.meta.url),'utf8'));
  else{const file=new URL(`${kind}.fbx`,cache);let bytes;try{bytes=await readFile(file);}catch{const response=await fetch(`https://raw.githubusercontent.com/nrz/ylikuutio/master/res/objects/www.blendswap.com/${sources[kind]}`);if(!response.ok)throw new Error(`Asset download: ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());await writeFile(file,bytes);}source=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
  source.updateMatrixWorld(true);const box=new T.Box3().setFromObject(source),center=box.getCenter(new T.Vector3()),scale=ANIMAL_CATALOG[kind].height/box.getSize(new T.Vector3()).y;
  const geometries=[];source.traverse(mesh=>{if(mesh.isMesh){const g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);g.translate(-center.x,-box.min.y,-center.z);g.scale(scale,scale,scale);for(const name of Object.keys(g.attributes))if(!['position','normal'].includes(name))g.deleteAttribute(name);geometries.push(g.index?g.toNonIndexed():g);}});
  let merged=mergeGeometries(geometries);
  if(kind==='dog'){merged.deleteAttribute('normal');merged=mergeVertices(merged,1e-5);merged.computeVertexNormals();}
  return compact(merged,kind==='horse'?42000:45000);
}
function bindSkin(geometry,kind,bones){
  const a=anatomy[kind],height=ANIMAL_CATALOG[kind].height,indices=new Uint16Array(geometry.attributes.position.count*4),weights=new Float32Array(indices.length),lookup=new Map(bones.map((b,i)=>[b.name,i]));const p=new T.Vector3();
  for(let i=0;i<geometry.attributes.position.count;i++){
    p.fromBufferAttribute(geometry.attributes.position,i);const w=new Map();const add=(name,value)=>{if(value>1e-5)w.set(lookup.get(name),(w.get(lookup.get(name))??0)+value);};
    const tailMask=kind==='cat'?smooth(.96,1.16,-p.z)*smooth(1.40,1.65,p.y):kind==='dog'?smooth(1.65,1.9,-p.z)*smooth(2.15,2.35,p.y):smooth(3.40,3.60,-p.z)*smooth(3.9,4.35,p.y);
    if(tailMask>.001){const t=kind==='horse'?(a.tail[0][1]-p.y)/(a.tail[0][1]-a.tail[2][1]):(p.y-a.tail[0][1])/(a.tail[2][1]-a.tail[0][1]);const u=T.MathUtils.clamp(t*2,0,1),v=T.MathUtils.clamp(t*2-1,0,1);add('TailBase',(1-u)*tailMask);add('TailMid',u*(1-v)*tailMask);add('TailTip',v*tailMask);}
    const neckBoundary=a.neck[2]-(p.y-a.neck[1])*.60;
    const neckMask=smooth(neckBoundary-height*.04,neckBoundary+height*.055,p.z)*smooth(a.neck[1]-height*.12,a.neck[1]+height*.04,p.y)*(1-tailMask);
    const headMask=smooth(a.head[1]-height*.105,a.head[1]-height*.025,p.y+(p.z-a.head[2])*.65);
    add('AnimalNeck',neckMask*(1-headMask));add('AnimalHead',neckMask*headMask);
    const remainder=Math.max(0,1-tailMask-neckMask),front=p.z>(a.front[0][2]+a.hind[0][2])/2,pts=front?a.front:a.hind,prefix=(front?'Front':'Hind')+(p.x<0?'Left':'Right');
    const limbMask=(1-smooth(pts[0][1]-height*.12,pts[0][1]+height*.07,p.y))*remainder;
    const lower=1-smooth(pts[1][1]-height*.055,pts[1][1]+height*.055,p.y),paw=1-smooth(pts[2][1],pts[2][1]+height*.055,p.y);
    add(prefix+'Upper',limbMask*(1-lower));add(prefix+'Lower',limbMask*lower*(1-paw));add(prefix+'Paw',limbMask*lower*paw);add('AnimalRoot',remainder-limbMask);
    const top=[...w].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((v,p)=>v+p[1],0);top.forEach(([j,v],slot)=>{indices[i*4+slot]=j;weights[i*4+slot]=v/sum;});
  }
  geometry.setAttribute('skinIndex',new T.BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.BufferAttribute(weights,4));
}
function details(kind,group,bones,bodyGeometry){
  const map=new Map(bones.map(b=>[b.name,b]));
  function oval(name,world,radius,rotation=[0,0,0],material=darkMaterial){const bone=map.get(name),m=new T.Mesh(new T.SphereGeometry(1,20,12),material);m.position.copy(vec(world).sub(bone.getWorldPosition(new T.Vector3())));m.scale.fromArray(radius);m.rotation.set(...rotation);bone.add(m);return m;}
  if(kind==='cat'){
    for(const sign of[-1,1])oval('AnimalHead',[sign*.153,1.697,1.106],[.041,.023,.022],[0,sign*.60,sign*.12]);
    oval('AnimalHead',[0,1.555,1.277],[.050,.026,.021]);
  }
  if(kind==='dog'){
    for(const sign of[-1,1])oval('AnimalHead',[sign*.329,3.09,1.925],[.034,.031,.035],[0,sign*.60,0]);
    oval('AnimalHead',[0,2.895,2.621],[.120,.073,.045]);
  }
  if(kind==='horse'){
    for(const sign of[-1,1]){
      oval('AnimalHead',[sign*.360,5.98,3.32],[.039,.052,.074],[0,sign*.25,0]);
      oval('AnimalHead',[sign*.22,4.98,3.70],[.025,.075,.090],[0,sign*.6,.25]);
    }
    const pos=bodyGeometry.attributes.position,colors=new Float32Array(pos.count*3);
    for(let i=0;i<pos.count;i++){const tone=T.MathUtils.lerp(.045,1,smooth(.34,.43,pos.getY(i)));colors.fill(tone,i*3,i*3+3);}
    bodyGeometry.setAttribute('color',new T.BufferAttribute(colors,3));
    // An uninterrupted, tapered tail skin follows all three tail joints.
    const curve=new T.CatmullRomCurve3([[0,4.50,-3.48],[0,4.06,-3.72],[0,3.10,-3.82],[0,2.10,-3.89],[0,1.20,-3.90]].map(vec));
    const tailGeometry=new T.TubeGeometry(curve,40,1,20,false),tp=tailGeometry.attributes.position;
    for(let j=0;j<=40;j++){const t=j/40,c=curve.getPointAt(t),radius=.07+.17*Math.sin(Math.PI*t)*Math.pow(1-t,.25);for(let k=0;k<=20;k++){const i=j*21+k,p=new T.Vector3().fromBufferAttribute(tp,i).sub(c).multiplyScalar(radius*(1+.06*Math.cos(k*Math.PI*.8)));p.x*=.72;p.add(c);tp.setXYZ(i,p.x,p.y,p.z);}}
    tailGeometry.computeVertexNormals();const ti=new Uint16Array(tp.count*4),tw=new Float32Array(tp.count*4);
    for(let i=0;i<tp.count;i++){const y=tp.getY(i),upper=smooth(2.9,3.5,y),tip=1-smooth(1.25,1.9,y);ti.set([bones.indexOf(map.get('TailBase')),bones.indexOf(map.get('TailMid')),bones.indexOf(map.get('TailTip')),0],i*4);tw.set([upper,(1-upper)*(1-tip),(1-upper)*tip,0],i*4);}
    tailGeometry.setAttribute('skinIndex',new T.BufferAttribute(ti,4));tailGeometry.setAttribute('skinWeight',new T.BufferAttribute(tw,4));const tail=new T.SkinnedMesh(tailGeometry,darkMaterial);tail.name='Horse articulated tail';group.add(tail);group.updateMatrixWorld(true);tail.bind(new T.Skeleton(bones));
    // Sample the authored neck crest, so the mane sits on the skin instead of floating.
    const crest=[];for(let z=.3;z<2.7;z+=.12){let y=-Infinity;for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i))<.10&&Math.abs(pos.getZ(i)-z)<.075)y=Math.max(y,pos.getY(i));if(Number.isFinite(y))crest.push(new T.Vector3(-.025,y+.025,z));}
    const maneGeometry=new T.TubeGeometry(new T.CatmullRomCurve3(crest),50,.075,8,false);bindSkin(maneGeometry,kind,bones);const mane=new T.SkinnedMesh(maneGeometry,darkMaterial);mane.name='Horse neck mane';group.add(mane);group.updateMatrixWorld(true);mane.bind(new T.Skeleton(bones));
  }
}
const prepareOnly=process.argv.includes('--prepare');
const requested=process.argv.slice(2).filter(arg=>arg!=='--prepare');
if(requested.some(kind=>!Object.hasOwn(anatomy,kind)))throw new Error('Expected cat, dog or horse');
for(const kind of(requested.length?requested:['cat','dog','horse'])){
  const geometry=await sourceGeometry(kind),{group,bones}=rig(kind);bindSkin(geometry,kind,bones);
  const rigInput=JSON.stringify({kind,positions:Array.from(geometry.attributes.position.array),indices:Array.from(geometry.index.array),bones:bones.map(b=>({name:b.name,parent:b.parent.isBone?b.parent.name:null,position:b.getWorldPosition(new T.Vector3()).toArray()}))});
  await writeFile(new URL(`../.animal-asset-work/${kind}-rig-input.json`,import.meta.url),rigInput);
  if(prepareOnly){console.log(`${kind}: skinning input prepared`);continue;}
  const weighted=JSON.parse(await readFile(new URL(`../.animal-asset-work/${kind}-weights.json`,import.meta.url),'utf8'));
  if(weighted.vertexCount!==geometry.attributes.position.count||weighted.inputHash!==createHash('sha256').update(rigInput).digest('hex'))throw Error(`${kind}: run skin-animal-assets.py again; geometry changed`);
  if(weighted.indices.length!==weighted.vertexCount*4||weighted.weights.length!==weighted.vertexCount*4)throw Error('Invalid weight dimensions');
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(weighted.indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weighted.weights,4));
  const material=bodyMaterial.clone();material.vertexColors=kind==='horse';const mesh=new T.SkinnedMesh(geometry,material);mesh.name=`${kind} anatomical skin`;group.add(mesh);group.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));details(kind,group,bones,geometry);
  group.name=`Pose Studio ${kind}`;group.userData={assetRevision:3,rigRevision:2,source:kind==='cat'?'Rigged and animated Cat by JonasDichelle':kind==='horse'?'Horse by b2przemo':'Dog by crownjoshua',license:kind==='dog'?'CC0':'CC BY 3.0',modifications:'Reduced, normalized and rigged by Seedance Pose Studio'};
  const binary=await new GLTFExporter().parseAsync(group,{binary:true});await writeFile(new URL(`${kind}.glb`,out),Buffer.from(binary));console.log(`${kind}: ${geometry.index.count/3} body triangles, ${(binary.byteLength/1024).toFixed(0)} KiB`);
}
