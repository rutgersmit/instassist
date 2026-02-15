// Cover-fit an image into a target width x height canvas
// focalX/focalY: 0–1 focal point (0.5 = centered)
function renderCover(img, width, height, focalX = 0.5, focalY = 0.5) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const imgRatio = img.width / img.height;
  const targetRatio = width / height;

  let sx, sy, sw, sh;
  if (imgRatio > targetRatio) {
    // Image is wider — crop sides
    sh = img.height;
    sw = img.height * targetRatio;
    sx = (img.width - sw) * focalX;
    sy = 0;
  } else {
    // Image is taller — crop top/bottom
    sw = img.width;
    sh = img.width / targetRatio;
    sx = 0;
    sy = (img.height - sh) * focalY;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  return canvas;
}

export function generatePeekImages(images, peekPercent = 15, blur = false, positions = []) {
  // Square output size: use the largest dimension for max quality
  const size = Math.max(...images.map((img) => Math.max(img.width, img.height)));
  const peekWidth = Math.round(size * (peekPercent / 100));
  const mainWidth = size - peekWidth;

  // Each image is cover-fitted slightly wider than square: (size + peekWidth) x size.
  // This extra width means the peek on slide N shows pixels [0..peekWidth] of wide[N+1],
  // and slide N+1 picks up at pixel [peekWidth..], so there's no repeated content.
  const wides = images.map((img, i) => {
    const pos = positions[i] || { x: 0.5, y: 0.5 };
    return renderCover(img, size + peekWidth, size, pos.x, pos.y);
  });

  const canvases = [];

  for (let i = 0; i < images.length; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // First image starts at offset 0; subsequent images start at peekWidth
    // (skipping the part already shown as peek on the previous slide)
    const offset = i === 0 ? 0 : peekWidth;

    if (i < images.length - 1) {
      // Main area: current image from offset, mainWidth pixels wide
      ctx.drawImage(wides[i], offset, 0, mainWidth, size, 0, 0, mainWidth, size);

      // Peek strip: left portion of next image's wide render
      if (blur) {
        ctx.save();
        ctx.filter = 'blur(8px)';
        ctx.drawImage(wides[i + 1], 0, 0, peekWidth + 4, size, mainWidth - 4, 0, peekWidth + 4, size);
        ctx.restore();
        // Clean seam
        ctx.drawImage(wides[i], offset + mainWidth - 2, 0, 2, size, mainWidth - 2, 0, 2, size);
      } else {
        ctx.drawImage(wides[i + 1], 0, 0, peekWidth, size, mainWidth, 0, peekWidth, size);
      }
    } else {
      // Last image: show from offset, full size width
      ctx.drawImage(wides[i], offset, 0, size, size, 0, 0, size, size);
    }

    canvases.push(canvas);
  }

  return canvases;
}
