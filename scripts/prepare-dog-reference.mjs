// Prepare the CC0 Jack Russell by crownjoshua for the animal reference rig.
// Source: https://opengameart.org/content/dog-low-poly-rigged
// Archive: https://opengameart.org/sites/default/files/OBJ.zip
// Usage: node scripts/prepare-dog-reference.mjs [source.zip|source.obj] [output.obj]
// Needs only Node. Reads the selected OBJ/MTL from ZIP without extracting paths.
import fs from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

const input = process.argv[2] ?? '.animal-asset-work/sources/dog-jack-russell-obj.zip';
const output = process.argv[3] ?? '.animal-asset-work/sources/dog-smooth.obj';
const average = items => items[0].map((_, i) => items.reduce((sum, p) => sum + p[i], 0) / items.length);
const smoothstep = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };

function zipEntry(zip, extension) {
  let eocd = zip.length - 22;
  while (eocd >= Math.max(0, zip.length - 65557) && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('ZIP central directory missing');
  let entry = zip.readUInt32LE(eocd + 16);
  for (let i = 0; i < zip.readUInt16LE(eocd + 10); i++) {
    const nameLength = zip.readUInt16LE(entry + 28), extraLength = zip.readUInt16LE(entry + 30), commentLength = zip.readUInt16LE(entry + 32);
    const name = zip.toString('utf8', entry + 46, entry + 46 + nameLength);
    if (name.toLowerCase().endsWith(extension)) {
      const method = zip.readUInt16LE(entry + 10), size = zip.readUInt32LE(entry + 20), local = zip.readUInt32LE(entry + 42);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      if (method !== 0 && method !== 8) throw new Error(`Unsupported ZIP method ${method}`);
      return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
    }
    entry += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`ZIP has no ${extension} source`);
}

function parseObj(text) {
  const vertices = [], faces = [];
  let material = '';
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === 'v') vertices.push(parts.slice(1, 4).map(Number));
    else if (parts[0] === 'usemtl') material = parts[1];
    else if (parts[0] === 'f') faces.push({ v: parts.slice(1).map(value => Number(value.split('/')[0]) - 1), material });
  }
  return { vertices, faces };
}

function components(mesh) {
  const attached = mesh.vertices.map(() => []), seen = new Set(), result = [];
  mesh.faces.forEach((face, i) => face.v.forEach(v => attached[v].push(i)));
  for (let seed = 0; seed < mesh.vertices.length; seed++) {
    if (seen.has(seed)) continue;
    const vertexIds = [], faceIds = new Set(), queue = [seed];
    seen.add(seed);
    while (queue.length) {
      const v = queue.pop(); vertexIds.push(v);
      for (const fi of attached[v]) {
        faceIds.add(fi);
        for (const adjacent of mesh.faces[fi].v) if (!seen.has(adjacent)) { seen.add(adjacent); queue.push(adjacent); }
      }
    }
    const remap = new Map(vertexIds.map((v, i) => [v, i]));
    result.push({ vertices: vertexIds.map(v => [...mesh.vertices[v]]), faces: [...faceIds].map(fi => ({ ...mesh.faces[fi], v: mesh.faces[fi].v.map(v => remap.get(v)) })) });
  }
  return result;
}

function subdivide(mesh) {
  const { vertices, faces } = mesh;
  const facePoints = faces.map(face => average(face.v.map(i => vertices[i])));
  const edges = new Map(), vertexEdges = vertices.map(() => []), vertexFaces = vertices.map(() => []);
  const key = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
  faces.forEach((face, fi) => face.v.forEach((a, i) => {
    vertexFaces[a].push(fi);
    const b = face.v[(i + 1) % face.v.length];
    let edge = edges.get(key(a, b));
    if (!edge) { edge = { a, b, faces: [] }; edges.set(key(a, b), edge); vertexEdges[a].push(edge); vertexEdges[b].push(edge); }
    edge.faces.push(fi);
  }));
  const points = vertices.map((point, i) => {
    const boundary = vertexEdges[i].filter(edge => edge.faces.length === 1);
    if (boundary.length) {
      const neighbors = average(boundary.map(edge => vertices[edge.a === i ? edge.b : edge.a]));
      return point.map((v, j) => v * .75 + neighbors[j] * .25);
    }
    const n = vertexFaces[i].length;
    const faceMean = average(vertexFaces[i].map(fi => facePoints[fi]));
    const edgeMean = average(vertexEdges[i].map(edge => average([vertices[edge.a], vertices[edge.b]])));
    return point.map((v, j) => (faceMean[j] + 2 * edgeMean[j] + (n - 3) * v) / n);
  });
  for (const edge of edges.values()) {
    edge.index = points.length;
    points.push(average([vertices[edge.a], vertices[edge.b], ...(edge.faces.length === 1 ? [] : edge.faces.map(fi => facePoints[fi]))]));
  }
  const faceOffset = points.length; points.push(...facePoints);
  const nextFaces = [];
  faces.forEach((face, fi) => face.v.forEach((v, i) => {
    const previous = face.v[(i + face.v.length - 1) % face.v.length], next = face.v[(i + 1) % face.v.length];
    nextFaces.push({ v: [v, edges.get(key(v, next)).index, faceOffset + fi, edges.get(key(previous, v)).index], material: face.material });
  }));
  return { vertices: points, faces: nextFaces };
}

