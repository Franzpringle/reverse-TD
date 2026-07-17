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
