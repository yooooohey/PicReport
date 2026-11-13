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
  Image as ImageIcon,
  AlertCircle,
  Settings as SettingsIcon,
  FolderCheck
} from 'lucide-react';
import { MediaItem, AppSettings } from '../types';
import { prepareMediaForUpload, fileToBase64 } from '../utils/photoProcessor';

interface UploadModalProps {
  mediaItems: MediaItem[];
  settings: AppSettings;
  onClose: () => void;
  onOpenAlbum: () => void;
  onOpenSettings?: () => void;
  onUploadedDriveFolder?: (folderUrl: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  mediaItems = [],
  settings,
  onClose,
  onOpenAlbum,
  onOpenSettings,
  onUploadedDriveFolder,
}) => {
  const [burnCaption, setBurnCaption] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [processedFiles, setProcessedFiles] = useState<File[]>([]);
  const [summaryText, setSummaryText] = useState('');
  const [copied, setCopied] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResultCount, setUploadResultCount] = useState(0);
  const [uploadedFolderUrl, setUploadedFolderUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const rawGasUrl = typeof settings?.gasMailUrl === 'string' ? settings.gasMailUrl.trim() : '';
  const isGasConfigured = Boolean(
    rawGasUrl && rawGasUrl.startsWith('https://script.google.com/macros/s/')
  );

  // Process files when modal opens or toggle changes
  useEffect(() => {
    let isCancelled = false;

    async function process() {
      setIsProcessing(true);
      setErrorMessage(null);
      try {
        const { files, summaryText: text } = await prepareMediaForUpload(mediaItems, {
          burnCaption,
          senderName: settings?.senderName || '自分',
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
  }, [mediaItems, burnCaption, settings?.senderName]);

  // Verify response object strictly
  const validateUploadResponse = (resData: any) => {
    if (!resData || resData.success !== true) {
      throw new Error(resData?.error || 'アップロードに失敗しました。');
    }
    if (!resData.folderUrl && (!resData.uploadedCount || resData.uploadedCount <= 0)) {
      throw new Error(
        'GAS側のスクリプトが古い（メール送信専用）か、Googleドライブへの保存応答が返りませんでした。設定画面から最新のGASコードをコピーして再デプロイしてください。'
      );
    }
    return {
      folderUrl: typeof resData.folderUrl === 'string' ? resData.folderUrl : null,
      uploadedCount: typeof resData.uploadedCount === 'number' ? resData.uploadedCount : processedFiles.length,
    };
  };

  // アプリ単体の動作でGoogleドライブ共有フォルダへ直接アップロード (GAS連携)
  const handleDirectDriveUpload = async () => {
    if (processedFiles.length === 0) return;

    if (!isGasConfigured) {
      setErrorMessage(
        'アプリ単体での直接クラウドアップロードには、Google Apps Script (GAS) のURL登録が必要です。設定画面で最新のGASコードを設定してください。'
      );
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadPercent(10);
    setUploadProgress('写真データを準備中...');

    try {
      // 1. Prepare base64 payloads
      const mediaPayloads: Array<{ fileName: string; mimeType: string; base64: string; description: string }> = [];

      for (let i = 0; i < processedFiles.length; i++) {
        const file = processedFiles[i];
        const originalItem = mediaItems[i];
        setUploadProgress(`画像データ変換中 (${i + 1}/${processedFiles.length}枚)...`);
        setUploadPercent(10 + Math.round(((i + 1) / processedFiles.length) * 30));

        const b64 = await fileToBase64(file);
        mediaPayloads.push({
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
          base64: b64,
          description: originalItem?.description || '',
        });
      }

      setUploadPercent(50);
      setUploadProgress('Googleドライブ共有フォルダへアップロード中...');

      const driveUrl = (settings?.googleDriveUrl || '').trim();
      const folderMatch = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const driveFolderId = folderMatch ? folderMatch[1] : '';

      const uploadPayload = {
        action: 'upload_to_album',
        albumUrl: settings?.albumUrl || '',
        googleDriveUrl: driveUrl,
        driveFolderId,
        senderName: settings?.senderName || '',
        mediaItems: mediaPayloads,
      };

      let verifiedResult: { folderUrl: string | null; uploadedCount: number } | null = null;
      let proxyError: string | null = null;

      // Try local server proxy first when running fullstack
      try {
        const localRes = await fetch('/api/send-mail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...uploadPayload, gasUrl: rawGasUrl }),
          signal: AbortSignal.timeout(45000),
        });

        const contentType = localRes.headers.get('content-type') || '';
        if (localRes.ok && contentType.includes('application/json')) {
          const resData = await localRes.json();
          verifiedResult = validateUploadResponse(resData);
        } else if (contentType.includes('application/json')) {
          const errData = await localRes.json().catch(() => ({}));
          proxyError = errData?.error || `サーバーエラー (${localRes.status})`;
        }
      } catch (e: any) {
        // Expected on static hosting (GitHub Pages) where /api/send-mail is absent
        proxyError = e?.message || null;
      }

      // If local proxy returned an explicit GAS validation error, throw it immediately
      if (!verifiedResult && proxyError && proxyError.includes('GAS')) {
        throw new Error(proxyError);
      }

      // Direct client call to GAS endpoint (e.g. GitHub Pages)
      if (!verifiedResult) {
        setUploadPercent(75);
        setUploadProgress('GASクラウドへ直接送信中...');

        const gasRes = await fetch(rawGasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(uploadPayload),
          signal: AbortSignal.timeout(45000),
        });

        if (!gasRes.ok) {
          throw new Error(`GAS応答エラー (HTTP ${gasRes.status})`);
        }

        const text = await gasRes.text();
        let jsonRes: any;
        try {
          jsonRes = JSON.parse(text);
        } catch {
          const isHtmlLogin = text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('accounts.google.com');
          throw new Error(
            isHtmlLogin
              ? 'GASがログイン画面を返しました。GASデプロイの「アクセスできるユーザー」が「全員 (Anyone)」に設定されているか確認してください。'
              : `GAS応答の解析失敗: ${text.slice(0, 100)}`
          );
        }

        verifiedResult = validateUploadResponse(jsonRes);
      }

      setUploadPercent(100);
      setUploadResultCount(verifiedResult.uploadedCount);
      setUploadedFolderUrl(verifiedResult.folderUrl);
      if (verifiedResult.folderUrl && onUploadedDriveFolder) {
        onUploadedDriveFolder(verifiedResult.folderUrl);
      }
      setUploadSuccess(true);
    } catch (err: any) {
      console.error('Direct cloud upload error:', err);
      setErrorMessage(
        err?.message || 'アップロード中にエラーが発生しました。設定画面でGAS設定をご確認ください。'
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Native share to Google Photos app on Android/Pixel 6a
  const handleShareToGooglePhotosApp = async () => {
    if (processedFiles.length === 0) return;

    try {
      await navigator.clipboard.writeText(`${settings?.albumUrl || ''}\n\n${summaryText}`);
    } catch {
      // ignore
    }

    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: processedFiles })
    ) {
      try {
        await navigator.share({
          files: processedFiles,
          title: 'Googleフォトへ共有',
          text: `${settings?.albumUrl || ''}\n\n${summaryText}`,
        });
        setShareToast('Googleフォト共有シートを呼び出しました');
        setTimeout(() => setShareToast(null), 3500);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setErrorMessage('共有機能の起動に失敗しました。');
        }
      }
    } else {
      handleDownloadAll();
      setShareToast('ブラウザがファイル共有に非対応のため、端末に保存しました');
      setTimeout(() => setShareToast(null), 3500);
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 max-h-[94vh] flex flex-col my-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                クラウド共有・アップロード
              </h2>
              <p className="text-[11px] text-slate-400">
                Googleドライブ直接保存 ＆ Googleフォト共有
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

        {/* Upload Success View (Google Drive Verified) */}
        {uploadSuccess ? (
          <div className="p-5 text-center space-y-4 my-auto animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <FolderCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Googleドライブ共有フォルダへ保存完了！
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {uploadResultCount}件の説明帯付きメディアを指定Googleドライブフォルダへ保存しました。
              </p>
              <p className="text-[11px] text-amber-300/90 mt-2 leading-relaxed">
                ※GoogleのAPI制限によりGoogleフォトの既存アルバムへ直接書き込みはできないため、Googleドライブ共有フォルダに保存されました（報告メールにこのドライブURLを記載できます）。
              </p>
            </div>

            {uploadedFolderUrl && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-1.5">
                <span className="text-[10px] font-bold text-sky-400 block">
                  保存先GoogleドライブURL（閲覧共有設定済み）
                </span>
                <p className="text-[11px] font-mono text-slate-300 break-all">
                  {uploadedFolderUrl}
                </p>
                <a
                  href={uploadedFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ドライブで画像を確認する</span>
                </a>
              </div>
            )}

            <div className="pt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition cursor-pointer"
              >
                完了して戻る
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-xs">
              {/* Google Photos Technical Specification Notice */}
              <div className="p-2.5 rounded-xl bg-amber-950/35 border border-amber-500/35 text-[11px] text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Googleフォト共有アルバムについての仕様説明</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-200">
                  Googleのセキュリティ仕様（2025年3月改定）により、既存のGoogleフォト共有アルバム（<span className="font-mono text-sky-300">photos.app.goo.gl/...</span>）へ外部アプリやスクリプトから直接自動アップロードするAPIはGoogle側で禁止されています。
                </p>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  • <strong>アプリ単体で直接アップロード</strong>したい場合 → 下の青いボタンで<strong>Googleドライブ共有フォルダ</strong>に直接保存（GAS連携）<br />
                  • <strong>Googleフォトに入れたい</strong>場合 → 「Googleフォトへ共有」または「保存してアルバムを開く」
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>アップロードエラー</span>
                  </div>
                  <p className="text-[11px] leading-tight text-slate-200">{errorMessage}</p>
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettings();
                      }}
                      className="mt-1 flex items-center gap-1 py-1 px-2.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                      <span>設定画面でGAS設定を確認する</span>
                    </button>
                  )}
                </div>
              )}

              {shareToast && (
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{shareToast}</span>
                </div>
              )}

              {/* Caption Stamping Toggle */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1">
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
              </div>

              {/* Progress Indicator */}
              {isUploading ? (
                <div className="py-5 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
                  <div className="space-y-1 max-w-xs mx-auto">
                    <p className="text-xs text-white font-bold">{uploadProgress}</p>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div
                        className="bg-sky-500 h-full transition-all duration-300"
                        style={{ width: `${uploadPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">{uploadPercent}% 完了</p>
                  </div>
                </div>
              ) : isProcessing ? (
                <div className="py-5 text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">
                    各写真の説明とファイル名を処理中...
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      対象メディア ({processedFiles.length}件)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyDescriptions}
                      className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
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
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {processedFiles.map((file, idx) => {
                      const original = mediaItems[idx];
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                        >
                          <span className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white truncate">
                              {original?.description || '（説明なし）'}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400 truncate">
                              {file.name}
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                            準備完了
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/95 shrink-0 space-y-2">
              {/* OPTION 1: Google Drive Direct Cloud Upload (100% Standalone via GAS) */}
              <button
                type="button"
                onClick={handleDirectDriveUpload}
                disabled={isProcessing || isUploading || processedFiles.length === 0}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm active:scale-[0.98] transition cursor-pointer ${
                  isGasConfigured
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-600/30'
                    : 'bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300'
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Googleドライブへアップロード中...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>
                      {isGasConfigured
                        ? 'Googleドライブへ直接アップロード（GAS）'
                        : 'Googleドライブへ直接保存（設定でGAS登録が必要）'}
                    </span>
                  </>
                )}
              </button>

              {/* OPTION 2: Share to Google Photos / Download / Open Album */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={handleShareToGooglePhotosApp}
                  disabled={isProcessing || isUploading || processedFiles.length === 0}
                  className="flex items-center justify-center gap-1 py-2 px-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  title="端末の共有メニューからGoogleフォトへ送る"
                >
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">フォトへ共有</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAll}
                  disabled={isProcessing || isUploading || processedFiles.length === 0}
                  className="flex items-center justify-center gap-1 py-2 px-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[11px] font-semibold text-slate-200 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  title="説明帯付き写真を端末に保存"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">端末保存</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenAlbum}
                  className="flex items-center justify-center gap-1 py-2 px-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[11px] font-semibold text-slate-200 active:scale-95 transition cursor-pointer"
                  title="Googleフォト共有アルバムを開く"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">アルバム開く</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
