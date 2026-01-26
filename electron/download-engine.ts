import { spawn, ChildProcess } from 'node:child_process';
import { BrowserWindow, ipcMain, dialog, Notification } from 'electron';
import path from 'node:path';
import Store from 'electron-store';
import { createInterface } from 'node:readline';
import fs from 'node:fs';
import { cookieManager } from './services/cookie-manager';
import { logManager } from './services/log-manager';

export interface DownloadTask {
    id: string;
    url: string;
    outputDir: string;
    filename: string;
    type: 'smartplayer' | 'standard';
    status?: 'pending' | 'downloading' | 'converting' | 'completed' | 'error' | 'paused';
    progress?: string;
    createdAt?: number;
    format?: 'video' | 'audio';
    resolution?: string;
    audioQuality?: string;
}

interface StoreSchema {
    downloads: DownloadTask[];
}

const store = new Store<StoreSchema>({
    defaults: {
        downloads: []
    }
});

import { EventEmitter } from 'node:events';

export class DownloadEngine extends EventEmitter {
    private queue: DownloadTask[] = [];
    private activeDownloads: Map<string, ChildProcess> = new Map();
    private maxConcurrent = 3;

    constructor(private win: BrowserWindow) {
        super();
        this.loadFromStore();
        this.setupIPC();
    }

    private setupIPC() {
        // BUG FIX 3: Remove existing handlers before registering to prevent duplicates
        try {
            ipcMain.removeHandler('select-directory');
        } catch (e) {
            // Handler didn't exist, ignore
        }

        ipcMain.handle('select-directory', async () => {
            const result = await dialog.showOpenDialog(this.win, {
                properties: ['openDirectory']
            });
            return result.filePaths[0];
        });

        // Remove old listeners before adding new ones
        ipcMain.removeAllListeners('pause-download');
        ipcMain.removeAllListeners('resume-download');
        ipcMain.removeAllListeners('cancel-download');

        ipcMain.on('pause-download', (_event, id) => this.pauseDownload(id));
        ipcMain.on('resume-download', (_event, id) => this.resumeDownload(id));
        ipcMain.on('cancel-download', (_event, id) => this.cancelDownload(id));
    }

    private loadFromStore() {
        const saved = store.get('downloads') || [];
        // Reset downloading tasks to pending or paused on startup
        this.queue = saved.map(task => {
            if (task.status === 'downloading') {
                return { ...task, status: 'paused' }; // or pending
            }
            return task;
        });

        // Send initial state to renderer
        this.win.webContents.on('did-finish-load', () => {
            this.queue.forEach(task => {
                // We might want to send a bulk update
            });
        });
    }

    private saveToStore() {
        store.set('downloads', this.queue);
    }

    // Public API called from Main
    async addTask(task: DownloadTask) {
        task.status = 'pending';
        task.createdAt = Date.now();
        this.queue.push(task);
        this.saveToStore();
        this.processQueue();
        return task;
    }

    private processQueue() {
        if (this.activeDownloads.size >= this.maxConcurrent) return;

        const nextTask = this.queue.find(t => t.status === 'pending');
        if (nextTask) {
            this.startDownload(nextTask);
        }
    }

    async startDownload(task: DownloadTask) {
        task.status = 'downloading';
        this.win.webContents.send('download-progress', { id: task.id, status: 'downloading', progress: task.progress || '0' });
        this.saveToStore();

        if (task.type === 'smartplayer' || task.url.includes('smartplayer.io') || task.url.includes('.m3u8')) {
            this.downloadWithFFmpeg(task);
        } else {
            this.downloadWithYtDlp(task);
        }

        // Check if we can start more
        this.processQueue();
    }

