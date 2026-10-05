import React, { useState, useEffect } from 'react';
import { Download, Share, Monitor, Smartphone, X, RefreshCw, Copy, Check } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

type Step = { th: string; en: string };
type Guide = { note?: Step; steps: Step[] };

const isInAppBrowser = (ua: string, device: string) =>
  /Line\/|FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|Messenger|TikTok|Snapchat|Twitter|; wv\)/i.test(ua) ||
  (device === 'ios' && !/Safari\//.test(ua));

function getGuide(ua: string, device: 'ios' | 'android' | 'desktop'): Guide {
  const t = (th: string, en: string): Step => ({ th, en });

  if (device === 'ios') {
    const addToHome = t('เลื่อนลงแล้วเลือก "เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)" แล้วกด "เพิ่ม"', 'Scroll and tap "Add to Home Screen", then "Add"');
    if (isInAppBrowser(ua, device)) {
      return {
        note: t('ตอนนี้เปิดอยู่ในเบราว์เซอร์ของแอปอื่น (เช่น Messenger/LINE) ติดตั้งไม่ได้ ให้เปิดใน Safari ก่อน', 'You are in an in-app browser (e.g. Messenger/LINE), which cannot install apps. Open Safari first.'),
        steps: [
          t('แตะเมนู ⋯ หรือไอคอนเข็มทิศ ที่มุมจอ แล้วเลือก "เปิดใน Safari (Open in Safari)"', 'Tap the ⋯ menu or compass icon and choose "Open in Safari"'),
          t('ใน Safari แตะปุ่ม แชร์ (Share)', 'In Safari, tap the Share button'),
          addToHome,
        ],
      };
    }
    if (/CriOS/.test(ua)) {
      return { steps: [t('แตะไอคอน แชร์ (Share) ที่มุมขวาบนข้างช่องที่อยู่เว็บ', 'Tap the Share icon next to the address bar'), addToHome] };
    }
    if (/FxiOS|EdgiOS|OPiOS/.test(ua)) {
      return { steps: [t('แตะเมนู ⋯ แล้วเลือก "แชร์ (Share)"', 'Tap the ⋯ menu, then "Share"'), addToHome] };
    }
    return { steps: [t('แตะปุ่ม แชร์ (Share) ที่แถบด้านล่าง (iPad อยู่ด้านบน) ของ Safari', 'Tap the Share button at the bottom of Safari (top on iPad)'), addToHome] };
  }

  if (device === 'android') {
    if (isInAppBrowser(ua, device)) {
      return {
        note: t('ตอนนี้เปิดอยู่ในเบราว์เซอร์ของแอปอื่น (เช่น Messenger/LINE) ติดตั้งไม่ได้ ให้เปิดใน Chrome ก่อน', 'You are in an in-app browser (e.g. Messenger/LINE), which cannot install apps. Open Chrome first.'),
        steps: [
          t('แตะเมนู ⋮ หรือ ⋯ ที่มุมจอ แล้วเลือก "เปิดในเบราว์เซอร์ (Open in browser/Chrome)"', 'Tap the ⋮ or ⋯ menu and choose "Open in browser/Chrome"'),
          t('กดปุ่ม "ติดตั้ง" อีกครั้งในเบราว์เซอร์ที่เปิดขึ้น', 'Tap "Install" again in the browser that opens'),
        ],
      };
    }
    if (/SamsungBrowser/i.test(ua)) {
      return { steps: [t('แตะเมนู ≡ (เส้น 3 ขีด) ที่มุมขวาล่างของ Samsung Internet', 'Tap the ≡ menu at the bottom-right of Samsung Internet'), t('เลือก "เพิ่มหน้าไปยัง (Add page to)" แล้วเลือก "หน้าจอหลัก (Home screen)"', 'Choose "Add page to", then "Home screen"')] };
    }
    if (/Firefox/i.test(ua)) {
      return { steps: [t('แตะเมนู ⋮ ของ Firefox', 'Tap the ⋮ menu in Firefox'), t('เลือก "ติดตั้ง (Install)" หรือ "เพิ่มไปยังหน้าจอหลัก"', 'Choose "Install" or "Add to Home screen"')] };
    }
    if (/EdgA/.test(ua)) {
      return { steps: [t('แตะเมนู ≡ ที่แถบด้านล่างของ Edge', 'Tap the ≡ menu at the bottom of Edge'), t('เลือก "เพิ่มลงในโทรศัพท์ (Add to phone)"', 'Choose "Add to phone"')] };
    }
    if (/OPR\//.test(ua)) {
      return { steps: [t('แตะเมนู ⋮ ของ Opera', 'Tap the ⋮ menu in Opera'), t('เลือก "หน้าจอหลัก (Home screen)" หรือ "ติดตั้ง"', 'Choose "Home screen" or "Install"')] };
    }
    return { steps: [t('แตะเมนู จุด 3 จุด (⋮) ที่มุมขวาบนของเบราว์เซอร์', 'Tap the ⋮ menu at the top-right of the browser'), t('เลือก "ติดตั้งแอป (Install app)" หรือ "เพิ่มลงในหน้าจอหลัก"', 'Choose "Install app" or "Add to Home screen"')] };
  }

  if (/Firefox/i.test(ua)) {
    return { note: t('Firefox บนคอมพิวเตอร์ไม่รองรับการติดตั้งแอป ให้เปิดด้วย Chrome หรือ Edge', 'Desktop Firefox cannot install web apps. Use Chrome or Edge.'), steps: [] };
  }
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua)) {
    return { steps: [t('ที่เมนูด้านบนเลือก "ไฟล์ (File)"', 'Open the "File" menu'), t('เลือก "เพิ่มไปยัง Dock (Add to Dock)"', 'Choose "Add to Dock"')] };
  }
  return { steps: [t('มองหาไอคอนติดตั้ง (⊕) ที่ขวาสุดของช่องที่อยู่เว็บ', 'Look for the install icon (⊕) at the right of the address bar'), t('หรือกดเมนู (⋮) แล้วเลือก "ติดตั้งสำรองที่นั่ง FST"', 'Or open the ⋮ menu and choose "Install FST Reserve"')] };
}

