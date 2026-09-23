import { Bone, Group, Mesh, MeshStandardMaterial, SphereGeometry, CylinderGeometry, ConeGeometry, Vector3 } from 'three';

export const ANIMAL_CATALOG = {
  cat: { label: 'Cat', height: 2.6, body: [.42,.49,1], leg: 1.05, head: [.34,.35,.36], neck: [.28,.38] },
  dog: { label: 'Dog', height: 3.4, body: [.52,.62,1.22], leg: 1.4, head: [.43,.46,.5], neck: [.4,.46] },
  horse: { label: 'Horse', height: 6.8, body: [.68,.93,1.7], leg: 2.65, head: [.38,.58,.8], neck: [1.1,.75] },
};

export const ANIMAL_PRESETS = [
  { key:'animal-stand', label:'Standing', category:'Standing' },
  { key:'animal-walk', label:'Walking', category:'Movement' },
  { key:'animal-run', label:'Running', category:'Movement' },
  { key:'animal-left', label:'Look left', category:'Head & gestures' },
  { key:'animal-right', label:'Look right', category:'Head & gestures' },
  { key:'animal-alert', label:'Alert', category:'Head & gestures' },
  { key:'animal-sniff', label:'Sniffing', category:'Head & gestures', species:['cat','dog'] },
  { key:'animal-sit', label:'Sitting', category:'Resting', species:['cat','dog'] },
  { key:'animal-lie', label:'Lying down', category:'Resting', species:['cat','dog'] },
  { key:'animal-paw', label:'Raise paw', category:'Head & gestures', species:['cat','dog'] },
  { key:'animal-stretch', label:'Stretching', category:'Movement', species:['cat'] },
  { key:'animal-crouch', label:'Crouching', category:'Resting', species:['cat'] },
  { key:'animal-bow', label:'Play bow', category:'Movement', species:['dog'] },
  { key:'animal-tail', label:'Tail to side', category:'Standing', species:['dog'] },
  { key:'animal-graze', label:'Grazing', category:'Head & gestures', species:['horse'] },
  { key:'animal-trot', label:'Trotting', category:'Movement', species:['horse'] },
  { key:'animal-canter', label:'Cantering', category:'Movement', species:['horse'] },
  { key:'animal-rest-hoof', label:'Rest hind hoof', category:'Resting', species:['horse'] },
];

export function getAnimalPresets(kind) {
  return ANIMAL_PRESETS.filter(p => !p.species || p.species.includes(kind));
}

export const ANIMAL_HANDLE_SPECS = [
  { key:'pelvis', label:'Body', effector:'AnimalRoot', chain:[], color:0x8bffd8, radius:.13 },
  { key:'head', label:'Head', effector:'AnimalHead', chain:['AnimalNeck'], color:0xffffff, radius:.13 },
  ...['FrontLeft','FrontRight','HindLeft','HindRight'].flatMap((leg,index) => [
    { key:`${leg}Knee`, label:`${leg.replace(/([A-Z])/g,' $1').trim()} knee`, effector:`${leg}Lower`, chain:[`${leg}Upper`], color:index % 2 ? 0x6fa6ff : 0xff8fb8, radius:.095 },
    { key:`${leg}Paw`, label:`${leg.replace(/([A-Z])/g,' $1').trim()} paw`, effector:`${leg}Paw`, chain:[`${leg}Lower`,`${leg}Upper`], color:index % 2 ? 0x4fffb8 : 0xffb84f, radius:.115 },
  ]),
  { key:'tail', label:'Tail', effector:'TailTip', chain:['TailMid','TailBase'], color:0xc78bff, radius:.1 },
];

