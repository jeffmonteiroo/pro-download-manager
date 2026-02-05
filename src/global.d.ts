export { };

declare global {
    interface Window {
        api: {
            startDownload: (task: any) => void;
            startPlaylistDownload: (playlist: any) => void;
            onProgress: (callback: (data: any) => void) => void;
            onComplete: (callback: (data: any) => void) => void;
            onError: (callback: (data: any) => void) => void;
            onRemoved: (callback: (data: any) => void) => void;
            removeListener: (channel: string) => void;
            selectDirectory: () => Promise<string | null>;
            getDownloadsFolder: () => Promise<string>;
            pauseDownload: (id: string) => void;
            resumeDownload: (id: string) => void;
            cancelDownload: (id: string) => void;
            openFolder: (path: string) => void;
            analyzeUrl: (url: string) => Promise<any>;
      analyzePlaylist: (url: string) => Promise<any>;
      openYouTubeLogin: () => void;
      enableCookies: () => void;
        };
    }
}
