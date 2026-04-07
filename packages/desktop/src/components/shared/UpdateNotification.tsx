import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function UpdateNotification() {
  const [updateState, setUpdateState] = useState<'none' | 'available' | 'downloaded'>('none');
  const [isInstalling, setIsInstalling] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Check if we're in Electron environment
    if (!window.electronAPI) return;

    // Listen for update events from main process
    window.electronAPI.onUpdateAvailable(() => {
      setUpdateState('available');
      setShowNotification(true);
      toast.loading('Update available! Downloading...', { id: 'update-check' });
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateState('downloaded');
      setShowNotification(true);
      toast.dismiss('update-check');
      toast.success('Update ready to install!', { id: 'update-ready' });
    });

    // Check for updates on startup
    window.electronAPI?.checkForUpdates?.();
  }, []);

  const handleInstallUpdate = async () => {
    setIsInstalling(true);
    try {
      await window.electronAPI.installUpdate?.();
    } catch (error) {
      toast.error('Failed to install update');
      setIsInstalling(false);
    }
  };

  const handleCheckUpdates = async () => {
    try {
      const result = await window.electronAPI.checkForUpdates?.();
      if (result?.updateAvailable) {
        setUpdateState('available');
        setShowNotification(true);
      } else {
        toast.success('You are on the latest version!');
      }
    } catch (error) {
      toast.error('Failed to check for updates');
    }
  };

  if (!showNotification || updateState === 'none') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-lg p-4 max-w-sm z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {updateState === 'available' ? (
            <>
              <h3 className="font-bold flex items-center gap-2">
                <Download size={18} />
                New Update Available
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                A new version is being downloaded. You'll be notified when it's ready to install.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-bold flex items-center gap-2">
                <RefreshCw size={18} />
                Update Ready
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                Click install to update to the latest version. The app will restart.
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => {
            setShowNotification(false);
            setUpdateState('none');
          }}
          className="text-blue-100 hover:text-white flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex gap-2 mt-3">
        {updateState === 'available' ? (
          <>
            <button
              onClick={handleCheckUpdates}
              disabled={isInstalling}
              className="flex-1 bg-blue-900/50 hover:bg-blue-900 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Check Status
            </button>
            <button
              onClick={() => setShowNotification(false)}
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              Remind Later
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowNotification(false)}
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleInstallUpdate}
              disabled={isInstalling}
              className="flex-1 bg-blue-900 hover:bg-blue-800 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isInstalling ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Install Now
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
