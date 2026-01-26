import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

// Custom API for Download Manager
contextBridge.exposeInMainWorld('api', {
  startDownload: (task: any) => ipcRenderer.send('start-download', task),
  startPlaylistDownload: (playlist: any) => ipcRenderer.send('start-playlist-download', playlist),
  onProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('download-progress', (_event, data) => callback(data))
  },
  onComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('download-complete', (_event, data) => callback(data))
  },
  onError: (callback: (data: any) => void) => {
    ipcRenderer.on('download-error', (_event, data) => callback(data))
  },
  onRemoved: (callback: (data: any) => void) => {
    ipcRenderer.on('download-removed', (_event, data) => callback(data))
  },
  removeListener: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  pauseDownload: (id: string) => ipcRenderer.send('pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.send('resume-download', id),
  cancelDownload: (id: string) => ipcRenderer.send('cancel-download', id),
  cancelPlaylist: (id: string) => ipcRenderer.send('cancel-playlist', id),
  analyzeUrl: (url: string) => ipcRenderer.invoke('analyze-url', url),
  analyzePlaylist: (url: string) => ipcRenderer.invoke('analyze-playlist', url),
})
