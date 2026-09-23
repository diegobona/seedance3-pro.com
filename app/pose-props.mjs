import { Group, Mesh, MeshStandardMaterial, BoxGeometry, SphereGeometry, CylinderGeometry } from 'three';

export const PROP_CATALOG = { chair: 'Chair', stool: 'Stool', table: 'Table', box: 'Box', ball: 'Ball', staff: 'Staff' };

// Dimensions share the mannequin's world units (standing height: 7.25).
export function createProp(kind) {
  if (!Object.hasOwn(PROP_CATALOG, kind)) throw new Error('Unknown prop');
  const model = new Group();
  const material = new MeshStandardMaterial({ color: '#8997a8', roughness: 0.8 });
  function part(geometry, x, y, z) {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    model.add(mesh);
  }
  const box = (w,h,d,x,y,z) => part(new BoxGeometry(w,h,d),x,y,z);
  if (kind === 'chair' || kind === 'stool') {
    box(2.1,.25,2.1,0,2.2,0);
    for (const x of [-.85,.85]) for (const z of [-.85,.85]) box(.18,2.1,.18,x,1.05,z);
    if (kind === 'chair') {
      for (const x of [-.85,.85]) box(.18,2,.18,x,3.25,-.85);
      box(2.1,1.25,.18,0,3.6,-.85);
    }
  } else if (kind === 'table') {
    box(4,.25,2.8,0,3.1,0);
    for (const x of [-1.75,1.75]) for (const z of [-1.15,1.15]) box(.22,3,.22,x,1.5,z);
  } else if (kind === 'box') box(2,2,2,0,1,0);
  else if (kind === 'ball') part(new SphereGeometry(.7,32,24),0,.7,0);
  else part(new CylinderGeometry(.07,.07,6,16),0,3,0);
  return model;
}
