// Instructional shape only: no cloth or rope-tension simulation.
export function courseSailPoint(horizontal, vertical, rig) {
  const spread = rig.sheets;
  const centre = Math.max(0, 1 - horizontal * horizontal);
  const gatheredDepth = 0.4 + 1.5 * centre;
  const depth = gatheredDepth + (4.6 - gatheredDepth) * spread;
  const width = 1 - vertical * 0.38 * (1 - spread) + vertical * spread * 0.09;
  const folds = Math.sin(horizontal * Math.PI * 9) * vertical * 0.16 * (1 - spread);
  const belly = Math.sin(vertical * Math.PI) * Math.cos(horizontal * Math.PI / 2);
  return {
    x: horizontal * 5 * width,
    y: -0.23 - vertical * depth * rig.sail,
    z: 0.38 + folds * rig.sail + belly * (0.25 + spread * 0.6) * rig.sail,
  };
}
