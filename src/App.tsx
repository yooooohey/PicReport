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
  Image as ImageIcon,
  AlertCircle,
  HelpCircle,
  Send
} from 'lucide-react';

import { MediaItem, AppSettings, DEFAULT_SETTINGS } from './types';
import { MediaUploader } from './components/MediaUploader';
import { MediaItemCard } from './components/MediaItemCard';
import { EmailPreviewModal } from './components/EmailPreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

const SETTINGS_STORAGE_KEY = 'photo_video_report_settings_v1';

export default function App() {
  // Settings loaded from localStorage or default
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Media items state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [copiedAlbumUrl, setCopiedAlbumUrl] = useState(false);

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

      // Auto-suggest initial description from clean file name
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      newItems.push({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        type: isVideo ? 'video' : 'image',
        previewUrl,
        description: mediaItems.length === 0 && newItems.length === 0 ? '' : '',
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

  // Reordering items
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

  // Copy Album Link
  const handleCopyAlbumUrl = async () => {
    try {
      await navigator.clipboard.writeText(settings.albumUrl);
      setCopiedAlbumUrl(true);
      setTimeout(() => setCopiedAlbumUrl(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const photoCount = mediaItems.filter((m) => m.type === 'image').length;
  const videoCount = mediaItems.filter((m) => m.type === 'video').length;
  const shouldAttachDirectly = photoCount > 0 && photoCount <= 3 && videoCount === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-sky-500 selection:text-white pb-28">
      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>報告カメラ</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium hidden sm:inline-block">
                  PWA
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 truncate max-w-[170px] sm:max-w-none">
                写真・動画報告 & Googleフォト連携
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5">
            {/* PWA Install Button */}
            <PWAInstallButton />

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 active:scale-95 transition"
              title="報告メール設定"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-3.5 sm:px-4 py-4 space-y-4">
        {/* Google Photos Shared Album Quick Card */}
        <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 border border-slate-800 p-4 shadow-lg relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  共有Googleフォトアルバム
                </h2>
              </div>
              <p className="text-xs text-slate-300">
                撮影した写真や動画を共有アルバムにアップロードできます。
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenGooglePhotosAlbum}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30 active:scale-95 transition shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>アルバムを開く</span>
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
            <span className="font-mono text-[11px] text-slate-400 truncate max-w-[240px] sm:max-w-[360px]">
              {settings.albumUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyAlbumUrl}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 shrink-0"
            >
              {copiedAlbumUrl ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">URLコピー済</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>URLをコピー</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Media Uploader Section */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-sky-400" />
              <span>写真・動画を追加</span>
            </h3>
            {mediaItems.length > 0 && (
              <span className="text-xs text-slate-400">
                計 <strong className="text-white">{mediaItems.length}</strong> 件 (写真{photoCount} / 動画{videoCount})
              </span>
            )}
          </div>

          <MediaUploader onAddFiles={handleAddFiles} mediaCount={mediaItems.length} />
        </section>

        {/* Media Rule Indicator Banner */}
        {mediaItems.length > 0 && (
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2.5 transition ${
              shouldAttachDirectly
                ? 'bg-sky-950/40 border-sky-500/30 text-sky-300'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {shouldAttachDirectly ? (
                <Paperclip className="w-4 h-4 text-sky-400 shrink-0" />
              ) : (
                <ExternalLink className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div>
                {shouldAttachDirectly ? (
                  <span>
                    <strong>写真3枚以内:</strong> メール送信時に画像を添付します
                  </span>
                ) : (
                  <span>
                    <strong>{videoCount > 0 ? '動画あり / ' : ''}写真4枚以上:</strong>{' '}
                    Googleフォト共有アルバムリンクを本文に表記して報告します
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/60 font-semibold shrink-0">
              {shouldAttachDirectly ? '添付モード' : 'アルバムURLモード'}
            </span>
          </div>
        )}

        {/* Media Items List */}
        {mediaItems.length > 0 && (
          <section className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-300">
                  登録メディア一覧と説明
                </h3>
                <span className="text-[11px] text-slate-400">
                  （#1の説明がメール件名になります）
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-500/10 transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>すべて削除</span>
              </button>
            </div>

            <div className="space-y-2.5">
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

        {/* Quick Instructions & Help Accordion */}
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/60 p-3.5 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>報告の手順ガイド</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
            <li>「写真を撮影」または「一括選択」で報告するメディアを登録。</li>
            <li>各メディアに説明メモを記入（先頭の1番目がメールの表題になります）。</li>
            <li>
              「アルバムを開く」からGoogleフォト共有アルバムへアップロード。
            </li>
            <li>
              下部の「報告メールを作成・送信」をタップし、内容を確認してワンタップ送信。
            </li>
          </ol>
        </div>
      </main>

      {/* Sticky Bottom Bar for Mobile Ergonomics */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-3 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Quick info status */}
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              {mediaItems.length === 0 ? (
                <span className="text-slate-400">写真または動画を追加してください</span>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
                  <span>
                    メディア {mediaItems.length}件 選択中
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({shouldAttachDirectly ? '画像添付' : 'アルバムURL'})
                  </span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              送信先: {settings.toEmail}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Direct shortcut to Google Photos album */}
            <button
              type="button"
              onClick={handleOpenGooglePhotosAlbum}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-sky-400 border border-slate-700 active:scale-95 transition"
              title="Googleフォト共有アルバムを開く"
            >
              <ExternalLink className="w-5 h-5" />
            </button>

            {/* Create & Send Report Button */}
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              disabled={mediaItems.length === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-sky-600/30 active:scale-95 transition"
            >
              <Send className="w-4 h-4" />
              <span>報告メール作成</span>
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
        />
      )}
    </div>
  );
}
