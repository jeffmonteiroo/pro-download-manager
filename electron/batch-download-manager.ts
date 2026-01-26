import { DownloadEngine } from './download-engine';
import type { PlaylistDownload, VideoInPlaylist, PlaylistMetadata } from './types/playlist';
import type { DownloadTask } from './download-engine';
import Store from 'electron-store';
import fs from 'node:fs';

interface BatchSettings {
    concurrentDownloads: number;
}

const store = new Store<{ settings: BatchSettings }>({
    defaults: {
        settings: {
            concurrentDownloads: 2,
        },
    },
});

export class BatchDownloadManager {
    private concurrentLimit: number;
    private activeDownloadsCount: number = 0;
    private downloadQueue: Array<{
        video: VideoInPlaylist;
        playlist: PlaylistDownload;
        resolve: () => void;
        reject: (error: Error) => void;
    }> = [];

    constructor(private engine: DownloadEngine) {
        this.concurrentLimit = store.get('settings.concurrentDownloads', 2);
    }

    /**
     * Set concurrent download limit (1-9)
     */
    setConcurrentLimit(limit: number): void {
        if (limit < 1 || limit > 9) {
            throw new Error('Concurrent downloads must be between 1 and 9');
        }
        this.concurrentLimit = limit;
        store.set('settings.concurrentDownloads', limit);
        console.log(`[BatchManager] Concurrent limit set to ${limit}`);
    }

    /**
     * Get current concurrent limit
     */
    getConcurrentLimit(): number {
        return this.concurrentLimit;
    }

    /**
     * Start downloading a playlist
     */
    async startPlaylistDownload(playlist: PlaylistDownload): Promise<void> {
        console.log(`[BatchManager] Starting playlist download: ${playlist.metadata.title}`);
        console.log(`[BatchManager] ${playlist.videos.filter(v => v.selected).length} videos selected`);

        // Ensure output directory exists
        this.ensureDirectory(playlist.outputDir);

        const selectedVideos = playlist.videos.filter(v => v.selected);

        // Queue all videos concurrently (without awaiting each one sequentially)
        // The manager handles concurrency limits internally.
        const queuePromises = selectedVideos.map(video =>
            this.queueVideo(video, playlist)
                .catch(err => {
                    console.error(`[BatchManager] Error processing video ${video.id}:`, err);
                    // Update status is handled by reject -> processQueue logic, 
                    // but we ensure the promise chain doesn't break here.
                })
        );

        // We don't await the result of all downloads here, as that would block the main process response??
        // actually startPlaylistDownload is void properly? No it returns Promise<void>.
        // It's mostly fire-and-forget from the UI perspective (UI relies on events).
        // But let's log when all are *queued* (which is instant)

        console.log(`[BatchManager] All ${selectedVideos.length} videos added to queue for playlist: ${playlist.metadata.title}`);
    }

