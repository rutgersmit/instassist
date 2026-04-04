/**
 * Crops an image to the given aspect ratio using a focal point position.
 * @param {HTMLImageElement} img
 * @param {number} ratio - target width/height ratio (e.g. 1, 1.91, 0.8)
 * @param {{ x: number, y: number }} pos - focal point, both values in [0, 1]
 * @returns {HTMLCanvasElement}
 */
export function cropImage(img, ratio, pos) {
  const imgRatio = img.width / img.height;
  let sx, sy, sw, sh;

  if (imgRatio > ratio + 0.001) {
    // Image is wider than target → crop left/right, user controls x
    sh = img.height;
    sw = Math.round(img.height * ratio);
    sy = 0;
    sx = Math.round((img.width - sw) * pos.x);
  } else if (imgRatio < ratio - 0.001) {
    // Image is taller than target → crop top/bottom, user controls y
    sw = img.width;
    sh = Math.round(img.width / ratio);
    sx = 0;
    sy = Math.round((img.height - sh) * pos.y);
  } else {
    // Already matches ratio — no crop
    sw = img.width;
    sh = img.height;
    sx = 0;
    sy = 0;
  }

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}
