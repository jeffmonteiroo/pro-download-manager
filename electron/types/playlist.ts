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
