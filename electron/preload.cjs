const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  sqliteGetAll: (tableName) => ipcRenderer.invoke('sqlite-get-all', tableName),
  sqliteAdd: (tableName, item) => ipcRenderer.invoke('sqlite-add', tableName, item),
  sqliteUpdate: (tableName, id, item) => ipcRenderer.invoke('sqlite-update', tableName, id, item),
  sqliteDelete: (tableName, id) => ipcRenderer.invoke('sqlite-delete', tableName, id),
  sqliteClear: (tableName) => ipcRenderer.invoke('sqlite-clear', tableName),
  saveFile: (fileName, base64Data) => ipcRenderer.invoke('save-file', fileName, base64Data),
  readFile: (fileName) => ipcRenderer.invoke('read-file', fileName),
  deleteFile: (fileName) => ipcRenderer.invoke('delete-file', fileName),
  backupDatabase: (destinationPath) => ipcRenderer.invoke('backup-database', destinationPath),
  restoreDatabase: (sourcePath) => ipcRenderer.invoke('restore-database', sourcePath),
  authLogin: (email, password) => ipcRenderer.invoke('auth-login', email, password),
  authHasUsers: () => ipcRenderer.invoke('auth-has-users'),
  authRegister: (email, password, displayName) => ipcRenderer.invoke('auth-register', email, password, displayName),
  verifyLicense: (licenseKey) => ipcRenderer.invoke('verify-license', licenseKey),
  isActivated: () => ipcRenderer.invoke('is-activated'),
  getMachineFingerprint: () => ipcRenderer.invoke('get-machine-fingerprint'),
});
