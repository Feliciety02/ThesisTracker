/**
 * ============================================================
 *  API — backend for the Banana Thesis Tracker app (GitHub Pages)
 * ============================================================
 *  Put this in the SAME Apps Script project as ThesisTracker.gs,
 *  as a script file named  WebApp. (No HTML file is needed; if you
 *  added "Index" earlier, delete it.)
 *
 *  1. Deploy → New deployment → gear → Web app
 *       Execute as:       Me
 *       Who has access:   Anyone
 *     → Deploy → copy the Web app URL (ends in /exec).
 *  2. Paste that URL into config.js in the GitHub repo.
 *  3. After changing this code: Deploy → Manage deployments → pencil →
 *     Version: New version → Deploy. The URL stays the same.
 *
 *  Members log in by picking their name in the app (no password).
 *  Every change is written to the "Activity" tab with who made it.
 * ============================================================
 */

/** Opening the API link in a browser shows a friendly page that points to the app. */
const APP_URL = 'https://feliciety02.github.io/ThesisTracker/';
function doGet() {
  const html =
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f5e8;font-family:Arial,sans-serif;color:#1f3b33}' +
    '.c{background:#fff;border-radius:18px;padding:28px 24px;max-width:360px;margin:16px;text-align:center;box-shadow:0 8px 24px rgba(31,59,51,.1)}' +
    'h1{font-size:24px;margin:8px 0}p{color:#5f6f66;font-size:14px}' +
    'a{display:block;background:#1f4b3a;color:#fff;text-decoration:none;font-weight:bold;padding:14px;border-radius:12px;margin-top:16px}</style></head>' +
    '<body><div class="c"><div style="font-size:40px">🍌</div><h1>Banana Thesis Tracker</h1>' +
    '<p>✅ The tracker server is running. This link is only the connection to the Google Sheet. Open the app to use the tracker.</p>' +
    '<a href="' + APP_URL + '" target="_top">Open the tracker app</a></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Banana Thesis Tracker')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** The app sends {user, fn, args} as text/plain JSON (avoids a CORS preflight). */
function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = String(req.user || '');
    if (!CFG.members.some(m => m.tab === user)) {
      return json_({ ok: false, auth: true, error: 'Please pick who you are.' });
    }
    const actions = {
      getData: getData, updateTask: updateTask, addTask: addTask, updateRevision: updateRevision,
      updateSample: updateSample, updateSupply: updateSupply, setRcpcDate: setRcpcDate,
      uploadPhoto: uploadPhoto, createSample: createSample,
      deleteTask: deleteTask, addSupply: addSupply, deleteSupply: deleteSupply, uploadReceipt: uploadReceipt,
    };
    const fn = actions[req.fn];
    if (!fn) throw new Error('Unknown action: ' + req.fn);
    const args = Array.isArray(req.args) ? req.args : [];
    if (req.fn !== 'getData') {
      let what = req.fn;
      try { what = describe_(req.fn, args); } catch (err) {}   // described before the change (so deletes keep their names)
      const result = fn.apply(null, args);   // writes return only what changed (fast)
      try { logActivity_(user, what); } catch (err) { /* never block a save on the log */ }
      return json_({ ok: true, data: result });
    }
    return json_({ ok: true, data: getData() });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- activity log ---------- */
function activitySheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Activity');
  if (!sh) {
    sh = ss.insertSheet('Activity');
    sh.setTabColor('#588d10');
    sh.getRange(1, 1, 1, 3).setValues([['When', 'Who', 'What']])
      .setBackground('#1f4b3a').setFontColor('#ffffff').setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 90); sh.setColumnWidth(3, 560);
  }
  return sh;
}

function short_(t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; }

