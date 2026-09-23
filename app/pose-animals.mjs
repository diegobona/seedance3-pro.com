import { Bone, Group, Mesh, MeshStandardMaterial, SphereGeometry, CylinderGeometry, ConeGeometry, Vector3 } from 'three';

export const ANIMAL_CATALOG = {
  cat: { label: 'Cat', height: 2.6, body: [.42,.49,1], leg: 1.05, head: [.34,.35,.36], neck: [.28,.38] },
  dog: { label: 'Dog', height: 3.4, body: [.52,.62,1.22], leg: 1.4, head: [.43,.46,.5], neck: [.4,.46] },
  horse: { label: 'Horse', height: 6.8, body: [.68,.93,1.7], leg: 2.65, head: [.38,.58,.8], neck: [1.1,.75] },
};

export const ANIMAL_PRESETS = [
  { key:'animal-stand', label:'Standing', category:'Animals' },
  { key:'animal-walk', label:'Walking', category:'Animals' },
  { key:'animal-run', label:'Running', category:'Animals' },
  { key:'animal-left', label:'Look left', category:'Animals' },
  { key:'animal-right', label:'Look right', category:'Animals' },
];

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

export function applyAnimalPreset(byName,key) {
  if(key==='animal-left' || key==='animal-right') byName.get('AnimalNeck').rotation.y=key==='animal-left' ? .7 : -.7;
  if(key==='animal-walk' || key==='animal-run') {
    const stride=key==='animal-run' ? .65 : .35;
    for(const [leg,sign] of [['FrontLeft',1],['FrontRight',-1],['HindLeft',-1],['HindRight',1]]) {
      byName.get(leg+'Upper').rotation.x=sign*stride;
      byName.get(leg+'Lower').rotation.x=-sign*stride*.5;
    }
    byName.get('TailBase').rotation.y=.25;
  }
}

export function animalIcon(kind) {
  const paths={
    cat:'M15 53 Q10 36 18 27 L19 14 28 23 38 22 45 13 46 32 Q49 39 57 40 L72 40 Q82 35 78 21 Q92 38 79 49 L76 66 69 66 69 51 47 51 41 66 34 66 38 47 28 43 23 66 16 66Z',
    dog:'M13 30 L23 20 41 20 49 34 69 37 80 26 85 29 79 43 76 66 68 66 67 50 47 49 41 66 33 66 36 45 26 38 18 38Z M30 23 L39 23 37 44 29 39Z',
    horse:'M14 26 L23 15 27 9 31 15 41 20 49 35 72 35 81 41 84 60 78 60 75 47 71 68 65 68 63 47 49 47 41 68 35 68 39 45 33 32 22 34Z',
  };
  return `<svg viewBox="0 0 96 80" aria-hidden="true"><path d="${paths[kind] ?? paths.dog}" fill="currentColor"/></svg>`;
}
