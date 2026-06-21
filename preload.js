const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('NexiDb', {
    saveMatchStats: (data) => ipcRenderer.invoke('save-match-stats', data),
    getAllStats: () => ipcRenderer.invoke('get-db-stats'),
    clearStats: () => ipcRenderer.invoke('clear-db-stats')
});
