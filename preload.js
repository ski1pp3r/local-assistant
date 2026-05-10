const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (fileName) => ipcRenderer.invoke('read-file', fileName),
  writeFile: (fileName, data) => ipcRenderer.invoke('write-file', fileName, data),
  checkOllama: (url) => ipcRenderer.invoke('check-ollama', url),
  startOllama: () => ipcRenderer.invoke('start-ollama'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  webSearch: (query) => ipcRenderer.invoke('web-search', query),
  fetchUrl: (url) => ipcRenderer.invoke('fetch-url', url)
});