// Lightweight articulated reference models, built locally with no downloaded assets.
export function createAnimal(kind) {
  const spec = ANIMAL_CATALOG[kind];
  if (!spec) throw new Error('Unknown animal');
  const root = new Group();
  const bodyMaterial = new MeshStandardMaterial({ color:'#d9d9d9', roughness:.75 });
  const detailMaterial = new MeshStandardMaterial({ color:'#353a3b', roughness:.8 });
  detailMaterial.userData.fixedColor = true;
  function bone(name,parent,position) { const b=new Bone(); b.name=name; b.position.fromArray(position); parent.add(b); return b; }
  function mesh(parent,geometry,position,scale=[1,1,1],material=bodyMaterial) {
    const m=new Mesh(geometry,material); m.position.fromArray(position); m.scale.fromArray(scale); m.castShadow=m.receiveShadow=true; parent.add(m); return m;
  }
  const ellipsoid=(parent,p,size,material) => mesh(parent,new SphereGeometry(1,24,16),p,size,material);
  function segment(parent,end,radius) {
    const direction=new Vector3(...end);
    const m=mesh(parent,new CylinderGeometry(radius*.8,radius,direction.length(),16),direction.clone().multiplyScalar(.5).toArray());
    m.quaternion.setFromUnitVectors(new Vector3(0,1,0),direction.normalize());
    ellipsoid(parent,[0,0,0],[radius,radius,radius]);
  }
  const [width,depth,length]=spec.body;
  const footHeight=kind==='horse' ? .19 : .13;
  const body=bone('AnimalRoot',root,[0,spec.leg+footHeight,0]);
  ellipsoid(body,[0,.15,0],spec.body);
  ellipsoid(body,[0,.15,length*.6],[width*.92,depth*.95,length*.42]);
  const neck=bone('AnimalNeck',body,[0,depth*.46,length*.73]);
  const neckEnd=[0,...spec.neck];
  // neck vector is [x, rise, forward].
  segment(neck,neckEnd,kind==='horse' ? .42 : width*.56);
  const head=bone('AnimalHead',neck,neckEnd);
  ellipsoid(head,[0,.08,.1],spec.head);
  const muzzle = kind==='cat' ? [.24,.16,.23] : kind==='dog' ? [.29,.25,.39] : [.3,.3,.48];
  ellipsoid(head,[0,kind==='horse' ? -.28 : -.13,spec.head[2]*.83],muzzle);
  if(kind!=='horse') ellipsoid(head,[0,-.08,spec.head[2]*1.42],[.10,.075,.07],detailMaterial);
  for(const side of [-1,1]) {
    if(kind==='dog') {
      const ear=ellipsoid(head,[side*spec.head[0]*.95,.03,-.06],[.16,.4,.23]); ear.rotation.z=side*.2;
    } else {
      const ear=mesh(head,new ConeGeometry(kind==='cat' ? .18 : .15,kind==='cat' ? .42 : .62,4),[side*spec.head[0]*.7,spec.head[1]+.14,0],[1,1,.62]); ear.rotation.z=-side*.15;
    }
    ellipsoid(head,[side*spec.head[0]*.84,.16,spec.head[2]*.57],[.055,.055,.06],detailMaterial);
  }
  if(kind==='horse') {
    const mane=ellipsoid(neck,[0,spec.neck[0]*.46,spec.neck[1]*.28],[.16,.68,.25],detailMaterial); mane.rotation.x=.4;
  }
  for(const [prefix,front] of [['Front',true],['Hind',false]]) for(const [side,x] of [['Left',-1],['Right',1]]) {
    const name=prefix+side;
    const upper=bone(name+'Upper',body,[x*width*.72,0,(front ? .68 : -.68)*length]);
    const bend=front ? .02 : -.18;
    const end=[0,-spec.leg*.52,bend];
    segment(upper,end,width*(kind==='horse' ? .3 : .32));
    if(!front) ellipsoid(upper,[0,-spec.leg*.13,-.02],[width*.47,spec.leg*.3,width*.53]);
    const lower=bone(name+'Lower',upper,end);
    const pawEnd=[0,-spec.leg*.48,-bend];
    segment(lower,pawEnd,width*.21);
    const paw=bone(name+'Paw',lower,pawEnd);
    ellipsoid(paw,[0,0,.07],[width*.34,footHeight,width*.46],kind==='horse' ? detailMaterial : bodyMaterial);
  }
  const tail=bone('TailBase',body,[0,depth*.35,-length*.86]);
  const tailEnd=kind==='cat' ? [0,.35,-.85] : kind==='dog' ? [0,.3,-.8] : [0,-.75,-.45];
  segment(tail,tailEnd,kind==='horse' ? .2 : .1);
  const middle=bone('TailMid',tail,tailEnd);
  const tipEnd=kind==='horse' ? [0,-.8,-.1] : [0,.3,-.55];
  segment(middle,tipEnd,kind==='horse' ? .16 : .07);
  bone('TailTip',middle,tipEnd);
  root.updateMatrixWorld(true);
  return root;
}

