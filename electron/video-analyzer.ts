import { spawn } from 'node:child_process';
import { cookieManager } from './services/cookie-manager';

export interface VideoMetadata {
    title: string;
    thumbnail: string;
    duration: number;
    formats: {
        resolution: string;
        ext: string;
        filesize: number;
        vcodec: string;
        url: string;
    }[];
}

export class VideoAnalyzerService {
    async analyze(url: string): Promise<VideoMetadata> {
        // Check if we should use cookies based on cache
        const useCookies = cookieManager.shouldUseCookies(url);

        try {
            return await this.runAnalysis(url, useCookies);
        } catch (error: any) {
            // Fallback: If bot error and wasn't using cookies, retry with cookies
            if (cookieManager.isBotError(error) && !useCookies) {
                cookieManager.recordBlock();
                console.log('[Analyzer] Bot detected, retrying with cookies...');
                return await this.runAnalysis(url, true);
            }
            throw error;
        }
    }

    private async runAnalysis(url: string, useCookies: boolean): Promise<VideoMetadata> {
        return new Promise((resolve, reject) => {
            console.log(`[Analyzer] Probing: ${url}${useCookies ? ' (with cookies)' : ''}`);

            const args = ['--dump-single-json', '--no-playlist', url];

            if (useCookies) {
                const browser = cookieManager.getBrowser();
                args.push('--cookies-from-browser', browser);
            }

            const proc = spawn('yt-dlp', args);
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
                    console.error(`[Analyzer] Error: ${stderr}`);
                    return reject(new Error(`Analyzer failed: ${stderr}`));
                }

                try {
                    const data = JSON.parse(stdout);

                    // Normalize formats
                    const formats = (data.formats || []).map((f: any) => ({
                        resolution: f.height ? `${f.height}p` : 'audio',
                        ext: f.ext,
                        filesize: f.filesize || 0,
                        vcodec: f.vcodec || 'none',
                        url: f.url
                    })).filter((f: any) => f.url);

                    const metadata: VideoMetadata = {
                        title: data.title || 'Unknown Video',
                        thumbnail: data.thumbnail || '',
                        duration: data.duration || 0,
                        formats
                    };

                    resolve(metadata);
                } catch (e) {
                    reject(new Error('Failed to parse metadata JSON'));
                }
            });
        });
    }
}
