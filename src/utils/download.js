import JSZip from 'jszip';
import { saveAs } from 'file-saver';

function canvasToBlob(canvas, type = 'image/jpeg', quality = 1.0) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

export async function downloadSegments(segments, filename = 'carousel') {
  const zip = new JSZip();

  for (let i = 0; i < segments.length; i++) {
    const blob = await canvasToBlob(segments[i]);
    zip.file(`${filename}-${i + 1}.jpg`, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${filename}.zip`);
}
