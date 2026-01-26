/**
 * Check if the URL belongs to a known audio-only platform
 */
export const isAudioPlatform = (url: string): boolean => {
    const audioDomains = [
        'soundcloud.com',
        'mixcloud.com',
        'bandcamp.com',
        'spotify.com',
        'music.youtube.com' // Maybe? often has video though. Let's stick to pure audio ones or ones user requested.
    ];

    try {
        const hostname = new URL(url).hostname;
        return audioDomains.some(domain => hostname.includes(domain));
    } catch (e) {
        return false;
    }
};