export default function PwaInstallPrompt() {
  const { isTh } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [copied, setCopied] = useState(false);
  const guide = getGuide(navigator.userAgent, deviceType);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split('#')[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(isTh ? 'คัดลอกลิงก์นี้' : 'Copy this link', window.location.href.split('#')[0]);
    }
  };

  useEffect(() => {
    // 1. Check if already running in standalone mode
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (standalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceType('ios');
    } else if (/android/.test(ua)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // 3. Check early prompt stored on window
    if ((window as any).deferredInstallPrompt) {
      setDeferredPrompt((window as any).deferredInstallPrompt);
    }

    // 4. Event listeners
    const handlePromptAvailable = (e: any) => {
      const p = e.detail || (window as any).deferredInstallPrompt;
      if (p) setDeferredPrompt(p);
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
    };

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // 1. Try immediate native prompt if already captured
    let prompt = deferredPrompt || (window as any).deferredInstallPrompt;

    if (prompt && typeof prompt.prompt === 'function') {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
        (window as any).deferredInstallPrompt = null;
        setShowInstructions(false);
        return;
      } catch (err) {
        console.error('Direct install prompt trigger error:', err);
      }
    }

    // In-app browsers (LINE, Facebook, Instagram...) never fire beforeinstallprompt.
    // On Android, hand the page over to Chrome, where the native install dialog works.
    const inApp = isInAppBrowser(navigator.userAgent, deviceType);
    if (inApp && deviceType === 'android') {
      // Show the manual guide too, in case the app blocks the intent link.
      setShowInstructions(true);
      const { host, pathname, search } = window.location;
      window.location.href = `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }
    if (inApp && deviceType === 'ios') {
      setShowInstructions(true);
      return;
    }

    // 2. If prompt hasn't arrived yet, wait briefly for browser event
    setIsInstalling(true);
    const readyPrompt = await new Promise<any>((resolve) => {
      const handler = (e: any) => {
        window.removeEventListener('pwa-prompt-available', handler);
        window.removeEventListener('beforeinstallprompt', handler);
        resolve(e.detail || (window as any).deferredInstallPrompt || e);
      };
      window.addEventListener('pwa-prompt-available', handler, { once: true });
      window.addEventListener('beforeinstallprompt', handler, { once: true });
      setTimeout(() => resolve(null), 2500);
    });
    setIsInstalling(false);

    if (readyPrompt && typeof readyPrompt.prompt === 'function') {
      try {
        await readyPrompt.prompt();
        const choice = await readyPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
        (window as any).deferredInstallPrompt = null;
        setShowInstructions(false);
        return;
      } catch (e) {}
    }

    // 3. iOS Safari Native Share Sheet
    if (deviceType === 'ios' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'สำรองที่นั่ง FST',
          text: 'ระบบยื่นคำร้องขอสำรองที่นั่งรายวิชา คณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยฟาฏอนี',
          url: window.location.href,
        });
        return;
      } catch (err) {
        // user dismissed share sheet
      }
    }

    // 4. Fallback instruction only if native prompt is not available
    setShowInstructions(true);
  };

  if (isStandalone) return null;

  return (
    <div 
      className="inline-flex flex-col items-center justify-center max-w-sm mx-auto text-left pt-1"
      id="pwa-install-footer-box"
    >
      <div className="bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 shadow-2xs rounded-xl py-1.5 px-2.5 flex items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-2">
          <img 
            src="/pwa-192.png" 
            alt="FST" 
            className="w-6 h-6 rounded-md shadow-3xs border border-mangosteen/20 object-cover shrink-0" 
          />
          <div className="text-left">
            <span className="text-xs font-bold text-slate-700 font-sans leading-none block">
              {isTh ? 'ติดตั้งแอปสำรองที่นั่ง FST' : 'Install FST Reserve App'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans leading-none block mt-0.5">
              {isTh ? 'เปิดใช้งานเต็มจอ สะดวก รวดเร็ว' : 'Fast standalone experience'}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={isInstalling}
          onClick={handleInstallClick}
          className="px-2.5 py-1 bg-gradient-to-r from-[#7A1F2B] via-[#8E2232] to-[#7A1F2B] hover:brightness-110 active:scale-95 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer font-sans shrink-0 disabled:opacity-60"
          id="btn-pwa-install"
        >
          {isInstalling ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : deviceType === 'ios' ? (
            <Share className="w-3 h-3" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          <span>{isInstalling ? (isTh ? 'กำลังเตรียม...' : 'Preparing...') : (isTh ? 'ติดตั้ง' : 'Install')}</span>
        </button>
      </div>

      {/* Guide Tooltip only when browser doesn't support direct prompt */}
      {showInstructions && (
        <div className="mt-2 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-xl text-xs font-sans shadow-xl border border-white/10 space-y-2 text-left w-full max-w-xs duration-150 animate-in fade-in">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-bold text-slate-200">
            <span className="flex items-center gap-1.5 text-[11px]">
              {deviceType === 'ios' && <Share className="w-3 h-3 text-sky-400" />}
              {deviceType === 'android' && <Smartphone className="w-3 h-3 text-emerald-400" />}
              {deviceType === 'desktop' && <Monitor className="w-3 h-3 text-purple-400" />}
              <span>{isTh ? 'วิธีติดตั้งลงเครื่อง:' : 'How to install:'}</span>
            </span>
            <button 
              type="button" 
              onClick={() => setShowInstructions(false)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {guide.note && (
            <p className="text-[10.5px] text-amber-300">{isTh ? guide.note.th : guide.note.en}</p>
          )}

          <div className="space-y-1.5 text-[10.5px] text-slate-300">
            {guide.steps.map((s, i) => (
              <p key={i} className="flex items-start gap-1.5">
                <span className="font-bold text-white bg-white/20 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px]">{i + 1}</span>
                <span>{isTh ? s.th : s.en}</span>
              </p>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[10.5px] font-bold text-white"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? (isTh ? 'คัดลอกลิงก์แล้ว' : 'Link copied') : (isTh ? 'คัดลอกลิงก์เพื่อไปเปิดในเบราว์เซอร์อื่น' : 'Copy link to open in another browser')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
