import Store from 'electron-store';

interface CookieStore {
    youtube_last_blocked: number | null;
    cookie_browser: 'chrome' | 'firefox' | 'safari';
}

const store = new Store<CookieStore>({
    defaults: {
        youtube_last_blocked: null,
        cookie_browser: 'chrome'
    }
});

export class CookieManager {
    private BLOCK_MEMORY_DURATION = 60 * 60 * 1000; // 1 hour

    /**
     * Record that YouTube blocked us
     */
    recordBlock(): void {
        const now = Date.now();
        store.set('youtube_last_blocked', now);
        console.log('[CookieManager] YouTube block recorded, will use cookies for next hour');
    }

    /**
     * Check if we should use cookies for this URL
     */
    shouldUseCookies(url: string): boolean {
        // Only for YouTube
        if (!this.isYouTube(url)) {
            return false;
        }

        const lastBlocked = store.get('youtube_last_blocked');
        if (!lastBlocked) {
            return false;
        }

        const elapsed = Date.now() - lastBlocked;
        if (elapsed < this.BLOCK_MEMORY_DURATION) {
            const minutesAgo = Math.floor(elapsed / 60000);
            console.log(`[CookieManager] Using cookies preventively (blocked ${minutesAgo}min ago)`);
            return true;
        }

        // Memory expired, reset
        console.log('[CookieManager] Block memory expired, trying without cookies');
        this.resetMemory();
        return false;
    }

    /**
     * Reset the block memory (manual or automatic)
     */
    resetMemory(): void {
        store.set('youtube_last_blocked', null);
        console.log('[CookieManager] Block memory reset');
    }

    /**
     * Get preferred browser for cookies
     */
    getBrowser(): string {
        return store.get('cookie_browser');
    }

    /**
     * Set preferred browser for cookies
     */
    setBrowser(browser: 'chrome' | 'firefox' | 'safari'): void {
        store.set('cookie_browser', browser);
    }

    /**
     * Get status information for UI
     */
    getStatus(): { blocked: boolean; minutesAgo: number | null } {
        const lastBlocked = store.get('youtube_last_blocked');
        if (!lastBlocked) {
            return { blocked: false, minutesAgo: null };
        }

        const elapsed = Date.now() - lastBlocked;
        if (elapsed < this.BLOCK_MEMORY_DURATION) {
            return {
                blocked: true,
                minutesAgo: Math.floor(elapsed / 60000)
            };
        }

        return { blocked: false, minutesAgo: null };
    }

    /**
     * Check if URL is YouTube
     */
    private isYouTube(url: string): boolean {
        return url.includes('youtube.com') || url.includes('youtu.be');
    }

    /**
     * Check if error is a bot detection error
     */
    isBotError(error: any): boolean {
        const msg = error.message?.toLowerCase() || '';
        return msg.includes('sign in') ||
            msg.includes('bot') ||
            msg.includes('cookies') ||
            msg.includes('authentication');
    }
}

// Singleton instance
export const cookieManager = new CookieManager();
