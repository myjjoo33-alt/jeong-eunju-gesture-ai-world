// Four processed source tiles are reused across the complete screen each frame.
export function createMosaic(canvas) {
  const context = canvas.getContext('2d', { alpha: false });
  const tiles = Array.from({ length: 8 }, () => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 420;
    return { canvas: tile, context: tile.getContext('2d', { alpha: false }) };
  });
  const red = document.createElement('canvas');
  red.width = red.height = 420;
  const redContext = red.getContext('2d', { alpha: false });
  let columns = 24, rows = 12, cells = [];
  function setDensity(level) {
    columns = 24 + level * 8; rows = 12 + level * 4;
    cells = [];
    const used = Array.from({length:rows},()=>Array(columns).fill(false));
    const sequence=[0,1,0,1,2,3];
    let index=0;
    for(let y=0;y<rows;y++) for(let x=0;x<columns;x++) {
      if(used[y][x]) continue;
      const fits=x+1<columns && y+1<rows && !used[y][x+1] && !used[y+1][x] && !used[y+1][x+1];
      const size=fits && (x<columns/3 || x>=columns*2/3) ? 2 : 1;
      cells.push({x,y,size,part:sequence[index++%sequence.length]});
      for(let row=y;row<y+size;row++) for(let col=x;col<x+size;col++) used[row][col]=true;
    }
  }
  setDensity(0);
  function resize() {
    const scale = Math.min(devicePixelRatio || 1, 1920 / innerWidth);
    const width = Math.round(innerWidth * scale), height = Math.round(innerHeight * scale);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  }
  function clear() { resize(); context.fillStyle = '#070707'; context.fillRect(0, 0, canvas.width, canvas.height); }
  function draw(primaryParts, surroundingParts, accents) {
    const sources = [...primaryParts, ...surroundingParts];
    const backgroundOffset = surroundingParts.length ? primaryParts.length : 0;
    resize();
    for (let i = 0; i < sources.length; i++) {
      tiles[i].context.filter = 'grayscale(1) contrast(1.7)';
      tiles[i].context.drawImage(sources[i], 0, 0);
    }
    for (const cell of cells) {
      const x = Math.round(cell.x * canvas.width / columns), y = Math.round(cell.y * canvas.height / rows);
      const width = Math.round((cell.x + cell.size) * canvas.width / columns) - x;
      const height = Math.round((cell.y + cell.size) * canvas.height / rows) - y;
      const source = tiles[backgroundOffset + cell.part].canvas;
      // Cover each rectangle without stretching the face or leaving gaps.
      const sw = width > height ? 420 : 420 * width / height;
      const sh = height > width ? 420 : 420 * height / width;
      context.save();
      if (!cell.accent && (cell.x + cell.y) % 5 === 0) { context.translate(x + width, y + height); context.rotate(Math.PI); }
      else context.translate(x, y);
      context.drawImage(source, (420 - sw) / 2, (420 - sh) / 2, sw, sh, 0, 0, width, height);
      context.restore();
    }
    for (const box of accents) {
      redContext.globalCompositeOperation = 'source-over';
      redContext.drawImage(tiles[box.part].canvas, 0, 0);
      redContext.globalCompositeOperation = 'multiply';
      redContext.fillStyle = '#ff1018';
      redContext.fillRect(0, 0, 420, 420);
      const x = box.x * canvas.width / 24, y = box.y * canvas.height / 12;
      const width = box.size * canvas.width / 24, height = box.size * canvas.height / 12;
      const sw = width > height ? 420 : 420 * width / height;
      const sh = height > width ? 420 : 420 * height / width;
      context.drawImage(red, (420 - sw) / 2, (420 - sh) / 2, sw, sh, x, y, width, height);
    }
  }
  clear();
  return { draw, clear, setDensity };
}