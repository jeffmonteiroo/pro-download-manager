import { spawn } from 'node:child_process';
import { cookieManager } from './services/cookie-manager';
import { binaryManager } from './services/binary-manager';
import { PlaylistMetadata, VideoInPlaylist } from './types/playlist';

export class PlaylistAnalyzerService {
    /**
     * Detect if URL is a playlist
     */
    isPlaylistUrl(url: string): boolean {
        return url.includes('list=') ||
            url.includes('/playlist') ||
            url.includes('/sets/') ||
            (url.includes('soundcloud.com/') && !url.includes('/s-')); // Basic SoundCloud detection
    }

    /**
     * Analyze playlist and return metadata with all videos
     */
    async analyzePlaylist(url: string): Promise<PlaylistMetadata> {
        // We DISABLED automatic cookie usage during analysis to avoid macOS Keychain prompts.
        const useCookies = false;

        return new Promise((resolve, reject) => {
            console.log(`[PlaylistAnalyzer] Analyzing: ${url}${useCookies ? ' (with cookies)' : ''}`);

            const args = [
                url,
                '--flat-playlist',      // Don't download, just list
                '--dump-json',
                '--yes-playlist',       // Enable playlist processing
            ];

            // Add Scaleup specific headers if needed
            if (url.includes('scaleup.com.br')) {
                args.push('--referer', 'https://stream.scaleup.com.br/');
                args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                args.push('--add-header', 'Origin:https://stream.scaleup.com.br');
            }

            if (useCookies) {
                const browser = cookieManager.getBrowser();
                args.push('--cookies-from-browser', browser);
            }

            const ytDlpPath = binaryManager.getBinaryPath('yt-dlp');
            const proc = spawn(ytDlpPath, args);
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code !== 0) {
                    console.error(`[PlaylistAnalyzer] Error: ${stderr}`);
                    return reject(new Error(`Playlist analysis failed: ${stderr}`));
                }

                try {
                    // Parse each line as separate JSON
                    const lines = stdout.trim().split('\n').filter(l => l.trim());
                    const videos: any[] = lines.map(line => JSON.parse(line));

                    if (videos.length === 0) {
                        return reject(new Error('No videos found in playlist'));
                    }

                    // Extract playlist info from first video
                    const firstVideo = videos[0];
                    console.log('[PlaylistAnalyzer] First video sample keys:', Object.keys(firstVideo));
                    console.log('[PlaylistAnalyzer] First video duration:', firstVideo.duration, typeof firstVideo.duration);

                    const playlistId = this.extractPlaylistId(url);

                    const videoList: VideoInPlaylist[] = videos.map((v, index) => ({
                        id: v.id || v.url,
                        playlistId: playlistId,
                        title: v.title || 'Unknown Video',
                        // SoundCloud flat playlist might verify duration presence
                        duration: typeof v.duration === 'number' ? v.duration : 0,
                        thumbnail: v.thumbnail || '',
                        index: index + 1,
                        selected: true,  // Default all selected
                        status: 'queued' as const,
                        filesize: v.filesize,
                        url: v.url, // ✅ CRITICAL: Pass the original URL for download
                    }));

                    const metadata: PlaylistMetadata = {
                        id: playlistId,
                        title: firstVideo.playlist_title || firstVideo.playlist || 'Unknown Playlist',
                        url: url,
                        thumbnail: firstVideo.playlist_thumbnail || firstVideo.thumbnail || '',
                        channel: firstVideo.uploader || firstVideo.channel || 'Unknown Channel',
                        videoCount: videos.length,
                        createdAt: Date.now(),
                    };

                    console.log(`[PlaylistAnalyzer] Found ${videos.length} videos in playlist: ${metadata.title}`);

                    // Return metadata with videos embedded
                    resolve({
                        ...metadata,
                        videos: videoList,
                    } as any); // Type assertion needed due to mismatch

                } catch (e: any) {
                    reject(new Error(`Failed to parse playlist data: ${e.message}`));
                }
            });
        });
    }

    /**
     * Extract playlist ID from URL
     */
    private extractPlaylistId(url: string): string {
        try {
            const u = new URL(url);
            // YouTube
            if (u.searchParams.has('list')) {
                return u.searchParams.get('list')!;
            }
            // SoundCloud /sets/ or user profile
            const pathParts = u.pathname.split('/').filter(p => p);
            if (pathParts.length > 0) {
                return pathParts[pathParts.length - 1]; // Use last path segment (slug)
            }
        } catch (e) {
            // Invalid URL
        }
        // Fallback to hash of URL
        return `playlist_${Buffer.from(url).toString('base64').substring(0, 10)}`;
    }
}
