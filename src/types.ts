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
  senderName: string;
  toEmail: string;
  ccEmails: string;
  albumUrl: string;
  greetingHeader: string;
  subjectPrefix: string;
  autoSubjectFromFirstMedia: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  senderName: '自分',
  toEmail: 'marine_fusaki-resort@iconia.co.jp',
  ccEmails: 'masahiko.saito@iconia.co.jp,toshie.matsui@iconia.co.jp,asako.oyama@iconia.co.jp,akira.smz777@gmail.com,yooooohey@gmail.com',
  albumUrl: 'https://photos.app.goo.gl/KB2YJYFenFbESGwQA',
  greetingHeader: 'お疲れ様です。以下ご報告になります。画像をご覧ください',
  subjectPrefix: '',
  autoSubjectFromFirstMedia: true,
};
