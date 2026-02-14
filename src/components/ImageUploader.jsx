import { useState, useRef } from 'react';

export default function ImageUploader({ onImageLoad }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const img = new Image();
    img.onload = () => {
      onImageLoad(img, file.name);
    };
    img.src = URL.createObjectURL(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function onDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onChange(e) {
    const file = e.target.files[0];
    handleFile(file);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`
        group relative overflow-hidden
        border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer
        transition-all duration-300
        ${isDragging
          ? 'border-pink-400 bg-pink-500/10 scale-[1.01]'
          : 'border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/8'
        }
      `}
      style={isDragging ? {} : { animation: 'pulse-border 3s ease-in-out infinite' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />

      {/* Decorative gradient blob */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-indigo-500/20 to-pink-500/20 rounded-full blur-3xl pointer-events-none transition-transform duration-500 group-hover:scale-110" />

      <div className="relative">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 mb-5 shadow-lg shadow-indigo-500/25">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="text-lg font-medium text-white/80">
          {isDragging ? 'Drop it like it\'s hot' : 'Drop a landscape image here'}
        </p>
        <p className="text-sm mt-1.5 text-white/35">
          {isDragging ? '' : 'or click to browse — JPG, PNG, WebP'}
        </p>
      </div>
    </div>
  );
}
