
export class BackupService {
  async backup(destinationPath: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI.backupDatabase(destinationPath);
    }
    return false;
  }

  async restore(sourcePath: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI.restoreDatabase(sourcePath);
    }
    return false;
  }
}