    /**
     * Queue a single video for download
     */
    private async queueVideo(video: VideoInPlaylist, playlist: PlaylistDownload): Promise<void> {
        return new Promise((resolve, reject) => {
            this.downloadQueue.push({ video, playlist, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Process the download queue
     */
    private async processQueue(): Promise<void> {
        // Check if we can start a new download
        if (this.activeDownloadsCount >= this.concurrentLimit) {
            return; // Wait for a slot
        }

        const item = this.downloadQueue.shift();
        if (!item) {
            return; // Queue empty
        }

        this.activeDownloadsCount++;
        console.log(`[BatchManager] Starting download (${this.activeDownloadsCount}/${this.concurrentLimit}): ${item.video.title}`);

        try {
            await this.downloadVideo(item.video, item.playlist);
            item.resolve();
        } catch (error: any) {
            console.error(`[BatchManager] Download failed:`, error);
            item.reject(error);
        } finally {
            this.activeDownloadsCount--;
            // Process next item
            this.processQueue();
        }
    }

    /**
   * Download a single video from playlist
   */
    private async downloadVideo(video: VideoInPlaylist, playlist: PlaylistDownload): Promise<void> {
        // Create UNIQUE task ID combining playlist and video
        const taskId = `${playlist.id}_${video.id}`;

        console.log(`[BatchManager] Creating task ${taskId} for video: ${video.title}`);
        console.log(`[BatchManager] Format: ${video.format || 'video'}, Resolution: ${video.resolution || '1080p'}`);

        // Create download task
        const taskUrl = video.url ? video.url : `https://www.youtube.com/watch?v=${video.id}`;

        const task: DownloadTask = {
            id: taskId,  // ✅ Unique ID
            url: taskUrl, // Use correct URL (SoundCloud url or YouTube constructed)
            type: 'standard',
            format: (video.format as any) || 'video', // ✅ Get from video
            resolution: video.resolution || '1080p', // ✅ Get from video
            outputDir: playlist.outputDir,
            filename: this.generateVideoFilename(video),
            status: 'pending',
            progress: '0',
        };

        // ✅ CRITICAL: Link task to video BEFORE adding to engine
        video.downloadTaskId = taskId;
        video.status = 'downloading';

        // Add to engine (this will trigger the actual download)
        await this.engine.addTask(task);

        console.log(`[BatchManager] Task ${taskId} added to engine with format=${task.format}, res=${task.resolution}`);

        // Wait for completion by listening to engine events
        return new Promise((resolve, reject) => {
            const onComplete = (data: any) => {
                if (data.id === taskId) {
                    cleanup();
                    resolve();
                }
            };

            const onError = (data: any) => {
                if (data.id === taskId) {
                    cleanup();
                    reject(new Error(data.error));
                }
            };

            const cleanup = () => {
                this.engine.off('download-complete', onComplete);
                this.engine.off('download-error', onError);
            };

            this.engine.on('download-complete', onComplete);
            this.engine.on('download-error', onError);
        });
    }

    /**
     * Generate filename for video in playlist
     */
    private generateVideoFilename(video: VideoInPlaylist): string {
        const index = String(video.index).padStart(2, '0');
        const title = this.sanitizeFilename(video.title);
        return `${index} - ${title}`;
    }

    /**
     * Sanitize filename (remove invalid characters)
     */
    private sanitizeFilename(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, '-').trim();
    }

    /**
     * Ensure directory exists
     */
    private ensureDirectory(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`[BatchManager] Created directory: ${dir}`);
        }
    }

    /**
     * Cancel a playlist download
     */
    cancelPlaylist(playlistId: string): void {
        console.log(`[BatchManager] Cancelling playlist: ${playlistId}`);

        // 1. Clear queued items for this playlist
        const initialQueueLen = this.downloadQueue.length;
        this.downloadQueue = this.downloadQueue.filter(item => item.playlist.id !== playlistId);
        console.log(`[BatchManager] Removed ${initialQueueLen - this.downloadQueue.length} queued items`);

        // 2. Identify active downloads for this playlist
        // We don't track active tasks by playlist ID explicitly in activeDownloadsCount,
        // but we can infer from the engine queue if needed, OR we can rely on the fact that
        // engine.cancelDownload will fail gracefully if ID is not found.
        // BUT we need the task IDs!
        // We can't iterate activeDownloads easily from here without engine support.
        // Workaround: The ENGINE should probably handle bulk cancel, or we reconstruct IDs.
        // Actually, we can regenerate task IDs if we had the video list... but we don't here easily.
        // Wait, 'downloadVideo' sets 'video.downloadTaskId'.
        // If we want to cancel ACTIVE ones, we need to know which ones are active.

        // Better approach for now: We cleared the queue. The renderer knows the video IDs.
        // We will rely on the renderer to send specific cancel requests OR we update the main process to handle this.

        // HOWEVER, cleaner implementation:
        // Iterate through all active downloads in engine and check ID prefix?
        // Task ID is `${playlist.id}_${video.id}`.
        this.engine.cancelTasksByPrefix(`${playlistId}_`);
    }
}
