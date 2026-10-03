/**
 * Geometry for the Journey charts, kept apart from the components that draw
 * them. Everything works in the chart's own viewBox units.
 */

/** A clean axis maximum at or above `value`: 1, 2, 2.5 or 5 × a power of ten. */
export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value)!;
  return step * magnitude;
}

/** Up to `count` evenly spaced indexes, always including the first and last. */
export function labelIndexes(length: number, count = 6): number[] {
  if (length <= count) return Array.from({ length }, (_, index) => index);
  return [...new Set(Array.from({ length: count }, (_, step) => Math.round((step * (length - 1)) / (count - 1))))];
}

/**
 * A smooth path through the points that never overshoots them (monotone
 * cubic, Fritsch–Carlson): a flat day stays flat, a peak isn't exaggerated,
 * and the curve never dips below zero between two zero days.
 */
export function monotonePath(points: readonly [number, number][]): string {
  const n = points.length;
  if (n === 0) return "";
  const fmt = (value: number) => Number(value.toFixed(2));
  if (n === 1) return `M${fmt(points[0][0])},${fmt(points[0][1])}`;

  const slopes: number[] = [];
  for (let index = 0; index < n - 1; index++) {
    const dx = points[index + 1][0] - points[index][0];
    slopes.push(dx === 0 ? 0 : (points[index + 1][1] - points[index][1]) / dx);
  }
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === n - 1) return slopes[n - 2];
    return slopes[index - 1] * slopes[index] <= 0 ? 0 : (slopes[index - 1] + slopes[index]) / 2;
  });
  for (let index = 0; index < n - 1; index++) {
    if (slopes[index] === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }
    const a = tangents[index] / slopes[index];
    const b = tangents[index + 1] / slopes[index];
    const length = a * a + b * b;
    if (length > 9) {
      const tau = 3 / Math.sqrt(length);
      tangents[index] = tau * a * slopes[index];
      tangents[index + 1] = tau * b * slopes[index];
    }
  }

  let path = `M${fmt(points[0][0])},${fmt(points[0][1])}`;
  for (let index = 0; index < n - 1; index++) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[index + 1];
    const third = (x1 - x0) / 3;
    path += `C${fmt(x0 + third)},${fmt(y0 + tangents[index] * third)},${fmt(x1 - third)},${fmt(y1 - tangents[index + 1] * third)},${fmt(x1)},${fmt(y1)}`;
  }
  return path;
}

/** Points of a regular polygon around a centre, starting at the top, clockwise. */
export function polygonPoints(values: readonly number[], center: number, radius: number): [number, number][] {
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + (index / values.length) * 2 * Math.PI;
    return [center + Math.cos(angle) * radius * value, center + Math.sin(angle) * radius * value];
  });
}
