import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export class LogManager {
    private MAX_AGE_NORMAL_MS = 24 * 60 * 60 * 1000; // 24 hours
    private MAX_AGE_ERROR_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    constructor() {
        this.ensureLogDirectory();
    }

    /**
     * Get the base directory for logs
     */
    getLogDirectory(): string {
        // Use app.getPath('userData')/logs in production
        // Use project_root/logs in development
        if (app.isPackaged) {
            return path.join(app.getPath('userData'), 'logs');
        } else {
            return path.join(process.cwd(), 'logs');
        }
    }

    /**
     * Ensure the log directory exists
     */
    ensureLogDirectory(): void {
        const logDir = this.getLogDirectory();
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
            console.log(`[LogManager] Created log directory: ${logDir}`);
        }
    }

    /**
     * Get the full path for a new log file
     */
    getLogPath(taskId: string): string {
        const logDir = this.getLogDirectory();
        const safeId = taskId.replace(/[^a-zA-Z0-9-_]/g, '_'); // Sanitize ID
        return path.join(logDir, `download_${safeId}.log`);
    }
    /**
     * Delete a specific log file
     */
    deleteLog(taskId: string): void {
        const logPath = this.getLogPath(taskId);
        if (fs.existsSync(logPath)) {
            try {
                fs.unlinkSync(logPath);
                console.log(`[LogManager] Deleted log for successful task: ${taskId}`);
            } catch (e) {
                console.error(`[LogManager] Failed to delete log ${logPath}:`, e);
            }
        }
    }

    /**
     * Delete logs older than MAX_AGE_MS
     */
    cleanOldLogs(): void {
        const logDir = this.getLogDirectory();
        if (!fs.existsSync(logDir)) return;

        console.log('[LogManager] Checking for old logs to clean...');
        let deletedCount = 0;

        try {
            const files = fs.readdirSync(logDir);
            const now = Date.now();

            files.forEach(file => {
                // Determine pattern: debug_*.log or download_*.log
                if (!file.endsWith('.log')) return;

                const filePath = path.join(logDir, file);
                try {
                    const stats = fs.statSync(filePath);
                    const age = now - stats.mtimeMs;

                    // Read a bit of the file to see if it contains ERROR
                    const content = fs.readFileSync(filePath, 'utf8').substring(0, 1000); // Check first 1KB
                    const hasError = content.includes('ERROR') || content.includes('failed');

                    const maxAge = hasError ? this.MAX_AGE_ERROR_MS : this.MAX_AGE_NORMAL_MS;

                    if (age > maxAge) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        console.log(`[LogManager] Deleted old ${hasError ? 'error ' : ''}log: ${file}`);
                    }
                } catch (e) {
                    console.error(`[LogManager] Error checking file ${file}:`, e);
                }
            });

            console.log(`[LogManager] Cleanup complete. Deleted ${deletedCount} files.`);
        } catch (e) {
            console.error('[LogManager] Failed to clean logs:', e);
        }
    }
}

// Singleton export
export const logManager = new LogManager();
