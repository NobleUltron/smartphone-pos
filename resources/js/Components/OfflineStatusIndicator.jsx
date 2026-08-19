import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);

  const checkQueuedSales = () => {
    try {
      const queue = JSON.parse(localStorage.getItem('smartpos_offline_sales') || '[]');
      setQueuedCount(queue.length);
    } catch (e) {
      setQueuedCount(0);
    }
  };

  useEffect(() => {
    checkQueuedSales();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Wi-Fi / Network re-connected! SmartPOS is online.', { id: 'network-status' });
      
      // Trigger sync if offline sales exist
      const queue = JSON.parse(localStorage.getItem('smartpos_offline_sales') || '[]');
      if (queue.length > 0) {
        toast.loading(`Syncing ${queue.length} queued offline sale(s)...`, { id: 'offline-sync' });
        // Dispatch custom sync event
        window.dispatchEvent(new Event('smartpos-sync-offline'));
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Network disconnected. Operating in Offline Mode.', { id: 'network-status', duration: 5000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', checkQueuedSales);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', checkQueuedSales);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <Wifi className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Online</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-400 bg-rose-950/50 border border-rose-500/30 rounded-full animate-bounce">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode</span>
          {queuedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-rose-600 text-white rounded-full font-bold">
              {queuedCount} Queued
            </span>
          )}
        </span>
      )}
    </div>
  );
}
