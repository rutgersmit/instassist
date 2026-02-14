export function calculateOptimalSegments(imageWidth, imageHeight) {
  const ratio = imageWidth / imageHeight;
  const optimal = Math.round(ratio);
  return Math.max(2, Math.min(10, optimal));
}

// verticalAlign: 0 = top, 0.5 = center (default), 1 = bottom
export function splitImage(image, segmentCount, verticalAlign = 0.5) {
  const segmentSide = Math.round(image.width / segmentCount);
  const maxSy = Math.max(0, image.height - segmentSide);
  const sy = Math.round(maxSy * verticalAlign);
  const sourceHeight = Math.min(segmentSide, image.height);

  return Array.from({ length: segmentCount }, (_, i) => {
    const canvas = document.createElement('canvas');
    canvas.width = segmentSide;
    canvas.height = segmentSide;
    const ctx = canvas.getContext('2d');

    const sx = i * segmentSide;
    ctx.drawImage(
      image,
      sx, sy, segmentSide, sourceHeight,
      0, 0, segmentSide, segmentSide
    );
    return canvas;
  });
}

export function getSegmentPositions(imageWidth, segmentCount) {
  const segmentSide = Math.round(imageWidth / segmentCount);
  return Array.from({ length: segmentCount }, (_, i) => i * segmentSide);
}
