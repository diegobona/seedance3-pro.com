import { ANYPOSES_PRESETS, ANYPOSES_REFERENCE_DIRECTIONS as base } from './pose-presets.mjs';

const pose = (key, label, category, directions = {}) => ({ key, label, category, directions: { ...base, ...directions } });
export const POSE_LIBRARY = [
  ...ANYPOSES_PRESETS.map(p => ({ ...p, category: p.key === 'jogging' ? 'Action' : p.key === 'kneeling' ? 'Floor' : 'Standing' })),
  pose('relaxed', 'Relaxed', 'Standing'),
  pose('t-pose', 'Arms out', 'Standing', { leftArm:[1,0,0],leftForeArm:[1,0,0],rightArm:[-1,0,0],rightForeArm:[-1,0,0] }),
  pose('wave', 'Wave', 'Gesture', { leftArm:[.8,.2,0],leftForeArm:[0,1,0] }),
  pose('reach', 'Reach up', 'Gesture', { leftArm:[.3,1,0],leftForeArm:[0,1,0] }),
  pose('celebrate', 'Celebrate', 'Gesture', { leftArm:[.7,.8,0],leftForeArm:[.2,1,0],rightArm:[-.7,.8,0],rightForeArm:[-.2,1,0] }),
  pose('point', 'Point ahead', 'Gesture', { leftArm:[.1,0,1],leftForeArm:[0,0,1] }),
  pose('present', 'Present', 'Gesture', { leftArm:[.6,-.8,0],leftForeArm:[.8,.2,.4] }),
  pose('hands-up', 'Hands up', 'Gesture', { leftArm:[1,0,0],leftForeArm:[0,1,0],rightArm:[-1,0,0],rightForeArm:[0,1,0] }),
  pose('hips', 'Hands on hips', 'Standing', { leftArm:[.65,-.75,0],leftForeArm:[-.7,.1,.2],rightArm:[-.65,-.75,0],rightForeArm:[.7,.1,.2] }),
  pose('think', 'Thinking', 'Gesture', { rightArm:[-.2,-.8,.3],rightForeArm:[.2,.9,.2] }),
  pose('walk', 'Walking', 'Action', { leftUpLeg:[.1,-.9,.4],leftLeg:[.1,-1,0],rightUpLeg:[-.1,-.9,-.4],rightLeg:[-.1,-.9,-.3],leftArm:[.15,-.9,-.3],rightArm:[-.15,-.9,.3] }),
  pose('run', 'Sprint', 'Action', { spine:[0,.85,.3],leftUpLeg:[.1,-.3,1],leftLeg:[0,-1,-.2],rightUpLeg:[-.1,-.8,-.5],rightLeg:[0,.3,-1],leftArm:[.2,-.6,-.8],leftForeArm:[0,.2,1],rightArm:[-.2,-.5,.8],rightForeArm:[0,1,.3] }),
  pose('balance', 'Balance', 'Action', { leftArm:[1,0,0],leftForeArm:[1,0,0],rightArm:[-1,0,0],rightForeArm:[-1,0,0],leftUpLeg:[.2,-.2,1],leftLeg:[0,-1,0] }),
  pose('boxing', 'Boxing guard', 'Action', { leftArm:[.4,-.4,.7],leftForeArm:[0,1,.3],rightArm:[-.4,-.4,.7],rightForeArm:[0,1,.3],leftUpLeg:[.2,-1,.2],rightUpLeg:[-.2,-1,-.2] }),
  pose('lunge', 'Lunge', 'Action', { leftUpLeg:[.15,-.2,1],leftLeg:[0,-1,0],rightUpLeg:[-.1,-.7,-.7],rightLeg:[0,-1,-.2] }),
  pose('sit', 'Seated', 'Seated', { leftUpLeg:[.15,0,1],leftLeg:[0,-1,0],rightUpLeg:[-.15,0,1],rightLeg:[0,-1,0],leftForeArm:[0,-.2,1],rightForeArm:[0,-.2,1] }),
  pose('sit-reach', 'Seated reach', 'Seated', { leftUpLeg:[.15,0,1],leftLeg:[0,-1,0],rightUpLeg:[-.15,0,1],rightLeg:[0,-1,0],leftArm:[.1,0,1],leftForeArm:[0,0,1] }),
  pose('sit-wide', 'Wide seated', 'Seated', { leftUpLeg:[.7,0,1],leftLeg:[0,-1,0],rightUpLeg:[-.7,0,1],rightLeg:[0,-1,0] }),
  pose('squat', 'Squat', 'Floor', { spine:[0,.9,.3],leftUpLeg:[.4,.1,1],leftLeg:[-.1,-1,-.5],rightUpLeg:[-.4,.1,1],rightLeg:[.1,-1,-.5],leftArm:[.2,0,1],leftForeArm:[0,0,1],rightArm:[-.2,0,1],rightForeArm:[0,0,1] }),
  pose('kneel-both', 'Both knees', 'Floor', { leftUpLeg:[.15,-1,0],leftLeg:[0,.1,-1],rightUpLeg:[-.15,-1,0],rightLeg:[0,.1,-1] }),
  pose('floor-sit', 'Floor seated', 'Floor', { leftUpLeg:[.2,0,1],leftLeg:[.1,0,1],rightUpLeg:[-.2,0,1],rightLeg:[-.1,0,1] }),
  pose('attention', 'Attention', 'Standing', { spine:[0,1,0],leftArm:[.08,-1,0],leftForeArm:[0,-1,0],rightArm:[-.08,-1,0],rightForeArm:[0,-1,0],leftUpLeg:[.02,-1,0],leftLeg:[0,-1,0],rightUpLeg:[-.02,-1,0],rightLeg:[0,-1,0] }),
  pose('one-hand-hip', 'One hand on hip', 'Standing', { leftArm:[.65,-.75,0],leftForeArm:[-.7,.1,.2],rightUpLeg:[-.25,-1,.15],rightLeg:[.1,-1,-.15] }),
  pose('model-stance', 'Model stance', 'Standing', { spine:[.08,1,0],leftArm:[.55,-.8,0],leftForeArm:[-.65,.05,.2],leftUpLeg:[.02,-1,0],leftLeg:[0,-1,0],rightUpLeg:[.18,-.95,.25],rightLeg:[-.12,-1,-.18] }),
  pose('salute', 'Salute', 'Gesture', { rightArm:[-.85,.05,.3],rightForeArm:[.65,.8,.05] }),
  pose('phone', 'On the phone', 'Gesture', { rightArm:[-.35,-.9,.12],rightForeArm:[.15,1,.12] }),
  pose('shrug', 'Shrug', 'Gesture', { leftArm:[.5,-.85,0],leftForeArm:[.7,.65,.3],rightArm:[-.5,-.85,0],rightForeArm:[-.7,.65,.3] }),
  pose('overhead-stretch', 'Overhead stretch', 'Gesture', { spine:[0,1,0],leftArm:[.3,1,0],leftForeArm:[-.3,1,.1],rightArm:[-.3,1,0],rightForeArm:[.3,1,.1] }),
  pose('punch', 'Straight punch', 'Action', { spine:[0,.98,.15],leftArm:[.08,.05,1],leftForeArm:[0,0,1],rightArm:[-.35,-.45,.6],rightForeArm:[.1,1,.2],leftUpLeg:[.2,-1,.3],leftLeg:[0,-1,-.1],rightUpLeg:[-.25,-1,-.4],rightLeg:[0,-1,-.1] }),
  pose('front-kick', 'Front kick', 'Action', { spine:[0,1,-.12],leftUpLeg:[.1,.1,1],leftLeg:[0,-.08,1],rightUpLeg:[-.08,-1,0],rightLeg:[0,-1,0],leftArm:[.6,-.4,-.3],leftForeArm:[.2,.8,.5],rightArm:[-.4,-.5,.3],rightForeArm:[.1,1,.3] }),
  pose('side-lunge', 'Side lunge', 'Action', { spine:[.15,1,.2],leftUpLeg:[.8,-.5,.5],leftLeg:[-.1,-1,-.15],rightUpLeg:[-.8,-.8,0],rightLeg:[-.7,-.8,0],leftArm:[.2,-.3,1],leftForeArm:[-.25,.25,1],rightArm:[-.2,-.3,1],rightForeArm:[.25,.25,1] }),
  pose('sit-hands-lap', 'Hands on lap', 'Seated', { spine:[0,1,0],leftUpLeg:[.15,0,1],leftLeg:[0,-1,0],rightUpLeg:[-.15,0,1],rightLeg:[0,-1,0],leftArm:[.12,-1,.15],leftForeArm:[-.2,-.15,1],rightArm:[-.12,-1,.15],rightForeArm:[.2,-.15,1] }),
  pose('sit-lean-forward', 'Seated lean', 'Seated', { spine:[0,.85,.5],leftUpLeg:[.4,0,1],leftLeg:[0,-1,-.15],rightUpLeg:[-.4,0,1],rightLeg:[0,-1,-.15],leftArm:[.2,-1,.2],leftForeArm:[-.25,.1,1],rightArm:[-.2,-1,.2],rightForeArm:[.25,.1,1] }),
];

// Compact 3D-direction projection: an illustrative preview, not a generated image.
export function presetPreview(preset) {
  const project = ([x,y,z]) => [x * 20 + z * 9, -y * 20 + z * 4];
  const points = [[32,12],[32,25],[32,46]];
  const lines = [[points[0],points[1]],[points[1],points[2]]];
  for (const [side, start, upper, lower] of [['left',[37,26],'Arm','ForeArm'],['right',[27,26],'Arm','ForeArm'],['left',[35,46],'UpLeg','Leg'],['right',[29,46],'UpLeg','Leg']]) {
    const a = project(preset.directions[side+upper]);
    const b = project(preset.directions[side+lower]);
    const mid = [start[0]+a[0],start[1]+a[1]];
    lines.push([start,mid],[mid,[mid[0]+b[0],mid[1]+b[1]]]);
  }
  return `<svg viewBox="-5 -12 85 112" aria-hidden="true"><circle cx="32" cy="7" r="6" fill="currentColor"/><g stroke="currentColor" stroke-width="4" stroke-linecap="round">${lines.map(([a,b])=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`).join('')}</g></svg>`;
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
