import { useEffect, useState } from 'react';
import { ExternalLink, ImageOff } from 'lucide-react';

/**
 * Shows a Google Drive image as a plain <img>.
 *
 * The old preview used an <iframe src="drive.google.com/file/d/ID/preview">, which often shows
 * "ขออภัย ไฟล์ที่คุณร้องขอไม่มีอยู่" (file does not exist) even though the file is fine:
 * browsers that block third-party cookies, or users signed in to several Google accounts,
 * make the embedded Drive viewer use the wrong account. Image endpoints don't have that problem,
 * and we try two of them before falling back to an "open in Drive" button.
 */
export default function DriveImage({
  driveId,
  alt,
  className,
  isTh = true
}: {
  driveId: string;
  alt: string;
  className?: string;
  isTh?: boolean;
}) {
  const sources = [
    `https://lh3.googleusercontent.com/d/${driveId}=w1600`,
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [driveId]);

  const viewUrl = `https://drive.google.com/file/d/${driveId}/view`;

  if (index >= sources.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-300 py-10 px-4">
        <ImageOff className="w-10 h-10 text-slate-500" />
        <p className="text-sm font-sans max-w-sm">
          {isTh
            ? 'ไม่สามารถแสดงรูปจาก Google Drive ได้ ไฟล์อาจถูกลบหรือถูกจำกัดสิทธิ์การเข้าถึง'
            : 'This image could not be loaded from Google Drive. It may have been deleted or its access restricted.'}
        </p>
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 font-sans"
        >
          <ExternalLink className="w-4 h-4" />
          {isTh ? 'ลองเปิดใน Google Drive' : 'Try opening in Google Drive'}
        </a>
      </div>
    );
  }

  return (
    <img
      key={sources[index]}
      src={sources[index]}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setIndex(i => i + 1)}
      className={className}
    />
  );
}
