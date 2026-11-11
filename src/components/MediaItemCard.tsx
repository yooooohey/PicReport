import React from 'react';
import { Trash2, Film, Image as ImageIcon, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { MediaItem } from '../types';

interface MediaItemCardProps {
  item: MediaItem;
  index: number;
  total: number;
  onUpdateDescription: (id: string, description: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const PRESET_TAGS = ['作業前', '作業後', '状況確認', '不具合', '修繕完了', '全体'];

export const MediaItemCard: React.FC<MediaItemCardProps> = ({
  item,
  index,
  total,
  onUpdateDescription,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)}KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handleAddTag = (tag: string) => {
    if (!item.description.trim()) {
      onUpdateDescription(item.id, tag);
    } else if (!item.description.includes(tag)) {
      onUpdateDescription(item.id, `${item.description} / ${tag}`);
    }
  };

  return (
    <div
      className={`group relative rounded-xl bg-slate-900/95 border transition-all duration-150 shadow-sm ${
        isFirst
          ? 'border-sky-500/70 ring-1 ring-sky-500/30'
          : 'border-slate-800 hover:border-slate-700'
      } overflow-hidden p-2 sm:p-2.5`}
    >
      <div className="flex gap-2.5 items-start">
        {/* Media Preview Thumbnail */}
        <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-lg bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
          {item.type === 'image' ? (
            <img
              src={item.previewUrl}
              alt={item.fileName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <video
              src={item.previewUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {/* Type Tag */}
          <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/75 text-[9px] font-semibold text-white flex items-center gap-0.5">
            {item.type === 'image' ? (
              <>
                <ImageIcon className="w-2.5 h-2.5 text-sky-400" />
                <span>写真</span>
              </>
            ) : (
              <>
                <Film className="w-2.5 h-2.5 text-amber-400" />
                <span>動画</span>
              </>
            )}
          </span>

          {/* File Size */}
          <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/75 text-[8px] text-slate-300 font-mono">
            {formatFileSize(item.sizeBytes)}
          </span>
        </div>

        {/* Content & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                  isFirst ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {index + 1}
              </span>
              <span className="text-[11px] font-mono text-slate-400 truncate max-w-[130px] sm:max-w-[200px]">
                {item.fileName}
              </span>

              {isFirst && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  件名
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => onMoveUp(index)}
                disabled={isFirst}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition cursor-pointer"
                title="上へ"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(index)}
                disabled={isLast}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition cursor-pointer"
                title="下へ"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer ml-0.5"
                title="削除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Description Input */}
          <div>
            <input
              type="text"
              value={item.description}
              onChange={(e) => onUpdateDescription(item.id, e.target.value)}
              placeholder={isFirst ? "説明（メール表題になります）" : "写真の説明メモを入力"}
              className="w-full rounded-lg bg-slate-950/90 border border-slate-700/80 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>

          {/* Preset Chips */}
          <div className="mt-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTag(tag)}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-[10px] text-slate-300 hover:text-white border border-slate-700/60 transition active:scale-95 shrink-0 cursor-pointer"
              >
                +{tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
