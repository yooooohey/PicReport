import { MediaItem } from '../types';

export interface ProcessMediaOptions {
  burnCaption: boolean;
  senderName: string;
}

/**
 * Sanitizes a string for use in safe filenames across Android, iOS, Windows, Mac.
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim();
}

/**
 * Embeds a visible, high-contrast, modern caption bar at the bottom of an image
 * so the description and timestamp are permanently preserved when viewed in Google Photos.
 */
export async function stampCaptionOnImage(
  imageFile: File,
  captionText: string,
  indexNumber: number,
  senderName: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(imageFile);
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      const width = img.width;
      const height = img.height;

      // Calculate responsive sizing based on image dimensions
      const minDimension = Math.min(width, height);
      const fontSizeTitle = Math.max(18, Math.round(minDimension * 0.034));
      const fontSizeSub = Math.max(14, Math.round(minDimension * 0.024));
      const padding = Math.max(16, Math.round(minDimension * 0.028));
      const barHeight = fontSizeTitle + fontSizeSub + padding * 2.5;

      // Draw translucent gradient background bar at bottom
      const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
      gradient.addColorStop(0.2, 'rgba(15, 23, 42, 0.75)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, height - barHeight, width, barHeight);

      // Accent pill/indicator
      const pillWidth = Math.max(4, Math.round(minDimension * 0.008));
      ctx.fillStyle = '#0284c7'; // sky-600
      ctx.fillRect(padding, height - barHeight + padding * 0.6, pillWidth, barHeight - padding * 1.2);

      // Title & Description text
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSizeTitle}px sans-serif`;
      ctx.textBaseline = 'top';
      const cleanDesc = captionText.trim() || '（説明なし）';
      const displayTitle = `#${indexNumber}: ${cleanDesc}`;
      
      const textX = padding + pillWidth + padding * 0.6;
      ctx.fillText(displayTitle, textX, height - barHeight + padding * 0.8, width - textX - padding);

      // Subtitle (Timestamp & Sender)
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = `500 ${fontSizeSub}px sans-serif`;
      const dateStr = new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      const displaySub = `撮影・報告日時: ${dateStr}　差出人: ${senderName || '自分'}`;
      ctx.fillText(displaySub, textX, height - barHeight + padding * 0.8 + fontSizeTitle + 6, width - textX - padding);

      // Export canvas to JPEG blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(imageFile);
          }
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(imageFile);
    };

    img.src = url;
  });
}

/**
 * Prepares all media files with descriptions in filenames,
 * optional visual caption stamps, and generates a formatted description text.
 */
export async function prepareMediaForUpload(
  items: MediaItem[],
  options: ProcessMediaOptions
): Promise<{ files: File[]; summaryText: string }> {
  const preparedFiles: File[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const indexNum = i + 1;
    const cleanDesc = sanitizeFileName(item.description || '写真');
    const ext = item.fileName.includes('.')
      ? item.fileName.substring(item.fileName.lastIndexOf('.'))
      : item.type === 'video'
      ? '.mp4'
      : '.jpg';

    const newFileName = `${String(indexNum).padStart(2, '0')}_${cleanDesc}${ext}`;

    if (item.type === 'image' && options.burnCaption) {
      try {
        const stampedBlob = await stampCaptionOnImage(
          item.file,
          item.description,
          indexNum,
          options.senderName
        );
        const stampedFile = new File([stampedBlob], newFileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        preparedFiles.push(stampedFile);
        continue;
      } catch (err) {
        console.warn('Caption stamping failed, using original file with renamed name:', err);
      }
    }

    // Default or video file: rename to include description
    const renamed = new File([item.file], newFileName, {
      type: item.file.type,
      lastModified: Date.now(),
    });
    preparedFiles.push(renamed);
  }

  // Construct summary text
  let summaryText = `【現場報告 メディア一覧】\n`;
  items.forEach((item, idx) => {
    const typeLabel = item.type === 'image' ? '写真' : '動画';
    const desc = item.description.trim() ? item.description.trim() : '（説明なし）';
    summaryText += `${idx + 1}. [${typeLabel}] ${desc} (${item.fileName})\n`;
  });

  return {
    files: preparedFiles,
    summaryText,
  };
}

/**
 * Converts a File or Blob object into a base64 Data URL string for direct email attachments.
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
