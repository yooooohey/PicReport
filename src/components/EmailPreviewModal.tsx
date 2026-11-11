import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  ExternalLink,
  Check,
  Paperclip,
  Download,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Settings as SettingsIcon
} from 'lucide-react';
import { MediaItem, AppSettings } from '../types';
import { prepareMediaForUpload, fileToBase64 } from '../utils/photoProcessor';

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
      : '現場報告';

  // Construct initial body based on the rule
  const generateInitialBody = () => {
    let body = `${settings.greetingHeader}\n${settings.albumUrl}\n\n`;

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
  const [gmailToast, setGmailToast] = useState(false);

  // In-app direct sending state
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [sendStep, setSendStep] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentTimestamp, setSentTimestamp] = useState<string>('');
  const [sentAttachmentCount, setSentAttachmentCount] = useState<number>(0);

  // Check if GAS URL is configured
  const isGasConfigured = Boolean(
    settings.gasMailUrl && settings.gasMailUrl.trim().startsWith('https://script.google.com/macros/s/')
  );

  // 1. Send via Gmail (宛先・CC・件名・本文100%完全自動入力)
  const handleOpenGmailWithAllFields = async () => {
    // Copy body to clipboard as well for safety
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      // ignore
    }

    const encodedTo = encodeURIComponent(toEmail.trim());
    const encodedCc = encodeURIComponent(ccEmails.trim());
    const encodedSubject = encodeURIComponent(subject.trim());
    const encodedBody = encodeURIComponent(body.trim());

    // Construct mailto with CC
    const mailtoUrl = `mailto:${encodedTo}?cc=${encodedCc}&subject=${encodedSubject}&body=${encodedBody}`;

    setGmailToast(true);
    setTimeout(() => setGmailToast(false), 3000);

    // Trigger mail client
    window.location.href = mailtoUrl;
  };

  // Alternative Web Gmail open
  const handleOpenWebGmail = () => {
    const encodedTo = encodeURIComponent(toEmail.trim());
    const encodedCc = encodeURIComponent(ccEmails.trim());
    const encodedSubject = encodeURIComponent(subject.trim());
    const encodedBody = encodeURIComponent(body.trim());
    const webGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&cc=${encodedCc}&su=${encodedSubject}&body=${encodedBody}`;
    window.open(webGmailUrl, '_blank', 'noopener,noreferrer');
  };

  // 2. Direct In-App Mail Transmission ("このアプリ単体でメール送信")
  const handleDirectSendInApp = async () => {
    if (!isGasConfigured) {
      setSendError(
        '直接送信用のGAS URLが未設定です。設定画面でGoogle Apps ScriptのURLを設定するか、上の「Gmailで送信」をご利用ください。'
      );
      return;
    }

    setIsSendingDirect(true);
    setSendError(null);
    setSendStep('写真に説明・日時を刻印中...');

    try {
      // 1. Process files with description caption stamps & safe filenames
      const { files, summaryText } = await prepareMediaForUpload(mediaItems, {
        burnCaption: true,
        senderName: senderName,
      });

      // 2. Prepare attachments if rule applies (photos <= 3 and video === 0)
      const attachmentPayloads: Array<{ fileName: string; mimeType: string; base64: string }> = [];

      if (shouldAttachDirectly) {
        setSendStep(`画像（${files.length}枚）を添付データに変換中...`);
        for (const file of files) {
          const b64 = await fileToBase64(file);
          attachmentPayloads.push({
            fileName: file.name,
            mimeType: file.type || 'image/jpeg',
            base64: b64,
          });
        }
      }

      setSentAttachmentCount(attachmentPayloads.length);
      setSendStep('Google Apps Script経由で直接メール送信中...');

      // 3. Construct payload
      const mailPayload = {
        to: toEmail.trim(),
        cc: ccEmails.trim(),
        subject: subject.trim(),
        body: body.trim(),
        senderName: senderName.trim(),
        albumUrl: settings.albumUrl,
        attachments: attachmentPayloads,
      };

      const gasUrl = settings.gasMailUrl.trim();
      let sentSuccessfully = false;
      let failureReason = '';

      // Attempt A: Server-side route (when running fullstack)
      try {
        const localRes = await fetch('/api/send-mail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...mailPayload, gasUrl }),
          signal: AbortSignal.timeout(30000),
        });

        if (localRes.ok) {
          const resData = await localRes.json();
          if (resData.success === true) {
            sentSuccessfully = true;
          } else {
            failureReason = resData.error || 'サーバー側での送信失敗';
          }
        } else {
          const errData = await localRes.json().catch(() => ({}));
          failureReason = errData.error || `HTTPエラー ${localRes.status}`;
        }
      } catch (e: any) {
        // Fallback to direct client call if server route unavailable (e.g. GitHub Pages)
        failureReason = e?.message || '通信エラー';
      }

      // Attempt B: Client-side direct call to GAS endpoint (GitHub Pages)
      if (!sentSuccessfully) {
        setSendStep('GASへ直接リクエスト送信中...');
        const gasRes = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(mailPayload),
          signal: AbortSignal.timeout(30000),
        });

        if (!gasRes.ok) {
          throw new Error(`GAS応答エラー (HTTP ${gasRes.status})`);
        }

        const text = await gasRes.text();
        let jsonResult: { success?: boolean; error?: string; message?: string } = {};
        try {
          jsonResult = JSON.parse(text);
        } catch {
          if (text.includes('success')) {
            jsonResult = { success: true };
          } else {
            throw new Error(`GAS応答の解析失敗: ${text.slice(0, 100)}`);
          }
        }

        if (jsonResult.success === true) {
          sentSuccessfully = true;
        } else {
          throw new Error(jsonResult.error || failureReason || 'GAS送信処理でエラーが発生しました。');
        }
      }

      if (sentSuccessfully) {
        setSentTimestamp(new Date().toLocaleTimeString('ja-JP'));
        setSendSuccess(true);
        try {
          await navigator.clipboard.writeText(`${settings.albumUrl}\n\n${summaryText}`);
        } catch {
          // ignore
        }
      } else {
        throw new Error(failureReason || 'メール送信の成功を確認できませんでした。');
      }
    } catch (err: any) {
      console.error('In-app mail send error:', err);
      setSendError(
        err?.message || 'メール送信に失敗しました。下の「Gmailで送信」をお試しください。'
      );
    } finally {
      setIsSendingDirect(false);
      setSendStep(null);
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

  const handleDownloadFiles = async () => {
    const { files } = await prepareMediaForUpload(mediaItems, {
      burnCaption: true,
      senderName,
    });
    files.forEach((file) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 max-h-[96vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">報告メール作成・送信</h2>
              <p className="text-[11px] text-slate-400">
                宛先・CC・件名・本文の確認と送信
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {sendSuccess ? (
          <div className="p-5 text-center space-y-4 my-auto animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">メール送信が完了しました！</h3>
              <p className="text-xs text-slate-300 mt-1">
                送信完了時刻: <span className="font-mono text-sky-400">{sentTimestamp}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                宛先: {toEmail} / 添付: {sentAttachmentCount > 0 ? `${sentAttachmentCount}枚` : 'Googleフォト共有'}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer"
              >
                完了して閉じる
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Form Fields */}
            <div className="flex-1 overflow-y-auto px-4 py-2.5 space-y-2.5 text-xs">
              {/* Toast when Gmail launched */}
              {gmailToast && (
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>宛先・CC・件名・本文を入力してGmailを起動しました！</span>
                </div>
              )}

              {/* Error Message */}
              {sendError && (
                <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>直接送信エラー</span>
                  </div>
                  <p className="text-[11px] leading-tight text-slate-200">{sendError}</p>
                  <button
                    type="button"
                    onClick={handleOpenGmailWithAllFields}
                    className="mt-1 flex items-center gap-1 py-1 px-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition cursor-pointer"
                  >
                    <Mail className="w-3 h-3" />
                    <span>確実に届く「Gmailで送信」に切り替える</span>
                  </button>
                </div>
              )}

              {/* Status Banner: Attachment vs Google Photos Link */}
              <div
                className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 ${
                  shouldAttachDirectly
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-sky-950/40 border-sky-500/30 text-sky-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <div className="flex-1 leading-tight">
                  {shouldAttachDirectly ? (
                    <span>
                      写真{photoCount}枚のため、<strong>画像を直接添付</strong>して送信します。
                    </span>
                  ) : (
                    <span>
                      写真{photoCount}枚・動画{videoCount}件のため、<strong>Googleフォト共有リンク</strong>を本文に記載して報告します。
                    </span>
                  )}
                </div>
              </div>

              {/* Sender Name */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                    差出人
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                    宛先 (To)
                  </label>
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* CC */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                  CC (自動挿入済み)
                </label>
                <textarea
                  rows={2}
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500 font-mono leading-tight"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                  表題（件名）<span className="text-sky-400">※1番目の写真説明から自動生成</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                  本文
                </label>
                <textarea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Media summary */}
              <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1 text-[11px]">
                  <Paperclip className="w-3 h-3 text-sky-400" />
                  対象メディア: {mediaItems.length}件 (写真{photoCount} / 動画{videoCount})
                </span>
                <button
                  type="button"
                  onClick={handleDownloadFiles}
                  className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 cursor-pointer"
                  title="説明付き写真を端末に一括保存"
                >
                  <Download className="w-3 h-3" />
                  <span>説明帯付き保存</span>
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/95 shrink-0 space-y-2">
              {/* PRIMARY METHOD 1: GMAIL WITH 100% PREFILLED TO & CC */}
              <button
                type="button"
                onClick={handleOpenGmailWithAllFields}
                disabled={isSendingDirect}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-xs sm:text-sm text-white shadow-md shadow-emerald-700/30 active:scale-[0.98] transition cursor-pointer"
              >
                <Mail className="w-4 h-4 text-white" />
                <span>Gmailで送信（宛先・CCすべて自動入力）</span>
              </button>

              {/* METHOD 2: DIRECT IN-APP GAS TRANSMISSION */}
              <button
                type="button"
                onClick={handleDirectSendInApp}
                disabled={isSendingDirect}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border font-bold text-xs active:scale-[0.98] transition cursor-pointer ${
                  isGasConfigured
                    ? 'bg-slate-800 hover:bg-slate-750 border-sky-500/50 text-sky-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-300'
                }`}
                title={
                  isGasConfigured
                    ? 'Google Apps Script経由で外部アプリを開かずに直接送信'
                    : '設定画面でGAS URLを設定すると有効になります'
                }
              >
                {isSendingDirect ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    <span>{sendStep || '送信中...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isGasConfigured
                        ? 'アプリから直接送信（GAS連携）'
                        : 'アプリ直接送信（設定画面でGAS登録が必要）'}
                    </span>
                  </>
                )}
              </button>

              {/* Secondary Utility Actions */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={handleOpenWebGmail}
                  disabled={isSendingDirect}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[11px] font-semibold text-slate-300 active:scale-95 transition cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3 text-sky-400" />
                  <span>ブラウザ版Gmailで開く</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAll}
                  disabled={isSendingDirect}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[11px] font-semibold text-slate-300 active:scale-95 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">コピー完了</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>全文をコピー</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
