import { useState, useEffect } from 'react'
import { X, Video, Music, HardDrive, Film } from 'lucide-react'
import { cn } from '../lib/utils'
import { isAudioPlatform } from '../utils/platform-utils'

interface VideoMetadata {
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
    url?: string; // Add URL to metadata for platform checking
}

interface DownloadConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownload: (config: DownloadConfig) => void;
    metadata: VideoMetadata | null;
    initialUrl: string;
}

export interface DownloadConfig {
    url: string;
    filename: string;
    outputDir: string;
    format: 'video' | 'audio';
    resolution?: string;
    targetExt?: string;
}

export function DownloadConfigModal({ isOpen, onClose, onDownload, metadata, initialUrl }: DownloadConfigModalProps) {
    const [filename, setFilename] = useState('');
    const isAudioOnly = isAudioPlatform(initialUrl);
    const [selectedFormat, setSelectedFormat] = useState<'video' | 'audio'>(isAudioOnly ? 'audio' : 'video');
    const [selectedResolution, setSelectedResolution] = useState<string>('');
    const [outputDir, setOutputDir] = useState('/Users/jeff/Downloads');

    const availableResolutions = metadata ? Array.from(new Set(metadata.formats.map(f => f.resolution)))
        .filter(r => r !== 'audio')
        .sort((a, b) => {
            const valA = parseInt(a.replace('p', '')) || 0;
            const valB = parseInt(b.replace('p', '')) || 0;
            return valB - valA;
        }) : [];

    useEffect(() => {
        if (metadata) {
            // Safe filename: remove only illegal characters, keep spaces and case
            // Illegal chars on Windows/Unix: / \ : * ? " < > |
            const safeName = metadata.title
                .replace(/[:]/g, ' -') // Replace colon with dash for better reading
                .replace(/[<>"/\\|?*]/g, ''); // Remove other illegal chars

            setFilename(safeName);
            // Default to best quality (first in sorted list)
            if (availableResolutions.length > 0) {
                setSelectedResolution(availableResolutions[0]);
            }
        }
    }, [metadata]);

    const handleSelectDir = async () => {
        try {
            const selected = await window.api.selectDirectory();
            if (selected) setOutputDir(selected);
        } catch (e) {
            console.error(e);
        }
    }

    if (!isOpen || !metadata) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Film className="w-5 h-5 text-blue-500" />
                        Configure Download
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Media Preview */}
                    <div className="flex gap-4">
                        <div className="w-32 aspect-video bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                            {metadata.thumbnail ? (
                                <img src={metadata.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Video className="w-8 h-8" />
                                </div>
                            )}
                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                                {new Date(metadata.duration * 1000).toISOString().substr(11, 8)}
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Title</label>
                            <input
                                type="text"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <p className="text-xs text-muted-foreground truncate">{initialUrl}</p>
                        </div>
                    </div>

                    {/* Settings Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Format Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Format</label>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-secondary/30 rounded-lg border border-border">
                                {isAudioOnly ? (
                                    // Audio Only Mode
                                    <button
                                        className="col-span-2 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium bg-secondary text-muted-foreground cursor-not-allowed opacity-50"
                                        disabled
                                    >
                                        <Video className="w-4 h-4" /> Video (Not Available)
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setSelectedFormat('video')}
                                        className={cn("flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                            selectedFormat === 'video' ? "bg-blue-600 text-white shadow-sm" : "hover:bg-muted text-muted-foreground"
                                        )}
                                    >
                                        <Video className="w-4 h-4" /> Video
                                    </button>
                                )}

                                <button
                                    onClick={() => setSelectedFormat('audio')}
                                    className={cn("flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                        selectedFormat === 'audio' ? "bg-blue-600 text-white shadow-sm" : "hover:bg-muted text-muted-foreground",
                                        isAudioOnly && "col-span-2 bg-blue-600 text-white shadow-sm"
                                    )}
                                >
                                    <Music className="w-4 h-4" /> {isAudioOnly ? "Audio (Default)" : "Audio"}
                                </button>
                            </div>
                        </div>

                        {/* Quality Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Quality</label>
                            <select
                                disabled={selectedFormat === 'audio'}
                                value={selectedResolution}
                                onChange={(e) => setSelectedResolution(e.target.value)}
                                className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {availableResolutions.map(res => (
                                    <option key={res} value={res}>{res}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Output Directory */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Save to</label>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm text-muted-foreground truncate flex items-center">
                                <HardDrive className="w-4 h-4 mr-2 opacity-50" />
                                {outputDir}
                            </div>
                            <button
                                onClick={handleSelectDir}
                                className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-md text-sm font-medium transition-colors"
                            >
                                Browse
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 hover:bg-muted text-foreground rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onDownload({
                            url: initialUrl,
                            filename,
                            outputDir,
                            format: selectedFormat,
                            resolution: selectedResolution
                        })}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                    >
                        Start Download
                    </button>
                </div>
            </div>
        </div>
    )
}
