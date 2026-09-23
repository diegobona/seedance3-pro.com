import { Vector3, Quaternion } from 'three';
import { normalizedBoneName } from './pose-rig-index.mjs';
export const PRESET_BONE_BINDINGS = [
  { key: "spine", bone: "mixamorig:Spine", child: "mixamorig:Spine1" },
  { key: "leftArm", bone: "mixamorig:LeftArm", child: "mixamorig:LeftForeArm" },
  { key: "leftForeArm", bone: "mixamorig:LeftForeArm", child: "mixamorig:LeftHand" },
  { key: "rightArm", bone: "mixamorig:RightArm", child: "mixamorig:RightForeArm" },
  { key: "rightForeArm", bone: "mixamorig:RightForeArm", child: "mixamorig:RightHand" },
  { key: "leftUpLeg", bone: "mixamorig:LeftUpLeg", child: "mixamorig:LeftLeg" },
  { key: "leftLeg", bone: "mixamorig:LeftLeg", child: "mixamorig:LeftFoot" },
  { key: "rightUpLeg", bone: "mixamorig:RightUpLeg", child: "mixamorig:RightLeg" },
  { key: "rightLeg", bone: "mixamorig:RightLeg", child: "mixamorig:RightFoot" },
];
export function prepareHumanPresetBindings(model, byName) {
  model.updateMatrixWorld(true);
  const bindings = PRESET_BONE_BINDINGS.map(spec => {
    const bone=byName.get(normalizedBoneName(spec.bone)), child=byName.get(normalizedBoneName(spec.child));
    const restWorldDirection=child.getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3())).normalize();
    const restParentDirection=restWorldDirection.clone().applyQuaternion(bone.parent.getWorldQuaternion(new Quaternion()).invert());
    return {...spec,bone,child,restWorldDirection,restParentDirection,restLocalQuaternion:bone.quaternion.clone()};
  });
  bindings.byName = byName;
  return bindings;
}
export function applyHumanPresetDirections(model, bindings, preset) {
  for(const binding of bindings) {
    const target=new Vector3(...preset.directions[binding.key]).normalize();
    // Presets are absolute directions in the neutral model frame, not rest-pose deltas.
    const world=target;
    const local=world.applyQuaternion(binding.bone.parent.getWorldQuaternion(new Quaternion()).invert()).normalize();
    binding.bone.quaternion.copy(new Quaternion().setFromUnitVectors(binding.restParentDirection,local).multiply(binding.restLocalQuaternion));
    model.updateMatrixWorld(true);
  }

  const find = name => bindings.byName.get(normalizedBoneName('mixamorig' + name));
  function aim(bone, child, direction) {
    if (!bone || !child) return;
    const current = child.getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3())).normalize();
    const inv = bone.parent.getWorldQuaternion(new Quaternion()).invert();
    const desired = new Vector3(...direction).normalize().applyQuaternion(inv);
    current.applyQuaternion(inv);
    bone.quaternion.premultiply(new Quaternion().setFromUnitVectors(current, desired));
    model.updateMatrixWorld(true);
  }
  for (const side of ['Left', 'Right']) {
    const key = side.toLowerCase();
    const hand = find(side+'Hand');
    aim(hand, find(side+'HandMiddle1'), preset.hands?.[key]?.direction ?? preset.directions[key+'ForeArm']);
    const palm = preset.hands?.[key]?.palm;
    if (palm && hand) {
      const axis = find(side+'HandMiddle1').getWorldPosition(new Vector3()).sub(hand.getWorldPosition(new Vector3())).normalize();
      const actual = new Vector3(0,0,1).applyQuaternion(hand.getWorldQuaternion(new Quaternion())).projectOnPlane(axis).normalize();
      const desired = new Vector3(...palm).projectOnPlane(axis).normalize();
      const angle = Math.atan2(axis.dot(actual.clone().cross(desired)), actual.dot(desired));
      const localAxis = axis.applyQuaternion(hand.parent.getWorldQuaternion(new Quaternion()).invert());
      hand.quaternion.premultiply(new Quaternion().setFromAxisAngle(localAxis,angle));
    }
    const grip = preset.hands?.[key]?.grip ?? 'open';
    if (grip === 'flat') {
      const direction = preset.hands[key].direction;
      for (const finger of ['Index','Middle','Ring','Pinky']) for (let joint=1;joint<=3;joint++) {
        const bone=find(side+'Hand'+finger+joint);
        const child=find(side+'Hand'+finger+(joint+1));
        aim(bone,child,direction);
      }
    } else if (grip !== 'open') {
      for (const finger of ['Index','Middle','Ring','Pinky']) for (let joint=1;joint<=3;joint++) {
        if (grip === 'point' && finger === 'Index') continue;
        const bone=find(side+'Hand'+finger+joint);
        if (bone) bone.rotateX((grip === 'relaxed' ? .55 : 1) * [0,1.1,1.45,.95][joint]);
      }
      const thumb=find(side+'HandThumb1');
      if(thumb) { thumb.rotateZ((side === 'Left' ? -.25 : .25)); thumb.rotateX(.35); }
      find(side+'HandThumb2')?.rotateX(.6);
    }
    aim(find(side+'Foot'),find(side+'ToeBase'),preset.feet?.[key] ?? [side === 'Left' ? .08 : -.08,-.22,1]);
    model.updateMatrixWorld(true);
  }
}
