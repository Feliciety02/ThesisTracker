import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

function openVersion2() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bt-photos', 2);
    request.onupgradeneeded = () => request.result.createObjectStore('q');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function put(db, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('q', 'readwrite');
    transaction.objectStore('q').put(value, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

test('offline photo survives the gallery database upgrade and can be retried', async () => {
  const oldDb = await openVersion2();
  const photo = { id: 'FA-001', angle: 1, b64: 'photo-data', at: 1 };
  await put(oldDb, 'FA-001_1', photo);
  oldDb.close();

  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.indexOf('const PhotoQ = (() => {');
  const end = html.indexOf('\n})();', start);
  assert.ok(start >= 0 && end > start, 'photo queue exists in the app');
  const queue = runInNewContext(html.slice(start, end + 6) + '\nPhotoQ;', { indexedDB, IDBKeyRange, Promise });

  assert.equal((await queue.all()).length, 1);
  assert.equal((await queue.all())[0].b64, photo.b64);
  await queue.galleryPut('FA-001_1', { id: photo.id, angle: photo.angle, blob: new Blob(['image']), name: 'FA-001_01.jpg' });
  assert.deepEqual(Array.from(await queue.galleryKeys()), ['FA-001_1']);
  assert.equal((await queue.galleryFor(photo.id)).length, 1);
  await queue.del('FA-001_1');
  assert.equal((await queue.all()).length, 0);
});