    private downloadWithFFmpeg(task: DownloadTask) {
        const outputPath = path.join(task.outputDir, `${task.filename}.mp4`);
        const args = [
            '-i', task.url,
            '-c', 'copy',
            '-bsf:a', 'aac_adtstoasc',
            '-y',
            outputPath
        ];

        console.log(`[FFmpeg] Starting: ${task.url}`);
        const proc = spawn('ffmpeg', args);
        this.activeDownloads.set(task.id, proc);

        let duration: number | null = null;

        proc.stderr.on('data', (data) => {
            const str = data.toString();

            if (!duration) {
                const durationMatch = str.match(/Duration: (\d{2}):(\d{2}):(\d{2}).(\d{2})/);
                if (durationMatch) {
                    const hours = parseInt(durationMatch[1]);
                    const minutes = parseInt(durationMatch[2]);
                    const seconds = parseInt(durationMatch[3]);
                    duration = (hours * 3600) + (minutes * 60) + seconds;
                }
            }

            const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2}).(\d{2})/);
            if (timeMatch && duration) {
                const hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const seconds = parseInt(timeMatch[3]);
                const currentTime = (hours * 3600) + (minutes * 60) + seconds;
                const percent = Math.min(100, (currentTime / duration) * 100).toFixed(1);

                this.updateTaskProgress(task.id, percent);
            }
        });

        this.handleProcessExit(task, proc, outputPath);
    }

    private downloadWithYtDlp(task: DownloadTask) {
        const outputPathHeader = path.join(task.outputDir, `${task.filename}.%(ext)s`);
        // Use Centralized Log Manager
        const debugLogPath = logManager.getLogPath(task.id);

        console.log(`[ENGINE] Log path for task ${task.id}: ${debugLogPath}`);

        const args = [
            task.url,
            '-o', outputPathHeader,
            '--newline',
            '--no-playlist',
        ];

        // Intelligent cookie usage
        if (cookieManager.shouldUseCookies(task.url)) {
            const browser = cookieManager.getBrowser();
            args.push('--cookies-from-browser', browser);
            console.log(`[yt-dlp] Using ${browser} cookies (preventive mode)`);
        }

        if (task.format === 'audio') {
            args.push('-x', '--audio-format', 'mp3');
            if (task.audioQuality) {
                args.push('--audio-quality', task.audioQuality); // 0=Best, 2=Good, 5=Standard
            }
        } else {
            // Video: Reverting to H.264 per user request
            // "bestvideo+bestaudio" merge to mp4.
            // Explicitly prefer h264 for compatibility and predictable size
            if (task.resolution) {
                const height = task.resolution.replace('p', '');
                args.push('-S', `res:${height},vcodec:h264,res,acodec:m4a`);
            } else {
                args.push('-S', 'vcodec:h264,res,acodec:m4a');
            }
            args.push('--merge-output-format', 'mp4');
        }

        console.log(`[yt-dlp] Starting: ${task.url}`);

        // Write header to log
        fs.writeFileSync(debugLogPath, `Command: yt-dlp ${args.join(' ')}\n\n`);

        const proc = spawn('yt-dlp', args);
        this.activeDownloads.set(task.id, proc);

        // Standard Error Handler
        proc.stderr.on('data', (data) => {
            const s = data.toString();
            fs.appendFileSync(debugLogPath, `[STDERR] ${s}`); // Log to file
            if (s.includes('frame=') || s.includes('time=')) {
                this.updateTaskProgress(task.id, 'Converting', undefined, undefined, undefined, 'converting');
            }
        });

        // Use Readline for robust line-by-line parsing
        const rl = createInterface({
            input: proc.stdout,
            crlfDelay: Infinity
        });

        console.log(`[DEBUG ${task.id}] Readline interface created`);

        rl.on('line', (line) => {
            console.log(`[DEBUG ${task.id}] RAW LINE:`, line);

            if (!line.trim()) return;
            fs.appendFileSync(debugLogPath, `[STDOUT] ${line}\n`); // Log to file

            // Detect conversion
            if (line.includes('[ffmpeg]') || line.includes('[Merger]')) {
                console.log(`[DEBUG ${task.id}] CONVERSION detected`);
                this.updateTaskProgress(task.id, '100', undefined, 'Processing...', undefined, 'converting');
                return;
            }

            // [download]  23.5% of 10.00MiB at 2.00MiB/s ETA 00:03
            if (line.startsWith('[download]')) {
                console.log(`[DEBUG ${task.id}] DOWNLOAD LINE detected`);
                // Regex 1: Standard yt-dlp
                // 12.3% of 123.45MiB at 12.34MiB/s ETA 00:12
                const percentMatch = line.match(/(\d{1,3}(?:\.\d+)?)%/);
                const progress = percentMatch ? percentMatch[1] : undefined;
                console.log(`[DEBUG ${task.id}] PROGRESS MATCH:`, progress);

                if (progress) {
                    // Try to extract other fields aggressively
                    const sizeMatch = line.match(/of\s+([~]?\d+\.?\d*\w+)/);
                    const speedMatch = line.match(/at\s+(\d+\.?\d*\w+\/s)/);
                    const etaMatch = line.match(/ETA\s+([\d:]+)/);

                    let eta = etaMatch ? etaMatch[1] : undefined;
                    if (line.includes('100%')) eta = '00:00';

                    console.log(`[DEBUG ${task.id}] CALLING updateTaskProgress with:`, {
                        progress,
                        speed: speedMatch ? speedMatch[1] : undefined,
                        eta,
                        size: sizeMatch ? sizeMatch[1] : undefined
                    });

                    this.updateTaskProgress(
                        task.id,
                        progress,
                        speedMatch ? speedMatch[1] : undefined,
                        eta,
                        sizeMatch ? sizeMatch[1] : undefined
                    );
                }
            }
        });

        this.handleProcessExit(task, proc, task.outputDir, () => `Check log file: ${debugLogPath}`);
    }

    private updateTaskProgress(id: string, progress: string, speed?: string, eta?: string, totalSize?: string, status?: 'downloading' | 'converting') {
        const task = this.queue.find(t => t.id === id);
        // console.log(`[DEBUG ${id}] updateTaskProgress called:`, { progress, speed, eta, totalSize, status }); // Reduced log noise

        if (task) {
            task.progress = progress;
            const payload = {
                id,
                progress,
                speed: speed || task.progress,
                eta,
                totalSize,
                status: status || 'downloading'
            };
            console.log(`[DEBUG ${id}] Sending to renderer:`, payload);
            this.win.webContents.send('download-progress', payload);
            this.emit('download-progress', payload); // Internal event
        } else {
            console.log(`[DEBUG ${id}] Task NOT FOUND in queue!`);
        }
    }

    private handleProcessExit(task: DownloadTask, proc: ChildProcess, finalPath: string, getErrorLog?: () => string) {
        proc.on('close', (code) => {
            this.activeDownloads.delete(task.id);

            if (code === 0) {
                task.status = 'completed';
                task.progress = '100';

                // Cleanup: Delete log for successful downloads to keep folders clean
                logManager.deleteLog(task.id);

                this.win.webContents.send('download-complete', { id: task.id, path: finalPath });
                this.emit('download-complete', { id: task.id, path: finalPath }); // Internal event

                new Notification({
                    title: 'Download Completed',
                    body: `${task.filename} has finished downloading.`,
                }).show();
            } else {
                task.status = 'error';
                const errorDetails = getErrorLog ? getErrorLog() : '';
                const shortError = errorDetails.split('\n').slice(-3).join(' ') || `Code ${code}`; // Get last 3 lines

                console.error(`Download failed [${task.id}]:`, errorDetails);

                this.win.webContents.send('download-error', { id: task.id, error: shortError });
                this.emit('download-error', { id: task.id, error: shortError }); // Internal event

                new Notification({
                    title: 'Download Failed',
                    body: `Error downloading ${task.filename}. Check app for details.`,
                }).show();
            }
            this.saveToStore();
            this.processQueue(); // Start next if any
        });

        proc.on('error', (err) => {
            this.activeDownloads.delete(task.id);
            task.status = 'error';
            this.win.webContents.send('download-error', { id: task.id, error: err.message });
            this.saveToStore();
            this.processQueue();
        });
    }

    pauseDownload(id: string) {
        const proc = this.activeDownloads.get(id);
        if (proc) {
            proc.kill(); // Kill the process
            this.activeDownloads.delete(id);
        }

        const task = this.queue.find(t => t.id === id);
        if (task) {
            task.status = 'paused';
            this.win.webContents.send('download-progress', { id, status: 'paused', progress: task.progress });
            this.saveToStore();
        }
        this.processQueue(); // Maybe start another one since a slot opened
    }

    resumeDownload(id: string) {
        const task = this.queue.find(t => t.id === id);
        if (task) {
            task.status = 'pending'; // Queue it up again
            this.win.webContents.send('download-progress', { id, status: 'pending', progress: task.progress });
            this.saveToStore();
            this.processQueue();
        }
    }

    cancelDownload(id: string) {
        const proc = this.activeDownloads.get(id);
        const task = this.queue.find(t => t.id === id);

        if (proc) {
            proc.kill();
            this.activeDownloads.delete(id);

            // Delete partial files when canceling an active download
            if (task && (task.status === 'downloading' || task.status === 'converting')) {
                try {
                    console.log(`[ENGINE] Looking for partial files in: ${task.outputDir}`);
                    console.log(`[ENGINE] Filename pattern: ${task.filename}`);

                    // Read directory and find all files matching the filename
                    const allFiles = fs.readdirSync(task.outputDir);
                    const matchingFiles = allFiles.filter(file =>
                        file.startsWith(task.filename) &&
                        (file.endsWith('.mp4') || file.endsWith('.webm') ||
                            file.endsWith('.mp3') || file.endsWith('.part') ||
                            file.endsWith('.ytdl') || file.endsWith('.temp') ||
                            file.includes('.f') || file.includes('.part-'))  // yt-dlp fragment files
                    );

                    console.log(`[ENGINE] Found ${matchingFiles.length} files to delete:`, matchingFiles);

                    matchingFiles.forEach(file => {
                        const fullPath = path.join(task.outputDir, file);
                        try {
                            fs.unlinkSync(fullPath);
                            console.log(`[ENGINE] ✓ Deleted: ${file}`);
                        } catch (e) {
                            console.error(`[ENGINE] ✗ Failed to delete ${file}:`, e);
                        }
                    });

                    if (matchingFiles.length === 0) {
                        console.log(`[ENGINE] No partial files found to delete`);
                    }
                } catch (e) {
                    console.error(`[ENGINE] Error scanning/deleting partial files:`, e);
                }
            }
        }

        this.queue = this.queue.filter(t => t.id !== id);
        this.saveToStore();
        this.processQueue();
        this.win.webContents.send('download-removed', { id });
    }

    public getInitialState() {
        return this.queue;
    }

    cancelTasksByPrefix(prefix: string) {
        console.log(`[ENGINE] Bulk canceling tasks with prefix: ${prefix}`);
        const tasksToCancel = this.queue.filter(t => t.id.startsWith(prefix));
        tasksToCancel.forEach(t => this.cancelDownload(t.id));
    }
}
