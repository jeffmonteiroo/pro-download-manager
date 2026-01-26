import { create } from 'zustand'

export interface DownloadItem {
    id: string;
    url: string;
    filename: string;
    progress: string; // string '10.5' or 'Processing'
    speed: string;
    status: 'pending' | 'downloading' | 'converting' | 'completed' | 'error' | 'paused';
    error?: string;
    path?: string;
    type: 'smartplayer' | 'standard';
    outputDir?: string;
    eta?: string;
    totalSize?: string;
    format?: 'video' | 'audio';
    resolution?: string;
}

interface DownloadStore {
    downloads: DownloadItem[];
    addDownload: (item: DownloadItem) => void;
    updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
    setDownloads: (downloads: DownloadItem[]) => void;
    removeDownload: (id: string) => void;
}

export const useDownloadStore = create<DownloadStore>((set) => ({
    downloads: [],
    setDownloads: (downloads) => set({ downloads }),
    addDownload: (item) => set((state) => ({ downloads: [item, ...state.downloads] })),
    updateDownload: (id, updates) => set((state) => ({
        downloads: state.downloads.map((d) => (d.id === id ? { ...d, ...updates } : d))
    })),
    removeDownload: (id) => set((state) => ({
        downloads: state.downloads.filter((d) => d.id !== id)
    })),
}))
