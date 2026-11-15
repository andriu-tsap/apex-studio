import { describe, expect, it } from 'vitest';
import { loft } from './geometry';
describe('procedural car geometry', () => {
  it('builds a closed mesh with outward side normals', () => {
    const mesh = loft(
      [
        [-2, 1, 0.3, 1],
        [0, 1, 0.3, 1],
        [2, 1, 0.3, 1],
      ],
      20,
    );
    const positions = mesh.getAttribute('position');
    const index = mesh.getIndex();
    const normals = mesh.getAttribute('normal');
    expect(positions.count).toBe(60);
    expect(index).not.toBeNull();
    expect(normals.getY(20)).toBeGreaterThan(0.9);
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true);
    const edges = new Map<string, number>();
    if (!index) throw new Error('Missing triangle index');
    for (let i = 0; i < index.count; i += 3) {
      const v = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      for (let j = 0; j < 3; j++) {
        const a = v[j],
          b = v[(j + 1) % 3];
        const key = [Math.min(a, b), Math.max(a, b)].join('-');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every((count) => count === 2)).toBe(true);
    mesh.computeBoundingBox();
    expect(mesh.boundingBox?.min.x).toBe(-2);
    expect(mesh.boundingBox?.max.x).toBe(2);
    mesh.dispose();
  });
});
