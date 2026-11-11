import React, { useState } from 'react';
import {
  X,
  Save,
  RotateCcw,
  Mail,
  Settings,
  Link as LinkIcon,
  User,
  Sparkles,
  ExternalLink,
  Beaker,
  Send,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { AppSettings, DEFAULT_SETTINGS, TEST_SETTINGS, APP_VERSION } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

const SAMPLE_GAS_CODE = `/**
 * PicReport用 Google Apps Script (GAS) メール直接送信スクリプト
 * 
 * 【導入手順 (2分)】
 * 1. https://script.google.com/ を開く
 * 2. 「新しいプロジェクト」を作成
 * 3. 以下のコードを全て上書き貼り付け
 * 4. 右上の「デプロイ」→「新しいデプロイ」をクリック
 * 5. 歯車アイコンで「ウェブアプリ」を選択
 * 6. 次のユーザーとして実行: 「自分」
 *    アクセスできるユーザー: 「全員 (Anyone)」※重要！
 * 7. 「デプロイ」を押して表示されるウェブアプリURLをコピーし、PicReportの設定に貼り付け
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var to = data.to;
    var cc = data.cc || '';
    var subject = data.subject || '現場報告';
    var body = data.body || '';
    var senderName = data.senderName || '現場報告';
    
    // 画像添付の展開処理 (最大3枚)
    var attachments = [];
    if (data.attachments && Array.isArray(data.attachments)) {
      data.attachments.forEach(function(att, idx) {
        if (att.base64) {
          var cleanBase64 = att.base64.replace(/^data:[^;]+;base64,/, '');
          var blob = Utilities.newBlob(
            Utilities.base64Decode(cleanBase64),
            att.mimeType || 'image/jpeg',
            att.fileName || ('photo_' + (idx + 1) + '.jpg')
          );
          attachments.push(blob);
        }
      });
    }

    var options = { name: senderName };
    if (cc) options.cc = cc;
    if (attachments.length > 0) options.attachments = attachments;

    // Gmailから実際に送信
    GmailApp.sendEmail(to, subject, body, options);

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: 'メール送信成功' 
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: 'ok', 
    service: 'PicReport Mailer Service' 
  })).setMimeType(ContentService.MimeType.JSON);
}`;

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [savedNotice, setSavedNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [gasCodeCopied, setGasCodeCopied] = useState(false);
  const [isTestingGas, setIsTestingGas] = useState(false);
  const [gasTestResult, setGasTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGasHelp, setShowGasHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setSavedNotice(true);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleReset = () => {
    if (window.confirm('本番の初期設定（marine_fusaki-resort@...）に戻しますか？')) {
      setForm({ ...DEFAULT_SETTINGS });
      setNoticeMessage('本番の初期値に戻しました');
      setGasTestResult(null);
      setTimeout(() => setNoticeMessage(null), 2500);
    }
  };

  const handleResetToTest = () => {
    setForm({ ...TEST_SETTINGS });
    setNoticeMessage('テスト値（yooooohey@gmail.com）に切り替えました');
    setGasTestResult(null);
    setTimeout(() => setNoticeMessage(null), 2500);
  };

  const handleTestAlbumUrl = () => {
    if (form.albumUrl.trim()) {
      window.open(form.albumUrl.trim(), '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyGasCode = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_GAS_CODE);
      setGasCodeCopied(true);
      setTimeout(() => setGasCodeCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestGasConnection = async () => {
    const url = form.gasMailUrl.trim();
    if (!url) {
      setGasTestResult({
        success: false,
        message: 'GASのウェブアプリURLを入力してください。',
      });
      return;
    }

    if (!url.startsWith('https://script.google.com/macros/s/')) {
      setGasTestResult({
        success: false,
        message: 'URLは「https://script.google.com/macros/s/...」で始まる必要があります。',
      });
      return;
    }

    setIsTestingGas(true);
    setGasTestResult(null);

    const testPayload = {
      to: form.toEmail || 'yooooohey@gmail.com',
      cc: '',
      subject: '【PicReport接続テスト】メール送信確認',
      body: `PicReportからの接続テストメールです。\n送信日時: ${new Date().toLocaleString('ja-JP')}\n\nこのメールが届いていれば、アプリ単体での直接メール送信が正常に稼働しています！`,
      senderName: form.senderName || 'PicReport テスト',
      attachments: [],
    };

    try {
      // Try local proxy if running on fullstack, otherwise direct POST
      let resultSuccess = false;
      let resultMsg = '';

      try {
        const localRes = await fetch('/api/send-mail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...testPayload, gasUrl: url }),
          signal: AbortSignal.timeout(20000),
        });
        if (localRes.ok) {
          const resData = await localRes.json();
          if (resData.success) {
            resultSuccess = true;
            resultMsg = resData.message || '送信成功';
          } else {
            throw new Error(resData.error || 'エラー応答');
          }
        } else {
          throw new Error(`サーバー応答 ${localRes.status}`);
        }
      } catch {
        // Fallback to client-side direct request (e.g. GitHub Pages)
        const gasRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(20000),
        });

        const text = await gasRes.text();
        let jsonRes;
        try {
          jsonRes = JSON.parse(text);
        } catch {
          if (text.includes('success')) {
            jsonRes = { success: true };
          } else {
            throw new Error(`GAS応答の解析失敗: ${text.slice(0, 100)}`);
          }
        }

        if (jsonRes.success) {
          resultSuccess = true;
          resultMsg = jsonRes.message || '送信成功';
        } else {
          throw new Error(jsonRes.error || 'GASエラー');
        }
      }

      if (resultSuccess) {
        setGasTestResult({
          success: true,
          message: `✅ テストメールを「${testPayload.to}」に送信しました！メールボックスをご確認ください。`,
        });
      }
    } catch (err: any) {
      console.error('GAS connection test failed:', err);
      setGasTestResult({
        success: false,
        message: `❌ 接続失敗: ${err?.message || 'ネットワークエラー'}。GASのデプロイで「アクセスできるユーザー: 全員」に設定されているかご確認ください。`,
      });
    } finally {
      setIsTestingGas(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-white">報告・アルバム設定</h2>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 border border-slate-700">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Googleフォト共有アルバム・送信先の指定</p>
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

        {/* Notice Banner */}
        {noticeMessage && (
          <div className="px-4 py-1.5 bg-sky-500/20 text-sky-300 border-b border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{noticeMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
          {/* Section 1: Google Photos Shared Album */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-500/40 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                <LinkIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>共有GoogleフォトアルバムURL</span>
              </label>
              <button
                type="button"
                onClick={handleTestAlbumUrl}
                className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30 transition cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>アルバム確認</span>
              </button>
            </div>
            <input
              type="url"
              value={form.albumUrl}
              onChange={(e) => setForm({ ...form, albumUrl: e.target.value })}
              className="w-full rounded-lg bg-slate-950 border border-sky-500/30 px-2.5 py-2 text-xs text-white focus:outline-none focus:border-sky-400 font-mono shadow-inner"
              placeholder="https://photos.app.goo.gl/..."
              required
            />
            <p className="text-[10px] text-slate-300 leading-tight">
              💡 メイン画面の「Googleフォト共有」ボタンを押すと、<strong>アルバムを開くことなく1タップ</strong>で端末のGoogleフォトへ写真を直接共有できます。
            </p>
          </div>

          {/* Section 2: Direct In-App Mail Transmission (GAS Web App) */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-200">
                <Send className="w-3 h-3 text-sky-400" />
                <span>アプリ単体メール送信用GAS URL</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowGasHelp(!showGasHelp)}
                  className="text-[10px] text-slate-400 hover:text-sky-400 flex items-center gap-0.5"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>解説</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyGasCode}
                  className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-0.5 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 cursor-pointer"
                  title="Google Apps Scriptのコードをコピー"
                >
                  {gasCodeCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">コピー済</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>GASコード</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {showGasHelp && (
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-sky-300">【アプリから直接メール送信する仕組み】</p>
                <p>Google Apps Script(無料)をデプロイしてURLを登録すると、Gmailアプリを開かずに本アプリのボタン1つで画像添付付きメールを送信できます。</p>
                <p className="text-[10px] text-amber-300">※未設定の場合は「Gmailで送信（宛先・CC自動入力）」がご利用いただけます。</p>
              </div>
            )}

            <div className="flex gap-1.5">
              <input
                type="url"
                value={form.gasMailUrl || ''}
                onChange={(e) => {
                  setForm({ ...form, gasMailUrl: e.target.value });
                  setGasTestResult(null);
                }}
                className="flex-1 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                placeholder="https://script.google.com/macros/s/.../exec"
              />
              <button
                type="button"
                onClick={handleTestGasConnection}
                disabled={isTestingGas || !form.gasMailUrl.trim()}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 font-bold text-xs text-white transition cursor-pointer"
              >
                {isTestingGas ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>接続テスト</span>
              </button>
            </div>

            {/* Test result feedback */}
            {gasTestResult && (
              <div
                className={`p-2 rounded-lg text-[11px] leading-tight ${
                  gasTestResult.success
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {gasTestResult.message}
              </div>
            )}
          </div>

          {/* Sender */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 mb-1">
              <User className="w-3 h-3 text-sky-400" />
              差出人名
            </label>
            <input
              type="text"
              value={form.senderName}
              onChange={(e) => setForm({ ...form, senderName: e.target.value })}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="自分"
            />
          </div>

          {/* To Email */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 mb-1">
              <Mail className="w-3 h-3 text-sky-400" />
              送信先メールアドレス (To)
            </label>
            <input
              type="email"
              value={form.toEmail}
              onChange={(e) => setForm({ ...form, toEmail: e.target.value })}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
              placeholder="marine_fusaki-resort@iconia.co.jp"
              required
            />
          </div>

          {/* CC Emails */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 mb-1">
              <Mail className="w-3 h-3 text-sky-400" />
              CCメールアドレス（カンマ区切りで複数指定）
            </label>
            <textarea
              rows={2}
              value={form.ccEmails}
              onChange={(e) => setForm({ ...form, ccEmails: e.target.value })}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
              placeholder="masahiko.saito@...,toshie.matsui@..."
            />
          </div>

          {/* Auto subject behavior */}
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoSubjectFromFirstMedia}
                onChange={(e) => setForm({ ...form, autoSubjectFromFirstMedia: e.target.checked })}
                className="w-3.5 h-3.5 rounded text-sky-500 focus:ring-sky-500 bg-slate-900 border-slate-700"
              />
              <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" />
                表題を「1番目のメディア説明」から自動連動
              </span>
            </label>
          </div>

          {/* Greeting Header */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              本文の定型挨拶文
            </label>
            <textarea
              rows={2}
              value={form.greetingHeader}
              onChange={(e) => setForm({ ...form, greetingHeader: e.target.value })}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="お疲れ様です。以下ご報告になります。画像をご覧ください"
            />
          </div>

          {/* Actions: 初期値に戻す / テスト値に戻す / 設定を保存 */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetToTest}
                className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 py-1.5 px-2 rounded-lg transition cursor-pointer active:scale-95"
                title="宛先をyooooohey@gmail.comに設定"
              >
                <Beaker className="w-3 h-3 text-amber-400" />
                <span>テスト値に戻す</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 py-1.5 px-2 rounded-lg transition cursor-pointer active:scale-95"
                title="本番の初期設定に戻す"
              >
                <RotateCcw className="w-3 h-3" />
                <span>初期値に戻す</span>
              </button>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-bold text-xs sm:text-sm text-white shadow-md shadow-sky-600/30 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savedNotice ? '保存完了！' : '設定を保存'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
