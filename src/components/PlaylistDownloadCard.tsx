import { PlaylistDownload } from '../store/playlistStore';
import { useDownloadStore } from '../store/downloadStore';
import { Folder, Pause, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface PlaylistDownloadCardProps {
    playlist: PlaylistDownload;
    onPauseAll: () => void;
    onCancelAll: () => void;
}

export function PlaylistDownloadCard({ playlist, onPauseAll, onCancelAll }: PlaylistDownloadCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const { downloads } = useDownloadStore();

    // Get downloads for this playlist
    // Get downloads for this playlist - (Logic kept for future reference but variable unused)
    // const playlistDownloads = playlist.videos...

    const completedCount = playlist.videos.filter(v => v.selected && v.status === 'completed').length;
    const totalSelected = playlist.videos.filter(v => v.selected).length;
    const overallProgress = totalSelected > 0 ? Math.floor((completedCount / totalSelected) * 100) : 0;

    return (
        <div className="border-2 border-border rounded-xl bg-surface overflow-hidden">
            {/* Playlist Header */}
            <div className="p-4 bg-muted/30 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <Folder className="w-5 h-5 text-accent flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                                {playlist.metadata.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {completedCount}/{totalSelected} videos • {overallProgress}%
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Progress Bar */}
                        <div className="w-32 h-2 bg-muted/50 rounded-full overflow-hidden border border-border/30">
                            <div
                                className="h-full bg-accent transition-all duration-300"
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>

                        {/* Controls */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                            onClick={onPauseAll}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            aria-label="Pause All"
                        >
                            <Pause className="w-4 h-4" />
                        </button>

                        <button
                            onClick={onCancelAll}
                            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                            aria-label="Cancel All"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Video List (Collapsible) */}
            {isExpanded && (
                <div className="p-2 space-y-1">
                    {playlist.videos
                        .filter(v => v.selected)
                        .map((video) => {
                            const progress = video.progress ? parseFloat(video.progress) : 0;
                            const isActive = video.status === 'downloading' || video.status === 'converting';

                            return (
                                <div
                                    key={video.id}
                                    className={`
                    p-3 rounded-lg flex items-center gap-3 transition-colors
                    ${isActive ? 'bg-accent/10 border border-accent/30' : 'bg-muted/20'}
                  `}
                                >
                                    {/* Status Icon */}
                                    <div className="flex-shrink-0">
                                        {video.status === 'completed' && (
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                        )}
                                        {video.status === 'downloading' && (
                                            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                        )}
                                        {video.status === 'queued' && (
                                            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                                        )}
                                        {video.status === 'error' && (
                                            <div className="w-2 h-2 rounded-full bg-destructive" />
                                        )}
                                    </div>

                                    {/* Video Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                            {String(video.index).padStart(2, '0')}. {video.title}
                                        </p>
                                        {isActive && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-accent transition-all duration-300"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground w-12 text-right">
                                                    {progress}%
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Badge */}
                                    {video.status === 'completed' && (
                                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 flex-shrink-0">
                                            ✓ Done
                                        </span>
                                    )}
                                    {video.status === 'error' && (
                                        <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 flex-shrink-0">
                                            Error
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
