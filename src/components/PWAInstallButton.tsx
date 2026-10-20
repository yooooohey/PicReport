import React, { useState } from 'react';
import { Download, Share2, X, CheckCircle2, Apple } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone mode, display subtle installed status or null
  if (isInstalled) {
    return (
      <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>PWA インストール済</span>
      </div>
    );
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          type="button"
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md shadow-sky-500/20 active:scale-95 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>ホーム画面に追加</span>
        </button>
      )}

      {isIOS && (
        <button
          onClick={() => setShowIOSGuide(true)}
          type="button"
          className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition"
        >
          <Apple className="w-3.5 h-3.5" />
          <span>iPhone追加方法</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Apple className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">iPhone / iPad ホーム画面に追加</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm text-slate-300">
              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-white font-bold text-xs shrink-0">1</span>
                <div>
                  Safari画面下部の <strong className="text-white">共有ボタン</strong>（四角から上向き矢印 <Share2 className="w-3.5 h-3.5 inline text-sky-400 mx-0.5" />）をタップします。
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-white font-bold text-xs shrink-0">2</span>
                <div>
                  メニューをスクロールし、<strong className="text-white">「ホーム画面に追加」</strong> を選択します。
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-white font-bold text-xs shrink-0">3</span>
                <div>
                  右上の <strong className="text-white">「追加」</strong> をタップすると、ワンタップで起動できるアプリとして使えます。
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-sky-600 hover:bg-sky-500 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              了解しました
            </button>
          </div>
        </div>
      )}
    </>
  );
};