// A broad transition lowers the head and upper neck together, leaving the
// ribcage, shoulders and all four legs at their original outline and positions.
function anatomicalPoint(point, isEar) {
  let [x, y, z] = point;
  const centerX = -.181045;
  if (isEar) {
    const hanging = Math.max(0, 2.717668 - y);
    y -= hanging * 1.15;
    x = centerX + (x - centerX) * 1.12;
    z += hanging * .12;
  }
  const head = smoothstep(1.25, 2.6, z) * smoothstep(.5, 1.6, y);
  const cheek = smoothstep(2.12, 2.8, z) * (1 - smoothstep(3.3, 3.95, z)) * smoothstep(1.15, 2.0, y);
  x = centerX + (x - centerX) * (1 + .19 * cheek);
  y -= .48 * head;
  z += .10 * head;
  return [x, y, z];
}

const isZip = input.toLowerCase().endsWith('.zip');
const bytes = fs.readFileSync(input);
const objText = isZip ? zipEntry(bytes, '.obj') : bytes.toString('utf8');
const mtlText = isZip ? zipEntry(bytes, '.mtl') : fs.readFileSync(input.replace(/\.obj$/i, '.mtl'), 'utf8');
const result = { vertices: [], faces: [] };
let removedParts = 0;
for (let part of components(parseObj(objText))) {
  const materials = new Set(part.faces.map(face => face.material));
  const ys = part.vertices.map(v => v[1]), ySpan = Math.max(...ys) - Math.min(...ys);
  // Remove both cartoon eye assemblies and thin detached eyebrow components.
  if ([...materials].some(material => material.startsWith('Dog_Eye_')) || (part.vertices.length < 100 && ySpan < .2)) { removedParts++; continue; }
  const isEar = part.vertices.length < 100;
  part.vertices = part.vertices.map(point => anatomicalPoint(point, isEar));
  part = subdivide(subdivide(part));
  const offset = result.vertices.length;
  result.vertices.push(...part.vertices);
  result.faces.push(...part.faces.map(face => ({ ...face, v: face.v.map(v => v + offset) })));
}
const bounds = mesh => ({ min: [0, 1, 2].map(i => Math.min(...mesh.vertices.map(v => v[i]))), max: [0, 1, 2].map(i => Math.max(...mesh.vertices.map(v => v[i]))) });
const before = bounds(result), centerX = (before.min[0] + before.max[0]) / 2;
result.vertices = result.vertices.map(point => [point[0] - centerX, point[1] - before.min[1], point[2]]);
const mtlOutput = output.replace(/\.obj$/i, '.mtl');
const lines = ['# CC0 Jack Russell by crownjoshua; refined anatomical reference.', `mtllib ${path.basename(mtlOutput)}`, 'o Dog', 's 1', ...result.vertices.map(v => 'v ' + v.join(' '))];
let material = '';
for (const face of result.faces) {
  if (material !== face.material) { material = face.material; lines.push('usemtl ' + material); }
  lines.push('f ' + face.v.map(v => v + 1).join(' '));
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, lines.join('\n'));
fs.writeFileSync(mtlOutput, mtlText);
fs.writeFileSync(output.replace(/\.obj$/i, '.json'), JSON.stringify(result));
const metadata = { vertices: result.vertices.length, faces: result.faces.length, removedParts, bounds: bounds(result), sourceOffset: [centerX, before.min[1], 0], scaleToHeight3_4: 3.4 / (before.max[1] - before.min[1]), up: '+Y', forward: '+Z', output };
fs.writeFileSync(output.replace(/\.obj$/i, '.meta.json'), JSON.stringify(metadata, null, 2));
console.log(JSON.stringify(metadata));
