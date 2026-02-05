"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
electron.contextBridge.exposeInMainWorld("api", {
  startDownload: (task) => electron.ipcRenderer.send("start-download", task),
  startPlaylistDownload: (playlist) => electron.ipcRenderer.send("start-playlist-download", playlist),
  onProgress: (callback) => {
    electron.ipcRenderer.on("download-progress", (_event, data) => callback(data));
  },
  onComplete: (callback) => {
    electron.ipcRenderer.on("download-complete", (_event, data) => callback(data));
  },
  onError: (callback) => {
    electron.ipcRenderer.on("download-error", (_event, data) => callback(data));
  },
  onRemoved: (callback) => {
    electron.ipcRenderer.on("download-removed", (_event, data) => callback(data));
  },
  removeListener: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  },
  selectDirectory: () => electron.ipcRenderer.invoke("select-directory"),
  getDownloadsFolder: () => electron.ipcRenderer.invoke("get-downloads-folder"),
  pauseDownload: (id) => electron.ipcRenderer.send("pause-download", id),
  resumeDownload: (id) => electron.ipcRenderer.send("resume-download", id),
  cancelDownload: (id) => electron.ipcRenderer.send("cancel-download", id),
  cancelPlaylist: (id) => electron.ipcRenderer.send("cancel-playlist", id),
  openFolder: (path) => electron.ipcRenderer.send("open-folder", path),
  analyzeUrl: (url) => electron.ipcRenderer.invoke("analyze-url", url),
  analyzePlaylist: (url) => electron.ipcRenderer.invoke("analyze-playlist", url),
  openYouTubeLogin: () => electron.ipcRenderer.send("open-youtube-login"),
  enableCookies: () => electron.ipcRenderer.send("enable-cookies"),
  resetCookies: () => electron.ipcRenderer.send("reset-cookies")
});