// Rotations are offsets from the neutral GLB rig. The caller restores that
// neutral snapshot first, so switching presets never accumulates deformation.
export function applyAnimalPreset(byName, key, kind = 'dog') {
  if (!getAnimalPresets(kind).some(p => p.key === key)) return;
  const rotate = (name,x=0,y=0,z=0) => byName.get(name)?.rotation.set(x,y,z);
  const leg = (name,upper,lower) => { rotate(name+'Upper',upper); rotate(name+'Lower',lower); };
  if (key === 'animal-left' || key === 'animal-right') {
    rotate('AnimalNeck',0,key==='animal-left' ? -.45 : .45);
    rotate('AnimalHead',0,key==='animal-left' ? -.2 : .2);
  }
  if (key === 'animal-walk' || key === 'animal-run' || key === 'animal-trot' || key === 'animal-canter') {
    const stride = key==='animal-walk' ? .35 : key==='animal-trot' ? .5 : .65;
    for (const [name,sign] of [['FrontLeft',1],['FrontRight',-1],['HindLeft',-1],['HindRight',1]]) leg(name,sign*stride,-sign*stride*.5);
    if(key==='animal-run') { leg('FrontLeft',-.9,.35);leg('FrontRight',-.6,1.0);leg('HindLeft',.8,-.5);leg('HindRight',.5,-.9); }
    if(key==='animal-canter') { leg('FrontLeft',-.8,1.55);leg('FrontRight',-.5,1.25);leg('HindLeft',.5,-.3);leg('HindRight',-.7,.5); }
    rotate('TailBase',key==='animal-run' ? (kind==='horse' ? .25 : -1.0) : 0,.25);
  }
  if (key==='animal-alert') { rotate('AnimalNeck',-.2);rotate('AnimalHead',-.12);rotate('TailBase',kind==='horse' ? -.15 : -.2); }
  if (key==='animal-sniff') { rotate('AnimalNeck',.8);rotate('AnimalHead',.35);rotate('TailBase',-.3); }
  if (key==='animal-sit') {
    const pitch=kind==='dog' ? .45 : .65;
    rotate('AnimalRoot',-pitch);rotate('AnimalNeck',pitch*.6);
    leg('FrontLeft',pitch-.1,.1);leg('FrontRight',pitch-.1,.1);
    const upper=kind==='dog' ? -1.2 : -1.05, lower=kind==='dog' ? 2.8 : 2;
    leg('HindLeft',upper,lower);leg('HindRight',upper,lower);
    rotate('TailBase',.6,.45);rotate('TailMid',.2,.3);
  }
  if (key==='animal-lie') {
    leg('FrontLeft',-1.1,.1);leg('FrontRight',-1.1,.1);
    leg('HindLeft',-1.5,2.9);leg('HindRight',-1.5,2.9);
    rotate('AnimalNeck',-.05);rotate('TailBase',-1.4,.25);rotate('TailMid',.1);
  }
  if (key==='animal-paw') { leg('FrontLeft',-.85,1.9);rotate('AnimalHead',-.1,0,-.1); }
  if (key==='animal-stretch' || key==='animal-bow') {
    rotate('AnimalRoot',.38);rotate('AnimalNeck',-.25);
    leg('FrontLeft',-1.3,-.08);leg('FrontRight',-1.3,-.08);
    leg('HindLeft',-.38,.05);leg('HindRight',-.38,.05);
    rotate('TailBase',-.2);
  }
  if (key==='animal-crouch') {
    leg('FrontLeft',-.7,1.3);leg('FrontRight',-.7,1.3);
    leg('HindLeft',-.8,1.2);leg('HindRight',-.8,1.2);
    rotate('AnimalNeck',.2);rotate('TailBase',-1.2);rotate('TailMid',.1);
  }
  if (key==='animal-tail') { rotate('TailBase',0,0,.65);rotate('TailMid',0,0,.4);rotate('AnimalHead',0,.15,-.08); }
  if (key==='animal-graze') { rotate('AnimalRoot',.08);rotate('AnimalNeck',1.55);rotate('AnimalHead',-.65);leg('FrontLeft',-.18,.1);leg('FrontRight',.18,-.1); }
  if (key==='animal-rest-hoof') { leg('HindLeft',-.25,.7);rotate('HindLeftPaw',.4);rotate('AnimalHead',.1); }
  // Counter-rotate paws/hooves so bending the limb does not turn the foot over.
  for (const name of ['FrontLeft','FrontRight','HindLeft','HindRight']) {
    if(key==='animal-rest-hoof' && name==='HindLeft') continue;
    const sum=['AnimalRoot',name+'Upper',name+'Lower'].reduce((v,n)=>v+(byName.get(n)?.rotation.x??0),0);
    rotate(name+'Paw',-sum);
  }
}

