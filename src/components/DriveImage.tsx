import { useEffect, useState } from 'react';
import { ExternalLink, ImageOff, Loader2 } from 'lucide-react';
import { getProofImage } from '../services/api';

/**
 * Shows a Google Drive image as a plain <img>.
 *
 * Order of attempts:
 *  1. lh3.googleusercontent.com (fast, works when the file is shared publicly)
 *  2. viaServer (admins only): ask Apps Script for the file. The script runs as the folder
 *     owner, so this works even when the browser is signed in to another Google account,
 *     third-party cookies are blocked, or the university domain forbids public sharing.
 *  3. otherwise drive.google.com/thumbnail, then an "open in Drive" fallback.
 */
export default function DriveImage({
  driveId,
  alt,
  className,
  isTh = true,
  viaServer = false
}: {
  driveId: string;
  alt: string;
  className?: string;
  isTh?: boolean;
  viaServer?: boolean;
}) {
  const directSources = [
    `https://lh3.googleusercontent.com/d/${driveId}=w1600`,
    ...(viaServer ? [] : [`https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`])
  ];
  const [index, setIndex] = useState(0);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [serverState, setServerState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    setIndex(0);
    setServerUrl(null);
    setServerState('idle');
    setServerError('');
  }, [driveId]);

  const directFailed = index >= directSources.length;

  useEffect(() => {
    if (!directFailed || !viaServer || serverState !== 'idle') return;
    let cancelled = false;
    setServerState('loading');
    getProofImage(driveId).then(res => {
      if (cancelled) return;
      if (res.success && res.dataUrl) {
        setServerUrl(res.dataUrl);
      } else {
        setServerState('failed');
        setServerError(res.error || '');
      }
    });
    return () => { cancelled = true; };
  }, [directFailed, viaServer, serverState, driveId]);

  const viewUrl = `https://drive.google.com/file/d/${driveId}/view`;

  if (!directFailed) {
    return (
      <img
        key={directSources[index]}
        src={directSources[index]}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setIndex(i => i + 1)}
        className={className}
      />
    );
  }

  if (serverUrl) {
    return <img src={serverUrl} alt={alt} className={className} />;
  }

  if (viaServer && serverState !== 'failed') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-slate-300 py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-xs font-sans">{isTh ? 'กำลังโหลดรูปจากระบบ...' : 'Loading image...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-300 py-10 px-4">
      <ImageOff className="w-10 h-10 text-slate-500" />
      <p className="text-sm font-sans max-w-sm">
        {serverError ||
          (isTh
            ? 'ไม่สามารถแสดงรูปจาก Google Drive ได้ ไฟล์อาจถูกลบหรือถูกจำกัดสิทธิ์การเข้าถึง'
            : 'This image could not be loaded from Google Drive. It may have been deleted or its access restricted.')}
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
