import { create } from 'zustand';

export interface PlaylistMetadata {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    channel: string;
    videoCount: number;
    totalSize?: number;
    createdAt: number;
}

export interface VideoInPlaylist {
    id: string;
    playlistId: string;
    title: string;
    duration: number;
    thumbnail: string;
    index: number;
    selected: boolean;
    status: 'queued' | 'downloading' | 'completed' | 'error' | 'skipped';
    progress?: string;
    downloadTaskId?: string;
    filesize?: number;
    url?: string; // Original URL if available
}

export interface PlaylistDownload {
    id: string;
    metadata: PlaylistMetadata;
    videos: VideoInPlaylist[];
    outputDir: string;
    status: 'pending' | 'downloading' | 'paused' | 'completed' | 'error';
    progress: {
        completed: number;
        total: number;
        percentage: number;
        currentSpeed: string;
        eta: string;
    };
}

interface PlaylistState {
    playlists: PlaylistDownload[];
    activePlaylistId: string | null;

    addPlaylist: (playlist: PlaylistDownload) => void;
    updatePlaylist: (id: string, updates: Partial<PlaylistDownload>) => void;
    updatePlaylistProgress: (id: string, progress: Partial<PlaylistDownload['progress']>) => void;
    toggleVideoSelection: (playlistId: string, videoId: string) => void;
    selectAll: (playlistId: string) => void;
    deselectAll: (playlistId: string) => void;
    updateVideoStatus: (playlistId: string, videoId: string, status: VideoInPlaylist['status'], progress?: string) => void;
    updateVideoByTaskId: (taskId: string, updates: Partial<VideoInPlaylist>) => void;
    removePlaylist: (id: string) => void;
    setActivePlaylist: (id: string | null) => void;
}

export const usePlaylistStore = create<PlaylistState>((set) => ({
    playlists: [],
    activePlaylistId: null,

    addPlaylist: (playlist) => set((state) => ({
        playlists: [...state.playlists, playlist],
    })),

    updatePlaylist: (id, updates) => set((state) => ({
        playlists: state.playlists.map((p) =>
            p.id === id ? { ...p, ...updates } : p
        ),
    })),

    updatePlaylistProgress: (id, progress) => set((state) => ({
        playlists: state.playlists.map((p) =>
            p.id === id ? { ...p, progress: { ...p.progress, ...progress } } : p
        ),
    })),

    toggleVideoSelection: (playlistId, videoId) => set((state) => ({
        playlists: state.playlists.map((p) =>
            p.id === playlistId
                ? {
                    ...p,
                    videos: p.videos.map((v: VideoInPlaylist) =>
                        v.id === videoId ? { ...v, selected: !v.selected } : v
                    ),
                }
                : p
        ),
    })),

    selectAll: (playlistId) => set((state) => ({
        playlists: state.playlists.map((p) =>
            p.id === playlistId
                ? { ...p, videos: p.videos.map((v: VideoInPlaylist) => ({ ...v, selected: true })) }
                : p
        ),
    })),

    deselectAll: (playlistId) => set((state) => ({
        playlists: state.playlists.map((p) =>
            p.id === playlistId
                ? { ...p, videos: p.videos.map((v: VideoInPlaylist) => ({ ...v, selected: false })) }
                : p
        ),
    })),

    updateVideoStatus: (playlistId, videoId, status, progress) => set((state) => ({
        playlists: state.playlists.map((p) =>
            p.id === playlistId
                ? {
                    ...p,
                    videos: p.videos.map((v: VideoInPlaylist) =>
                        v.id === videoId ? { ...v, status, progress } : v
                    ),
                }
                : p
        ),

    })),

    updateVideoByTaskId: (taskId, updates) => set((state) => ({
        playlists: state.playlists.map((p) => {
            const hasVideo = p.videos.some(v => v.downloadTaskId === taskId);
            if (!hasVideo) return p;

            return {
                ...p,
                videos: p.videos.map((v) =>
                    v.downloadTaskId === taskId
                        ? { ...v, ...updates }
                        : v
                ),
            };
        }),
    })),

    removePlaylist: (id) => set((state) => ({
        playlists: state.playlists.filter((p) => p.id !== id),
        activePlaylistId: state.activePlaylistId === id ? null : state.activePlaylistId,
    })),

    setActivePlaylist: (id) => set({ activePlaylistId: id }),
}));
