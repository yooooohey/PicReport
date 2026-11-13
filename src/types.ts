export const APP_VERSION = 'v1.9.4';

export const DEPRECATED_PLACEHOLDER_GAS_URL =
  'https://script.google.com/macros/s/AKfycbzCsx2vu2bIuC8zwIfFZKvLTG-Nyj-ctlinTpDbArYN2yyTyg0h7Fg-d5iyZeJoKE_l/exec';

export const DEFAULT_GOOGLE_DRIVE_URL =
  'https://drive.google.com/drive/folders/1_M61izESd2h2IfB4xHeMNRWbdSK_4XQe?usp=sharing';

export const DEFAULT_GAS_MAIL_URL =
  'https://script.google.com/macros/s/AKfycbyQc_6aUng4eq3X8GfYdjZsLqFCR514VEky3AP2cZ8xNU_dKw3MqX9TNWPco0igpRRBTw/exec';

export interface MediaItem {
  id: string;
  file: File;
  type: 'image' | 'video';
  previewUrl: string;
  description: string;
  sizeBytes: number;
  fileName: string;
  createdAt: number;
}

export interface AppSettings {
  googleDriveUrl: string;
  senderEmail: string;
  senderName: string;
  toEmail: string;
  ccEmails: string;
  bccEmails: string;
  albumUrl: string;
  greetingHeader: string;
  subjectPrefix: string;
  autoSubjectFromFirstMedia: boolean;
  gasMailUrl: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  googleDriveUrl: DEFAULT_GOOGLE_DRIVE_URL,
  senderEmail: '',
  senderName: '',
  toEmail: 'marine_fusaki-resort@iconia.co.jp',
  ccEmails: 'masahiko.saito@iconia.co.jp,toshie.matsui@iconia.co.jp,asako.oyama@iconia.co.jp,akira.smz777@gmail.com,yooooohey@gmail.com',
  bccEmails: '（自分）',
  albumUrl: 'https://photos.app.goo.gl/KB2YJYFenFbESGwQA',
  greetingHeader: `【写真報告】お疲れ様です。\n以下報告になります。画像をご確認ください。\n\n写真のリンク先\n${DEFAULT_GOOGLE_DRIVE_URL}`,
  subjectPrefix: '',
  autoSubjectFromFirstMedia: true,
  gasMailUrl: DEFAULT_GAS_MAIL_URL,
};

export const TEST_SETTINGS: AppSettings = {
  googleDriveUrl: DEFAULT_GOOGLE_DRIVE_URL,
  senderEmail: 'yooooohey@gmail.com',
  senderName: 'ようへい',
  toEmail: 'yooooohey@gmail.com',
  ccEmails: '',
  bccEmails: '',
  albumUrl: 'https://photos.app.goo.gl/KB2YJYFenFbESGwQA',
  greetingHeader: `【テスト】\n写真のリンク先\n${DEFAULT_GOOGLE_DRIVE_URL}`,
  subjectPrefix: '',
  autoSubjectFromFirstMedia: true,
  gasMailUrl: DEFAULT_GAS_MAIL_URL,
};
