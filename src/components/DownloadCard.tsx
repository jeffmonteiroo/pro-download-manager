import { DownloadItem } from '../store/downloadStore'
import { FileVideo, CheckCircle, AlertCircle, Loader2, Play, Pause, X, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'

interface DownloadCardProps {
    item: DownloadItem;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
    onCancel: (id: string) => void;
}

export function DownloadCard({ item, onPause, onResume, onCancel }: DownloadCardProps) {
    const isPaused = item.status === 'paused';
    const isDownloading = item.status === 'downloading';
    const isConverting = item.status === 'converting';
    const isPending = item.status === 'pending';
    const isError = item.status === 'error';
    const isCompleted = item.status === 'completed';
    return (
        <div className="bg-card border border-border rounded-lg p-4 flex items-center space-x-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={cn("p-2 rounded-full", {
                "bg-blue-500/10 text-blue-500": item.status === 'downloading',
                "bg-purple-500/10 text-purple-500": item.status === 'converting',
                "bg-yellow-500/10 text-yellow-500": item.status === 'paused',
                "bg-green-500/10 text-green-500": item.status === 'completed',
                "bg-red-500/10 text-red-500": item.status === 'error',
                "bg-muted text-muted-foreground": item.status === 'pending',
            })}>
                {(item.status === 'downloading' || item.status === 'converting') && <Loader2 className="w-6 h-6 animate-spin" />}
                {item.status === 'paused' && <Pause className="w-6 h-6" />}
                {item.status === 'completed' && <CheckCircle className="w-6 h-6" />}
                {item.status === 'error' && <AlertCircle className="w-6 h-6" />}
                {item.status === 'pending' && <FileVideo className="w-6 h-6" />}
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 md:col-span-4">
                    <h3 className="font-semibold text-sm truncate" title={item.filename}>{item.filename}</h3>
                    {item.status === 'downloading' && (
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-2">
                            <div
                                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                style={{ width: `${parseFloat(item.progress) || 0}%` }}
                            />
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 truncate">{item.url}</p>
                </div>

                <div className="col-span-3 hidden md:block text-sm text-right">
                    <span className="text-muted-foreground">Size:</span> {item.totalSize || '--'}
                </div>

                <div className="col-span-3 hidden md:block text-sm text-right">
                    {item.status === 'downloading' && (
                        <>
                            <div className="font-mono text-emerald-500">{item.speed}</div>
                            <div className="text-xs text-muted-foreground">ETA: {item.eta || '--'}</div>
                        </>
                    )}
                </div>

                <div className="col-span-2 text-right flex justify-end gap-2">
                    {/* Pause/Resume for Downloading/Paused states */}
                    {(isDownloading || isPaused || isPending) && (
                        <button
                            onClick={() => isPaused ? onResume(item.id) : onPause(item.id)}
                            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title={isPaused ? "Resume" : "Pause"}
                        >
                            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>
                    )}

                    {/* Cancel/Delete */}
                    <button
                        onClick={() => onCancel(item.id)}
                        className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Cancel"
                    >
                        {isCompleted ? <Trash2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>

                    <span className={cn("text-xs font-bold px-2 py-1 rounded-full hidden lg:inline-block", {
                        "bg-blue-500/20 text-blue-400": isDownloading,
                        "bg-purple-500/20 text-purple-400": isConverting,
                        "bg-yellow-500/20 text-yellow-400": isPaused,
                        "bg-green-500/20 text-green-400": isCompleted,
                        "bg-zinc-500/20 text-zinc-400": isPending,
                        "bg-red-500/20 text-red-400": isError,
                    })}>
                        {isDownloading ? `${item.progress}%` : isConverting ? 'Converting...' : item.status}
                    </span>
                </div>
            </div>
        </div>
    )
}
