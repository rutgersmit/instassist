import { useState, useCallback, useMemo, useRef } from 'react';
import { cropImage } from '../utils/cropImage';
import { downloadSegments } from '../utils/download';

const RATIOS = [
  { id: 'square', label: 'Square', description: '1:1', value: 1, w: 24, h: 24 },
  { id: 'horizontal', label: 'Horizontal', description: '1.91:1', value: 1.91, w: 36, h: 19 },
  { id: 'vertical', label: 'Vertical', description: '4:5', value: 0.8, w: 20, h: 25 },
];

export default function RatioCrop() {
  const [images, setImages] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedRatio, setSelectedRatio] = useState('vertical');
  const [editingIndex, setEditingIndex] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const posContainerRef = useRef(null);
  const posDragging = useRef(false);
  const [draftPos, setDraftPos] = useState(null);

  const ratio = RATIOS.find((r) => r.id === selectedRatio).value;

  const handleFiles = useCallback((files) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!fileArray.length) return;

    const promises = fileArray.map(
      (file) =>
        new Promise((resolve) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => resolve({ id: crypto.randomUUID(), img, url });
          img.src = url;
        })
    );

    Promise.all(promises).then((loaded) => {
      setImages((prev) => [...prev, ...loaded]);
      setPositions((prev) => [...prev, ...loaded.map(() => ({ x: 0.5, y: 0.5 }))]);
    });
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onFileChange = useCallback(
    (e) => {
      handleFiles(e.target.files);
      e.target.value = '';
    },
    [handleFiles]
  );

  const removeImage = useCallback((index) => {
    setImages((prev) => {
      const item = prev[index];
      if (item?.url) URL.revokeObjectURL(item.url);
      return prev.filter((_, i) => i !== index);
    });
    setPositions((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  }, []);

  const handleReset = useCallback(() => {
    setImages((prev) => { prev.forEach((item) => { if (item?.url) URL.revokeObjectURL(item.url); }); return []; });
    setPositions([]);
    setEditingIndex(null);
    setDraftPos(null);
  }, []);

  // Cropped canvas previews — recomputed when any image, ratio, or position changes
  const previews = useMemo(
    () => images.map((item, i) => cropImage(item.img, ratio, positions[i] || { x: 0.5, y: 0.5 })),
    [images, ratio, positions]
  );

  const previewUrls = useMemo(
    () => previews.map((canvas) => canvas.toDataURL('image/jpeg', 0.7)),
    [previews]
  );

  const handleDownload = useCallback(async () => {
    if (previews.length === 0) return;
    setDownloading(true);
    try {
      await downloadSegments(previews, 'ratio-crop');
    } finally {
      setDownloading(false);
    }
  }, [previews]);

  // Crop positioner drag handlers
  const calcFocalPoint = useCallback((clientX, clientY) => {
    const rect = posContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  }, []);

  const onPosPointerDown = useCallback(
    (e) => {
      if (editingIndex === null || !posContainerRef.current) return;
      posDragging.current = true;
      posContainerRef.current.setPointerCapture(e.pointerId);
      setDraftPos(calcFocalPoint(e.clientX, e.clientY));
    },
    [editingIndex, calcFocalPoint]
  );

  const onPosPointerMove = useCallback(
    (e) => {
      if (!posDragging.current || editingIndex === null) return;
      setDraftPos(calcFocalPoint(e.clientX, e.clientY));
    },
    [editingIndex, calcFocalPoint]
  );

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

  // Compute crop overlay percentages for the inline crop editor
  const cropOverlay = useMemo(() => {
    if (editingIndex === null || !images[editingIndex]) return null;
    const img = images[editingIndex].img;
    const imgRatio = img.width / img.height;
    const pos = draftPos || positions[editingIndex] || { x: 0.5, y: 0.5 };

    if (Math.abs(imgRatio - ratio) < 0.001) return { exact: true };

    let cropWidthPct, cropHeightPct, cropLeftPct, cropTopPct, mode;

    if (imgRatio > ratio) {
      mode = 'horizontal';
      cropHeightPct = 100;
      cropWidthPct = (ratio / imgRatio) * 100;
      cropTopPct = 0;
      cropLeftPct = (100 - cropWidthPct) * pos.x;
    } else {
      mode = 'vertical';
      cropWidthPct = 100;
      cropHeightPct = (imgRatio / ratio) * 100;
      cropLeftPct = 0;
      cropTopPct = (100 - cropHeightPct) * pos.y;
    }

    return { mode, cropWidthPct, cropHeightPct, cropLeftPct, cropTopPct };
  }, [editingIndex, images, positions, draftPos, ratio]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Upload area */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById('ratio-file-input').click()}
        className="border-2 border-dashed border-white/20 hover:border-white/40 rounded-2xl p-10 text-center cursor-pointer transition-all bg-white/5 hover:bg-white/8"
      >
        <input
          id="ratio-file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={onFileChange}
          className="hidden"
        />
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 mb-4 shadow-lg shadow-indigo-500/25">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <p className="text-base font-medium text-white/80">
          {images.length === 0 ? 'Drop photos here' : 'Drop more photos to add'}
        </p>
        <p className="text-sm mt-1 text-white/35">or click to browse — select multiple</p>
      </div>

      {/* Info sections — shown before upload */}
      {images.length === 0 && (
        <section className="mt-14 max-w-2xl mx-auto grid sm:grid-cols-2 gap-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-base font-semibold mb-4 text-white/90">How it works</h2>
            <ol className="space-y-3 text-sm text-white/60">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">1</span>
                Upload one or more photos
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">2</span>
                Choose an Instagram ratio
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-xs font-bold text-white">3</span>
                Click a photo to adjust its crop
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white">4</span>
                Download all cropped photos as a ZIP
              </li>
            </ol>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-base font-semibold mb-4 text-white/90">Supported ratios</h2>
            <ul className="space-y-3 text-sm text-white/60">
              <li className="flex gap-3 items-start">
                <span className="shrink-0 mt-0.5 text-xs font-bold text-indigo-400 w-10">1:1</span>
                Square — works for feed posts and reels covers
              </li>
              <li className="flex gap-3 items-start">
                <span className="shrink-0 mt-0.5 text-xs font-bold text-purple-400 w-10">1.91:1</span>
                Horizontal — landscape format
              </li>
              <li className="flex gap-3 items-start">
                <span className="shrink-0 mt-0.5 text-xs font-bold text-pink-400 w-10">4:5</span>
                Vertical — portrait, recommended for feed
              </li>
            </ul>
          </div>
        </section>
      )}

      {/* Main UI — shown after upload */}
      {images.length > 0 && (
        <>
          {/* Ratio selector */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <p className="text-sm text-white/60 mb-3">Ratio — applies to all photos</p>
            <div className="flex gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRatio(r.id)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    selectedRatio === r.id
                      ? 'border-pink-500 bg-pink-500/10 text-white'
                      : 'border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-center h-8">
                    <div
                      className={`border-2 rounded transition-colors ${
                        selectedRatio === r.id ? 'border-pink-400' : 'border-white/30'
                      }`}
                      style={{ width: r.w, height: r.h }}
                    />
                  </div>
                  <span>{r.label}</span>
                  <span className="text-xs opacity-50">{r.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Image list + crop editor */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70">
                {images.length} photo{images.length !== 1 ? 's' : ''} — click to adjust crop
              </h3>
              <button
                onClick={handleReset}
                className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((item, i) => (
                <div
                  key={item.id}
                  className="relative shrink-0 group cursor-pointer"
                  onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                >
                  <img
                    src={item.url}
                    alt={`Photo ${i + 1}`}
                    className={`h-20 w-auto rounded-lg border-2 object-cover transition-all ${
                      editingIndex === i
                        ? 'border-pink-500 ring-2 ring-pink-500/40'
                        : 'border-white/10'
                    }`}
                  />
                  <span className="absolute top-1 left-1 text-[10px] bg-black/60 rounded px-1 text-white/80">
                    {i + 1}
                  </span>
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="w-5 h-5 rounded bg-red-900/60 text-white/80 hover:bg-red-800/80 text-xs flex items-center justify-center cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Inline crop positioner */}
            {editingIndex !== null && images[editingIndex] && cropOverlay && (() => {
              if (cropOverlay.exact) {
                return (
                  <div className="mt-3 text-xs text-white/30 text-center py-2">
                    Photo already matches the selected ratio — no crop needed
                  </div>
                );
              }

              const { mode, cropWidthPct, cropHeightPct, cropLeftPct, cropTopPct } = cropOverlay;

              return (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">
                      {mode === 'horizontal'
                        ? 'Drag left/right to set crop position'
                        : 'Drag up/down to set crop position'}
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
                    className={`relative inline-block max-w-full overflow-hidden rounded-xl select-none ${
                      mode === 'horizontal' ? 'cursor-ew-resize' : 'cursor-ns-resize'
                    }`}
                    onPointerDown={onPosPointerDown}
                    onPointerMove={onPosPointerMove}
                    onPointerUp={onPosPointerUp}
                  >
                    <img
                      src={images[editingIndex].url}
                      alt="Adjust crop"
                      className="max-w-full h-auto block max-h-72"
                      draggable={false}
                    />
                    {/* Dim areas outside the crop */}
                    {mode === 'horizontal' ? (
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
                    {/* Crop frame */}
                    <div
                      className="absolute border-2 border-white/50 rounded pointer-events-none transition-all duration-75"
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

          {/* Download */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 transition-all disabled:opacity-50 cursor-pointer"
            >
              {downloading
                ? 'Creating ZIP...'
                : `Download ${images.length} cropped photo${images.length !== 1 ? 's' : ''} as ZIP`}
            </button>
          </div>

          {/* Preview grid */}
          {previewUrls.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold text-white/70 mb-3">Preview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative">
                    <img
                      src={url}
                      alt={`Cropped ${i + 1}`}
                      className="w-full rounded-lg border border-white/10"
                    />
                    <span className="absolute top-1.5 left-1.5 text-[10px] bg-black/60 rounded px-1.5 py-0.5 text-white/80">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
