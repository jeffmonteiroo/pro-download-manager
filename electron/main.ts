import { app, BrowserWindow, ipcMain } from 'electron'
import { DownloadEngine } from './download-engine'
import { VideoAnalyzerService } from './video-analyzer'
import { VideoAnalyzerService } from './video-analyzer'
import { PlaylistAnalyzerService } from './playlist-analyzer'
import { BatchDownloadManager } from './batch-download-manager'
import { logManager } from './services/log-manager' // ✅ Initialize logs
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let engine: DownloadEngine | null = null
let analyzer: VideoAnalyzerService | null = null
let playlistAnalyzer: PlaylistAnalyzerService | null = null
let batchManager: BatchDownloadManager | null = null

// Register IPC handlers only once, outside createWindow
function setupIPCHandlers() {
  if (analyzer) return; // Already set up

  analyzer = new VideoAnalyzerService();
  playlistAnalyzer = new PlaylistAnalyzerService();

  // Remove existing handler if any
  try {
    ipcMain.removeHandler('analyze-url');
    ipcMain.removeHandler('analyze-playlist');
  } catch (e) {
    // Handler didn't exist
  }

  ipcMain.handle('analyze-url', async (_event, url) => {
    try {
      return await analyzer!.analyze(url);
    } catch (e: any) {
      // Better error handling for YouTube auth issues
      if (e.message.includes('Sign in') || e.message.includes('cookies')) {
        throw new Error('YouTube requires authentication. Try using cookies or a different video.');
      }
      throw new Error(e.message);
    }
  });

  ipcMain.handle('analyze-playlist', async (_event, url) => {
    try {
      return await playlistAnalyzer!.analyzePlaylist(url);
    } catch (e: any) {
      throw new Error(e.message);
    }
  });
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // Create engine only once
  if (!engine) {
    engine = new DownloadEngine(win)
    batchManager = new BatchDownloadManager(engine)

    // BUG FIX 1: Use addTask instead of startDownload
    ipcMain.on('start-download', (_event, task) => {
      console.log('[MAIN] Received start-download with task ID:', task.id);
      engine?.addTask(task)
    })

    // Playlist batch download
    ipcMain.on('start-playlist-download', (_event, playlist) => {
      console.log('[MAIN] Received start-playlist-download:', playlist.metadata.title);
      batchManager?.startPlaylistDownload(playlist);
    })

    ipcMain.on('cancel-playlist', (_event, playlistId) => {
      console.log('[MAIN] Received cancel-playlist:', playlistId);
      batchManager?.cancelPlaylist(playlistId);
    })
  } else {
    // Update window reference if recreating
    engine = new DownloadEngine(win)
    if (batchManager) {
      batchManager = new BatchDownloadManager(engine)
    }
  }

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  // Clean old logs on startup
  logManager.cleanOldLogs();

  setupIPCHandlers()
  createWindow()
})
