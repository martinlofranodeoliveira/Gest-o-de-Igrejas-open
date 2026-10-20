export interface ElectronAPI {
  getConfig: (key: string) => Promise<string | null>;
  setConfig: (key: string, value: string) => Promise<boolean>;
  sqliteGetAll: <T>(tableName: string) => Promise<T[]>;
  sqliteAdd: <T>(tableName: string, item: T) => Promise<string>;
  sqliteUpdate: <T>(tableName: string, id: string, item: Partial<T>) => Promise<boolean>;
  sqliteDelete: (tableName: string, id: string) => Promise<boolean>;
  sqliteClear: (tableName: string) => Promise<boolean>;

  saveFile: (fileName: string, base64Data: string) => Promise<string>;
  readFile: (fileName: string) => Promise<string | null>;
  deleteFile: (fileName: string) => Promise<boolean>;
  backupDatabase: (destinationPath: string) => Promise<boolean>;
  restoreDatabase: (sourcePath: string) => Promise<boolean>;
  authLogin: (email: string, password: string) => Promise<{ id: string, email: string, displayName: string } | null>;
  authHasUsers: () => Promise<boolean>;
  authRegister: (email: string, password: string, displayName: string) => Promise<{ id: string, email: string, displayName: string } | null>;
  verifyLicense: (licenseKey: string) => Promise<boolean>;
  isActivated: () => Promise<boolean>;
  getMachineFingerprint: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