export function animalPresetPreview(preset, kind, actor) {
  // A lightweight copy of the actual neutral bone tree; no mesh or live scene edits.
  const root = new Group();
  const nodes = actor.bones.map((bone,index) => {
    const copy = new Bone(); copy.name=bone.name;
    const rest=actor.neutral.bones[index];
    copy.position.fromArray(rest.position);copy.quaternion.fromArray(rest.quaternion);copy.scale.fromArray(rest.scale);
    return copy;
  });
  actor.bones.forEach((bone,index) => {
    const parent=actor.bones.indexOf(bone.parent);
    (parent<0 ? root : nodes[parent]).add(nodes[index]);
  });
  const byName=new Map(nodes.map(b=>[b.name,b]));
  applyAnimalPreset(byName,preset.key,kind);root.updateMatrixWorld(true);
  const position=name=>byName.get(name).getWorldPosition(new Vector3());
  const front=position('FrontLeftUpper').add(position('FrontRightUpper')).multiplyScalar(.5);
  const hind=position('HindLeftUpper').add(position('HindRightUpper')).multiplyScalar(.5);
  const head=position('AnimalHead');
  const unit=front.distanceTo(hind);
  const headRotation=byName.get('AnimalHead').getWorldQuaternion(byName.get('AnimalHead').quaternion.clone());
  const offset=(x,y,z)=>new Vector3(x,y,z).multiplyScalar(unit).applyQuaternion(headRotation).add(head);
  const muzzle=offset(0,kind==='horse' ? -.18 : -.045,kind==='horse' ? .3 : .18);
  const segments=[[hind,position('TailBase')],[hind,front],[front,position('AnimalNeck')],[position('AnimalNeck'),head],[head,muzzle],
    [position('TailBase'),position('TailMid')],[position('TailMid'),position('TailTip')]];
  const opacity=segments.map(()=>1);
  for(const name of ['FrontRight','HindRight','FrontLeft','HindLeft']) {
    segments.push([position(name+'Upper'),position(name+'Lower')],[position(name+'Lower'),position(name+'Paw')]);
    opacity.push(name.endsWith('Right') ? .45 : 1,name.endsWith('Right') ? .45 : 1);
  }
  // Small ears and muzzle retain species identity in the same line style as humans.
  for(const side of [-1,1]) segments.push([offset(side*.045,.02,0),offset(side*.07,kind==='dog' ? -.07 : .16,-.015)]);
  const project=p=>[p.z*.94-p.x*.34,-p.y+p.z*.1+p.x*.16];
  const lines=segments.map(pair=>pair.map(project)),h=project(head),r=unit*(kind==='horse' ? .09 : .1);
  const points=[...lines.flat(),[h[0]-r,h[1]-r],[h[0]+r,h[1]+r]];
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),padding=unit*.13;
  const lowX=Math.min(...xs)-padding,lowY=Math.min(...ys)-padding;
  return `<svg viewBox="${lowX} ${lowY} ${Math.max(...xs)-lowX+padding} ${Math.max(...ys)-lowY+padding}" aria-hidden="true"><g stroke="currentColor" stroke-width="${unit*.045}" stroke-linecap="round" stroke-linejoin="round">${lines.map(([a,b],i)=>`<line opacity="${opacity[i]??1}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`).join('')}</g><circle cx="${h[0]}" cy="${h[1]}" r="${r}" fill="currentColor"/></svg>`;
}
