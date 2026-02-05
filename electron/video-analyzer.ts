import { spawn } from 'node:child_process';
import { cookieManager } from './services/cookie-manager';
import { binaryManager } from './services/binary-manager';

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
        // We DISABLED automatic cookie usage during analysis to avoid macOS Keychain prompts.
        // Analysis will try WITHOUT cookies first.
        const useCookies = false; 

        try {
            return await this.runAnalysis(url, useCookies);
        } catch (error: any) {
            // If it fails with a bot error, we don't retry automatically with cookies.
            // Instead, we let the UI handle the error and ask the user to login if they want.
            throw error;
        }
    }

    private async runAnalysis(url: string, useCookies: boolean): Promise<VideoMetadata> {
        return new Promise((resolve, reject) => {
            console.log(`[Analyzer] Probing: ${url}${useCookies ? ' (with cookies)' : ''}`);

            const args = ['--dump-single-json', '--no-playlist', url];

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
