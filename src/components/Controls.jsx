export default function Controls({
  segmentCount,
  onSegmentCountChange,
  onDownload,
  downloading,
}) {
  return (
    <div className="flex flex-wrap items-center gap-6 p-5 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-white/60">Segments</label>
        <input
          type="range"
          min={2}
          max={10}
          value={segmentCount}
          onChange={(e) => onSegmentCountChange(Number(e.target.value))}
          className="w-32"
        />
        <span className="text-sm font-mono bg-white/10 px-2.5 py-1 rounded-lg text-white/90 min-w-[2.5ch] text-center">
          {segmentCount}
        </span>
      </div>

      <button
        onClick={onDownload}
        disabled={downloading}
        className="ml-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-white
          bg-gradient-to-r from-indigo-500 to-pink-500
          hover:from-indigo-400 hover:to-pink-400
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all cursor-pointer
          shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30
          active:scale-[0.97]"
      >
        {downloading ? 'Zipping...' : 'Download ZIP'}
      </button>
    </div>
  );
}
