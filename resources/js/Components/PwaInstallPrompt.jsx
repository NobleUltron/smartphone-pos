import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent automatic browser banner
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed
      const dismissed = localStorage.getItem('smartpos_pwa_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted PWA installation');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('smartpos_pwa_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="bg-gradient-to-r from-cyan-900/90 via-slate-900 to-indigo-900/90 border-b border-cyan-500/30 text-white px-4 py-2.5 flex items-center justify-between shadow-lg text-sm transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 border border-cyan-500/30">
          <Smartphone className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <p className="font-semibold text-white">Install SmartPOS App</p>
          <p className="text-xs text-slate-300 hidden sm:block">
            Add SmartPOS to your smartphone home screen for fast offline POS access.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg shadow-md transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Now</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
