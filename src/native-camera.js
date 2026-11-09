import { Capacitor, registerPlugin } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { App } from '@capacitor/app';

const available = Capacitor.isNativePlatform();
const BackgroundUpload = available ? registerPlugin('BackgroundUpload') : null;
const restored = [];

async function imageBlob(photo) {
  if (photo.webPath) {
    try {
      const response = await fetch(photo.webPath);
      if (response.ok) return await response.blob();
    } catch (e) { /* try the native file URI below */ }
  }
  if (!photo.uri) throw new Error('Camera returned no readable photo.');
  const { data } = await Filesystem.readFile({ path: photo.uri });
  if (data instanceof Blob) return data;
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  return new Blob([bytes], { type: 'image/jpeg' });
}

async function saveNamed(name, photo, blob) {
  if (!BackgroundUpload) throw new Error('Gallery save is unavailable.');
  try { await BackgroundUpload.saveNamedPhoto({ name, uri: photo && photo.uri || '' }); }
  catch (e) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    await BackgroundUpload.saveNamedPhoto({ name, b64: btoa(binary) });
  }
}

async function materialize(photo, name) {
  if (!photo) throw new Error('Camera returned no photo.');
  const blob = await imageBlob(photo);
  await saveNamed(name, photo, blob);
  return { blob, saved: true };
}

async function fromGallery(result, name) {
  const photo = result && result.results && result.results[0];
  if (!photo) return null;
  return materialize(photo, name);
}

if (available) {
  App.addListener('appRestoredResult', result => {
    if (result.pluginId === 'Camera' && ['takePhoto', 'chooseFromGallery'].includes(result.methodName)) {
      restored.push(result);
      window.dispatchEvent(new Event('thesis-camera-restored'));
    }
  });
}

window.ThesisNativeCamera = {
  available,
  async take(name) {
    const photo = await Camera.takePhoto({
      quality: 85,
      saveToGallery: false,
      correctOrientation: true,
    });
    return materialize(photo, name);
  },
  async choose(name) {
    return fromGallery(await Camera.chooseFromGallery({ limit: 1 }), name);
  },
  async takeRestored(name) {
    const result = restored.shift();
    if (!result) return null;
    if (result.error) throw new Error(result.error.message || 'Camera was interrupted. Retake the photo.');
    return result.methodName === 'chooseFromGallery' ? fromGallery(result.data, name) : materialize(result.data, name);
  },
};

window.ThesisBackgroundUpload = {
  available: !!BackgroundUpload,
  setSession: (token, url) => BackgroundUpload.setSession({ token, url }),
  clearSession: () => BackgroundUpload.clearSession(),
  enqueue: job => BackgroundUpload.enqueue({ job }),
  status: () => BackgroundUpload.status(),
  acknowledge: (key, at) => BackgroundUpload.acknowledge({ key, at }),
  cancel: key => BackgroundUpload.cancel({ key }),
  saveNamedPhoto: (name, b64) => BackgroundUpload.saveNamedPhoto({ name, b64 }),
  deleteNamedPhoto: name => BackgroundUpload.deleteNamedPhoto({ name }),
  readNamedPhoto: name => BackgroundUpload.readNamedPhoto({ name }),
};
