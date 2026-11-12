// Relative nose position cancels whole-body translation, camera distance, and head roll.
export function createHeadTurn() {
  let baseline = null, neutralSince = null, turnSince = null, armed = false;
  function reset() { baseline = null; neutralSince = null; turnSince = null; armed = false; }
  function update(points, now) {
    const left = points[33], right = points[263], nose = points[1];
    if (!left || !right || !nose) { reset(); return false; }
    const dx = right.x - left.x, dy = right.y - left.y;
    const length2 = dx * dx + dy * dy;
    if (length2 < 0.0001) { reset(); return false; }
    const score = ((nose.x - (left.x + right.x) / 2) * dx + (nose.y - (left.y + right.y) / 2) * dy) / length2;
    if (baseline === null) baseline = score;
    const deviation = Math.abs(score - baseline);
    if (deviation < 0.06) {
      turnSince = null;
      neutralSince ??= now;
      if (now - neutralSince >= 250) armed = true;
    } else {
      neutralSince = null;
      if (armed && deviation > 0.16) {
        turnSince ??= now;
        if (now - turnSince >= 150) { armed = false; turnSince = null; return true; }
      } else turnSince = null;
    }
    return false;
  }
  return { update, reset };
}

export function createRedBoxes(random = Math.random) {
  let boxes = [], refreshAt = 0;
  function pickParts() {
    let choices = [];
    for (const box of boxes) {
      if (!choices.length) choices = [0, 1, 2, 3];
      const eligible = choices.filter(part => part !== box.part);
      const pool = eligible.length ? eligible : choices;
      box.part = pool[Math.floor(random() * pool.length)];
      choices.splice(choices.indexOf(box.part), 1);
    }
  }
  function reset(now = 0) { boxes = [{ x: 0.5, y: 0.5, part: -1 }]; pickParts(); refreshAt = now + 4000; }
  function add(now) {
    const size = 8 / Math.sqrt(boxes.length + 1);
    let best, leastOverlap = Infinity;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = { x: random(), y: random(), part: -1 };
      const x = candidate.x * (24 - size), y = candidate.y * (12 - size);
      const overlap = boxes.reduce((sum, box) => {
        const bx = box.x * (24 - size), by = box.y * (12 - size);
        return sum + Math.max(0, Math.min(x + size, bx + size) - Math.max(x, bx)) * Math.max(0, Math.min(y + size, by + size) - Math.max(y, by));
      }, 0);
      if (overlap < leastOverlap) { best = candidate; leastOverlap = overlap; }
      if (overlap === 0) break;
    }
    boxes.push(best);
    pickParts();
    refreshAt = now + 4000;
  }
  function get(now) {
    if (now >= refreshAt) { pickParts(); refreshAt = now + 4000; }
    const size = 8 / Math.sqrt(boxes.length);
    return boxes.map(box => ({ x: box.x * (24 - size), y: box.y * (12 - size), size, part: box.part }));
  }
  reset();
  return { reset, add, get };
}