import { useState } from 'react';
import { X, Folder, Search, Check } from 'lucide-react';
import type { PlaylistMetadata, VideoInPlaylist } from '../store/playlistStore';
import { isAudioPlatform } from '../utils/platform-utils';

interface PlaylistSelectionModalProps {
    playlist: PlaylistMetadata & { videos: VideoInPlaylist[] };
    onConfirm: (selectedVideoIds: string[], outputDir: string, format: 'video' | 'audio', resolution: string, audioQuality?: string) => void;
    onCancel: () => void;
}

export function PlaylistSelectionModal({ playlist, onConfirm, onCancel }: PlaylistSelectionModalProps) {
    // Initialize full selection by default
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(playlist.videos.map(v => v.id))
    );

    // Default paths/settings
    const sanitizeFolderName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '-').trim();
    const defaultDir = `/Users/jeff/Downloads/${sanitizeFolderName(playlist.title)}`;

    const [outputDir, setOutputDir] = useState<string>(defaultDir);
    const [searchTerm, setSearchTerm] = useState('');
    const [format, setFormat] = useState<'video' | 'audio'>(isAudioPlatform(playlist.url) ? 'audio' : 'video');
    const [resolution, setResolution] = useState<string>('1080p');
    const [audioQuality, setAudioQuality] = useState<string>('0'); // 0 = Best, 5 = Worst

    // Filter logic
    const filteredVideos = playlist.videos.filter(v =>
        v.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handlers
    const toggleSelection = (videoId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(videoId)) {
            newSelected.delete(videoId);
        } else {
            newSelected.add(videoId);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => setSelectedIds(new Set(filteredVideos.map(v => v.id)));
    const handleDeselectAll = () => setSelectedIds(new Set());

    const handleSelectFolder = async () => {
        const folder = await window.api.selectDirectory();
        if (folder) setOutputDir(folder);
    };

    // Formatters
    const formatDuration = (seconds?: number) => {
        if (!seconds || seconds === 0) return '-:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatBytes = (bytes?: number) => {
        if (!bytes) return '-';
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    const totalSize = playlist.videos
        .filter(v => selectedIds.has(v.id))
        .reduce((sum, v) => sum + (v.filesize || 0), 0);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            {/* Modal Container - Fixed Height 85vh, CSS Grid Layout */}
            <div className="bg-surface rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] border border-border flex flex-col overflow-hidden">

                {/* 1. Header (Fixed) */}
                <div className="p-3 border-b border-border bg-background z-10 flex-none">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-foreground truncate" title={playlist.title}>
                                🎵 {playlist.title}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {playlist.channel} • {playlist.videoCount} videos
                            </p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 2. Configuration Section (Fixed) */}
                <div className="p-2 border-b border-border bg-muted/10 space-y-2 flex-none">
                    {/* Path */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                            Save Destination
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                style={{ WebkitAppRegion: 'no-drag' } as any}
                                value={outputDir}
                                onChange={(e) => setOutputDir(e.target.value)}
                                className="flex-1 h-8 px-2 bg-background border border-border rounded-lg text-xs focus:ring-2 focus:ring-accent outline-none font-mono"
                            />
                            <button
                                onClick={handleSelectFolder}
                                className="h-8 px-3 bg-muted hover:bg-muted/80 border border-border rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                            >
                                <Folder className="w-4 h-4" />
                                Browse
                            </button>
                        </div>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                                Format
                            </label>
                            <select
                                value={format}
                                onChange={(e) => setFormat(e.target.value as any)}
                                className="w-full h-8 px-2 bg-background border border-border rounded-lg text-xs focus:ring-2 focus:ring-accent outline-none appearance-none"
                            >
                                {!isAudioPlatform(playlist.url) && <option value="video">Video (MP4)</option>}
                                <option value="audio">Audio Only (MP3)</option>
                            </select>
                        </div>
                        {format === 'video' ? (
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                                    Quality
                                </label>
                                <select
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    className="w-full h-8 px-2 bg-background border border-border rounded-lg text-xs focus:ring-2 focus:ring-accent outline-none appearance-none"
                                >
                                    <option value="1080p">High (1080p)</option>
                                    <option value="720p">Medium (720p)</option>
                                    <option value="480p">Low (480p)</option>
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                                    Audio Quality
                                </label>
                                <select
                                    value={audioQuality}
                                    onChange={(e) => setAudioQuality(e.target.value)}
                                    className="w-full h-8 px-2 bg-background border border-border rounded-lg text-xs focus:ring-2 focus:ring-accent outline-none appearance-none"
                                >
                                    <option value="0">Best (320kbps)</option>
                                    <option value="2">High (192kbps)</option>
                                    <option value="5">Standard (128kbps)</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Toolbar (Fixed) */}
                <div className="px-4 py-2 border-b border-border bg-background flex items-center justify-between gap-4 flex-none">
                    <div className="flex gap-2">
                        <button onClick={handleSelectAll} className="h-8 px-3 text-xs font-semibold bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors">Select All</button>
                        <button onClick={handleDeselectAll} className="h-8 px-3 text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-colors">Deselect All</button>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            style={{ WebkitAppRegion: 'no-drag' } as any}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Filter videos..."
                            className="w-full h-8 pl-8 pr-3 bg-muted/30 border border-border rounded-md text-xs focus:ring-1 focus:ring-accent outline-none"
                        />
                    </div>
                </div>

                {/* 4. Video List (Scrollable Area) */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-background/50 p-2">
                    <div className="space-y-0.5">
                        {filteredVideos.map((video) => {
                            const isSelected = selectedIds.has(video.id);
                            return (
                                <div
                                    key={video.id}
                                    onClick={() => toggleSelection(video.id)}
                                    className={`
                                        flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer transition-all border
                                        ${isSelected
                                            ? 'bg-accent/5 border-accent/30 shadow-sm'
                                            : 'bg-transparent border-transparent hover:bg-muted/40 hover:border-border/50'
                                        }
                                    `}
                                >
                                    <div className={`
                                       w-5 h-5 rounded border flex items-center justify-center transition-colors
                                        ${isSelected ? 'bg-accent border-accent' : 'border-muted-foreground/30 bg-background'}
                                    `}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>

                                    <span className="text-xs font-mono text-muted-foreground w-6 text-center opacity-60">
                                        {video.index}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {video.title}
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground tabular-nums opacity-70">
                                        {formatDuration(video.duration)}
                                    </div>

                                    <div className="text-xs text-muted-foreground tabular-nums w-16 text-right font-mono opacity-60">
                                        {formatBytes(video.filesize)}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredVideos.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 py-10">
                                <Search className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-sm">No videos found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Footer (Fixed) */}
                <div className="p-4 border-t border-border bg-background z-10 flex-none">
                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <span className="font-semibold text-accent">{selectedIds.size}</span>
                            <span className="text-muted-foreground"> selected</span>
                            {totalSize > 0 && (
                                <span className="text-muted-foreground ml-1">
                                    ({formatBytes(totalSize)})
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="px-6 py-2.5 rounded-lg font-medium text-sm text-foreground hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onConfirm([...selectedIds], outputDir, format, resolution, audioQuality)}
                                disabled={selectedIds.size === 0 || !outputDir}
                                className="px-6 py-2.5 rounded-lg font-medium text-sm bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Download Selected
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
