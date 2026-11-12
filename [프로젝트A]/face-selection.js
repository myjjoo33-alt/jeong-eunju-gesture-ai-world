// Temporary geometric tracks; no names, face recognition, storage, or identity matching.
export function createFaceSelector() {
  let previous = [], nextId = 1, primaryId = null, challengerId = null, challengerSince = 0;
  function reset() { previous = []; primaryId = null; challengerId = null; challengerSince = 0; }
  function update(faces, now) {
    const current = faces.map(landmarks => {
      const xs = landmarks.map(p => p.x), ys = landmarks.map(p => p.y);
      const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
      return { landmarks, x: (left + right) / 2, y: (top + bottom) / 2, area: (right - left) * (bottom - top), id: null };
    });
    const pairs = current.flatMap((face, i) => previous.map(old => ({ i, old, distance: Math.hypot(face.x - old.x, face.y - old.y) }))).sort((a, b) => a.distance - b.distance);
    const used = new Set();
    for (const pair of pairs) {
      if (pair.distance < 0.25 && current[pair.i].id === null && !used.has(pair.old.id)) {
        current[pair.i].id = pair.old.id;
        used.add(pair.old.id);
      }
    }
    for (const face of current) if (face.id === null) face.id = nextId++;
    const before = primaryId;
    const largest = [...current].sort((a, b) => b.area - a.area)[0];
    let primary = current.find(face => face.id === primaryId);
    if (!primary) {
      primary = largest;
      challengerId = null;
    } else if (largest.id !== primary.id && largest.area > primary.area * 1.15) {
      if (challengerId !== largest.id) { challengerId = largest.id; challengerSince = now; }
      if (now - challengerSince >= 800) { primary = largest; challengerId = null; }
    } else challengerId = null;
    primaryId = primary?.id ?? null;
    previous = current;
    return { primary, others: current.filter(face => face.id !== primaryId), changed: before !== primaryId };
  }
  return { update, reset };
}