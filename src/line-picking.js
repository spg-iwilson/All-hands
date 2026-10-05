export const LINE_PICK_RADIUS = 12;

export function nearestLine(click, candidates, radius = LINE_PICK_RADIUS) {
  let nearest = null;
  let bestDistance = radius;
  for (const { id, points } of candidates) {
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1];
      const b = points[index];
      if (a.z < -1 || a.z > 1 || b.z < -1 || b.z > 1) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lengthSquared = dx * dx + dy * dy;
      const fraction = lengthSquared === 0 ? 0
        : Math.max(0, Math.min(1, ((click.x - a.x) * dx + (click.y - a.y) * dy) / lengthSquared));
      const x = a.x + fraction * dx;
      const y = a.y + fraction * dy;
      const distance = Math.hypot(click.x - x, click.y - y);
      if (distance > bestDistance) continue;
      const depth = a.z + fraction * (b.z - a.z);
      if (nearest && Math.abs(distance - bestDistance) < 0.001 && depth >= nearest.depth) continue;
      bestDistance = distance;
      nearest = { id, distance, depth, t: a.t + fraction * (b.t - a.t) };
    }
  }
  return nearest;
}
