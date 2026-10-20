import React, { useRef } from 'react';
import { Camera, Video, Plus, ImagePlus, UploadCloud } from 'lucide-react';

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
      // Reset input value so same files can be re-selected if deleted
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
    <div className="space-y-3">
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

      {/* Main Touch-Friendly Action Buttons optimized for smartphones */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Photo Camera */}
        <button
          type="button"
          onClick={() => photoCameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-b from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white shadow-lg shadow-sky-600/25 active:scale-95 transition"
        >
          <Camera className="w-6 h-6 mb-1 text-sky-100" />
          <span className="text-sm font-bold">写真を撮影</span>
          <span className="text-[10px] text-sky-200">スマホカメラ起動</span>
        </button>

        {/* Video Camera */}
        <button
          type="button"
          onClick={() => videoCameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-600/25 active:scale-95 transition"
        >
          <Video className="w-6 h-6 mb-1 text-amber-100" />
          <span className="text-sm font-bold">動画を撮影</span>
          <span className="text-[10px] text-amber-200">動画モード起動</span>
        </button>

        {/* Multi-file Gallery Picker */}
        <button
          type="button"
          onClick={() => multiFileInputRef.current?.click()}
          className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-100 shadow-md active:scale-95 transition"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <ImagePlus className="w-5 h-5 text-emerald-400" />
            <Plus className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-sm font-bold">写真・動画を一括選択</span>
          <span className="text-[10px] text-slate-400">アルバムから複数指定</span>
        </button>
      </div>

      {/* Desktop/Dropzone helper banner if empty */}
      {mediaCount === 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => multiFileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-6 text-center cursor-pointer bg-slate-900/40 transition group"
        >
          <UploadCloud className="w-8 h-8 mx-auto text-slate-500 group-hover:text-sky-400 mb-2 transition" />
          <p className="text-sm font-medium text-slate-300">
            上のボタンをタップして撮影、またはここにファイルをドロップ
          </p>
          <p className="text-xs text-slate-500 mt-1">
            複数写真・動画に対応しています
          </p>
        </div>
      )}
    </div>
  );
};
