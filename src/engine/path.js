export function buildPath(waypoints) {
  const segments = [];
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 0.0001;
    segments.push({ a, b, len, dx: dx / len, dy: dy / len, start: total });
    total += len;
  }

  function segmentAt(dist) {
    for (const seg of segments) {
      if (dist <= seg.start + seg.len) return seg;
    }
    return segments[segments.length - 1];
  }

  return {
    waypoints,
    totalLength: total,
    pointAt(dist) {
      dist = Math.max(0, Math.min(total, dist));
      const seg = segmentAt(dist);
      const t = (dist - seg.start) / seg.len;
      return { x: seg.a.x + (seg.b.x - seg.a.x) * t, y: seg.a.y + (seg.b.y - seg.a.y) * t };
    },
    tangentAt(dist) {
      dist = Math.max(0, Math.min(total, dist));
      const seg = segmentAt(dist);
      return { dx: seg.dx, dy: seg.dy };
    },
  };
}

// Builds a path parallel to `waypoints`, offset sideways by `dist` - used to
// give each unit its own lane so a column of units doesn't all walk the
// exact same line. A naive per-frame perpendicular offset (recomputed from
// the local tangent) snaps discontinuously at every corner, since the
// tangent itself is discontinuous there - that reads as the unit taking a
// backward step. Baking the offset into the waypoints themselves (mitered at
// each corner) keeps the lane continuous and makes it turn only where the
// path itself turns.
export function buildOffsetPath(waypoints, dist) {
  if (!dist) return buildPath(waypoints);

  const dirs = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x;
    const dy = waypoints[i + 1].y - waypoints[i].y;
    const len = Math.hypot(dx, dy) || 0.0001;
    dirs.push({ x: dx / len, y: dy / len });
  }

  const offsetPoints = waypoints.map((wp, i) => {
    const inDir = dirs[i - 1] || dirs[i];
    const outDir = dirs[i] || dirs[i - 1];
    const inNormal = { x: -inDir.y, y: inDir.x };
    const outNormal = { x: -outDir.y, y: outDir.x };
    const mx = inNormal.x + outNormal.x;
    const my = inNormal.y + outNormal.y;
    const mLen = Math.hypot(mx, my);
    if (mLen < 0.001) {
      // Adjacent segments point in exactly opposite directions - no single
      // miter direction satisfies both, so just offset along the incoming one.
      return { x: wp.x + inNormal.x * dist, y: wp.y + inNormal.y * dist };
    }
    const miterX = mx / mLen;
    const miterY = my / mLen;
    const cosHalfAngle = miterX * inNormal.x + miterY * inNormal.y;
    const scale = dist / cosHalfAngle;
    return { x: wp.x + miterX * scale, y: wp.y + miterY * scale };
  });

  return buildPath(offsetPoints);
}

// Small deterministic PRNG so a given base index always regenerates the same path/towers.
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