function describe_(fn, a) {
  const ss = SpreadsheetApp.getActive();
  const show = v => v === true ? '✔' : v === false ? '✘' : (v === '' || v == null ? '(blank)' : String(v));
  if (fn === 'updateTask') {
    const r = ss.getSheetByName(a[0]).getRange(Number(a[1]), 1, 1, 2).getValues()[0];
    return 'updated ' + r[0] + ' "' + short_(r[1], 50) + '": ' + a[2] + ' → ' + show(a[3]);
  }
  if (fn === 'addTask') return 'added a task for ' + a[0] + ': "' + short_(a[1] && a[1].task, 60) + '"';
  if (fn === 'updateRevision') {
    const c = ss.getSheetByName('Panel Revisions').getRange(Number(a[0]), 3).getValue();
    return 'panel item "' + short_(c, 50) + '": ' + a[1] + ' → ' + show(a[2]);
  }
  if (fn === 'updateSample') return 'sample ' + a[0] + ': ' + a[1] + ' → ' + show(a[2]);
  if (fn === 'createSample') return 'started new sample ' + a[0];
  if (fn === 'deleteTask') {
    const r = ss.getSheetByName(a[0]).getRange(Number(a[1]), 1, 1, 2).getValues()[0];
    return 'deleted task ' + r[0] + ' "' + short_(r[1], 50) + '"';
  }
  if (fn === 'addSupply') return 'added expense "' + short_(a[0] && a[0].item, 40) + '"';
  if (fn === 'uploadReceipt') return 'attached a receipt to "' + short_(ss.getSheetByName('Expenses').getRange(Number(a[0]), 1).getValue(), 40) + '"';
  if (fn === 'deleteSupply') return 'deleted expense "' + short_(ss.getSheetByName('Expenses').getRange(Number(a[0]), 1).getValue(), 40) + '"';
  if (fn === 'updateSupply') {
    const item = ss.getSheetByName('Expenses').getRange(Number(a[0]), 1).getValue();
    return 'expense "' + short_(item, 40) + '": ' + a[1] + ' → ' + show(a[2]);
  }
  if (fn === 'uploadPhoto') {
    const id = a[0];
    const n = Number(a[1]);
    return 'took photo ' + id + '_' + ('0' + n).slice(-2) + '.jpg (' + (CFG.photoAngles[n - 1] || 'angle ' + n) + ')';
  }
  if (fn === 'setRcpcDate') return 'set the DA RCPC submission date → ' + show(a[0]);
  return fn;
}

function logActivity_(user, what) {
  const sh = activitySheet_();
  sh.insertRowAfter(1);
  sh.getRange(2, 1, 1, 3).setValues([[new Date(), user, what]]);
  sh.getRange(2, 1).setNumberFormat('mmm d, h:mm am/pm');
  if (sh.getMaxRows() > 600) sh.deleteRows(502, sh.getMaxRows() - 501); // keep the newest ~500
}

function readActivity_(tz) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Activity');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, Math.min(10, sh.getLastRow() - 1), 3).getValues()
    .filter(r => r[1])
    .map(r => ({ when: r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'MMM d, h:mm a') : String(r[0]), who: String(r[1]), what: String(r[2]) }));
}

/* ---------- helpers ---------- */
function fmtDate_(v, tz) {
  return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : '';
}
function parseDate_(s) {
  if (!s) return '';
  const p = String(s).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}
function parseLink_(formula, value) {
  const m = String(formula || '').match(/HYPERLINK\("([^"]+)"\s*[,;]\s*"([^"]*)"\)/i);
  if (m) return { url: m[1], label: m[2] };
  if (/^https?:\/\//.test(String(value))) return { url: String(value), label: 'Link' };
  return null;
}
function withLock_(fn) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Missing tab "' + name + '". Run setupTracker first.');
  return sh;
}
function memberSheet_(tab) {
  if (!CFG.members.some(m => m.tab === tab)) throw new Error('Unknown member: ' + tab);
  return sheet_(tab);
}
function suppliesTotalRow_(sh) {
  const vals = sh.getRange(3, 4, Math.max(1, sh.getLastRow() - 2), 1).getValues();
  for (let i = 0; i < vals.length; i++) if (vals[i][0] === 'TOTAL') return i + 3;
  return sh.getLastRow() + 1;
}

