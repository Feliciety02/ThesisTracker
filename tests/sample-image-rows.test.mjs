import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../apps-script/WebApp.gs', import.meta.url), 'utf8');
const blank = () => Array(16).fill('');

function fakeSheet() {
  const rows = Array.from({ length: 30 }, blank);
  const formulas = Array.from({ length: 30 }, blank);
  const sheet = {
    rows, formulas,
    getMaxRows: () => rows.length,
    getLastRow: () => Math.max(3, rows.findLastIndex(r => r.some(v => v !== '' && v !== false)) + 1),
    insertRowsBefore(row, count = 1) { rows.splice(row - 1, 0, ...Array.from({ length: count }, blank)); formulas.splice(row - 1, 0, ...Array.from({ length: count }, blank)); },
    insertRowsAfter(row, count = 1) { rows.splice(row, 0, ...Array.from({ length: count }, blank)); formulas.splice(row, 0, ...Array.from({ length: count }, blank)); },
    deleteRows(row, count) { rows.splice(row - 1, count); formulas.splice(row - 1, count); },
    setRowHeight() {},
    getRange(row, col, height = 1, width = 1) {
      const range = {
        getValues: () => Array.from({ length: height }, (_, i) => rows[row - 1 + i].slice(col - 1, col - 1 + width)),
        getFormulas: () => Array.from({ length: height }, (_, i) => formulas[row - 1 + i].slice(col - 1, col - 1 + width)),
        getValue: () => rows[row - 1][col - 1],
        setValue(v) { rows[row - 1][col - 1] = v; return this; },
        setFormula(v) { formulas[row - 1][col - 1] = v; rows[row - 1][col - 1] = 'Open image'; return this; },
        setFormulaR1C1(v) { formulas[row - 1][col - 1] = v; return this; },
        clearContent() { for (let i = 0; i < height; i++) for (let j = 0; j < width; j++) { rows[row - 1 + i][col - 1 + j] = ''; formulas[row - 1 + i][col - 1 + j] = ''; } return this; },
        insertCheckboxes() { for (let i = 0; i < height; i++) for (let j = 0; j < width; j++) rows[row - 1 + i][col - 1 + j] = false; return this; },
      };
      for (const method of ['clearDataValidations', 'setNumberFormat', 'setBackground', 'setFontColor', 'setFontWeight', 'setHorizontalAlignment', 'setDataValidation']) range[method] = () => range;
      return range;
    },
  };
  return sheet;
}

