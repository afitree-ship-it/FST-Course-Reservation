import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export default function PwaInstallPrompt() {
  const { isTh } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    // Check if already in standalone / installed mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if user previously dismissed in this session
    try {
      if (sessionStorage.getItem('pwa_dismissed') === 'true') {
        return;
      }
    } catch (e) {}

    // Check iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);
    if (isIosDevice && isSafari) {
      setIsIos(true);
      // Show small banner after 2.5 seconds
      const timer = setTimeout(() => setShowPrompt(true), 2500);
      return () => clearTimeout(timer);
    }

    // Android / Chrome / Edge native install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosInstructions(prev => !prev);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      sessionStorage.setItem('pwa_dismissed', 'true');
    } catch (e) {}
  };

  if (!showPrompt) return null;

  return (
    <div 
      className="fixed bottom-20 md:bottom-3 left-3 right-3 md:left-auto md:right-4 z-40 max-w-sm md:max-w-xs mx-auto md:mx-0 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
      id="pwa-install-mini-banner"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)] rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5 ring-1 ring-black/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <img 
            src="/pwa-192.png" 
            alt="FST" 
            className="w-8 h-8 rounded-xl shrink-0 shadow-xs border border-mangosteen/20 object-cover" 
          />
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 font-sans leading-tight truncate">
              {isTh ? 'ติดตั้งแอป FST Reserve' : 'Install FST Reserve App'}
            </h4>
            <p className="text-[10.5px] text-slate-500 font-sans leading-tight truncate mt-0.5">
              {isTh ? 'เข้าใช้งานได้รวดเร็วขึ้น' : 'Faster access & full screen'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-2.5 py-1.5 bg-gradient-to-r from-[#7A1F2B] via-[#8E2232] to-[#7A1F2B] hover:brightness-110 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer font-sans"
            id="btn-pwa-install"
          >
            {isIos ? <Share className="w-3 h-3" /> : <Download className="w-3 h-3" />}
            <span>{isTh ? 'ติดตั้ง' : 'Install'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
            title={isTh ? 'ปิด' : 'Dismiss'}
            id="btn-pwa-dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* iOS instruction tooltip if opened */}
      {isIos && showIosInstructions && (
        <div className="mt-1.5 p-2 bg-slate-900/90 backdrop-blur-md text-white rounded-xl text-[11px] font-sans shadow-lg space-y-1 duration-150 animate-in fade-in">
          <p className="flex items-center gap-1.5">
            <span>1.</span>
            <span>{isTh ? 'แตะปุ่ม' : 'Tap'}</span>
            <Share className="w-3.5 h-3.5 inline text-sky-400" />
            <span>{isTh ? '(แชร์) ที่แถบล่างของ Safari' : 'Share in Safari'}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span>2.</span>
            <span>{isTh ? "เลือก 'เพิ่มไปยังหน้าจอโฮม' (Add to Home Screen)" : "Select 'Add to Home Screen'"}</span>
          </p>
        </div>
      )}
    </div>
  );
}
