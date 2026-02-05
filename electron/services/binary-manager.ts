import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class BinaryManager {
    private isWindows = process.platform === 'win32';

    /**
     * Get the path to a binary (yt-dlp or ffmpeg)
     */
    getBinaryPath(name: string): string {
        const binaryName = this.isWindows ? `${name}.exe` : name;

        // 1. Check if bundled in the app (production)
        const bundledPath = this.getBundledPath(binaryName);
        if (bundledPath && fs.existsSync(bundledPath)) {
            // Ensure execute permission on Linux/macOS
            if (process.platform !== 'win32') {
                try {
                    fs.chmodSync(bundledPath, 0o755);
                } catch (e) {
                    console.warn(`[BinaryManager] Failed to set permissions for ${bundledPath}`);
                }
            }
            return bundledPath;
        }

        // 2. Check if in system PATH
        try {
            const command = this.isWindows ? 'where' : 'which';
            const result = execSync(`${command} ${name}`, { encoding: 'utf8' }).trim().split('\n')[0];
            if (result && fs.existsSync(result)) {
                return result;
            }
        } catch (e) {
            // Not in PATH
        }

        // 3. Fallback to just the name and hope for the best
        return name;
    }

    /**
     * Get the path where the binary should be bundled
     */
    private getBundledPath(binaryName: string): string {
        if (app.isPackaged) {
            // In production, binaries should be in the 'bin' folder relative to the app resources
            return path.join(process.resourcesPath, 'bin', binaryName);
        } else {
            // In development, look for a local 'bin' folder in the project root or parent root
            const pathsToTry = [
                path.join(process.cwd(), 'bin', binaryName),
                path.join(process.cwd(), '..', 'bin', binaryName),
                path.join(__dirname, '..', '..', 'bin', binaryName) // Relative to this file (electron/services/binary-manager.ts -> pro-download-manager/bin -> pro-download-manager/../bin)
            ];

            for (const p of pathsToTry) {
                if (fs.existsSync(p)) {
                    return p;
                }
            }
            
            return path.join(process.cwd(), 'bin', binaryName); // Default fallback
        }
    }

    /**
     * Check if necessary binaries are available
     */
    async validateBinaries(): Promise<{ ytDlp: boolean; ffmpeg: boolean }> {
        const ytDlpPath = this.getBinaryPath('yt-dlp');
        const ffmpegPath = this.getBinaryPath('ffmpeg');

        const ytDlpExists = ytDlpPath !== 'yt-dlp' || this.checkInPath('yt-dlp');
        const ffmpegExists = ffmpegPath !== 'ffmpeg' || this.checkInPath('ffmpeg');

        return {
            ytDlp: ytDlpExists,
            ffmpeg: ffmpegExists
        };
    }

    private checkInPath(name: string): boolean {
        try {
            const command = this.isWindows ? 'where' : 'which';
            execSync(`${command} ${name}`, { stdio: 'ignore' });
            return true;
        } catch (e) {
            return false;
        }
    }
}

export const binaryManager = new BinaryManager();
