import { useState, useCallback, useMemo, useRef } from 'react';
import { generatePeekImages } from '../utils/peekImage';
import { downloadSegments } from '../utils/download';

export default function PeekMode() {
  const [images, setImages] = useState([]);
  const [positions, setPositions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const dragIndexRef = useRef(null);
  const [dragFromIndex, setDragFromIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
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
      setPositions((prev) => [...prev, ...loaded.map(() => ({ x: 0.5, y: 0.5 }))]);
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
    setPositions((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setEditingIndex((prev) => {
      if (prev === null) return null;
      if (prev === from) return to;
      if (from < prev && to >= prev) return prev - 1;
      if (from > prev && to <= prev) return prev + 1;
      return prev;
    });
  }, []);

  const removeImage = useCallback((index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPositions((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  }, []);

  const previews = useMemo(() => {
    if (images.length < 2) return [];
    return generatePeekImages(images, peekPercent, blur, positions);
  }, [images, peekPercent, blur, positions]);

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
    setPositions([]);
    setEditingIndex(null);
  }, []);

  // Crop positioner drag logic — draft position drives frame only,
  // committed to positions (triggering preview re-render) on pointer up.
  const posContainerRef = useRef(null);
  const posDragging = useRef(false);
  const [draftPos, setDraftPos] = useState(null);

  const calcFocalPoint = useCallback((clientX, clientY) => {
    const rect = posContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  }, []);

  const onPosPointerDown = useCallback((e) => {
    if (editingIndex === null) return;
    posDragging.current = true;
    posContainerRef.current.setPointerCapture(e.pointerId);
    setDraftPos(calcFocalPoint(e.clientX, e.clientY));
  }, [editingIndex, calcFocalPoint]);

  const onPosPointerMove = useCallback((e) => {
    if (!posDragging.current || editingIndex === null) return;
    setDraftPos(calcFocalPoint(e.clientX, e.clientY));
  }, [editingIndex, calcFocalPoint]);

  const onPosPointerUp = useCallback(() => {
    if (!posDragging.current) return;
    posDragging.current = false;
    if (draftPos !== null && editingIndex !== null) {
      setPositions((prev) => {
        const next = [...prev];
        next[editingIndex] = draftPos;
        return next;
      });
      setDraftPos(null);
    }
  }, [draftPos, editingIndex]);

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
        <div
          className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
          onDrop={(e) => {
            e.preventDefault();
            setDragOverIndex(null);
            setDragFromIndex(null);
            // If it's a reorder drag (no files), handle move
            if (dragIndexRef.current !== null && e.dataTransfer.files.length === 0) {
              dragIndexRef.current = null;
              return;
            }
            dragIndexRef.current = null;
            // Otherwise it's a file drop — add images
            handleFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/70">
              {images.length} image{images.length !== 1 ? 's' : ''} — drag to reorder
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
                draggable
                onDragStart={(e) => {
                  dragIndexRef.current = i;
                  setDragFromIndex(i);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragIndexRef.current === null) return;
                  setDragOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragIndexRef.current !== null && dragIndexRef.current !== i) {
                    moveImage(dragIndexRef.current, i);
                  }
                  dragIndexRef.current = null;
                  setDragFromIndex(null);
                  setDragOverIndex(null);
                }}
                onDragEnd={() => { dragIndexRef.current = null; setDragFromIndex(null); setDragOverIndex(null); }}
                className={`relative shrink-0 group cursor-grab active:cursor-grabbing transition-all duration-150 ${dragFromIndex === i ? 'opacity-30 scale-90' : ''} ${dragOverIndex === i && dragFromIndex !== null && dragFromIndex !== i ? 'scale-110' : ''}`}
                onClick={() => setEditingIndex(editingIndex === i ? null : i)}
              >
                <img
                  src={img.src}
                  alt={`Image ${i + 1}`}
                  className={`h-20 w-auto rounded-lg border-2 object-cover transition-all ${editingIndex === i ? 'border-pink-500 ring-2 ring-pink-500/40' : dragOverIndex === i && dragFromIndex !== null && dragFromIndex !== i ? 'border-indigo-400 ring-2 ring-indigo-400/30' : 'border-white/10'}`}
                />
                <span className="absolute top-1 left-1 text-[10px] bg-black/60 rounded px-1 text-white/80">
                  {i + 1}
                </span>
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    className="w-5 h-5 rounded bg-red-900/60 text-white/80 hover:bg-red-800/80 text-xs flex items-center justify-center cursor-pointer"
                  >&times;</button>
                </div>
              </div>
            ))}
          </div>

          {/* Inline crop positioner */}
          {editingIndex !== null && images[editingIndex] && (() => {
            const img = images[editingIndex];
            const pos = draftPos || positions[editingIndex] || { x: 0.5, y: 0.5 };
            const imgRatio = img.width / img.height;
            // The crop target is slightly-wider-than-square (matching peek render),
            // but for the positioner we simplify to a square crop overlay.
            const isWider = imgRatio > 1;
            const isTaller = imgRatio < 1;

            // Show the image at a usable size with the crop region indicated
            // For wider images: full width shown, crop box is square centered, user shifts horizontally
            // For taller images: full height shown, crop box is square centered, user shifts vertically
            // For square images: no positioning needed

            if (!isWider && !isTaller) return (
              <div className="mt-3 text-xs text-white/30 text-center">Image is square — no repositioning needed</div>
            );

            // Compute crop overlay percentages
            let cropWidthPct, cropHeightPct, cropLeftPct, cropTopPct;
            if (isWider) {
              // Landscape: crop height = 100%, crop width = height/width ratio
              cropHeightPct = 100;
              cropWidthPct = (1 / imgRatio) * 100;
              cropTopPct = 0;
              cropLeftPct = (100 - cropWidthPct) * pos.x;
            } else {
              // Portrait: crop width = 100%, crop height = width/height ratio
              cropWidthPct = 100;
              cropHeightPct = imgRatio * 100;
              cropLeftPct = 0;
              cropTopPct = (100 - cropHeightPct) * pos.y;
            }

            return (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">
                    {isWider ? 'Click or drag to set horizontal focus' : 'Click or drag to set vertical focus'}
                  </span>
                  <button
                    onClick={() => setEditingIndex(null)}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer px-2 py-0.5 rounded bg-white/5 hover:bg-white/10"
                  >
                    Done
                  </button>
                </div>
                <div
                  ref={posContainerRef}
                  className={`relative inline-block max-w-full overflow-hidden rounded-xl select-none ${isWider ? 'cursor-ew-resize' : 'cursor-ns-resize'}`}
                  onPointerDown={onPosPointerDown}
                  onPointerMove={onPosPointerMove}
                  onPointerUp={onPosPointerUp}
                >
                  <img
                    src={img.src}
                    alt="Position crop"
                    className="max-w-full h-auto block max-h-64"
                    draggable={false}
                  />
                  {/* Dim areas outside crop */}
                  {isWider ? (
                    <>
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-black/50 pointer-events-none transition-all duration-75"
                        style={{ width: `${cropLeftPct}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 right-0 bg-black/50 pointer-events-none transition-all duration-75"
                        style={{ width: `${100 - cropLeftPct - cropWidthPct}%` }}
                      />
                    </>
                  ) : (
                    <>
                      <div
                        className="absolute left-0 right-0 top-0 bg-black/50 pointer-events-none transition-all duration-75"
                        style={{ height: `${cropTopPct}%` }}
                      />
                      <div
                        className="absolute left-0 right-0 bottom-0 bg-black/50 pointer-events-none transition-all duration-75"
                        style={{ height: `${100 - cropTopPct - cropHeightPct}%` }}
                      />
                    </>
                  )}
                  {/* Crop frame border */}
                  <div
                    className="absolute border-2 border-white/40 rounded pointer-events-none transition-all duration-75"
                    style={{
                      left: `${cropLeftPct}%`,
                      top: `${cropTopPct}%`,
                      width: `${cropWidthPct}%`,
                      height: `${cropHeightPct}%`,
                    }}
                  />
                </div>
              </div>
            );
          })()}
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
