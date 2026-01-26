/// <reference types="vite/client" />

interface Window {
    ipcRenderer: import('electron').IpcRenderer
    api: {
        startDownload: (task: any) => void;
        onProgress: (callback: (data: any) => void) => void;
        onComplete: (callback: (data: any) => void) => void;
        onError: (callback: (data: any) => void) => void;
        removeListener: (channel: string) => void;
        selectDirectory: () => Promise<string>;
        pauseDownload: (id: string) => void;
        resumeDownload: (id: string) => void;
        cancelDownload: (id: string) => void;
        onRemoved: (callback: (data: any) => void) => void;
        analyzeUrl: (url: string) => Promise<any>;
    }
}
