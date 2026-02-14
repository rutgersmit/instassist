import { useMemo, useRef, useState, useCallback } from 'react';
import { getSegmentPositions, splitImage } from '../utils/splitImage';

export default function SegmentPreview({ image, segmentCount, verticalAlign, onVerticalAlignChange }) {
  const [dragAlign, setDragAlign] = useState(null);
  const activeAlign = dragAlign !== null ? dragAlign : verticalAlign;

  const positions = useMemo(
    () => getSegmentPositions(image.width, segmentCount),
    [image, segmentCount]
  );

  const segments = useMemo(
    () => splitImage(image, segmentCount, verticalAlign),
    [image, segmentCount, verticalAlign]
  );

  const segmentDataUrls = useMemo(
    () => segments.map((canvas) => canvas.toDataURL('image/jpeg', 0.9)),
    [segments]
  );

  const segmentSide = Math.round(image.width / segmentCount);
  const cropHeightPct = (segmentSide / image.height) * 100;
  const maxOffset = image.height - segmentSide;
  const cropTopPct = maxOffset > 0 ? (activeAlign * maxOffset / image.height) * 100 : 0;
  const canDrag = segmentSide < image.height;

  const containerRef = useRef(null);
  const dragging = useRef(false);

  const calcAlign = useCallback((clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    return Math.max(0, Math.min(1, y / rect.height));
  }, []);

  const onPointerDown = useCallback((e) => {
    if (!canDrag) return;
    dragging.current = true;
    containerRef.current.setPointerCapture(e.pointerId);
    setDragAlign(calcAlign(e.clientY));
  }, [canDrag, calcAlign]);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    setDragAlign(calcAlign(e.clientY));
  }, [calcAlign]);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragAlign !== null) {
      onVerticalAlignChange(dragAlign);
      setDragAlign(null);
    }
  }, [dragAlign, onVerticalAlignChange]);

  return (
    <div className="space-y-6">
      {/* Original image with overlay grid and crop region */}
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <h3 className="text-sm font-medium text-white/50">Preview</h3>
          {canDrag && (
            <span className="text-xs text-white/25">Drag to adjust vertical position</span>
          )}
        </div>
        <div
          ref={containerRef}
          className={`relative inline-block max-w-full overflow-hidden rounded-2xl select-none shadow-2xl shadow-black/40 ${canDrag ? 'cursor-ns-resize' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <img
            src={image.src}
            alt="Original"
            className="max-w-full h-auto block"
            draggable={false}
          />
          {canDrag && (
            <>
              <div
                className="absolute left-0 right-0 top-0 bg-black/50 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
                style={{ height: `${cropTopPct}%` }}
              />
              <div
                className="absolute left-0 right-0 bottom-0 bg-black/50 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
                style={{ height: `${100 - cropTopPct - cropHeightPct}%` }}
              />
            </>
          )}
          {positions.map((px, i) => {
            const leftPct = (px / image.width) * 100;
            const widthPct = (segmentSide / image.width) * 100;
            return (
              <div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  top: `${cropTopPct}%`,
                  height: `${cropHeightPct}%`,
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.25)' : 'none',
                  borderRight: i < segmentCount - 1 ? '1px solid rgba(255,255,255,0.25)' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Individual segment previews */}
      <div>
        <h3 className="text-sm font-medium text-white/50 mb-3">Segments</h3>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {segmentDataUrls.map((url, i) => (
            <div
              key={i}
              className="shrink-0 animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="relative group">
                <img
                  src={url}
                  alt={`Segment ${i + 1}`}
                  className="h-28 w-28 object-cover rounded-xl border border-white/10 shadow-lg shadow-black/30
                    transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-center text-white/30 mt-1.5 font-mono">{i + 1}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
