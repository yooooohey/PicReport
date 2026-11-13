import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow larger payload for high-resolution base64 images and PDFs
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Gemini API client
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API endpoint: AI Document OCR & Structure Extraction
  app.post('/api/extract', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/png' } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: '画像またはPDFデータが指定されていません。' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY がサーバー環境に設定されていません。AI StudioのSecretsを確認してください。',
        });
      }

      // Clean base64 header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

      const systemInstruction = `
あなたは日本の資材・工具・建材・ホームセンター向け見積書の解析エキスパートです。
画像データから見積明細の表データを高精度に抽出し、指定のJSON形式で返却してください。

【抽出ルール】
1. company: 見積書を発行した会社名・屋号・店舗名・支店名。
2. date: 見積書の日付 (例: 2026/04/15 などの YYYY/MM/DD 形式)。元号表記(令和○年)の場合は西暦に換算してください。
3. items: 明細行の配列
   - name: 商品名・型番・規格・サイズ・色など。半角カタカナは必ず全角カタカナに正規化し、規格寸法(例: 3.5×25mm、12mm合板 等)を含めて読み取ってください。
   - qty: 数量（数値）。記載がない・不明な場合は 1。
   - unit: 単位（例: 本、個、巻、箱、式、m、枚、袋、束 など）。不明なら空文字または"個"。
   - price: 単価（数値、円単位）。
   - amount: 金額（数値、円単位、小計または各行記載の金額）。
   - note: 備考（定価、値引き率、メーカー名など特記事項があれば記載、無ければ空文字）。

【注意】
- 小計行、総合計行、消費税額行は明細 items に含めず、純粋な商品・資材明細のみを抽出してください。
- 手書き・かすれ・傾きがある場合も文脈から最も確度の高いテキストを復元してください。
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64,
              },
            },
            {
              text: 'この見積書画像から発行会社名、日付、およびすべての明細項目（商品名・数量・単位・単価・金額・備考）を正確に抽出してJSONで返してください。',
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              company: { type: Type.STRING, description: '見積書を発行した会社名・店舗名' },
              date: { type: Type.STRING, description: '見積日付 (YYYY/MM/DD)' },
              items: {
                type: Type.ARRAY,
                description: '見積書の明細リスト',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: '商品名・規格・型番' },
                    qty: { type: Type.NUMBER, description: '数量' },
                    unit: { type: Type.STRING, description: '単位' },
                    price: { type: Type.NUMBER, description: '単価 (円)' },
                    amount: { type: Type.NUMBER, description: '金額 (円)' },
                    note: { type: Type.STRING, description: '備考' },
                  },
                  required: ['name', 'qty', 'unit', 'price', 'amount', 'note'],
                },
              },
            },
            required: ['company', 'date', 'items'],
          },
        },
      });

      const rawJson = response.text?.trim() || '{}';
      let parsedData;
      try {
        parsedData = JSON.parse(rawJson);
      } catch (parseErr) {
        return res.status(502).json({
          error: 'AIからのJSONレスポンスのパースに失敗しました。',
          rawText: rawJson,
        });
      }

      return res.json({
        success: true,
        data: parsedData,
        rawJson: rawJson,
      });
    } catch (err: any) {
      console.error('Gemini Extract Error:', err);
      return res.status(500).json({
        error: err?.message || '見積書のAI解析中にエラーが発生しました。',
      });
    }
  });

  // API endpoint: Direct Email Sending via GAS Web App Proxy
  app.post('/api/send-mail', async (req, res) => {
    try {
      const { to, cc, bcc, subject, body, senderName, senderEmail, attachments, gasUrl } = req.body;
      const targetUrl = typeof gasUrl === 'string' ? gasUrl.trim() : '';

      if (!targetUrl || !targetUrl.startsWith('https://script.google.com/macros/s/')) {
        return res.status(400).json({
          success: false,
          error: '有効なGoogle Apps Script (GAS) のウェブアプリURLが未設定です。設定画面でGAS URLを設定してください。',
        });
      }

      if (!to && req.body.action !== 'upload_to_album') {
        return res.status(400).json({
          success: false,
          error: '宛先メールアドレスが指定されていません。',
        });
      }

      const payload = {
        action: req.body.action || 'send_mail',
        albumUrl: req.body.albumUrl || '',
        googleDriveUrl: req.body.googleDriveUrl || '',
        driveFolderId: req.body.driveFolderId || '',
        mediaItems: req.body.mediaItems || [],
        to: to || '',
        cc: cc || '',
        bcc: bcc || '',
        subject: subject || '現場報告',
        body: body || '',
        senderName: senderName || '',
        senderEmail: senderEmail || '',
        attachments: attachments || [],
      };

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(502).json({
          success: false,
          error: `GASからのHTTP応答エラー (${response.status}): ${errText.slice(0, 200)}`,
        });
      }

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        const isHtmlLogin = text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('accounts.google.com');
        return res.status(502).json({
          success: false,
          error: isHtmlLogin
            ? 'GASがHTML画面（ログイン画面またはエラーページ）を返しました。GASデプロイ設定の「アクセスできるユーザー」が「全員 (Anyone)」になっているか確認してください。'
            : `GASレスポンスの解析に失敗しました: ${text.slice(0, 200)}`,
        });
      }

      return res.json(result);
    } catch (err: any) {
      console.error('Direct Mail Send Error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'メール送信中にエラーが発生しました。',
      });
    }
  });


  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
      model: 'gemini-3.8-flash',
    });
  });

  // Setup Vite dev server or static file serving
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[見積書テキスト化] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
