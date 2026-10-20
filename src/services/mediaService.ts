export interface MediaService {
  saveFile: (fileName: string, base64Data: string) => Promise<string>;
  readFile: (fileName: string) => Promise<string | null>;
  deleteFile: (fileName: string) => Promise<boolean>;
}

export const createMediaService = (): MediaService => {
  const { electronAPI } = typeof window !== 'undefined' ? window as any : { electronAPI: null };
  if (electronAPI) {
    return {
      saveFile: (fileName: string, base64Data: string) => electronAPI.saveFile(fileName, base64Data),
      readFile: (fileName: string) => electronAPI.readFile(fileName),
      deleteFile: (fileName: string) => electronAPI.deleteFile(fileName),
    };
  }
  return {
    saveFile: async (fileName: string, base64Data: string) => {
      localStorage.setItem(`media_${fileName}`, base64Data);
      return `/local-media/${fileName}`;
    },
    readFile: async (fileName: string) => {
      return localStorage.getItem(`media_${fileName}`);
    },
    deleteFile: async (fileName: string) => {
      localStorage.removeItem(`media_${fileName}`);
      return true;
    },
  };
};
