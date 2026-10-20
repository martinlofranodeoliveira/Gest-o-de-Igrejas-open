import assert from 'node:assert/strict';
import { createMediaService } from '../src/services/mediaService.ts';

async function test() {
  const calls: Array<{ method: string; fileName: string }> = [];

  (global as any).window = {
    electronAPI: {
      saveFile: async (fileName: string, _base64Data: string) => {
        calls.push({ method: 'save', fileName });
        return fileName;
      },
      readFile: async (fileName: string) => {
        calls.push({ method: 'read', fileName });
        return 'base64data';
      },
      deleteFile: async (fileName: string) => {
        calls.push({ method: 'delete', fileName });
        return true;
      },
    },
  };

  const mediaService = createMediaService();
  const saved = await mediaService.saveFile('anexo.jpg', 'fakebase64');
  const read = await mediaService.readFile('anexo.jpg');
  const deleted = await mediaService.deleteFile('anexo.jpg');

  assert.equal(saved, 'anexo.jpg');
  assert.equal(read, 'base64data');
  assert.equal(deleted, true);
  assert.deepEqual(calls, [
    { method: 'save', fileName: 'anexo.jpg' },
    { method: 'read', fileName: 'anexo.jpg' },
    { method: 'delete', fileName: 'anexo.jpg' },
  ]);

  console.log('Media service tests passed!');
}

test().catch((error) => {
  console.error(error);
  process.exit(1);
});