/* ---------- read ---------- */
function getData() {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();

  const members = CFG.members.map(m => {
    const sh = ss.getSheetByName(m.tab);
    const tasks = [];
    if (sh && sh.getLastRow() >= 4) {
      const rng = sh.getRange(4, 1, sh.getLastRow() - 3, 9);
      const v = rng.getValues(), f = rng.getFormulas();
      v.forEach((r, i) => {
        if (!r[1]) return;
        tasks.push({
          row: i + 4, id: String(r[0]), task: String(r[1]), category: String(r[2] || ''),
          priority: String(r[3] || ''), status: String(r[4] || 'Not Started'), due: fmtDate_(r[5], tz),
          link: parseLink_(f[i][6], r[6]), notes: String(r[7] || ''), completed: fmtDate_(r[8], tz),
        });
      });
    }
    return { tab: m.tab, name: m.name, role: m.role, email: m.email, color: m.color, light: m.light, prefix: m.prefix, tasks };
  });

  const revisions = [];
  const rev = ss.getSheetByName('Panel Revisions');
  if (rev && rev.getLastRow() >= 4) {
    rev.getRange(4, 1, rev.getLastRow() - 3, 8).getValues().forEach((r, i) => {
      if (!r[2]) return;
      revisions.push({
        row: i + 4, item: String(r[0]), section: String(r[1]), comment: String(r[2]), owner: String(r[3]),
        status: String(r[4] || 'NC'), page: String(r[5] || ''), signed: r[6] === true, notes: String(r[7] || ''),
      });
    });
  }

  const samples = [];
  const smp = ss.getSheetByName('DA RCPC Samples');
  if (smp && smp.getLastRow() >= 4) {
    const srng = smp.getRange(4, 1, smp.getLastRow() - 3, 15);
    const sf = srng.getFormulas();
    srng.getValues().forEach((r, i) => {
      if (!r[0]) return;
      const fl = parseLink_(sf[i][13], r[13]);
      samples.push({
        folder: fl ? fl.url : '',
        angles: String(r[14] || '').split(/[^0-9]+/).filter(String).map(Number),
        row: i + 4, id: String(r[0]), disease: String(r[1] || ''), date: fmtDate_(r[2], tz), site: String(r[3] || ''),
        by: String(r[4] || ''), photos: r[5] === '' ? '' : Number(r[5]), cotton: r[7] === true, bagged: r[8] === true,
        submitted: fmtDate_(r[9], tz), validated: String(r[10] || ''), notes: String(r[12] || ''),
      });
    });
  }

  const supplies = [];
  const sup = ss.getSheetByName('Expenses');
  if (sup) {
    const total = suppliesTotalRow_(sup);
    if (total > 3) {
      const srng = sup.getRange(3, 1, total - 3, 11), sfm = srng.getFormulas();
      srng.getValues().forEach((r, i) => {
        if (!r[0]) return;
        const rc = parseLink_(sfm[i][10], r[10]);
        supplies.push({
          category: String(r[8] || ''), date: fmtDate_(r[9], tz), receipt: rc ? rc.url : '',
          row: i + 3, item: String(r[0] || ''), purpose: String(r[1] || ''), qty: r[2] === '' ? '' : Number(r[2]),
          cost: r[3] === '' ? '' : Number(r[3]), assigned: String(r[5] || ''), bought: r[6] === true, notes: String(r[7] || ''),
        });
      });
    }
  }

  const lists = ss.getSheetByName('Lists');
  const classes = lists
    ? lists.getRange(2, 4, 30, 1).getValues().map(r => String(r[0])).filter(String)
    : CFG.classes;

  const dash = ss.getSheetByName('Dashboard');
  return {
    title: CFG.title,
    thesisTitle: CFG.thesisTitle,
    sheetUrl: ss.getUrl(),
    rcpcDate: dash ? fmtDate_(dash.getRange('E4').getValue(), tz) : '',
    members, revisions, samples, supplies,
    activity: readActivity_(tz),
    photoFolderUrl: folderUrl_('PHOTO_FOLDER_ID_V2'),
    receiptFolderUrl: folderUrl_('RECEIPT_FOLDER_ID'),
    photoAngles: CFG.photoAngles,
    links: Object.keys(LINKS).map(k => LINKS[k]),
    lists: { expenseCategories: CFG.expenseCategories, statuses: CFG.statuses, priorities: CFG.priorities, categories: CFG.categories, classes, revStatuses: CFG.revStatuses },
    panel: { adviser: 'Ms. Barbosa', members: ['Mr. Aborde', 'Mr. Hernando', 'Ms. Yara'], defense: 'Outline Defense · Sep 22, 2026 · Accepted with major revision' },
  };
}

/* ---------- write ---------- */
function updateTask(tab, row, field, value) {
  return withLock_(() => {
    const sh = memberSheet_(tab);
    row = Number(row);
    if (row < 4) throw new Error('Bad row');
    const col = { task: 2, category: 3, priority: 4, status: 5, due: 6, notes: 8 }[field];
    if (!col) throw new Error('Field not editable: ' + field);
    sh.getRange(row, col).setValue(field === 'due' ? parseDate_(value) : value);
    if (field === 'status') {
      const stamp = sh.getRange(row, 9);
      if (value === 'Done') { if (!stamp.getValue()) stamp.setValue(new Date()); }
      else stamp.clearContent();
    }
    return true;
  });
}

