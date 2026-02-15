import { useState, useCallback, useMemo } from 'react';
import { generatePeekImages } from '../utils/peekImage';
import { downloadSegments } from '../utils/download';

export default function PeekMode() {
  const [images, setImages] = useState([]);
  const [peekPercent, setPeekPercent] = useState(() => {
    const saved = localStorage.getItem('peek-percent');
    return saved !== null ? Number(saved) : 10;
  });
  const [blur, setBlur] = useState(() => {
    return localStorage.getItem('peek-blur') === 'true';
  });
  const [draftPeekPercent, setDraftPeekPercent] = useState(peekPercent);
  const [downloading, setDownloading] = useState(false);

  const handleFiles = useCallback((files) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!fileArray.length) return;

    const promises = fileArray.map(
      (file) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = URL.createObjectURL(file);
        })
    );

    Promise.all(promises).then((loaded) => {
      setImages((prev) => [...prev, ...loaded]);
    });
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onFileChange = useCallback((e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  }, [handleFiles]);

  const moveImage = useCallback((from, to) => {
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const removeImage = useCallback((index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const previews = useMemo(() => {
    if (images.length < 2) return [];
    return generatePeekImages(images, peekPercent, blur);
  }, [images, peekPercent, blur]);

  const previewDataUrls = useMemo(() => {
    return previews.map((canvas) => canvas.toDataURL('image/jpeg', 0.7));
  }, [previews]);

  const handleDownload = useCallback(async () => {
    if (previews.length === 0) return;
    setDownloading(true);
    try {
      await downloadSegments(previews, 'peek-carousel');
    } finally {
      setDownloading(false);
    }
  }, [previews]);

  const downloadSingle = useCallback((canvas, index) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `peek-carousel-${index + 1}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 1.0);
  }, []);

  const openInNewTab = useCallback((canvas) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }, 'image/jpeg', 1.0);
  }, []);

  const handleReset = useCallback(() => {
    setImages([]);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Upload area */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('peek-file-input').click()}
        className="border-2 border-dashed border-white/20 hover:border-white/40 rounded-2xl p-10 text-center cursor-pointer transition-all bg-white/5 hover:bg-white/8"
      >
        <input
          id="peek-file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={onFileChange}
          className="hidden"
        />
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 mb-4 shadow-lg shadow-indigo-500/25">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="text-base font-medium text-white/80">
          {images.length === 0 ? 'Drop carousel images here' : 'Drop more images to add'}
        </p>
        <p className="text-sm mt-1 text-white/35">or click to browse — select multiple</p>
      </div>

      {/* Info sections — visible before images are uploaded */}
      {images.length === 0 && (
        <section className="mt-14 max-w-2xl mx-auto grid sm:grid-cols-2 gap-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-base font-semibold mb-4 text-white/90">How it works</h2>
            <ol className="space-y-3 text-sm text-white/60">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">1</span>
                Upload multiple images for your carousel
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">2</span>
                Reorder them to set the swipe sequence
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-xs font-bold text-white">3</span>
                Adjust the peek offset and optional blur
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white">4</span>
                Download individually or as a ZIP
              </li>
            </ol>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-base font-semibold mb-4 text-white/90">Why Peek Carousel?</h2>
            <ul className="space-y-3 text-sm text-white/60">
              <li className="flex gap-2 items-start"><span className="text-green-400 mt-0.5">&#10003;</span> Seamless swipe — each slide previews the next</li>
              <li className="flex gap-2 items-start"><span className="text-green-400 mt-0.5">&#10003;</span> Encourages followers to keep swiping</li>
              <li className="flex gap-2 items-start"><span className="text-green-400 mt-0.5">&#10003;</span> Works with any image size — always outputs squares</li>
              <li className="flex gap-2 items-start"><span className="text-green-400 mt-0.5">&#10003;</span> Privacy-first — photos never leave your browser</li>
            </ul>
          </div>
        </section>
      )}

      {/* Thumbnail reorder list */}
      {images.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/70">
              {images.length} image{images.length !== 1 ? 's' : ''} — drag order
            </h3>
            <button
              onClick={handleReset}
              className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative shrink-0 group"
              >
                <img
                  src={img.src}
                  alt={`Image ${i + 1}`}
                  className="h-20 w-auto rounded-lg border border-white/10 object-cover"
                />
                <span className="absolute top-1 left-1 text-[10px] bg-black/60 rounded px-1 text-white/80">
                  {i + 1}
                </span>
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {i > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); moveImage(i, i - 1); }}
                      className="w-5 h-5 rounded bg-black/60 text-white/80 hover:bg-black/80 text-xs flex items-center justify-center cursor-pointer"
                    >&#8592;</button>
                  )}
                  {i < images.length - 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); moveImage(i, i + 1); }}
                      className="w-5 h-5 rounded bg-black/60 text-white/80 hover:bg-black/80 text-xs flex items-center justify-center cursor-pointer"
                    >&#8594;</button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    className="w-5 h-5 rounded bg-red-900/60 text-white/80 hover:bg-red-800/80 text-xs flex items-center justify-center cursor-pointer"
                  >&times;</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {images.length >= 2 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 space-y-4">
          <div>
            <label className="flex items-center justify-between text-sm text-white/70 mb-2">
              <span>Peek offset</span>
              <span className="text-white/40">{draftPeekPercent}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={draftPeekPercent}
              onChange={(e) => setDraftPeekPercent(Number(e.target.value))}
              onPointerUp={(e) => { const v = Number(e.target.value); setPeekPercent(v); localStorage.setItem('peek-percent', v); }}
              className="w-full"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={blur}
              onChange={(e) => { const v = e.target.checked; setBlur(v); localStorage.setItem('peek-blur', v); }}
              className="accent-pink-500"
            />
            Blur peek strip
          </label>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 transition-all disabled:opacity-50 cursor-pointer"
          >
            {downloading ? 'Creating ZIP...' : 'Download all as ZIP'}
          </button>
        </div>
      )}

      {/* Preview grid */}
      {previewDataUrls.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Preview — click to open full size</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {previewDataUrls.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={url}
                  alt={`Output ${i + 1}`}
                  onClick={() => openInNewTab(previews[i])}
                  className="w-full rounded-lg border border-white/10 cursor-pointer hover:border-white/30 transition-all"
                />
                <span className="absolute top-1.5 left-1.5 text-[10px] bg-black/60 rounded px-1.5 py-0.5 text-white/80">
                  {i + 1}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadSingle(previews[i], i); }}
                  className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Download this image"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
