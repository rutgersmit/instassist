import { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import SegmentPreview from './components/SegmentPreview';
import Controls from './components/Controls';
import PeekMode from './components/PeekMode';
import { calculateOptimalSegments, splitImage } from './utils/splitImage';
import { downloadSegments } from './utils/download';

export default function App() {
  const [activeTab, setActiveTab] = useState('splitter');
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState('');
  const [segmentCount, setSegmentCount] = useState(3);

  const [verticalAlign, setVerticalAlign] = useState(0.5);
  const [downloading, setDownloading] = useState(false);

  const handleImageLoad = useCallback((img, name) => {
    setImage(img);
    setFileName(name.replace(/\.[^.]+$/, ''));
    setSegmentCount(calculateOptimalSegments(img.width, img.height));
    setVerticalAlign(0.5);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!image) return;
    setDownloading(true);
    try {
      const segments = splitImage(image, segmentCount, verticalAlign);
      await downloadSegments(segments, fileName || 'carousel');
    } finally {
      setDownloading(false);
    }
  }, [image, segmentCount, verticalAlign, fileName]);

  const handleReset = useCallback(() => {
    setImage(null);
    setFileName('');
    setSegmentCount(3);
    setVerticalAlign(0.5);
  }, []);

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            InstAssist
          </h1>
          <p className="text-sm text-white/50 mt-2">
            Tools for Instagram carousels
          </p>

          <div className="mt-5 inline-flex rounded-xl bg-white/5 border border-white/10 p-1">
            {[
              { id: 'splitter', label: 'Splitter' },
              { id: 'peek', label: 'Peek Carousel' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main>
          {activeTab === 'splitter' ? (
            <>
              {!image ? (
                <div className="animate-fade-in-up">
                  <ImageUploader onImageLoad={handleImageLoad} />

                  <section className="mt-14 max-w-2xl mx-auto grid sm:grid-cols-2 gap-8">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                      <h2 className="text-base font-semibold mb-4 text-white/90">How it works</h2>
                      <ol className="space-y-3 text-sm text-white/60">
                        <li className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">1</span>
                          Upload a landscape or panoramic photo
                        </li>
                        <li className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">2</span>
                          Choose how many carousel slides (2-10)
                        </li>
                        <li className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-xs font-bold text-white">3</span>
                          Drag to adjust the vertical crop
                        </li>
                        <li className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white">4</span>
                          Download all segments as a ZIP
                        </li>
                      </ol>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                      <h2 className="text-base font-semibold mb-4 text-white/90">Why InstAssist?</h2>
                      <ul className="space-y-3 text-sm text-white/60">
                        <li className="flex gap-2 items-start"><span className="text-green-400 mt-0.5">&#10003;</span> Free and instant — no account needed</li>
                        <li className="flex gap-2 items-start"><span className="text-green-400 mt-0.5">&#10003;</span> Privacy-first — photos never leave your browser</li>
                        <li className="flex gap-2 items-start"><span className="text-green-400 mt-0.5">&#10003;</span> Full quality — original resolution export</li>
                        <li className="flex gap-2 items-start"><span className="text-green-400 mt-0.5">&#10003;</span> Works with any landscape or panorama</li>
                      </ul>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in-up">
                  <Controls
                    segmentCount={segmentCount}
                    onSegmentCountChange={setSegmentCount}
                    onDownload={handleDownload}
                    downloading={downloading}
                  />

                  <SegmentPreview
                    image={image}
                    segmentCount={segmentCount}
                    verticalAlign={verticalAlign}
                    onVerticalAlignChange={setVerticalAlign}
                  />

                  <button
                    onClick={handleReset}
                    className="text-sm text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    &larr; Upload a different image
                  </button>
                </div>
              )}
            </>
          ) : (
            <PeekMode />
          )}
        </main>

        <footer className="mt-20 pb-6 text-center">
          <a
            href="https://buymeacoffee.com/rutgrrr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full
              bg-[#FFDD00]/10 border border-[#FFDD00]/20
              text-[#FFDD00]/80 hover:text-[#FFDD00] hover:bg-[#FFDD00]/15
              transition-all text-sm font-medium"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.062 2.014.13l.04.005a6.083 6.083 0 011.64.373c.078.028.214.098.27.019.045-.062.043-.18.043-.28a1.55 1.55 0 00-.062-.407zM9.367 17.343c-.076.396-.29.703-.588.937a2.185 2.185 0 01-1.164.464 2.671 2.671 0 01-.882-.06 1.916 1.916 0 01-.756-.396c-.192-.178-.31-.413-.324-.676a.94.94 0 01.09-.486c.257-.567.786-.895 1.378-1.048.295-.076.6-.117.906-.117.21 0 .42.026.627.076.23.056.365.275.365.512 0 .137-.016.274-.046.41zm6.577-3.283a4.534 4.534 0 01-.583.22 11.46 11.46 0 01-3.376.53 11.5 11.5 0 01-3.376-.53 4.534 4.534 0 01-.583-.22 1.665 1.665 0 01-.543-.32.837.837 0 01-.24-.637c.009-.26.107-.502.27-.696.09-.107.2-.2.32-.278a5.146 5.146 0 00-.702 1.474c-.128.48-.14.976-.022 1.458.252 1.03 1.09 1.706 2.065 2.054.975.349 2.044.5 3.082.442a8.214 8.214 0 002.033-.323c.605-.177 1.192-.453 1.63-.89.456-.457.676-1.074.586-1.706a3.05 3.05 0 00-.36-.997z" />
              <path d="M11.976 4.108a10.09 10.09 0 00-3.998.668c-.295.118-.478.397-.416.705.062.308.368.5.675.412a8.753 8.753 0 016.978.284.53.53 0 00.674-.25.555.555 0 00-.19-.706 10.2 10.2 0 00-3.723-1.113z" />
            </svg>
            Buy me a coffee
          </a>
        </footer>
      </div>
    </div>
  );
}
