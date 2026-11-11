import React, { useRef } from 'react';
import { Camera, Video, ImagePlus, UploadCloud } from 'lucide-react';

interface MediaUploaderProps {
  onAddFiles: (files: FileList | File[]) => void;
  mediaCount: number;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ onAddFiles, mediaCount }) => {
  const photoCameraInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-1.5">
      {/* Hidden file inputs */}
      <input
        ref={photoCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={videoCameraInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={multiFileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Ultra-compact 3-button touch row optimized for Pixel 6a & smartphone thumb reach */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Photo Camera */}
        <button
          type="button"
          onClick={() => photoCameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-gradient-to-b from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white shadow-md shadow-sky-600/20 active:scale-95 transition cursor-pointer"
        >
          <Camera className="w-5 h-5 mb-0.5 text-sky-100" />
          <span className="text-xs font-bold leading-tight">写真を撮影</span>
          <span className="text-[9px] text-sky-200">カメラ</span>
        </button>

        {/* Video Camera */}
        <button
          type="button"
          onClick={() => videoCameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-md shadow-amber-600/20 active:scale-95 transition cursor-pointer"
        >
          <Video className="w-5 h-5 mb-0.5 text-amber-100" />
          <span className="text-xs font-bold leading-tight">動画を撮影</span>
          <span className="text-[9px] text-amber-200">動画モード</span>
        </button>

        {/* Multi-file Gallery Picker */}
        <button
          type="button"
          onClick={() => multiFileInputRef.current?.click()}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-100 shadow-sm active:scale-95 transition cursor-pointer"
        >
          <ImagePlus className="w-5 h-5 mb-0.5 text-emerald-400" />
          <span className="text-xs font-bold leading-tight">アルバム選択</span>
          <span className="text-[9px] text-slate-400">複数指定</span>
        </button>
      </div>

      {/* Empty State Banner (Minimal height for Pixel 6a) */}
      {mediaCount === 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => multiFileInputRef.current?.click()}
          className="border border-dashed border-slate-800 hover:border-sky-500/50 rounded-xl py-3 px-3 text-center cursor-pointer bg-slate-900/30 transition group"
        >
          <div className="flex items-center justify-center gap-1.5 text-slate-400 group-hover:text-sky-300">
            <UploadCloud className="w-4 h-4 text-sky-400 shrink-0" />
            <p className="text-xs font-medium">
              ボタンをタップして撮影、または写真を指定
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