function contextFor(sheet) {
  const ss = { getSheetByName: name => name === 'DA RCPC Samples' ? sheet : null, getSpreadsheetTimeZone: () => 'Asia/Manila', getUrl: () => 'https://docs.google.com/spreadsheets/d/test' };
  const ctx = vm.createContext({
    console,
    CFG: { title: 'Tracker', thesisTitle: 'Test', classes: ['Healthy'], photoAngles: ['Whole leaf', 'Left side only', 'Top lesions', 'Right side only', 'Back in different light'],
      members: [{ tab: 'Fe Anne', prefix: 'FA', light: '#eee' }, { tab: 'Rho', prefix: 'RJ', light: '#eee' }] },
    LINKS: {},
    SpreadsheetApp: { getActive: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
  });
  vm.runInContext(source, ctx);
  ctx.sheet_ = () => sheet;
  ctx.withLock_ = fn => fn();
  ctx.listRule_ = () => ({});
  ctx.photoFilesFor_ = () => [];
  ctx.sampleFolder_ = () => null;
  ctx.readActivity_ = () => [];
  ctx.photoRootUrl_ = () => '';
  ctx.folderUrl_ = () => '';
  ctx.readRecords_ = () => ({});
  ctx.readSettings_ = () => ({});
  ctx.currentVersion_ = () => '0';
  ctx.fmtDate_ = value => value ? '2026-11-09' : '';
  return ctx;
}

test('five image rows stay beneath their parent without overwriting the next sample', () => {
  const sh = fakeSheet();
  sh.rows[3][0] = 'FA-001';
  sh.rows[4][0] = 'RJ-001';
  const app = contextFor(sh);
  app.ensureSampleImageRows_(sh, 'FA-001');
  assert.equal(sh.rows[9][0], 'RJ-001');
  assert.deepEqual(sh.rows.slice(4, 9).map(r => r[6]), ['FA-001_01.jpg', 'FA-001_02.jpg', 'FA-001_03.jpg', 'FA-001_04.jpg', 'FA-001_05.jpg']);
  const length = sh.rows.length;
  app.ensureSampleImageRows_(sh, 'FA-001');
  assert.equal(sh.rows.length, length);
  sh.rows[10][7] = false; sh.rows[10][8] = false;
  assert.equal(app.createSample('FA-002', '').id, 'FA-002');
  assert.equal(sh.rows[10][0], 'FA-002');
  assert.equal(sh.rows[11][6], 'FA-002_01.jpg');
  assert.equal(sh.rows[10][2], '', 'a reserved label is not a captured leaf');
});

test('the app reads parent samples and their individual image links without counting image rows as samples', () => {
  const sh = fakeSheet();
  sh.rows[3][0] = 'FA-001';
  const app = contextFor(sh);
  const ScriptDate = vm.runInContext('Date', app);
  sh.rows[3][2] = new ScriptDate('2026-11-09T01:00:00Z');
  app.ensureSampleImageRows_(sh, 'FA-001');
  sh.rows[4][2] = new ScriptDate('2026-11-09T01:05:00Z');
  sh.rows[4][13] = 'Open image';
  sh.formulas[4][13] = '=HYPERLINK("https://drive.google.com/file/d/photo1/view","Open image")';
  const data = app.getData();
  assert.equal(data.samples.length, 1);
  assert.equal(data.samples[0].images.length, 5);
  assert.equal(data.samples[0].images[0].name, 'FA-001_01.jpg');
  assert.equal(data.samples[0].images[0].url, 'https://drive.google.com/file/d/photo1/view');
  assert.equal(data.samples[0].images[0].capturedAt, Date.parse('2026-11-09T01:05:00Z'));
});

test('deleting a sample removes its five image rows and keeps the next sample', () => {
  const sh = fakeSheet();
  sh.rows[3][0] = 'FA-001';
  sh.rows[4][0] = 'RJ-001';
  const app = contextFor(sh);
  app.ensureSampleImageRows_(sh, 'FA-001');
  app.deleteSample('FA-001');
  assert.equal(sh.rows[3][0], '');
  assert.equal(sh.rows[4][0], 'RJ-001');
  assert.equal(sh.rows.some(r => String(r[6]).startsWith('FA-001_')), false);
});

test('deleting one image updates its child row and parent count without touching another view', () => {
  const sh = fakeSheet();
  sh.rows[3][0] = 'FA-001';
  const app = contextFor(sh);
  const ScriptDate = vm.runInContext('Date', app);
  app.ensureSampleImageRows_(sh, 'FA-001');
  sh.rows[3][14] = '1 2'; sh.rows[3][5] = 2; sh.rows[3][2] = new ScriptDate('2026-11-09T01:00:00Z');
  for (const angle of [1, 2]) {
    sh.rows[3 + angle][2] = new ScriptDate('2026-11-09T01:05:00Z');
    sh.rows[3 + angle][13] = 'Open image';
    sh.formulas[3 + angle][13] = `=HYPERLINK("https://drive.google.com/file/d/${angle}/view","Open image")`;
  }
  const files = [1, 2].map(angle => ({ angle, trashed: false, getName: () => `FA-001_0${angle}.jpg`, setTrashed(value) { this.trashed = value; } }));
  app.photoFilesFor_ = () => files.filter(f => !f.trashed);
  const patch = app.deletePhoto('FA-001', 1);
  assert.equal(files[0].trashed, true);
  assert.equal(files[1].trashed, false);
  assert.equal(sh.rows[3][5], 1);
  assert.equal(sh.rows[4][2], '');
  assert.equal(sh.rows[4][13], '');
  assert.equal(sh.rows[5][13], 'Open image');
  assert.deepEqual(Array.from(patch.angles), [2]);
  assert.equal(patch.images[1].url, 'https://drive.google.com/file/d/2/view');
});
