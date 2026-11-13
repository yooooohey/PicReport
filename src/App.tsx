/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Camera,
  Film,
  Mail,
  Settings,
  ExternalLink,
  Copy,
  Trash2,
  CheckCircle2,
  Sparkles,
  Paperclip,
  Share2,
  AlertCircle,
  HelpCircle,
  Send,
  Maximize,
  Minimize,
  UploadCloud,
  Link as LinkIcon,
  Loader2,
  X
} from 'lucide-react';

import { MediaItem, AppSettings, DEFAULT_SETTINGS, APP_VERSION, DEPRECATED_PLACEHOLDER_GAS_URL } from './types';
import { MediaUploader } from './components/MediaUploader';
import { MediaItemCard } from './components/MediaItemCard';
import { EmailPreviewModal } from './components/EmailPreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { UploadModal } from './components/UploadModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { prepareMediaForUpload } from './utils/photoProcessor';

const SETTINGS_STORAGE_KEY = 'photo_video_report_settings_v2';
const LEGACY_SETTINGS_KEY = 'photo_video_report_settings_v1';

export default function App() {
  // Settings loaded from localStorage v2 (or migrated from v1 preserving custom GAS URL)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const storedV2 = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedV2) {
        const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(storedV2) };
        if (!parsed.gasMailUrl || parsed.gasMailUrl === DEPRECATED_PLACEHOLDER_GAS_URL) {
          parsed.gasMailUrl = DEFAULT_SETTINGS.gasMailUrl;
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }

      const storedV1 = localStorage.getItem(LEGACY_SETTINGS_KEY);
      if (storedV1) {
        const legacy = JSON.parse(storedV1);
        const validGasUrl =
          legacy?.gasMailUrl && legacy.gasMailUrl !== DEPRECATED_PLACEHOLDER_GAS_URL
            ? legacy.gasMailUrl
            : DEFAULT_SETTINGS.gasMailUrl;
        const migrated: AppSettings = {
          ...DEFAULT_SETTINGS,
          gasMailUrl: validGasUrl,
          albumUrl: legacy?.albumUrl || DEFAULT_SETTINGS.albumUrl,
        };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Media items state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploadedDriveUrl, setUploadedDriveUrl] = useState<string | null>(null);

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [copiedAlbumUrl, setCopiedAlbumUrl] = useState(false);

  // Quick 1-Tap Google Photos share state
  const [isSharingPhotos, setIsSharingPhotos] = useState(false);
  const [photosShareToast, setPhotosShareToast] = useState<string | null>(null);

  // Fullscreen state & detection
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFullscreen = !!(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setIsFullscreen(isDocFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    handleFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const isCurrentFullscreen = !!(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );

      if (!isCurrentFullscreen) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (document.documentElement as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  // Save settings to localStorage
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  // Add files to media list
  const handleAddFiles = (fileList: FileList | File[]) => {
    const newItems: MediaItem[] = [];
    const filesArray = Array.from(fileList);

    filesArray.forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const previewUrl = URL.createObjectURL(file);

      newItems.push({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        type: isVideo ? 'video' : 'image',
        previewUrl,
        description: '',
        sizeBytes: file.size,
        fileName: file.name,
        createdAt: Date.now(),
      });
    });

    setMediaItems((prev) => [...prev, ...newItems]);
  };

  // Update per-item description
  const handleUpdateDescription = (id: string, description: string) => {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item))
    );
  };

  // Remove individual item
  const handleRemoveItem = (id: string) => {
    setMediaItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // Reorder items
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setMediaItems((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= mediaItems.length - 1) return;
    setMediaItems((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Clear all media
  const handleClearAll = () => {
    if (window.confirm('すべての写真・動画をクリアしますか？')) {
      mediaItems.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setMediaItems([]);
    }
  };

  // Open Google Photos Shared Album
  const handleOpenGooglePhotosAlbum = () => {
    window.open(settings.albumUrl, '_blank', 'noopener,noreferrer');
  };

  // 1-Tap Google Photos Share: DOES NOT open the album web page!
  const handleQuickGooglePhotosShare = async () => {
    if (mediaItems.length === 0) return;
    setIsSharingPhotos(true);
    setPhotosShareToast('写真に説明・日時を刻印中...');

    try {
      const { files, summaryText } = await prepareMediaForUpload(mediaItems, {
        burnCaption: true,
        senderName: settings.senderName,
      });

      // Automatically copy album link and description summary to clipboard
      try {
        await navigator.clipboard.writeText(`${settings.albumUrl}\n\n${summaryText}`);
      } catch {
        // ignore
      }

      // Check if native file sharing is supported (Pixel 6a / Android Chrome)
      if (
        typeof navigator !== 'undefined' &&
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files })
      ) {
        setPhotosShareToast('共有メニューを開いています...');
        await navigator.share({
          files,
          title: 'Googleフォト共有アルバムへ保存',
          text: `【Googleフォト共有アルバム】\n${settings.albumUrl}\n\n${summaryText}`,
        });
        setPhotosShareToast('✅ Googleフォト共有を呼び出しました（アルバムURLコピー済）');
        setTimeout(() => setPhotosShareToast(null), 4000);
      } else {
        // Fallback for PC browser: download stamped files directly without opening album
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
        setPhotosShareToast('✅ 説明付き写真を端末に保存しました（アルバムは開かず保存完了）');
        setTimeout(() => setPhotosShareToast(null), 4000);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User closed share sheet - clean dismiss, do NOT open album!
        setPhotosShareToast(null);
      } else {
        console.error('Google Photos share error:', err);
        setPhotosShareToast('共有処理中にエラーが発生しました');
        setTimeout(() => setPhotosShareToast(null), 3000);
      }
    } finally {
      setIsSharingPhotos(false);
    }
  };

  const photoCount = mediaItems.filter((m) => m.type === 'image').length;
  const videoCount = mediaItems.filter((m) => m.type === 'video').length;
  const shouldAttachDirectly = photoCount > 0 && photoCount <= 3 && videoCount === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-sky-500 selection:text-white pb-24">
      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Top Navigation Header (Ultra-slim for Pixel 6a) */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-2.5 py-1.5 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {/* Logo & App Title + Version badge */}
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-sky-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <h1 className="text-sm font-black tracking-tight text-white">
                  現場報告カメラ
                </h1>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 border border-slate-700/80">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                写真・動画キャプション付き報告PWA
              </p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1">
            <PWAInstallButton />

            {/* Icon-only Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 transition active:scale-95 cursor-pointer"
              title={isFullscreen ? '全画面解除' : '全画面表示'}
              aria-label={isFullscreen ? '全画面解除' : '全画面表示'}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-sky-400" />
              ) : (
                <Maximize className="w-4 h-4 text-slate-300" />
              )}
            </button>

            {/* Settings Modal Toggle */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 transition active:scale-95 cursor-pointer"
              title="設定（共有アルバムURL・宛先）"
              aria-label="設定"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-2.5 py-2 space-y-2.5">
        {/* Media Uploader (Compact single-row 3-button touch layout) */}
        <MediaUploader onAddFiles={handleAddFiles} mediaCount={mediaItems.length} />

        {/* Media Item List Section */}
        {mediaItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800/90 bg-slate-900/30 p-5 text-center text-slate-400 space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto text-slate-500">
              <Camera className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-300">
              写真または動画を追加してください
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              撮影または選択したメディアに説明文を付けると、写真下部に自動で刻印されGoogleフォトへ直接共有できます。
            </p>
          </div>
        ) : (
          <section className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <span>登録メディア ({mediaItems.length}件)</span>
                <span className="text-[10px] font-normal text-slate-400">
                  (写真{photoCount} / 動画{videoCount})
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 active:scale-95 transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>全削除</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {mediaItems.map((item, index) => (
                <MediaItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  total={mediaItems.length}
                  onUpdateDescription={handleUpdateDescription}
                  onRemove={handleRemoveItem}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Floating Toast Notification for Google Photos Share */}
      {photosShareToast && (
        <div className="fixed bottom-14 inset-x-2 z-40 max-w-md mx-auto p-2.5 rounded-xl bg-slate-900/95 border border-sky-500/60 shadow-2xl text-xs text-sky-200 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isSharingPhotos ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-semibold truncate">{photosShareToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setPhotosShareToast(null)}
            className="text-slate-400 hover:text-white p-1 shrink-0 ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sticky Bottom Bar (Optimized for Pixel 6a thumb operation) */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2.5 py-1.5 shadow-2xl pb-safe">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-1.5">
          {/* Quick status summary */}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white flex items-center gap-1 truncate">
              {mediaItems.length === 0 ? (
                <span className="text-slate-400 text-[11px]">写真・動画を追加してください</span>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                  <span className="truncate">{mediaItems.length}件 選択中</span>
                  <span className="text-[10px] text-slate-400 font-normal shrink-0">
                    ({shouldAttachDirectly ? '画像添付' : 'アルバムURL'})
                  </span>
                </>
              )}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              宛先: {settings.toEmail}
            </div>
          </div>

          {/* Action Buttons: Standalone Cloud Upload & Direct Email */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* BUTTON 1: Standalone Cloud Upload / Google Photos Share */}
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              disabled={mediaItems.length === 0}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-sky-500/40 disabled:opacity-30 disabled:cursor-not-allowed text-sky-400 font-bold text-xs active:scale-95 transition cursor-pointer shadow-sm"
              title="クラウド（Googleドライブ直接保存・Googleフォト共有）"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>クラウド共有</span>
            </button>

            {/* BUTTON 2: Direct Email Send Modal */}
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              disabled={mediaItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/30 active:scale-95 transition cursor-pointer"
              title="報告メールを作成・直接送信"
            >
              <Send className="w-3.5 h-3.5" />
              <span>直接メールを送信</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showEmailModal && (
        <EmailPreviewModal
          mediaItems={mediaItems}
          settings={settings}
          onClose={() => setShowEmailModal(false)}
          onOpenAlbum={handleOpenGooglePhotosAlbum}
          uploadedDriveUrl={uploadedDriveUrl}
        />
      )}

      {showUploadModal && (
        <UploadModal
          mediaItems={mediaItems}
          settings={settings}
          onClose={() => setShowUploadModal(false)}
          onOpenAlbum={handleOpenGooglePhotosAlbum}
          onOpenSettings={() => setShowSettingsModal(true)}
          onUploadedDriveFolder={(url) => setUploadedDriveUrl(url)}
        />
      )}
    </div>
  );
}
