import { BufferGeometry, Float32BufferAttribute } from 'three';
export type Section = readonly [number, number, number, number];
export function loft(sections: readonly Section[], count = 20) {
  const positions: number[] = [];
  const indices: number[] = [];
  sections.forEach(([x, y, height, width]) => {
    for (let j = 0; j < count; j++) {
      const angle = (j / count) * Math.PI * 2;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      positions.push(
        x,
        y + Math.sign(c) * Math.pow(Math.abs(c), 0.6) * height,
        Math.sign(s) * Math.pow(Math.abs(s), 0.6) * width,
      );
    }
  });
  for (let i = 0; i < sections.length - 1; i++)
    for (let j = 0; j < count; j++) {
      const a = i * count + j,
        b = i * count + ((j + 1) % count),
        c = (i + 1) * count + j,
        d = (i + 1) * count + ((j + 1) % count);
      indices.push(a, b, c, b, d, c);
    }
  for (let j = 1; j < count - 1; j++) {
    indices.push(0, j + 1, j);
    const last = (sections.length - 1) * count;
    indices.push(last, last + j, last + j + 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
