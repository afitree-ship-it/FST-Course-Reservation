import { useEffect, useRef, useState } from 'react';
import { ExternalLink, AlertCircle, RefreshCw, ImageOff } from 'lucide-react';
import { getProofImage } from '../services/api';

/**
 * Shows a Google Drive image as a plain <img>.
 *
 * Order of attempts:
 *  1. lh3.googleusercontent.com at the requested width (fast; a 400px thumbnail is a few KB
 *     instead of the full 1600px file)
 *  2. viaServer (admins only): ask Apps Script for the file. The script runs as the folder
 *     owner, so this works even when the browser is signed in to another Google account,
 *     third-party cookies are blocked, or the university domain forbids public sharing.
 *  3. otherwise drive.google.com/thumbnail, then an "open in Drive" fallback.
 *
 * `lazy` waits until the image scrolls near the viewport before loading anything, so a long
 * admin list doesn't fire dozens of requests at once. Server results are cached per file for
 * the session, so opening the full view after the thumbnail is instant.
 */
const serverCache = new Map<string, string>();
const serverInflight = new Map<string, Promise<{ success: boolean; dataUrl?: string; error?: string }>>();

function fetchViaServer(driveId: string) {
  const cached = serverCache.get(driveId);
  if (cached) return Promise.resolve({ success: true, dataUrl: cached });
  let p = serverInflight.get(driveId);
  if (!p) {
    p = getProofImage(driveId).then(res => {
      if (res.success && res.dataUrl) serverCache.set(driveId, res.dataUrl);
      serverInflight.delete(driveId);
      return res;
    });
    serverInflight.set(driveId, p);
  }
  return p;
}

export default function DriveImage({
  driveId,
  alt,
  className,
  isTh = true,
  viaServer = false,
  size = 1600,
  lazy = false,
  compact = false
}: {
  driveId: string;
  alt: string;
  className?: string;
  isTh?: boolean;
  viaServer?: boolean;
  /** requested width in px (Drive resizes on its side) */
  size?: number;
  /** load only when scrolled into view */
  lazy?: boolean;
  /** small inline fallback UI (for thumbnails) */
  compact?: boolean;
}) {
  const directSources = [
    `https://lh3.googleusercontent.com/d/${driveId}=w${size}`,
    ...(viaServer ? [] : [`https://drive.google.com/thumbnail?id=${driveId}&sz=w${size}`])
  ];
  const [index, setIndex] = useState(0);
  const [serverUrl, setServerUrl] = useState<string | null>(() => serverCache.get(driveId) || null);
  const [serverState, setServerState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [serverError, setServerError] = useState('');
  const [visible, setVisible] = useState(!lazy);
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIndex(0);
    setServerUrl(serverCache.get(driveId) || null);
    setServerState('idle');
    setServerError('');
  }, [driveId]);

  useEffect(() => {
    if (visible || !holderRef.current) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '300px' });
    io.observe(holderRef.current);
    return () => io.disconnect();
  }, [visible]);

  const directFailed = index >= directSources.length;

  useEffect(() => {
    if (!visible || !directFailed || !viaServer || serverUrl || serverState !== 'idle') return;
    let cancelled = false;
    setServerState('loading');
    fetchViaServer(driveId).then(res => {
      if (cancelled) return;
      if (res.success && res.dataUrl) {
        setServerUrl(res.dataUrl);
      } else {
        setServerState('failed');
        setServerError(res.error || '');
      }
    });
    return () => { cancelled = true; };
  }, [visible, directFailed, viaServer, serverUrl, serverState, driveId]);

  const viewUrl = `https://drive.google.com/file/d/${driveId}/view`;

  if (!visible) {
    return <div ref={holderRef} className={`${className || ''} bg-slate-100 animate-pulse min-h-[96px]`} aria-hidden="true" />;
  }

  if (serverUrl) {
    return <img src={serverUrl} alt={alt} className={className} decoding="async" />;
  }

  if (!directFailed) {
    return (
      <img
        key={directSources[index]}
        src={directSources[index]}
        alt={alt}
        referrerPolicy="no-referrer"
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onError={() => setIndex(i => i + 1)}
        className={className}
      />
    );
  }

  if (viaServer && serverState !== 'failed') {
    return compact ? (
      <div className="flex items-center justify-center bg-slate-100 text-slate-400 min-h-[96px] w-full">
        <RefreshCw className="w-5 h-5 animate-spin" />
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center gap-3 text-slate-300 py-12">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <p className="text-xs font-sans">{isTh ? 'กำลังโหลดรูปจากระบบ...' : 'Loading image...'}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-500 min-h-[96px] w-full text-[11px] font-sans p-2 text-center">
        <ImageOff className="w-5 h-5" />
        <span>{isTh ? 'โหลดรูปไม่ได้' : 'Image unavailable'}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-300 py-10 px-4">
      <AlertCircle className="w-10 h-10 text-slate-500" />
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
