import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Share2,
  Copy,
  ExternalLink,
  Check,
  Paperclip,
  AlertCircle,
  FileImage,
  Film,
  Download,
  Info
} from 'lucide-react';
import { MediaItem, AppSettings } from '../types';

interface EmailPreviewModalProps {
  mediaItems: MediaItem[];
  settings: AppSettings;
  onClose: () => void;
  onOpenAlbum: () => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  mediaItems,
  settings,
  onClose,
  onOpenAlbum,
}) => {
  const photoItems = mediaItems.filter((m) => m.type === 'image');
  const videoItems = mediaItems.filter((m) => m.type === 'video');

  const photoCount = photoItems.length;
  const videoCount = videoItems.length;

  // Rule: Attach photos if photos <= 3 AND no videos.
  // If photos >= 4 OR contains video -> specify Google Photos link address in body.
  const shouldAttachDirectly = photoCount > 0 && photoCount <= 3 && videoCount === 0;

  // Initial Subject: description of the first media item
  const initialSubject =
    mediaItems.length > 0 && mediaItems[0].description.trim()
      ? mediaItems[0].description.trim()
      : `【業務報告】現場確認報告 (${new Date().toLocaleDateString('ja-JP')})`;

  // Construct initial body based on the rule
  const generateInitialBody = () => {
    let body = `${settings.greetingHeader}\n${settings.albumUrl}\n\n`;

    // Rule annotation note
    if (!shouldAttachDirectly) {
      if (videoCount > 0 && photoCount >= 4) {
        body += `※写真4枚以上および動画が含まれるため、上記Googleフォト共有アルバムにて報告いたします。\n\n`;
      } else if (videoCount > 0) {
        body += `※動画が含まれるため、上記Googleフォト共有アルバムにて報告いたします。\n\n`;
      } else if (photoCount >= 4) {
        body += `※写真4枚以上のため、上記Googleフォト共有アルバムにて報告いたします。\n\n`;
      }
    } else {
      body += `※画像（${photoCount}枚）を添付しております。\n\n`;
    }

    body += `【メディア報告詳細】\n`;
    mediaItems.forEach((item, index) => {
      const typeLabel = item.type === 'image' ? '写真' : '動画';
      const desc = item.description.trim() ? item.description.trim() : '（説明なし）';
      body += `${index + 1}. [${typeLabel}] ${desc} (${item.fileName})\n`;
    });

    body += `\n-------------------------\n差出人: ${settings.senderName}\n送信日時: ${new Date().toLocaleString('ja-JP')}`;
    return body;
  };

  const [toEmail, setToEmail] = useState(settings.toEmail);
  const [ccEmails, setCcEmails] = useState(settings.ccEmails);
  const [senderName, setSenderName] = useState(settings.senderName);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(generateInitialBody);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [canWebShareFiles, setCanWebShareFiles] = useState(false);

  useEffect(() => {
    // Check if navigator.canShare with files is supported
    if (typeof navigator !== 'undefined' && 'canShare' in navigator && shouldAttachDirectly) {
      try {
        const testFile = new File(['foo'], 'test.txt', { type: 'text/plain' });
        if (navigator.canShare({ files: [testFile] })) {
          setCanWebShareFiles(true);
        }
      } catch {
        setCanWebShareFiles(false);
      }
    }
  }, [shouldAttachDirectly]);

  // Handle standard mailto opening
  const handleOpenMailClient = () => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const ccParam = ccEmails.trim() ? `&cc=${encodeURIComponent(ccEmails.trim())}` : '';
    const mailtoUrl = `mailto:${encodeURIComponent(toEmail.trim())}?subject=${encodedSubject}&body=${encodedBody}${ccParam}`;
    window.location.href = mailtoUrl;
  };

  // Handle native Web Share API (which on mobile can attach actual image files!)
  const handleNativeShare = async () => {
    setShareError(null);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        if (shouldAttachDirectly) {
          // Prepare image files
          const filesToShare = photoItems.map((item) => item.file);
          if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
            await navigator.share({
              files: filesToShare,
              title: subject,
              text: `宛先: ${toEmail}\nCC: ${ccEmails}\n\n${body}`,
            });
            return;
          }
        }

        // Fallback or text-only share (when photos >= 4 or video)
        await navigator.share({
          title: subject,
          text: `宛先: ${toEmail}\nCC: ${ccEmails}\n件名: ${subject}\n\n${body}`,
        });
      } else {
        // Fallback to mailto
        handleOpenMailClient();
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('Web Share Error, falling back to mailto:', err);
        handleOpenMailClient();
      }
    }
  };

  const handleCopyAll = async () => {
    const fullText = `宛先: ${toEmail}\nCC: ${ccEmails}\n差出人: ${senderName}\n件名: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handleDownloadFiles = () => {
    mediaItems.forEach((item, index) => {
      const a = document.createElement('a');
      a.href = item.previewUrl;
      a.download = `report_${index + 1}_${item.fileName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">報告メールの作成・送信</h2>
              <p className="text-xs text-slate-400">内容の確認と送信方法の選択</p>
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

        {/* Rule Status Alert Banner */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 shrink-0">
          {shouldAttachDirectly ? (
            <div className="flex items-center gap-2 text-xs text-sky-400">
              <Paperclip className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                <strong>写真3枚以内:</strong> メールへの画像添付モード（端末共有機能で画像を直接添付できます）
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-xs text-amber-400">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>
                  {videoCount > 0 ? '動画あり / ' : ''}写真4枚以上:
                </strong>{' '}
                共有Googleフォトアルバムのリンクを本文に記載して報告します。
              </div>
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
          {/* Sender */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              差出人
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* To */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              送信先 (To)
            </label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* CC */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              CC
            </label>
            <textarea
              rows={2}
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              表題（件名）<span className="text-sky-400">※最初のメディア説明から自動生成</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              本文
            </label>
            <textarea
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs sm:text-sm text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Attached / Linked media summary preview */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-sky-400" />
                報告対象メディア ({mediaItems.length}件)
              </span>
              <button
                type="button"
                onClick={handleDownloadFiles}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                端末に保存
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {mediaItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="w-16 h-16 shrink-0 rounded-lg bg-slate-900 border border-slate-800 relative overflow-hidden group"
                  title={`${idx + 1}. ${item.description || item.fileName}`}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-amber-400">
                      <Film className="w-5 h-5" />
                    </div>
                  )}
                  <span className="absolute top-0.5 left-0.5 px-1 rounded bg-black/70 text-[9px] font-bold text-white">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 shrink-0 space-y-2.5">
          {/* Main Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Native Share button (attaches images directly if <=3 photos) */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-bold text-sm text-white shadow-lg shadow-sky-600/30 active:scale-[0.98] transition"
            >
              <Share2 className="w-4 h-4" />
              <span>
                {shouldAttachDirectly
                  ? 'スマホ共有で送信（画像添付）'
                  : 'スマホ共有・メールで送信'}
              </span>
            </button>

            {/* Mailto launcher */}
            <button
              type="button"
              onClick={handleOpenMailClient}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 font-semibold text-sm text-slate-100 active:scale-[0.98] transition"
            >
              <Mail className="w-4 h-4 text-sky-400" />
              <span>メールアプリで開く (mailto)</span>
            </button>
          </div>

          {/* Secondary Quick Utilities */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">コピーしました！</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>本文・宛先をコピー</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenAlbum}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 px-3 py-1.5 rounded-lg bg-sky-950/40 border border-sky-800/40 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Googleフォト共有アルバムを開く</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
