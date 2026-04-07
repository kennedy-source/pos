declare global {
  interface Window {
    electronAPI?: {
      printReceipt: (html: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      showSaveDialog: (options: any) => Promise<any>;
      getVersion: () => Promise<string>;
      toggleFullscreen: () => Promise<void>;
      checkForUpdates: () => Promise<{ updateAvailable: boolean; currentVersion: string; newVersion?: string }>;
      installUpdate: () => Promise<void>;
      onUpdateAvailable: (callback: () => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      isElectron?: boolean;
    };
  }
}

export {};
