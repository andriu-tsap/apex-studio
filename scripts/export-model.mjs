/* Original procedural GT-class demo source. No third-party car model is used. */
import * as T from '../apps/web/node_modules/three/build/three.module.js';
import { GLTFExporter } from '../apps/web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { loft } from '../apps/web/src/lib/geometry.ts';
import { writeFile, mkdir } from 'node:fs/promises';
class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob
      .arrayBuffer()
      .then((value) => {
        this.result = value;
        this.onloadend?.();
      })
      .catch((error) => this.onerror?.(error));
  }
  readAsDataURL(blob) {
    blob
      .arrayBuffer()
      .then((value) => {
        this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;
        this.onloadend?.();
      })
      .catch((error) => this.onerror?.(error));
  }
}
globalThis.FileReader = NodeFileReader;
const root = new T.Group();
root.name = 'GT_class_original_demo';
const paint = new T.MeshPhysicalMaterial({
  color: '#dfe7ec',
  metalness: 0.48,
  roughness: 0.24,
  clearcoat: 1,
});
const glass = new T.MeshPhysicalMaterial({
  color: '#294c62',
  metalness: 0.55,
  roughness: 0.12,
  clearcoat: 1,
});
const dark = new T.MeshStandardMaterial({ color: '#11151b', roughness: 0.8 });
const rim = new T.MeshStandardMaterial({ color: '#a7b0bd', metalness: 0.85, roughness: 0.25 });
const caliper = new T.MeshStandardMaterial({ color: '#ff425f' });
const trim = new T.MeshStandardMaterial({ color: '#17202a', metalness: 0.6, roughness: 0.3 });
function add(
  name,
  geometry,
  material,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
) {
  const mesh = new T.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  root.add(mesh);
  return mesh;
}
add(
  'body_main',
  loft([
    [-2.42, 0.65, 0.17, 0.73],
    [-2.18, 0.73, 0.28, 1.03],
    [-1.6, 0.81, 0.34, 1.12],
    [-0.9, 0.76, 0.28, 1.01],
    [0.5, 0.78, 0.29, 1.02],
    [1.45, 0.83, 0.36, 1.16],
    [2.12, 0.77, 0.27, 1.06],
    [2.3, 0.72, 0.22, 0.91],
  ]),
  paint,
);
add(
  'glass_cabin',
  loft([
    [-1.04, 1.03, 0.09, 0.79],
    [-0.35, 1.32, 0.3, 0.76],
    [0.35, 1.37, 0.34, 0.73],
    [0.95, 1.24, 0.25, 0.8],
    [1.48, 1.02, 0.08, 0.85],
  ]),
  glass,
);
add(
  'body_roof',
  new T.SphereGeometry(1, 24, 12),
  paint,
  [0.22, 1.706, 0],
  [0, 0, 0],
  [0.65, 0.035, 0.68],
);
add('underbody', new T.BoxGeometry(3.8, 0.15, 1.83), dark, [0, 0.53, 0]);
for (const x of [-1.48, 1.47])
  for (const z of [-1.07, 1.07]) {
    const suffix = `${x}_${z}`;
    add(
      'tire_' + suffix,
      new T.CylinderGeometry(0.47, 0.47, 0.27, 32),
      dark,
      [x, 0.48, z],
      [Math.PI / 2, 0, 0],
    );
    add('wheel_ring_' + suffix, new T.TorusGeometry(0.35, 0.045, 8, 32), rim, [
      x,
      0.48,
      z + Math.sign(z) * 0.145,
    ]);
    for (let i = 0; i < 5; i++)
      add(
        'wheel_spoke_' + suffix + '_' + i,
        new T.BoxGeometry(0.065, 0.62, 0.045),
        rim,
        [x, 0.48, z + Math.sign(z) * 0.17],
        [0, 0, (i * Math.PI * 2) / 5],
      );
    add('caliper_' + suffix, new T.BoxGeometry(0.12, 0.24, 0.07), caliper, [
      x + 0.2,
      0.48,
      z + Math.sign(z) * 0.15,
    ]);
    add('hub_' + suffix, new T.SphereGeometry(0.08, 12, 8), trim, [
      x,
      0.48,
      z + Math.sign(z) * 0.2,
    ]);
  }
for (const z of [-0.78, 0.78]) {
  add(
    'headlight_' + z,
    new T.SphereGeometry(1, 20, 10),
    new T.MeshStandardMaterial({ color: '#d8fbff', emissive: '#b8f9ff', emissiveIntensity: 2.2 }),
    [-2.13, 0.975, z],
    [0, 0, -0.24],
    [0.26, 0.062, 0.16],
  );
  add(
    'taillight_' + z,
    new T.BoxGeometry(0.045, 0.055, 0.54),
    new T.MeshStandardMaterial({ color: '#ff305f', emissive: '#ff174e', emissiveIntensity: 1.6 }),
    [2.23, 0.86, z * 0.9],
  );
  add(
    'wing_support_' + z,
    new T.BoxGeometry(0.09, 0.68, 0.07),
    trim,
    [1.74, 1.31, z * 0.85],
    [0, 0, -0.13],
  );
  add('wing_end_' + z, new T.BoxGeometry(0.67, 0.21, 0.045), trim, [1.8, 1.66, z * 1.65]);
  add(
    'body_mirror_' + z,
    new T.SphereGeometry(1, 12, 8),
    paint,
    [-0.61, 1.19, z * 1.35],
    [0, 0, 0],
    [0.2, 0.07, 0.11],
  );
  add('side_skirt_' + z, new T.BoxGeometry(2.6, 0.08, 0.09), trim, [0, 0.59, z * 1.34]);
}
add('wing', new T.BoxGeometry(0.66, 0.065, 2.62), trim, [1.8, 1.64, 0], [0, 0, 0.06]);
add('splitter', new T.BoxGeometry(0.57, 0.055, 2.18), trim, [-2.21, 0.47, 0]);
root.userData = {
  license: 'MIT',
  description:
    'Original procedural GT-class concept, not the user’s Blender model. No automotive brand affiliation.',
};
const result = await new GLTFExporter().parseAsync(root, { binary: true });
await mkdir('apps/web/public/models', { recursive: true });
await writeFile('apps/web/public/models/gt-class-demo.glb', Buffer.from(result));
console.log('Wrote original demo GLB:', result.byteLength, 'bytes');
