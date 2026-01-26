import { useState, useEffect } from 'react'
import { Plus, Download, Loader2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useDownloadStore } from './store/downloadStore'
import { usePlaylistStore } from './store/playlistStore'
import { DownloadCard } from './components/DownloadCard'
import { DownloadConfigModal, DownloadConfig } from './components/DownloadConfigModal'
import { PlaylistSelectionModal } from './components/PlaylistSelectionModal'
import { PlaylistDownloadCard } from './components/PlaylistDownloadCard'
import type { PlaylistMetadata, VideoInPlaylist } from './store/playlistStore'

function App() {
  const [url, setUrl] = useState('')
  const { downloads, addDownload, updateDownload, setDownloads, removeDownload } = useDownloadStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Modal State
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [analyzedMetadata, setAnalyzedMetadata] = useState<any>(null)
  const [activeUrl, setActiveUrl] = useState<string>('')

  // Playlist State
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [analyzedPlaylist, setAnalyzedPlaylist] = useState<(PlaylistMetadata & { videos: VideoInPlaylist[] }) | null>(null)
  const { playlists, addPlaylist, removePlaylist, updateVideoByTaskId } = usePlaylistStore()

  useEffect(() => {
    // Setup listeners
    window.api.onProgress((data) => {
      // console.log('[App] Progress:', data.id, data.progress); // Verify events are arriving

      // Update individual downloads
      updateDownload(data.id, {
        progress: data.progress,
        status: data.status || 'downloading',
        speed: data.speed,
        eta: data.eta,
        totalSize: data.totalSize
      })
      // Update playlist videos (if matches)
      updateVideoByTaskId(data.id, {
        progress: data.progress,
        status: (data.status as any) || 'downloading'
      })
    })

    window.api.onComplete((data) => {
      updateDownload(data.id, { progress: '100', status: 'completed', path: data.path })
      updateVideoByTaskId(data.id, { progress: '100', status: 'completed' })

      // Check if this was the last pending item in any active playlist
      // We need to access the LATEST state of playlists. Since we are in a closure,
      // we might need to use a ref or check via store directly if possible, or trigger a check effect.
      // Better approach: Let useEffect monitor playlist changes? No, that's too heavy.
      // Let's use the 'playlists' dependency in this effect? It might restart listener too often.
      // Alternatively: Just check the store within a setTimeout to let the state update propagate?

      // Simpler for now: Check if this ID belongs to a playlist, find that playlist, count incomplete items.
      // Since 'playlists' in this scope might be stale if we don't depend on it, 
      // let's trust the user to look at the UI, OR implement a proper store subscription.
      // However, the user asked for a "Window" popup.

      // Let's defer the check slightly to ensure store is updated
      setTimeout(() => {
        const currentPlaylists = usePlaylistStore.getState().playlists;
        const playlist = currentPlaylists.find(p => p.videos.some(v => v.downloadTaskId === data.id));

        if (playlist) {
          const allCompleted = playlist.videos
            .filter(v => v.selected) // Only check selected ones
            .every(v => v.status === 'completed' || v.status === 'error');

          if (allCompleted && playlist.status !== 'completed') {
            // Mark playlist as completed in store to avoid double alerts (optional but good)
            // But for now, just show the alert
            // Verify if we haven't shown it yet? 
            // Let's just standard alert confirmed by user request "Janela ... clicar OK"
            if (confirm(`🎉 Playlist "${playlist.metadata.title}" concluída!\n\nTodos os downloads terminaram.\n\nDeseja limpar esta playlist da tela?`)) {
              removePlaylist(playlist.id);
            }
          }
        }
      }, 500);
    })

    window.api.onError((data) => {
      updateDownload(data.id, { status: 'error', error: data.error })
      updateVideoByTaskId(data.id, { status: 'error' })
    })

    // BUG FIX 2: Listen for download-removed event
    window.api.onRemoved?.((data: { id: string }) => {
      removeDownload(data.id)
    })

    return () => {
      window.api.removeListener('download-progress')
      window.api.removeListener('download-complete')
      window.api.removeListener('download-error')
      window.api.removeListener?.('download-removed')
    }
  }, [updateDownload, removeDownload, updateVideoByTaskId])

  const handleAnalyze = async () => {
    if (!url) return;

    setActiveUrl(url);
    setIsAnalyzing(true);

    try {
      // Check if URL is a playlist
      // Expanded detection for SoundCloud sets/profiles and other platforms
      const isPlaylist = url.includes('list=') ||
        url.includes('/playlist') ||
        url.includes('/sets/') ||
        url.includes('/albums/') ||
        (url.includes('soundcloud.com/') && url.split('/').length > 3); // Crude heuristic for profile/set

      console.log(`[App] Inspecting URL: ${url}, isPlaylist=${isPlaylist}`);

      if (isPlaylist) {
        // Analyze as playlist
        const playlistData = await window.api.analyzePlaylist(url);
        console.log('[App] Playlist detected:', playlistData);

        // Show playlist selection modal
        setAnalyzedPlaylist(playlistData);
        setShowPlaylistModal(true);
      } else {
        // Analyze as single video
        const metadata = await window.api.analyzeUrl(url);
        setAnalyzedMetadata(metadata);
        setShowConfigModal(true);
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);

      // Friendly error messages
      let userMessage = '';
      if (error.message.includes('authentication') || error.message.includes('cookies') || error.message.includes('bot')) {
        userMessage = '🔒 YouTube está bloqueando downloads temporariamente.\n\n' +
          '💡 Soluções:\n' +
          '• Aguarde 10-15 minutos e tente novamente\n' +
          '• Teste com outro vídeo do YouTube\n' +
          '• Use vídeos de outras plataformas (Vimeo, Dailymotion)\n\n' +
          'Estamos trabalhando em uma solução permanente!';
      } else if (error.message.includes('No title')) {
        userMessage = '❌ Não foi possível analisar este vídeo.\n\n' +
          'O vídeo pode estar:\n' +
          '• Privado ou restrito\n' +
          '• Indisponível na sua região\n' +
          '• Removido pelo autor';
      } else {
        userMessage = `❌ Erro ao analisar URL:\n\n${error.message}`;
      }

      alert(userMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handleStartDownload = (config: DownloadConfig) => {
    const id = uuidv4();

    // Determine type based on URL still useful for engine routing if needed, 
    // but now we trust the analyzer mostly
    const isSmartPlayer = config.url.includes('smartplayer') || config.url.includes('.m3u8');

    addDownload({
      id,
      url: config.url,
      filename: config.filename,
      progress: '0',
      speed: '0',
      status: 'pending',
      type: isSmartPlayer ? 'smartplayer' : 'standard',
      outputDir: config.outputDir,
      format: config.format,
      resolution: config.resolution,
      eta: '--',
      totalSize: 'Calculating...'
    })

    // Send to backend with rich config
    window.api.startDownload({
      id,
      url: config.url,
      filename: config.filename,
      outputDir: config.outputDir,
      type: isSmartPlayer ? 'smartplayer' : 'standard',
      format: config.format,
      resolution: config.resolution
    })

    setShowConfigModal(false);
    setUrl('');
    setAnalyzedMetadata(null);
  }

  const handlePause = (id: string) => {
    window.api.pauseDownload(id)
    updateDownload(id, { status: 'paused' })
  }

  const handleResume = (id: string) => {
    window.api.resumeDownload(id)
    updateDownload(id, { status: 'pending' })
  }

  const handleCancel = (id: string) => {
    const download = downloads.find(d => d.id === id)

    // Different messages based on download status
    let confirmMsg = ''
    if (download?.status === 'completed') {
      confirmMsg = '✅ Download concluído.\n\nDeseja remover da lista?\n(O arquivo baixado será mantido)'
    } else if (download?.status === 'downloading' || download?.status === 'converting') {
      confirmMsg = '⚠️ Download em andamento!\n\nDeseja cancelar e remover?\n(Arquivos parciais serão deletados)'
    } else {
      confirmMsg = 'Deseja remover este download da lista?'
    }

    if (window.confirm(confirmMsg)) {
      window.api.cancelDownload(id)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Pro Download Manager</h1>
        <p className="text-muted-foreground">Professional Video Downloader & Analyzer</p>
      </header>

      <div className="flex gap-4 mb-8">
        <div className="relative flex-1">
          <input
            type="text"
            style={{ WebkitAppRegion: 'no-drag' } as any}
            placeholder="Paste URL (YouTube, Youtube Music, Soundcloud...)"
            className="w-full h-12 px-4 rounded-lg bg-secondary/50 border border-border focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-muted-foreground"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            disabled={isAnalyzing}
          />
        </div>
        <button
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              // Basic URL validation
              if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                setUrl(text);
              }
            } catch (err) {
              console.error('Failed to read clipboard:', err);
            }
          }}
          className="h-12 px-4 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-lg font-medium transition-colors"
        >
          Paste
        </button>
        <button
          onClick={handleAnalyze}
          disabled={!url || isAnalyzing}
          className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" /> Analyze & Download
            </>
          )}
        </button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {downloads.length === 0 && playlists.length === 0 && (
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <Download className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No active downloads</p>
            <p className="text-sm">Paste a link to analyze and download</p>
          </div>
        )}

        {/* Playlist Downloads */}
        {playlists.map((playlist) => (
          <PlaylistDownloadCard
            key={playlist.id}
            playlist={playlist}
            onPauseAll={() => console.log('Pause all:', playlist.id)}
            onCancelAll={() => {
              if (confirm(`Cancel all downloads from "${playlist.metadata.title}"?`)) {
                window.api.cancelPlaylist(playlist.id); // ✅ Tell backend to cancel
                removePlaylist(playlist.id);
              }
            }}
          />
        ))}

        {/* Individual Downloads (non-playlist) */}
        {downloads.filter(d => !playlists.some(p => p.videos.some(v => v.downloadTaskId === d.id))).map((item) => (
          <DownloadCard
            key={item.id}
            item={item}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
          />
        ))}
      </div>

      <DownloadConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        metadata={analyzedMetadata}
        initialUrl={activeUrl}
        onDownload={handleStartDownload}
      />
      {/* Playlist Selection Modal */}
      {showPlaylistModal && analyzedPlaylist && (
        <PlaylistSelectionModal
          playlist={analyzedPlaylist}
          onConfirm={(selectedVideoIds, outputDir, format, resolution, audioQuality) => {
            console.log('[App] Playlist download starting:', selectedVideoIds.length, 'videos', format, resolution, audioQuality);

            // Create PlaylistDownload object
            const playlistDownload = {
              id: analyzedPlaylist.id,
              metadata: {
                id: analyzedPlaylist.id,
                title: analyzedPlaylist.title,
                url: analyzedPlaylist.url,
                thumbnail: analyzedPlaylist.thumbnail,
                channel: analyzedPlaylist.channel,
                videoCount: analyzedPlaylist.videoCount,
                createdAt: analyzedPlaylist.createdAt,
              },
              videos: analyzedPlaylist.videos.map(v => ({
                ...v,
                selected: selectedVideoIds.includes(v.id),
                format, // ✅ Add format to each video
                resolution, // ✅ Add resolution to each video
                audioQuality, // ✅ Add audio quality
                downloadTaskId: `${analyzedPlaylist.id}_${v.id}`, // ✅ Deterministic ID for progress tracking
              })),
              outputDir: outputDir,
              status: 'downloading' as const,
              progress: {
                completed: 0,
                total: selectedVideoIds.length,
                percentage: 0,
                currentSpeed: '0 KB/s',
                eta: 'Calculando...',
              },
            };

            // Add to store
            addPlaylist(playlistDownload);

            console.log('[App] Sending to batch manager:', playlistDownload);

            // Start batch download
            window.api.startPlaylistDownload(playlistDownload);

            setShowPlaylistModal(false);
            setAnalyzedPlaylist(null);
          }}
          onCancel={() => {
            setShowPlaylistModal(false);
            setAnalyzedPlaylist(null);
          }}
        />
      )}
    </div>
  )
}

export default App
