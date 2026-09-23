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
    for (const material of (Array.isArray(part.material) ? part.material : [part.material])) material?.color?.set(color);
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
