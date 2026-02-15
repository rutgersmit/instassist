// Draw an image cover-fitted into a square canvas
function renderSquare(img, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const imgRatio = img.width / img.height;
  let sx, sy, sw, sh;
  if (imgRatio > 1) {
    // Wider than tall — crop sides
    sh = img.height;
    sw = img.height;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    // Taller than wide — crop top/bottom
    sw = img.width;
    sh = img.width;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  return canvas;
}

export function generatePeekImages(images, peekPercent = 15, blur = false) {
  // Square output: use the largest dimension for max quality
  const size = Math.max(...images.map((img) => Math.max(img.width, img.height)));

  // Step 1: pre-render every image as a full square
  const squares = images.map((img) => renderSquare(img, size));

  // Step 2: compose output slides by slicing from the pre-rendered squares
  // Output i = [square[i] left (size - peekWidth) px] + [square[i+1] left peekWidth px]
  // This guarantees the peek on slide i matches the left edge of slide i+1.
  const peekWidth = Math.round(size * (peekPercent / 100));
  const mainWidth = size - peekWidth;
  const canvases = [];

  for (let i = 0; i < squares.length; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (i < squares.length - 1) {
      // Main area: left portion of current square
      ctx.drawImage(squares[i], 0, 0, mainWidth, size, 0, 0, mainWidth, size);

      // Peek strip: left portion of next square
      if (blur) {
        ctx.save();
        ctx.filter = 'blur(8px)';
        // Draw slightly wider to avoid transparent blur edges
        ctx.drawImage(squares[i + 1], 0, 0, peekWidth + 4, size, mainWidth - 4, 0, peekWidth + 4, size);
        ctx.restore();
        // Clean seam: redraw thin strip from main image
        ctx.drawImage(squares[i], mainWidth - 2, 0, 2, size, mainWidth - 2, 0, 2, size);
      } else {
        ctx.drawImage(squares[i + 1], 0, 0, peekWidth, size, mainWidth, 0, peekWidth, size);
      }
    } else {
      // Last image: full square, no peek
      ctx.drawImage(squares[i], 0, 0);
    }

    canvases.push(canvas);
  }

  return canvases;
}
