import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  ExternalLink,
  Check,
  Copy,
  Download,
  Share2,
  CheckCircle2,
  Sparkles,
  Info,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { MediaItem, AppSettings } from '../types';
import { prepareMediaForUpload } from '../utils/photoProcessor';

interface UploadModalProps {
  mediaItems: MediaItem[];
  settings: AppSettings;
  onClose: () => void;
  onOpenAlbum: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  mediaItems,
  settings,
  onClose,
  onOpenAlbum,
}) => {
  const [burnCaption, setBurnCaption] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<File[]>([]);
  const [summaryText, setSummaryText] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Process files when modal opens or toggle changes
  useEffect(() => {
    let isCancelled = false;

    async function process() {
      setIsProcessing(true);
      setErrorMessage(null);
      try {
        const { files, summaryText: text } = await prepareMediaForUpload(mediaItems, {
          burnCaption,
          senderName: settings.senderName,
        });

        if (!isCancelled) {
          setProcessedFiles(files);
          setSummaryText(text);
          setIsProcessing(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('Error processing media:', err);
          setErrorMessage('写真の処理中にエラーが発生しました。');
          setIsProcessing(false);
        }
      }
    }

    process();

    return () => {
      isCancelled = true;
    };
  }, [mediaItems, burnCaption, settings.senderName]);

  // Handle direct upload via Web Share API
  const handleNativeShareUpload = async () => {
    if (processedFiles.length === 0) return;

    // Automatically copy description list to clipboard for user convenience
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Ignore clipboard fail
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        const canShareFiles = navigator.canShare && navigator.canShare({ files: processedFiles });

        if (canShareFiles) {
          await navigator.share({
            files: processedFiles,
            title: 'Googleフォト共有アルバムへアップロード',
            text: `${settings.greetingHeader}\n${settings.albumUrl}\n\n${summaryText}`,
          });
          setShareSuccess(true);
          return;
        }
      }

      // If native file sharing is not supported by browser, download files directly
      handleDownloadAll();
      setShareSuccess(true);
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('Native share error:', err);
      }
    }
  };

  // Download all processed files
  const handleDownloadAll = () => {
    processedFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  };

  // Copy descriptions
  const handleCopyDescriptions = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Googleフォトへアップロード</h2>
              <p className="text-xs text-slate-400">各写真に説明を付与して送信</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Album Target Banner */}
        <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 shrink-0 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider block">
              アップロード先共有アルバム
            </span>
            <span className="text-xs font-mono text-slate-300 truncate block">
              {settings.albumUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenAlbum}
            className="shrink-0 flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 px-2.5 py-1.5 rounded-lg transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>開く</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Caption Stamping Toggle */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200">
                  写真下部に説明・日付の帯（キャプション）を入れる
                </span>
              </div>
              <input
                type="checkbox"
                checked={burnCaption}
                onChange={(e) => setBurnCaption(e.target.checked)}
                className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-700"
              />
            </label>
            <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
              Googleフォト内で写真を開いた時に、誰でも一目で「どの箇所の写真か」「報告日時」が確認できます。
            </p>
          </div>

          {/* Processing Indicator */}
          {isProcessing ? (
            <div className="py-8 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-medium">
                各写真の説明とファイル名を処理中...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  アップロード対象ファイル ({processedFiles.length}件)
                </span>
                <button
                  type="button"
                  onClick={handleCopyDescriptions}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">説明コピー済</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>説明文を一括コピー</span>
                    </>
                  )}
                </button>
              </div>

              {/* File list preview */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {processedFiles.map((file, idx) => {
                  const original = mediaItems[idx];
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                    >
                      <span className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate">
                          {original?.description || '（説明なし）'}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 truncate">
                          ファイル名: {file.name}
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                        説明付与済
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Information box */}
          <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-800/40 text-[11px] text-sky-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>アップロードのながれ</span>
            </div>
            <p className="text-slate-300 pl-5 leading-relaxed">
              1. 下の「Googleフォトへ送信・アップロード」を押すと、端末の共有メニューが開きます。<br />
              2. 共有先で「Googleフォト」を選択すると、説明付きの写真がそのままGoogleフォトへ転送されます。<br />
              3. 「共有アルバムを開く」から、アルバム内に写真を追加してください。
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 shrink-0 space-y-2">
          {/* Main Action: Native Share to Google Photos */}
          <button
            type="button"
            onClick={handleNativeShareUpload}
            disabled={isProcessing || processedFiles.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-sky-600/30 active:scale-[0.98] transition cursor-pointer"
          >
            <UploadCloud className="w-5 h-5" />
            <span>Googleフォトへ送信・アップロード</span>
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenAlbum}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 active:scale-95 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              <span>共有アルバムを開く</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={isProcessing || processedFiles.length === 0}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>説明付き写真保存</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
