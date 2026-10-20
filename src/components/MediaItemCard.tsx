import React from 'react';
import { Trash2, Film, Image as ImageIcon, ChevronUp, ChevronDown, Check, Sparkles } from 'lucide-react';
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

const PRESET_TAGS = ['作業前', '作業後', '状況確認', '不具合・破損', '修繕完了', '全体', '詳細'];

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
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      className={`group relative rounded-2xl bg-slate-900/90 border transition-all duration-200 shadow-md ${
        isFirst
          ? 'border-sky-500/60 ring-1 ring-sky-500/30'
          : 'border-slate-800 hover:border-slate-700'
      } overflow-hidden p-3.5`}
    >
      <div className="flex gap-3 items-start">
        {/* Media Preview (Square Thumbnail with full media preview modal or video playback) */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
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
          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-semibold text-white flex items-center gap-1">
            {item.type === 'image' ? (
              <>
                <ImageIcon className="w-3 h-3 text-sky-400" />
                <span>写真</span>
              </>
            ) : (
              <>
                <Film className="w-3 h-3 text-amber-400" />
                <span>動画</span>
              </>
            )}
          </span>

          {/* Size */}
          <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-[9px] text-slate-300">
            {formatFileSize(item.sizeBytes)}
          </span>
        </div>

        {/* Content details & description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                  isFirst
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {index + 1}
              </span>
              <span className="text-xs font-medium text-slate-400 truncate max-w-[120px] sm:max-w-[180px]">
                {item.fileName}
              </span>

              {isFirst && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400">
                  <Sparkles className="w-3 h-3" />
                  メール表題に反映
                </span>
              )}
            </div>

            {/* Quick Actions (Reorder & Delete) */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => onMoveUp(index)}
                disabled={isFirst}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition"
                title="上へ移動"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(index)}
                disabled={isLast}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition"
                title="下へ移動"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="p-1 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                title="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description Input */}
          <div className="mt-1">
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              説明・状況メモ {isFirst && <span className="text-sky-400">（メールの表題になります）</span>}
            </label>
            <input
              type="text"
              value={item.description}
              onChange={(e) => onUpdateDescription(item.id, e.target.value)}
              placeholder={isFirst ? "例: プールサイド点検状況報告" : "例: 破損箇所の拡大写真"}
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>

          {/* Quick preset chips */}
          <div className="mt-2 flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-slate-400 mr-0.5">定型タグ:</span>
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTag(tag)}
                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-[11px] text-slate-300 hover:text-white border border-slate-700/50 transition active:scale-95"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
