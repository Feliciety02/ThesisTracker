import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../apps-script/WebApp.gs', import.meta.url), 'utf8');

function setupContext(getUi) {
  const messages = [];
  const context = vm.createContext({
    console: { log: message => messages.push(String(message)), error: message => messages.push(String(message)) },
    SpreadsheetApp: { getUi },
    CFG: { members: [{ tab: 'Fe Anne', prefix: 'FA' }] },
  });
  vm.runInContext(source, context);
  const folder = { getUrl: () => 'https://drive.google.com/drive/folders/test' };
  context.photoRoot_ = () => folder;
  context.childFolder_ = () => folder;
  context.migrateLegacyPhotos_ = () => 0;
  context.autoRenamePhotos_ = () => ({ renamed: 0 });
  context.ensureRenameTrigger_ = () => {};
  return { context, messages };
}

test('photo folder setup works from the Apps Script editor without spreadsheet UI', () => {
  const { context, messages } = setupContext(() => { throw new Error('Cannot call getUi from this context'); });
  assert.equal(context.setupPhotoFolder(), 'https://drive.google.com/drive/folders/test');
  assert.match(messages.join('\n'), /Photo folder connected/);
});

test('photo folder setup still reports through the spreadsheet menu', () => {
  const alerts = [];
  const ui = { ButtonSet: { OK: 'OK' }, alert: (...args) => alerts.push(args) };
  const { context } = setupContext(() => ui);
  assert.equal(context.setupPhotoFolder(), 'https://drive.google.com/drive/folders/test');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0][0], 'Photo folder connected');
});

test('missing Drive scope is diagnosed separately from folder sharing', () => {
  const { context, messages } = setupContext(() => { throw new Error('Cannot call getUi from this context'); });
  context.photoRoot_ = () => { throw new Error('You do not have permission to call DriveApp.getFolderById. Required permissions: https://www.googleapis.com/auth/drive'); };
  assert.throws(() => context.setupPhotoFolder(), /DriveApp\.getFolderById/);
  assert.match(messages.join('\n'), /Google Drive permission needed/);
  assert.match(messages.join('\n'), /oauthScopes/);
  assert.doesNotMatch(messages.join('\n'), /can EDIT this folder/);
});
