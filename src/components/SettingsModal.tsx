import React, { useState } from 'react';
import { X, Save, RotateCcw, Mail, Settings, Link as LinkIcon, User, Sparkles } from 'lucide-react';
import { AppSettings, DEFAULT_SETTINGS } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setSavedNotice(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleReset = () => {
    if (window.confirm('初期設定に戻しますか？')) {
      setForm({ ...DEFAULT_SETTINGS });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">報告設定</h2>
              <p className="text-xs text-slate-400">送信先・CC・定型文の初期値</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Sender */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1">
              <User className="w-3.5 h-3.5 text-sky-400" />
              差出人名
            </label>
            <input
              type="text"
              value={form.senderName}
              onChange={(e) => setForm({ ...form, senderName: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="自分"
            />
          </div>

          {/* To Email */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              送信先メールアドレス (To)
            </label>
            <input
              type="email"
              value={form.toEmail}
              onChange={(e) => setForm({ ...form, toEmail: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono text-xs sm:text-sm"
              placeholder="marine_fusaki-resort@iconia.co.jp"
              required
            />
          </div>

          {/* CC Emails */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              CCメールアドレス（カンマ区切りで複数指定可）
            </label>
            <textarea
              rows={3}
              value={form.ccEmails}
              onChange={(e) => setForm({ ...form, ccEmails: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
              placeholder="masahiko.saito@iconia.co.jp,toshie.matsui@iconia.co.jp,..."
            />
          </div>

          {/* Google Photos Shared Album */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1">
              <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
              共有GoogleフォトアルバムURL
            </label>
            <input
              type="url"
              value={form.albumUrl}
              onChange={(e) => setForm({ ...form, albumUrl: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
              placeholder="https://photos.app.goo.gl/KB2YJYFenFbESGwQA"
              required
            />
          </div>

          {/* Auto subject behavior */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoSubjectFromFirstMedia}
                onChange={(e) => setForm({ ...form, autoSubjectFromFirstMedia: e.target.checked })}
                className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-medium text-slate-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                表題を「最初のメディアの説明」から自動連動する
              </span>
            </label>
            <p className="text-[11px] text-slate-400 mt-1 pl-6">
              チェックを外すと手動でいつでも自由に変更できます。
            </p>
          </div>

          {/* Greeting Header */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              本文の冒頭文（定型挨拶）
            </label>
            <textarea
              rows={2}
              value={form.greetingHeader}
              onChange={(e) => setForm({ ...form, greetingHeader: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="お疲れ様です。以下ご報告になります。画像をご覧ください"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 py-2 px-3 rounded-xl hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>初期値に戻す</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 font-semibold text-xs sm:text-sm text-white shadow-lg shadow-sky-600/30 transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{savedNotice ? '保存完了！' : '設定を保存'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