function addTask(tab, t) {
  return withLock_(() => {
    const sh = memberSheet_(tab);
    if (!t || !String(t.task || '').trim()) throw new Error('Task text is required');
    const vals = sh.getRange(4, 1, CFG.maxRows, 2).getValues();
    let row = -1, max = 0;
    vals.forEach((r, i) => {
      const m = String(r[0]).match(/(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
      if (row < 0 && !r[1]) row = i + 4;
    });
    if (row < 0) throw new Error('This tab is full (' + CFG.maxRows + ' tasks).');
    const id = tab.charAt(0).toUpperCase() + '-' + ('0' + (max + 1)).slice(-2);
    sh.getRange(row, 1, 1, 6).setValues([[id, String(t.task).trim(), t.category || '', t.priority || 'Medium', 'Not Started', parseDate_(t.due)]]);
    sh.getRange(row, 8).setValue(t.notes || '');
    return { row: row, id: id, task: String(t.task).trim(), category: t.category || '', priority: t.priority || 'Medium',
             status: 'Not Started', due: t.due || '', link: null, notes: t.notes || '', completed: '' };
  });
}

function deleteTask(tab, row) {
  return withLock_(() => {
    const sh = memberSheet_(tab);
    row = Number(row);
    if (row < 4) throw new Error('Bad row');
    sh.getRange(row, 1, 1, 9).clearContent();   // keeps the dropdowns; the row is reused by the next new task
    return true;
  });
}

function updateRevision(row, field, value) {
  return withLock_(() => {
    const sh = sheet_('Panel Revisions');
    row = Number(row);
    if (row < 4) throw new Error('Bad row');
    const col = { status: 5, page: 6, signed: 7, notes: 8 }[field];
    if (!col) throw new Error('Field not editable: ' + field);
    sh.getRange(row, col).setValue(value);
    return true;
  });
}

/* ---------- samples (addressed by label, e.g. "FA-004") ---------- */
function sampleRow_(sh, id) {
  const last = Math.max(4, sh.getLastRow());
  const ids = sh.getRange(4, 1, last - 3, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 4;
  return -1;
}

/** Adds a new sample row for a label the app handed out (FA-004, RJ-012, …). Safe to call twice. */
function createSample(id) {
  id = String(id || '').toUpperCase();
  const m = CFG.members.find(x => id.indexOf(x.prefix + '-') === 0);
  if (!m || !/^[A-Z]{2}-\d{3,}$/.test(id)) throw new Error('Bad sample label: ' + id);
  return withLock_(() => {
    const sh = sheet_('DA RCPC Samples');
    let row = sampleRow_(sh, id);
    if (row > 0) return { id: id, row: row };
    const vals = sh.getRange(4, 1, Math.max(1, sh.getMaxRows() - 3), 1).getValues();
    row = -1;
    for (let i = 0; i < vals.length; i++) if (!vals[i][0]) { row = i + 4; break; }
    if (row < 0) { sh.insertRowsAfter(sh.getMaxRows(), 50); row = vals.length + 4; }
    sh.getRange(row, 1).setValue(id).setBackground(m.light).setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(row, 5).setValue(m.tab);
    sh.getRange(row, 3).setValue(new Date());   // started today
    sh.getRange(row, 7).setFormulaR1C1('=IF(RC6="","",RC1&"_01.jpg … "&RC1&"_"&TEXT(RC6,"00")&".jpg")');
    sh.getRange(row, 12).setFormulaR1C1('=IF(RC11="","",IF(RC11=RC2,"✓ Match","✗ Differs"))');
    sh.getRange(row, 15).setNumberFormat('@');
    return { id: id, row: row };
  });
}

function updateSample(id, field, value) {
  const col = { disease: 2, date: 3, site: 4, by: 5, photos: 6, cotton: 8, bagged: 9, submitted: 10, validated: 11, notes: 13 }[field];
  if (!col) throw new Error('Field not editable: ' + field);
  if (field === 'date' || field === 'submitted') value = parseDate_(value);
  createSample(id);                       // in case it was started offline on another path
  return withLock_(() => {
    const sh = sheet_('DA RCPC Samples');
    sh.getRange(sampleRow_(sh, String(id).toUpperCase()), col).setValue(value);
    return true;
  });
}

function updateSupply(row, field, value) {
  return withLock_(() => {
    const sh = sheet_('Expenses');
    row = Number(row);
    if (row < 3 || row >= suppliesTotalRow_(sh)) throw new Error('Bad row');
    const col = { item: 1, purpose: 2, qty: 3, cost: 4, assigned: 6, bought: 7, notes: 8, category: 9, date: 10 }[field];
    if (!col) throw new Error('Field not editable: ' + field);
    sh.getRange(row, col).setValue(field === 'date' ? parseDate_(value) : value);
    return true;
  });
}

function addSupply(x) {
  if (!x || !String(x.item || '').trim()) throw new Error('Item name is required');
  return withLock_(() => {
    const sh = sheet_('Expenses');
    let total = suppliesTotalRow_(sh), row = -1;
    const vals = sh.getRange(3, 1, Math.max(1, total - 3), 1).getValues();
    for (let i = 0; i < vals.length; i++) if (!vals[i][0]) { row = i + 3; break; }
    if (row < 0) {                                  // no empty line left: add one above TOTAL
      sh.insertRowBefore(total);
      row = total; total++;
      sh.getRange(row, 5).setFormulaR1C1('=IF(OR(RC3="",RC4=""),"",RC3*RC4)');
      sh.getRange(row, 7).insertCheckboxes();
      sh.getRange(total, 5).setFormula('=SUM(E3:E' + (total - 1) + ')');
    }
    const qty = x.qty === '' || x.qty == null ? 1 : Number(x.qty);
    const cost = x.cost === '' || x.cost == null ? '' : Number(x.cost);
    sh.getRange(row, 1, 1, 4).setValues([[String(x.item).trim(), x.purpose || '', qty, cost]]);
    sh.getRange(row, 6).setValue(x.assigned || '');
    sh.getRange(row, 7).setValue(x.bought === true);
    sh.getRange(row, 8).setValue(x.notes || '');
    sh.getRange(row, 9).setValue(x.category || 'Other');
    sh.getRange(row, 10).setValue(x.date ? parseDate_(x.date) : new Date()).setNumberFormat('mmm d, yyyy');
    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    return { row: row, item: String(x.item).trim(), purpose: x.purpose || '', qty: qty, cost: cost, assigned: x.assigned || '', bought: x.bought === true,
             notes: x.notes || '', category: x.category || 'Other', date: fmtDate_(sh.getRange(row, 10).getValue(), tz), receipt: '' };
  });
}

function deleteSupply(row) {
  return withLock_(() => {
    const sh = sheet_('Expenses');
    row = Number(row);
    if (row < 3 || row >= suppliesTotalRow_(sh)) throw new Error('Bad row');
    sh.getRange(row, 1, 1, 4).clearContent();       // keeps the subtotal formula + checkbox for reuse
    sh.getRange(row, 6).clearContent();
    sh.getRange(row, 7).setValue(false);
    sh.getRange(row, 8).clearContent();
    sh.getRange(row, 9, 1, 3).clearContent();
    return true;
  });
}

function setRcpcDate(iso) {
  return withLock_(() => {
    sheet_('Dashboard').getRange('E4').setValue(parseDate_(iso));
    return true;
  });
}

/* ---------- sample photos (Google Drive) ---------- */
// The team's "Curated Banana Leaf Disease Dataset" folder (everyone already has access).
const DATASET_FOLDER_ID = '1OxFuhfrEIChjzVFISjBL0J8yrMM2af-P';
// Photos go into ONE subfolder there, so they never mix with the curated images:
//   Curated Banana Leaf Disease Dataset / DA RCPC Sample Photos / FA-001_01.jpg …
const PHOTO_SUBFOLDER = 'DA RCPC Sample Photos';

function photoFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PHOTO_FOLDER_ID_V2');
  if (id) {
    try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {}
  }
  const parent = DriveApp.getFolderById(DATASET_FOLDER_ID);
  const it = parent.getFoldersByName(PHOTO_SUBFOLDER);
  const f = it.hasNext() ? it.next() : parent.createFolder(PHOTO_SUBFOLDER);
  props.setProperty('PHOTO_FOLDER_ID_V2', f.getId());
  return f;
}

/**
 * Saves one photo as  <ID>_<NN>.jpg  in the DA RCPC Sample Photos folder.
 * Retaking an angle replaces the old file. Returns only what changed for that sample.
 */
function uploadPhoto(id, angle, b64) {
  id = String(id || '').toUpperCase(); angle = Number(angle);
  if (!(angle >= 1 && angle <= CFG.photoAngles.length)) throw new Error('Angle must be 1–' + CFG.photoAngles.length);
  if (!b64 || String(b64).length < 100) throw new Error('Empty photo');
  const sh = sheet_('DA RCPC Samples');
  createSample(id);                       // a sample started offline gets its row here if needed

  const folder = photoFolder_();
  const name = id + '_' + ('0' + angle).slice(-2) + '.jpg';
  const old = folder.getFilesByName(name);
  while (old.hasNext()) old.next().setTrashed(true);
  folder.createFile(Utilities.newBlob(Utilities.base64Decode(String(b64).replace(/^data:image\/\w+;base64,/, '')), 'image/jpeg', name));

  return withLock_(() => {
    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    const row = sampleRow_(sh, id);
    const cell = sh.getRange(row, 15);
    const angles = String(cell.getValue() || '').split(/[^0-9]+/).filter(String).map(Number);
    if (angles.indexOf(angle) < 0) angles.push(angle);
    angles.sort((a, b) => a - b);
    cell.setNumberFormat('@').setValue(angles.join(' '));
    sh.getRange(row, 6).setValue(angles.length);
    const dateCell = sh.getRange(row, 3);
    if (!dateCell.getValue()) dateCell.setValue(new Date());  // first photo = collected today
    const url = folder.getUrl();
    sh.getRange(row, 14).setFormula('=HYPERLINK("' + url + '","Open photos ↗")');
    return { angles: angles, photos: angles.length, folder: url, date: fmtDate_(dateCell.getValue(), tz) };
  });
}

/** Menu: 🍌 Thesis Tracker → 📷 Connect photo folder. Run once; grants Drive permission. */
function setupPhotoFolder() {
  const ui = SpreadsheetApp.getUi();
  let f;
  try { f = photoFolder_(); }
  catch (e) {
    ui.alert('Could not open the dataset folder',
      'Make sure the account that owns this script can EDIT the "Curated Banana Leaf Disease Dataset" folder.\n\n' + e.message, ui.ButtonSet.OK);
    return;
  }
  ui.alert('Photo folder connected 📷',
    'Photos from the app are saved here:\nCurated Banana Leaf Disease Dataset / ' + PHOTO_SUBFOLDER + '\n' + f.getUrl() +
    '\n\nNow make a New version of the web app deployment (Deploy → Manage deployments → ✏️ → New version) so the app can save photos.',
    ui.ButtonSet.OK);
}

function folderUrl_(prop) {
  const id = PropertiesService.getScriptProperties().getProperty(prop);
  return id ? 'https://drive.google.com/drive/folders/' + id : '';
}

/* ---------- expense receipts (Google Drive) ---------- */
// Receipts stay OUT of the dataset folder: "Banana Thesis – Receipts" in the script owner's Drive, shared with the team.
function receiptFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('RECEIPT_FOLDER_ID');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const f = DriveApp.createFolder('Banana Thesis – Receipts');
  props.setProperty('RECEIPT_FOLDER_ID', f.getId());
  const me = Session.getEffectiveUser().getEmail();
  CFG.members.forEach(m => { if (m.email && m.email !== me) { try { f.addEditor(m.email); } catch (e) {} } });
  return f;
}

/** Saves a receipt photo for an expense row and links it in the Receipt column. Retaking replaces it. */
function uploadReceipt(row, b64) {
  row = Number(row);
  if (!b64 || String(b64).length < 100) throw new Error('Empty photo');
  const sh = sheet_('Expenses');
  if (row < 3 || row >= suppliesTotalRow_(sh)) throw new Error('Bad row');
  const v = sh.getRange(row, 1, 1, 10).getValues()[0];
  if (!v[0]) throw new Error('That expense no longer exists');
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const day = Utilities.formatDate(v[9] instanceof Date ? v[9] : new Date(), tz, 'yyyy-MM-dd');
  const name = 'Receipt_row' + row + '_' + day + '_' + String(v[0]).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) + (v[5] ? '_' + v[5] : '') + '.jpg';
  const folder = receiptFolder_();
  const old = folder.getFiles();
  while (old.hasNext()) { const f = old.next(); if (f.getName().indexOf('Receipt_row' + row + '_') === 0) f.setTrashed(true); }
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(String(b64).replace(/^data:image\/\w+;base64,/, '')), 'image/jpeg', name));
  return withLock_(() => {
    sh.getRange(row, 11).setFormula('=HYPERLINK("' + file.getUrl() + '","Receipt ↗")');
    return { receipt: file.getUrl() };
  });
}
