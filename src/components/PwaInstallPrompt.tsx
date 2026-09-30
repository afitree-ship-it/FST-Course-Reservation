import React, { useState, useEffect } from 'react';
import { Download, Share, Monitor, Smartphone, X, RefreshCw } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export default function PwaInstallPrompt() {
  const { isTh } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

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
      setTimeout(() => resolve(null), 1200);
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

          {deviceType === 'ios' && (
            <div className="space-y-1.5 text-[10.5px] text-slate-300">
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-white bg-white/20 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px]">1</span>
                <span>{isTh ? 'แตะปุ่ม' : 'Tap'} <strong className="text-sky-300">แชร์ (Share)</strong> {isTh ? 'ที่แถบด้านล่างของ Safari' : 'at bottom of Safari'}</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-white bg-white/20 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px]">2</span>
                <span>{isTh ? "เลื่อนลงแล้วเลือก" : "Scroll and tap"} <strong className="text-white bg-white/25 px-1 py-0.5 rounded">เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</strong></span>
              </p>
            </div>
          )}

          {deviceType === 'android' && (
            <div className="space-y-1.5 text-[10.5px] text-slate-300">
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-white bg-white/20 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px]">1</span>
                <span>{isTh ? 'แตะปุ่มเมนู' : 'Tap'} <strong className="text-emerald-300">จุด 3 จุด (⋮)</strong> {isTh ? 'ที่มุมขวาบนของเบราว์เซอร์' : 'at top-right'}</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-white bg-white/20 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px]">2</span>
                <span>{isTh ? "เลือก" : "Select"} <strong className="text-white bg-white/25 px-1 py-0.5 rounded">ติดตั้งแอป (Install App)</strong> {isTh ? 'หรือ เพิ่มลงในหน้าจอหลัก' : 'or Add to Home Screen'}</span>
              </p>
            </div>
          )}

          {deviceType === 'desktop' && (
            <div className="space-y-1.5 text-[10.5px] text-slate-300">
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-white bg-white/20 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px]">1</span>
                <span>{isTh ? 'มองหาไอคอน' : 'Look for the'} <strong className="text-purple-300">ติดตั้งแอป (⊕)</strong> {isTh ? 'ที่แถบขวาสุดของช่องใส่ URL เบราว์เซอร์' : 'icon in address bar'}</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-white bg-white/20 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px]">2</span>
                <span>{isTh ? "หรือกดเมนู (⋮) > เลือก 'ติดตั้งสำรองที่นั่ง FST'" : "Or click menu (⋮) > 'Install FST Reserve'"}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
