// Four processed source tiles are reused across the complete screen each frame.
export function createMosaic(canvas, parts) {
  const context = canvas.getContext('2d', { alpha: false });
  const tiles = parts.map(() => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 420;
    return { canvas: tile, context: tile.getContext('2d', { alpha: false }) };
  });
  const red = document.createElement('canvas');
  red.width = red.height = 420;
  const redContext = red.getContext('2d', { alpha: false });
  const cells = [];
  const occupied = Array.from({ length: 6 }, () => Array(12).fill(false));
  function add(x, y, size, part, accent = false) {
    cells.push({ x, y, size, part, accent });
    for (let row = y; row < y + size; row++) for (let col = x; col < x + size; col++) occupied[row][col] = true;
  }
  add(4, 1, 4, 0, true);
  const sequence = [0, 1, 0, 1, 2, 3];
  let index = 0;
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 12; x++) {
      if (occupied[y][x]) continue;
      const fits = x + 1 < 12 && y + 1 < 6 && !occupied[y][x + 1] && !occupied[y + 1][x] && !occupied[y + 1][x + 1];
      add(x, y, fits && (x < 4 || x >= 8) ? 2 : 1, sequence[index++ % sequence.length]);
    }
  }
  function resize() {
    const scale = Math.min(devicePixelRatio || 1, 1920 / innerWidth);
    const width = Math.round(innerWidth * scale), height = Math.round(innerHeight * scale);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  }
  function clear() { resize(); context.fillStyle = '#070707'; context.fillRect(0, 0, canvas.width, canvas.height); }
  function draw() {
    resize();
    for (let i = 0; i < parts.length; i++) {
      tiles[i].context.filter = 'grayscale(1) contrast(1.7)';
      tiles[i].context.drawImage(parts[i].canvas, 0, 0);
    }
    redContext.globalCompositeOperation = 'source-over';
    redContext.drawImage(tiles[0].canvas, 0, 0);
    redContext.globalCompositeOperation = 'multiply';
    redContext.fillStyle = '#ff1018';
    redContext.fillRect(0, 0, 420, 420);
    for (const cell of cells) {
      const x = Math.round(cell.x * canvas.width / 12), y = Math.round(cell.y * canvas.height / 6);
      const width = Math.round((cell.x + cell.size) * canvas.width / 12) - x;
      const height = Math.round((cell.y + cell.size) * canvas.height / 6) - y;
      const source = cell.accent ? red : tiles[cell.part].canvas;
      // Cover each rectangle without stretching the face or leaving gaps.
      const sw = width > height ? 420 : 420 * width / height;
      const sh = height > width ? 420 : 420 * height / width;
      context.save();
      if (!cell.accent && (cell.x + cell.y) % 5 === 0) { context.translate(x + width, y + height); context.rotate(Math.PI); }
      else context.translate(x, y);
      context.drawImage(source, (420 - sw) / 2, (420 - sh) / 2, sw, sh, 0, 0, width, height);
      context.restore();
    }
  }
  clear();
  return { draw, clear };
}