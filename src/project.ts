/** Equirectangular sketch. Degrees are not corrected, and no borders are drawn. */
export const VIEW = { w: 740, h: 800 };

const LON0 = 66.4;
const LON1 = 97.6;
const LAT0 = 5.5;
const LAT1 = 36.4;
const PAD = 34;

export function project(lon: number, lat: number): [number, number] {
  const x = PAD + ((lon - LON0) / (LON1 - LON0)) * (VIEW.w - PAD * 2);
  const y = PAD + ((LAT1 - lat) / (LAT1 - LAT0)) * (VIEW.h - PAD * 2);
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

export function smooth(points: [number, number][]): string {
  if (points.length < 2) return "";
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
