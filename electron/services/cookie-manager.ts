import Store from 'electron-store';

interface CookieStore {
    youtube_last_blocked: number | null;
    cookie_browser: 'chrome' | 'firefox' | 'safari';
    session_cookies_enabled: boolean; // NEW: Track if cookies are enabled for this session only
}

const store = new Store<CookieStore>({
    defaults: {
        youtube_last_blocked: null,
        cookie_browser: 'chrome',
        session_cookies_enabled: false // Start with cookies disabled
    }
});


export class CookieManager {
    private BLOCK_MEMORY_DURATION = 60 * 60 * 1000; // 1 hour

    /**
     * Record that YouTube blocked us - NOW only for this session
     */
    recordBlock(): void {
        const now = Date.now();
        store.set('youtube_last_blocked', now);
        store.set('session_cookies_enabled', true); // Enable cookies for this session only
        console.log('[CookieManager] YouTube block recorded, cookies enabled for this session');
    }

    /**
     * Check if we should use cookies for this URL - ONLY if session is enabled
     */
    shouldUseCookies(url: string): boolean {
        if (!this.isYouTube(url)) return false;

        // Only use cookies if explicitly enabled for this session
        if (!store.get('session_cookies_enabled')) {
            return false;
        }

        const status = this.getStatus();
        // If we are currently in "blocked" state, use cookies
        return status.blocked;
    }

    /**
     * Clear session cookies when app closes
     */
    clearSessionCookies(): void {
        store.set('session_cookies_enabled', false);
        store.set('youtube_last_blocked', null);
        console.log('[CookieManager] Session cookies cleared');
    }


    /**
     * Reset the block memory (manual or automatic)
     */
    resetMemory(): void {
        store.set('youtube_last_blocked', null);
        store.set('session_cookies_enabled', false);
        console.log('[CookieManager] Block memory and session cookies reset');
    }

    /**
     * Get preferred browser for cookies
     */
    getBrowser(): string {
        const browser = store.get('cookie_browser');
        // Safari is only available on macOS
        if (browser === 'safari' && process.platform !== 'darwin') {
            return 'chrome';
        }
        return browser;
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
