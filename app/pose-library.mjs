// Absolute bone directions: +X character left, +Y up, +Z forward.
export const POSE_LIBRARY = [
  {"key":"crossed-arms","label":"Crossed arms","category":"Standing","directions":{"spine":[0,1,0],"leftArm":[0.18,-0.85,0.45],"leftForeArm":[-0.95,0.25,0.12],"rightArm":[-0.18,-0.85,0.45],"rightForeArm":[0.95,0.05,0.15],"leftUpLeg":[0.16644,-0.947309,0.273686],"leftLeg":[0.010916,-0.963587,-0.26717],"rightUpLeg":[-0.058972,-0.995809,0.069904],"rightLeg":[-0.055167,-0.988996,-0.13727]},"hands":{"left":{"direction":[-1,0,0]},"right":{"direction":[1,0,0]}}},
  {"key":"kneeling","label":"Kneeling","category":"Floor","directions":{"spine":[0,1,0.08],"leftArm":[0.006912,-0.99746,0.070887],"leftForeArm":[-0.529494,-0.687041,0.497604],"rightArm":[-0.265844,-0.945991,-0.185548],"rightForeArm":[-0.030137,-0.981321,0.190005],"leftUpLeg":[0.189252,0.029986,0.981471],"leftLeg":[0.081664,-0.996493,0.018255],"rightUpLeg":[-0.081918,-0.995868,0.039185],"rightLeg":[-0.049716,0.139544,-0.988967]},"feet":{"right":[0,0,-1]}},
  {"key":"jogging","label":"Jogging","category":"Action","directions":{"spine":[0,1,0.12],"leftArm":[0.12,-1,-0.3],"leftForeArm":[0,-0.1,1],"rightArm":[-0.12,-0.8,0.45],"rightForeArm":[0,0.3,1],"leftUpLeg":[-0.013607,-0.895664,-0.444524],"leftLeg":[-0.024725,-0.257036,-0.966086],"rightUpLeg":[0.011915,-0.923557,0.383276],"rightLeg":[0.009225,-0.938191,0.345995]},"hands":{"left":{"grip":"fist"},"right":{"grip":"fist"}}},
  {"key":"relaxed","label":"Relaxed","category":"Standing","directions":{"spine":[0,1,0],"leftArm":[0.122311,-0.985014,-0.121602],"leftForeArm":[0.118213,-0.983153,0.139412],"rightArm":[-0.122311,-0.985014,-0.121602],"rightForeArm":[-0.118213,-0.983153,0.139412],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]}},
  {"key":"t-pose","label":"Arms out","category":"Standing","directions":{"spine":[0,1,0],"leftArm":[1,0,0],"leftForeArm":[1,0,0],"rightArm":[-1,0,0],"rightForeArm":[-1,0,0],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]}},
  {"key":"wave","label":"Wave","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[0.8,0.2,0],"leftForeArm":[0,1,0],"rightArm":[-0.122311,-0.985014,-0.121602],"rightForeArm":[-0.118213,-0.983153,0.139412],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]},"hands":{"left":{"palm":[0,0,1]}}},
  {"key":"reach","label":"Reach up","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[0.3,1,0],"leftForeArm":[0,1,0],"rightArm":[-0.122311,-0.985014,-0.121602],"rightForeArm":[-0.118213,-0.983153,0.139412],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]}},
  {"key":"celebrate","label":"Celebrate","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[0.7,0.8,0],"leftForeArm":[0.2,1,0],"rightArm":[-0.7,0.8,0],"rightForeArm":[-0.2,1,0],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]}},
  {"key":"point","label":"Point ahead","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[0.1,0,1],"leftForeArm":[0,0,1],"rightArm":[-0.122311,-0.985014,-0.121602],"rightForeArm":[-0.118213,-0.983153,0.139412],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]},"hands":{"left":{"grip":"point"}}},
  {"key":"present","label":"Present","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[0.6,-0.8,0],"leftForeArm":[0.8,0.2,0.4],"rightArm":[-0.122311,-0.985014,-0.121602],"rightForeArm":[-0.118213,-0.983153,0.139412],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]},"hands":{"left":{"palm":[0,1,0]}}},
  {"key":"hands-up","label":"Hands up","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[1,0,0],"leftForeArm":[0,1,0],"rightArm":[-1,0,0],"rightForeArm":[0,1,0],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]},"hands":{"left":{"palm":[0,0,1]},"right":{"palm":[0,0,1]}}},
  {"key":"hips","label":"Hands on hips","category":"Standing","directions":{"spine":[0,1,0],"leftArm":[0.8,-0.6,0],"leftForeArm":[-0.4,-0.9,0.12],"rightArm":[-0.8,-0.6,0],"rightForeArm":[0.4,-0.9,0.12],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]},"hands":{"left":{"direction":[-0.7,-0.6,0],"palm":[-1,0,0]},"right":{"direction":[0.7,-0.6,0],"palm":[1,0,0]}}},
  {"key":"think","label":"Thinking","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[0.122311,-0.985014,-0.121602],"leftForeArm":[0.118213,-0.983153,0.139412],"rightArm":[-0.12,-1,0.2],"rightForeArm":[0.45,0.8,0.3],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]},"hands":{"right":{"direction":[0.15,0.75,0.2],"grip":"relaxed"}}},
  {"key":"walk","label":"Walking","category":"Action","directions":{"spine":[0,1,0],"leftArm":[0.15,-0.9,-0.3],"leftForeArm":[0.05,-1,-0.2],"rightArm":[-0.15,-0.9,0.3],"rightForeArm":[-0.05,-0.85,0.5],"leftUpLeg":[0.1,-0.9,0.4],"leftLeg":[0.1,-1,0],"rightUpLeg":[-0.1,-0.9,-0.4],"rightLeg":[-0.1,-0.9,-0.3]}},
  {"key":"run","label":"Sprint","category":"Action","directions":{"spine":[0,1,0.22],"leftArm":[0.12,-0.95,-0.45],"leftForeArm":[0,-0.4,1],"rightArm":[-0.12,-0.55,0.85],"rightForeArm":[0,0.5,1],"leftUpLeg":[0.1,-0.3,1],"leftLeg":[0,-1,-0.2],"rightUpLeg":[-0.1,-0.8,-0.5],"rightLeg":[0,0.3,-1]},"hands":{"left":{"grip":"fist"},"right":{"grip":"fist"}},"feet":{"right":[0,-0.5,-1]}},
  {"key":"balance","label":"Balance","category":"Action","directions":{"spine":[0,1,0],"leftArm":[1,0,0],"leftForeArm":[1,0,0],"rightArm":[-1,0,0],"rightForeArm":[-1,0,0],"leftUpLeg":[0.2,-0.2,1],"leftLeg":[0,-1,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]}},
  {"key":"boxing","label":"Boxing guard","category":"Action","directions":{"spine":[0,1,0.1],"leftArm":[0.1,-0.92,0.38],"leftForeArm":[-0.25,0.95,0.18],"rightArm":[-0.1,-0.92,0.28],"rightForeArm":[0.25,0.95,0.22],"leftUpLeg":[0.15,-1,0.2],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.15,-1,-0.25],"rightLeg":[-0.104528,-0.994522,0]},"hands":{"left":{"grip":"fist"},"right":{"grip":"fist"}}},
  {"key":"lunge","label":"Lunge","category":"Action","directions":{"spine":[0,1,0.08],"leftArm":[0.122311,-0.985014,-0.121602],"leftForeArm":[0.118213,-0.983153,0.139412],"rightArm":[-0.122311,-0.985014,-0.121602],"rightForeArm":[-0.118213,-0.983153,0.139412],"leftUpLeg":[0.15,-0.2,1],"leftLeg":[0,-1,0],"rightUpLeg":[-0.1,-0.7,-0.7],"rightLeg":[0,-1,-0.2]}},
  {"key":"sit","label":"Seated","category":"Seated","directions":{"spine":[0,1,0],"leftArm":[0.1,-1,0.1],"leftForeArm":[0.1,-0.35,1],"rightArm":[-0.1,-1,0.1],"rightForeArm":[-0.1,-0.35,1],"leftUpLeg":[0.15,0,1],"leftLeg":[0,-1,0],"rightUpLeg":[-0.15,0,1],"rightLeg":[0,-1,0]},"hands":{"left":{"direction":[0,-0.1,1],"palm":[0,-1,0]},"right":{"direction":[0,-0.1,1],"palm":[0,-1,0]}}},
  {"key":"sit-reach","label":"Seated reach","category":"Seated","directions":{"spine":[0,1,0],"leftArm":[0.1,0,1],"leftForeArm":[0,0,1],"rightArm":[-0.1,-1,0.1],"rightForeArm":[-0.1,-0.35,1],"leftUpLeg":[0.15,0,1],"leftLeg":[0,-1,0],"rightUpLeg":[-0.15,0,1],"rightLeg":[0,-1,0]},"hands":{"right":{"direction":[0,-0.1,1],"palm":[0,-1,0]}}},
  {"key":"sit-wide","label":"Wide seated","category":"Seated","directions":{"spine":[0,1,0],"leftArm":[0.1,-1,0.1],"leftForeArm":[0.35,-0.35,1],"rightArm":[-0.1,-1,0.1],"rightForeArm":[-0.35,-0.35,1],"leftUpLeg":[0.7,0,1],"leftLeg":[0,-1,0],"rightUpLeg":[-0.7,0,1],"rightLeg":[0,-1,0]},"hands":{"left":{"direction":[0,-0.1,1],"palm":[0,-1,0]},"right":{"direction":[0,-0.1,1],"palm":[0,-1,0]}}},
  {"key":"squat","label":"Squat","category":"Floor","directions":{"spine":[0,0.9,0.3],"leftArm":[0.2,0,1],"leftForeArm":[0,0,1],"rightArm":[-0.2,0,1],"rightForeArm":[0,0,1],"leftUpLeg":[0.3,0.05,1],"leftLeg":[-0.1,-1,-0.5],"rightUpLeg":[-0.3,0.05,1],"rightLeg":[0.1,-1,-0.5]}},
  {"key":"kneel-both","label":"Both knees","category":"Floor","directions":{"spine":[0,1,0],"leftArm":[0.122311,-0.985014,-0.121602],"leftForeArm":[0.118213,-0.983153,0.139412],"rightArm":[-0.122311,-0.985014,-0.121602],"rightForeArm":[-0.118213,-0.983153,0.139412],"leftUpLeg":[0.15,-1,0],"leftLeg":[0,0.1,-1],"rightUpLeg":[-0.15,-1,0],"rightLeg":[0,0.1,-1]},"feet":{"left":[0,0,-1],"right":[0,0,-1]}},
  {"key":"floor-sit","label":"Floor seated","category":"Floor","directions":{"spine":[0,1,0],"leftArm":[0.25,-1,-0.15],"leftForeArm":[0.1,-1,-0.1],"rightArm":[-0.25,-1,-0.15],"rightForeArm":[-0.1,-1,-0.1],"leftUpLeg":[0.2,0,1],"leftLeg":[0.1,0,1],"rightUpLeg":[-0.2,0,1],"rightLeg":[-0.1,0,1]},"hands":{"left":{"direction":[0.1,0,1]},"right":{"direction":[-0.1,0,1]}},"feet":{"left":[0,1,0],"right":[0,1,0]}},
  {"key":"attention","label":"Attention","category":"Standing","directions":{"spine":[0,1,0],"leftArm":[0.08,-1,0],"leftForeArm":[0,-1,0],"rightArm":[-0.08,-1,0],"rightForeArm":[0,-1,0],"leftUpLeg":[0.02,-1,0],"leftLeg":[0,-1,0],"rightUpLeg":[-0.02,-1,0],"rightLeg":[0,-1,0]}},
  {"key":"one-hand-hip","label":"One hand on hip","category":"Standing","directions":{"spine":[0,1,0],"leftArm":[0.8,-0.6,0],"leftForeArm":[-0.4,-0.9,0.12],"rightArm":[-0.122311,-0.985014,-0.121602],"rightForeArm":[-0.118213,-0.983153,0.139412],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.25,-1,0.15],"rightLeg":[0.1,-1,-0.15]},"hands":{"left":{"direction":[-0.7,-0.6,0],"palm":[-1,0,0]}}},
  {"key":"model-stance","label":"Model stance","category":"Standing","directions":{"spine":[0.08,1,0],"leftArm":[0.8,-0.6,0],"leftForeArm":[-0.4,-0.9,0.12],"rightArm":[-0.122311,-0.985014,-0.121602],"rightForeArm":[-0.118213,-0.983153,0.139412],"leftUpLeg":[0.02,-1,0],"leftLeg":[0,-1,0],"rightUpLeg":[0.18,-0.95,0.25],"rightLeg":[-0.12,-1,-0.18]},"hands":{"left":{"direction":[-0.7,-0.6,0],"palm":[-1,0,0]}}},
  {"key":"salute","label":"Salute","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[0.122311,-0.985014,-0.121602],"leftForeArm":[0.118213,-0.983153,0.139412],"rightArm":[-0.85,-0.3,0.15],"rightForeArm":[0.4,0.85,0.25],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]},"hands":{"right":{"direction":[0.85,0.35,0],"palm":[0,0,1],"grip":"flat"}}},
  {"key":"phone","label":"On the phone","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[0.122311,-0.985014,-0.121602],"leftForeArm":[0.118213,-0.983153,0.139412],"rightArm":[-0.38,-0.95,0.05],"rightForeArm":[0.08,1,0.03],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]},"hands":{"right":{"direction":[0,1,0],"grip":"relaxed","palm":[1,0,0]}}},
  {"key":"shrug","label":"Shrug","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[0.5,-0.85,0],"leftForeArm":[0.7,0.65,0.3],"rightArm":[-0.5,-0.85,0],"rightForeArm":[-0.7,0.65,0.3],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]},"hands":{"left":{"palm":[0,1,0]},"right":{"palm":[0,1,0]}}},
  {"key":"overhead-stretch","label":"Overhead stretch","category":"Gesture","directions":{"spine":[0,1,0],"leftArm":[0.3,1,0],"leftForeArm":[-0.3,1,0.1],"rightArm":[-0.3,1,0],"rightForeArm":[0.3,1,0.1],"leftUpLeg":[0.104528,-0.994522,0],"leftLeg":[0.104528,-0.994522,0],"rightUpLeg":[-0.104528,-0.994522,0],"rightLeg":[-0.104528,-0.994522,0]}},
  {"key":"punch","label":"Straight punch","category":"Action","directions":{"spine":[0,0.98,0.15],"leftArm":[0.08,0.05,1],"leftForeArm":[0,0,1],"rightArm":[-0.1,-0.92,0.28],"rightForeArm":[0.25,0.95,0.22],"leftUpLeg":[0.2,-1,0.3],"leftLeg":[0,-1,-0.1],"rightUpLeg":[-0.25,-1,-0.4],"rightLeg":[0,-1,-0.1]},"hands":{"left":{"grip":"fist"},"right":{"grip":"fist"}}},
  {"key":"front-kick","label":"Front kick","category":"Action","directions":{"spine":[0,1,-0.12],"leftArm":[0.6,-0.4,-0.3],"leftForeArm":[0.2,0.8,0.5],"rightArm":[-0.4,-0.5,0.3],"rightForeArm":[0.1,1,0.3],"leftUpLeg":[0.1,0.1,1],"leftLeg":[0,-0.08,1],"rightUpLeg":[-0.08,-1,0],"rightLeg":[0,-1,0]},"hands":{"left":{"grip":"fist"},"right":{"grip":"fist"}}},
  {"key":"side-lunge","label":"Side lunge","category":"Action","directions":{"spine":[0.15,1,0.2],"leftArm":[0.2,-0.3,1],"leftForeArm":[-0.25,0.25,1],"rightArm":[-0.2,-0.3,1],"rightForeArm":[0.25,0.25,1],"leftUpLeg":[0.8,-0.5,0.5],"leftLeg":[-0.1,-1,-0.15],"rightUpLeg":[-0.8,-0.8,0],"rightLeg":[-0.7,-0.8,0]}},
  {"key":"sit-hands-lap","label":"Hands on lap","category":"Seated","directions":{"spine":[0,1,0],"leftArm":[0.1,-1,0.1],"leftForeArm":[0.1,-0.35,1],"rightArm":[-0.1,-1,0.1],"rightForeArm":[-0.1,-0.35,1],"leftUpLeg":[0.15,0,1],"leftLeg":[0,-1,0],"rightUpLeg":[-0.15,0,1],"rightLeg":[0,-1,0]},"hands":{"left":{"direction":[0,-0.1,1],"palm":[0,-1,0]},"right":{"direction":[0,-0.1,1],"palm":[0,-1,0]}}},
  {"key":"sit-lean-forward","label":"Seated lean","category":"Seated","directions":{"spine":[0,0.85,0.5],"leftArm":[0.2,-1,0.05],"leftForeArm":[-0.15,-0.15,1],"rightArm":[-0.2,-1,0.05],"rightForeArm":[0.15,-0.15,1],"leftUpLeg":[0.4,0,1],"leftLeg":[0,-1,-0.15],"rightUpLeg":[-0.4,0,1],"rightLeg":[0,-1,-0.15]},"hands":{"left":{"direction":[0,-0.1,1],"palm":[0,-1,0]},"right":{"direction":[0,-0.1,1],"palm":[0,-1,0]}}},
];

// Use normalized authored directions and anatomical segment lengths. Auto-fit
// each diagram so raised arms and seated legs stay inside the thumbnail.
export function presetPreview(preset) {
  const add = (a,b) => a.map((v,i)=>v+b[i]);
  const scaled = (v,length) => v.map(n=>n/Math.hypot(...v)*length);
  const pelvis=[0,3.8,0];
  const chest=add(pelvis,scaled(preset.directions.spine,1.9));
  const neck=add(chest,[0,.35,0]);
  const head=add(neck,[0,.38,0]);
  const lines=[[pelvis,chest],[chest,neck]];
  const fists=[];
  for(const [side,sign] of [['left',1],['right',-1]]) {
    const shoulder=add(chest,[sign*.65,0,0]);
    const elbow=add(shoulder,scaled(preset.directions[side+'Arm'],.94));
    const wrist=add(elbow,scaled(preset.directions[side+'ForeArm'],1.12));
    const hand=add(wrist,scaled(preset.hands?.[side]?.direction??preset.directions[side+'ForeArm'],.38));
    const hip=add(pelvis,[sign*.35,0,0]);
    const knee=add(hip,scaled(preset.directions[side+'UpLeg'],1.7));
    const ankle=add(knee,scaled(preset.directions[side+'Leg'],1.65));
    const toe=add(ankle,scaled(preset.feet?.[side]??[0,-.22,1],.4));
    lines.push([chest,shoulder],[shoulder,elbow],[elbow,wrist],[wrist,hand],[pelvis,hip],[hip,knee],[knee,ankle],[ankle,toe]);
    if(preset.hands?.[side]?.grip==='fist') fists.push(hand);
  }
  const project=([x,y,z])=>[x*.87-z*.5,-y+(x*.5+z*.87)*.12];
  const segments=lines.map(pair=>pair.map(project));
  const h=project(head), points=[...segments.flat(),[h[0]-.32,h[1]-.32],[h[0]+.32,h[1]+.32]];
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const lowX=Math.min(...xs)-.3,lowY=Math.min(...ys)-.3;
  const width=Math.max(...xs)-lowX+.3,height=Math.max(...ys)-lowY+.3;
  return `<svg viewBox="${lowX} ${lowY} ${width} ${height}" aria-hidden="true"><circle cx="${h[0]}" cy="${h[1]}" r=".32" fill="currentColor"/><g stroke="currentColor" stroke-width=".16" stroke-linecap="round" stroke-linejoin="round">${segments.map(([a,b])=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`).join('')}</g>${fists.map(p=>{const [x,y]=project(p);return `<circle cx="${x}" cy="${y}" r=".16" fill="currentColor"/>`;}).join('')}</svg>`;
}

export function setActorColor(actor, color) {
  actor.color = color;
  actor.model.traverse(part => {
    for (const material of (Array.isArray(part.material) ? part.material : [part.material])) if (!material?.userData?.fixedColor) material?.color?.set(color);
  });
}

export function setActorMirrored(actor, mirrored) {
  if (Boolean(actor.mirrored) === mirrored) return;
  const root = actor.model.children[0];
  root.scale.x *= -1;
  root.position.x *= -1;
  actor.mirrored = mirrored;
  actor.model.updateMatrixWorld(true);
}
