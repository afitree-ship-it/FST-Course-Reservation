import React, { useState, useEffect } from 'react';
import { Download, X, Share, Monitor, Smartphone, Check } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export default function PwaInstallPrompt() {
  const { isTh } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // 1. Check if already running as installed standalone app
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
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

    // 3. Listen for native browser install prompt (Chrome/Edge/Android)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. Always show the banner after a gentle delay (unless dismissed in this tab)
    const timer = setTimeout(() => {
      try {
        if (sessionStorage.getItem('pwa_prompt_closed') !== 'true') {
          setShowPrompt(true);
        }
      } catch (err) {
        setShowPrompt(true);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setShowPrompt(false);
        }
        setDeferredPrompt(null);
        return;
      } catch (e) {
        // Fallback to instruction tooltip
      }
    }

    // If native prompt is not available, toggle platform-specific guidance
    setShowInstructions(prev => !prev);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPrompt(false);
    setShowInstructions(false);
    try {
      sessionStorage.setItem('pwa_prompt_closed', 'true');
    } catch (err) {}
  };

  if (!showPrompt) return null;

  return (
    <aside 
      aria-label="PWA Installation Banner"
      className="fixed bottom-[74px] md:bottom-4 left-3 right-3 md:left-auto md:right-4 z-50 max-w-sm md:max-w-xs mx-auto md:mx-0 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
      id="pwa-install-mini-banner"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-mangosteen/20 shadow-[0_12px_32px_-4px_rgba(122,31,43,0.18),0_4px_12px_rgba(0,0,0,0.06)] rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5 ring-1 ring-mangosteen/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img 
              src="/pwa-192.png" 
              alt="FST" 
              className="w-9 h-9 rounded-xl shadow-xs border border-mangosteen/25 object-cover" 
            />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
              ✓
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-850 font-sans leading-tight truncate">
              {isTh ? 'ติดตั้งแอปสำรองที่นั่ง FST' : 'Install FST Reserve App'}
            </h4>
            <p className="text-[10.5px] text-slate-500 font-sans leading-tight truncate mt-0.5">
              {isTh ? 'เปิดใช้งานเต็มจอ ไวเหมือนแอป' : 'Add to home screen for fast access'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-gradient-to-r from-[#7A1F2B] via-[#8E2232] to-[#7A1F2B] hover:brightness-110 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm shadow-mangosteen/30 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
            id="btn-pwa-install"
          >
            {deviceType === 'ios' ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isTh ? 'ติดตั้ง' : 'Install'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title={isTh ? 'ปิดการแจ้งเตือน' : 'Dismiss'}
            id="btn-pwa-dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Guide Tooltip if browser requires manual action */}
      {showInstructions && (
        <div className="mt-2 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl text-xs font-sans shadow-xl border border-white/10 space-y-2 duration-150 animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              {deviceType === 'ios' && <Share className="w-3.5 h-3.5 text-sky-400" />}
              {deviceType === 'android' && <Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
              {deviceType === 'desktop' && <Monitor className="w-3.5 h-3.5 text-purple-400" />}
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
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <p className="flex items-start gap-2">
                <span className="font-bold text-white bg-white/20 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>{isTh ? 'แตะปุ่ม' : 'Tap'} <strong className="text-sky-300">แชร์ (Share)</strong> {isTh ? 'ที่แถบด้านล่างของ Safari' : 'at the bottom of Safari'}</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-white bg-white/20 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>{isTh ? "เลื่อนลงมาแล้วเลือก" : "Scroll and tap"} <strong className="text-white bg-white/25 px-1 py-0.5 rounded">เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</strong></span>
              </p>
            </div>
          )}

          {deviceType === 'android' && (
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <p className="flex items-start gap-2">
                <span className="font-bold text-white bg-white/20 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>{isTh ? 'แตะปุ่มเมนู' : 'Tap'} <strong className="text-emerald-300">จุด 3 จุด (⋮)</strong> {isTh ? 'ที่มุมขวาบนของเบราว์เซอร์' : 'at top-right'}</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-white bg-white/20 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>{isTh ? "เลือก" : "Select"} <strong className="text-white bg-white/25 px-1 py-0.5 rounded">ติดตั้งแอป (Install App)</strong> {isTh ? 'หรือ เพิ่มลงในหน้าจอหลัก' : 'or Add to Home Screen'}</span>
              </p>
            </div>
          )}

          {deviceType === 'desktop' && (
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <p className="flex items-start gap-2">
                <span className="font-bold text-white bg-white/20 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>{isTh ? 'มองหาไอคอน' : 'Look for the'} <strong className="text-purple-300">ติดตั้งแอป (⊕)</strong> {isTh ? 'ที่แถบขวาสุดของช่องใส่ URL เบราว์เซอร์' : 'icon on the right end of the address bar'}</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-white bg-white/20 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>{isTh ? "หรือกดเมนู (⋮) > เลือก 'ติดตั้งสำรองที่นั่ง FST'" : "Or click menu (⋮) > 'Install FST Reserve'"}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
