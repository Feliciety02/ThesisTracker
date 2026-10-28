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
 *  Members sign in with their team email + password (see CFG.accounts).
 *  Every change is written to the "Activity" tab with who made it.
 * ============================================================
 */

let CURRENT_USER = '';   // set per request; used to fill "Done by"

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
    const args0 = Array.isArray(req.args) ? req.args : [];
    const open = { authStart: authStart, authForgot: authForgot, authVerify: authVerify, authLogin: authLogin };
    if (open[req.fn]) return json_({ ok: true, data: open[req.fn].apply(null, args0) });   // sign-in steps need no token
    const acct = tokenAccount_(req.token);
    if (!acct) return json_({ ok: false, auth: true, error: 'Please sign in.' });
    if (req.fn === 'authLogout') return json_({ ok: true, data: authLogout(req.token) });
    const user = acct.tab;
    CURRENT_USER = user;
    const actions = {
      getData: getData, updateTask: updateTask, addTask: addTask, updateRevision: updateRevision,
      updateSample: updateSample, updateSupply: updateSupply, setRcpcDate: setRcpcDate,
      uploadPhoto: uploadPhoto, createSample: createSample, exportValidatedDataset: exportValidatedDataset,
      updateRevisions: updateRevisions, rescheduleTasks: rescheduleTasks,
      deleteTask: deleteTask, addSupply: addSupply, deleteSupply: deleteSupply, uploadReceipt: uploadReceipt,
      addRecord: addRecord, updateRecord: updateRecord, deleteRecord: deleteRecord, setSetting: setSetting,
      submitSamples: submitSamples, listPhotos: listPhotos,
    };
    const fn = actions[req.fn];
    if (!fn) throw new Error('Unknown action: ' + req.fn);
    const args = Array.isArray(req.args) ? req.args : [];
    if (req.fn !== 'getData' && req.fn !== 'listPhotos') {
      let what = req.fn;
      try { what = describe_(req.fn, args); } catch (err) {}   // described before the change (so deletes keep their names)
      const result = fn.apply(null, args);   // writes return only what changed (fast)
      try { logActivity_(user, what); } catch (err) { /* never block a save on the log */ }
      return json_({ ok: true, data: result });
    }
    return json_({ ok: true, data: fn.apply(null, args) });
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
  if (fn === 'updateRevisions') return 'marked ' + (a[0] || []).length + ' panel item(s) ' + (a[1] === 'C' ? 'complied' : a[1]) + (a[2] ? ' · done by ' + a[2] : '');
  if (fn === 'rescheduleTasks') return 'moved ' + (a[0] || []).length + ' overdue task(s) to ' + a[1];
  if (fn === 'exportValidatedDataset') return 'exported the RCPC-validated photos into class folders';
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
  if (fn === 'submitSamples') return 'marked ' + (a[0] || []).length + ' sample(s) submitted to DA RCPC on ' + show(a[1]) + ': ' + short_((a[0] || []).join(', '), 80);
  if (fn === 'setSetting') return 'set ' + ({ leafGoal: 'the leaf goal', classGoal: 'the per-class goal', defenseDate: 'the final defense date' }[a[0]] || a[0]) + ' → ' + show(a[1]);
  if (fn === 'addRecord') return 'added to ' + RECORDS[a[0]].tab + ': "' + short_(recordLabel_(a[0], a[1]), 50) + '"';
  if (fn === 'updateRecord' || fn === 'deleteRecord') {
    const R = RECORDS[a[0]], vals = ss.getSheetByName(R.tab).getRange(Number(a[1]), 1, 1, R.fields.length).getValues()[0];
    const obj = {}; R.fields.forEach((f, i) => { obj[f[0]] = vals[i]; });
    return (fn === 'deleteRecord' ? 'deleted from ' : 'updated in ') + R.tab + ' "' + short_(recordLabel_(a[0], obj), 50) + '"' + (fn === 'updateRecord' ? ': ' + a[2] + ' → ' + show(a[3]) : '');
  }
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
      const rng = sh.getRange(4, 1, sh.getLastRow() - 3, 10);
      const v = rng.getValues(), f = rng.getFormulas();
      v.forEach((r, i) => {
        if (!r[1]) return;
        tasks.push({
          row: i + 4, id: String(r[0]), task: String(r[1]), category: String(r[2] || ''),
          priority: String(r[3] || ''), status: String(r[4] || 'Not Started'), due: fmtDate_(r[5], tz),
          link: parseLink_(f[i][6], r[6]), notes: String(r[7] || ''), completed: fmtDate_(r[8], tz), doneBy: String(r[9] || ''),
        });
      });
    }
    return { tab: m.tab, name: m.name, role: m.role, email: m.email, color: m.color, light: m.light, prefix: m.prefix, tasks };
  });

  const revisions = [];
  const rev = ss.getSheetByName('Panel Revisions');
  if (rev && rev.getLastRow() >= 4) {
    rev.getRange(4, 1, rev.getLastRow() - 3, 9).getValues().forEach((r, i) => {
      if (!r[2]) return;
      revisions.push({
        row: i + 4, item: String(r[0]), section: String(r[1]), comment: String(r[2]), owner: String(r[3]),
        status: String(r[4] || 'NC'), page: String(r[5] || ''), signed: r[6] === true, notes: String(r[7] || ''), doneBy: String(r[8] || ''),
      });
    });
  }

  const samples = [];
  const smp = ss.getSheetByName('DA RCPC Samples');
  if (smp && smp.getLastRow() >= 4) {
    const srng = smp.getRange(4, 1, smp.getLastRow() - 3, 16);
    const sf = srng.getFormulas();
    srng.getValues().forEach((r, i) => {
      if (!r[0]) return;
      const fl = parseLink_(sf[i][13], r[13]);
      samples.push({
        folder: fl ? fl.url : '',
        angles: String(r[14] || '').split(/[^0-9]+/).filter(String).map(Number),
        gps: String(r[15] || ''),
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
    exportFolderUrl: folderUrl_('EXPORT_FOLDER_ID'),
    backupFolderUrl: folderUrl_('BACKUP_FOLDER_ID'),
    photoAngles: CFG.photoAngles,
    links: Object.keys(LINKS).map(k => LINKS[k]),
    lists: { expenseCategories: CFG.expenseCategories, statuses: CFG.statuses, priorities: CFG.priorities, categories: CFG.categories, classes, revStatuses: CFG.revStatuses },
    records: readRecords_(tz),
    settings: readSettings_(),
    panel: { adviser: 'Ms. Barbosa', members: ['Mr. Aborde', 'Mr. Hernando', 'Ms. Yara'], defense: 'Outline Defense · Sep 22, 2026 · Accepted with major revision' },
  };
}

/* ---------- write ---------- */
function updateTask(tab, row, field, value) {
  return withLock_(() => {
    const sh = memberSheet_(tab);
    row = Number(row);
    if (row < 4) throw new Error('Bad row');
    const col = { task: 2, category: 3, priority: 4, status: 5, due: 6, notes: 8, doneBy: 10 }[field];
    if (!col) throw new Error('Field not editable: ' + field);
    sh.getRange(row, col).setValue(field === 'due' ? parseDate_(value) : value);
    if (field === 'status') {
      const stamp = sh.getRange(row, 9), by = sh.getRange(row, 10);
      if (value === 'Done') {
        if (!stamp.getValue()) stamp.setValue(new Date());
        if (!by.getValue() && CURRENT_USER) by.setValue(CURRENT_USER);   // whoever marked it done
      } else { stamp.clearContent(); by.clearContent(); }
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

/** Bulk: set many panel items' status at once (e.g. "mark complied · done by me"). */
function updateRevisions(rows, status, doneBy) {
  if (CFG.revStatuses.indexOf(status) < 0) throw new Error('Bad status');
  return withLock_(() => {
    const sh = sheet_('Panel Revisions');
    (rows || []).map(Number).filter(r => r >= 4).forEach(r => {
      sh.getRange(r, 5).setValue(status);
      sh.getRange(r, 9).setValue(status === 'C' ? (doneBy || CURRENT_USER || '') : '');
    });
    return true;
  });
}

/** Bulk: move many tasks' due date (e.g. everything overdue to next Friday). items = [{tab,row}] */
function rescheduleTasks(items, iso) {
  const d = parseDate_(iso);
  if (!d) throw new Error('Pick a date');
  return withLock_(() => {
    (items || []).forEach(it => { const sh = memberSheet_(it.tab), r = Number(it.row); if (r >= 4) sh.getRange(r, 6).setValue(d); });
    return true;
  });
}

function updateRevision(row, field, value) {
  return withLock_(() => {
    const sh = sheet_('Panel Revisions');
    row = Number(row);
    if (row < 4) throw new Error('Bad row');
    const col = { status: 5, page: 6, signed: 7, notes: 8, doneBy: 9 }[field];
    if (!col) throw new Error('Field not editable: ' + field);
    sh.getRange(row, col).setValue(value);
    if (field === 'status') {
      const by = sh.getRange(row, 9);
      if (value === 'C') { if (!by.getValue() && CURRENT_USER) by.setValue(CURRENT_USER); }
      else by.clearContent();
    }
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
  const col = { disease: 2, date: 3, site: 4, by: 5, photos: 6, cotton: 8, bagged: 9, submitted: 10, validated: 11, notes: 13, gps: 16 }[field];
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

/* ---------- dataset export for training / the paper ---------- */
/**
 * Copies the photos of every RCPC-validated sample into class folders, OUTSIDE the curated dataset folder:
 *   RCPC Validated Local Set / Black Sigatoka / FA-003_01.jpg …
 * Safe to run again: only new or re-classified photos are copied; a sample whose RCPC class changed is moved.
 */
function exportValidatedDataset() {
  const sh = sheet_('DA RCPC Samples');
  const props = PropertiesService.getScriptProperties();
  let root = null;
  const rid = props.getProperty('EXPORT_FOLDER_ID');
  if (rid) { try { root = DriveApp.getFolderById(rid); if (root.isTrashed()) root = null; } catch (e) { root = null; } }
  if (!root) {
    root = DriveApp.createFolder('RCPC Validated Local Set');
    props.setProperty('EXPORT_FOLDER_ID', root.getId());
    const me = Session.getEffectiveUser().getEmail();
    CFG.members.forEach(m => { if (m.email && m.email !== me) { try { root.addEditor(m.email); } catch (e) {} } });
  }
  const classes = CFG.classes.filter(c => !/unsure|unknown/i.test(c));
  const folders = {};
  classes.forEach(c => { const it = root.getFoldersByName(c); folders[c] = it.hasNext() ? it.next() : root.createFolder(c); });
  const existing = {};   // file name -> {cls, file}
  classes.forEach(c => { const it = folders[c].getFiles(); while (it.hasNext()) { const f = it.next(); existing[f.getName()] = { cls: c, file: f }; } });

  const photos = photoFolder_();
  const last = sh.getLastRow();
  const rows = last >= 4 ? sh.getRange(4, 1, last - 3, 11).getValues() : [];
  const counts = {}; classes.forEach(c => { counts[c] = { samples: 0, images: 0 }; });
  let copied = 0;
  rows.forEach(r => {
    const id = String(r[0] || ''), cls = String(r[10] || '');
    if (!id || classes.indexOf(cls) < 0) return;
    let any = false;
    for (let n = 1; n <= CFG.photoAngles.length; n++) {
      const name = id + '_' + ('0' + n).slice(-2) + '.jpg';
      const src = photos.getFilesByName(name);
      if (!src.hasNext()) continue;
      any = true; counts[cls].images++;
      const have = existing[name];
      if (have && have.cls === cls) continue;
      if (have) have.file.setTrashed(true);            // RCPC class changed: move it
      src.next().makeCopy(name, folders[cls]); copied++;
    }
    if (any) counts[cls].samples++;
  });
  return { folder: root.getUrl(), copied: copied, counts: counts };
}

function exportValidatedDatasetMenu() {
  const r = exportValidatedDataset();
  SpreadsheetApp.getUi().alert('Export done 📦', 'Copied ' + r.copied + ' new photo(s).\n\n' +
    Object.keys(r.counts).map(c => c + ': ' + r.counts[c].samples + ' samples, ' + r.counts[c].images + ' images').join('\n') +
    '\n\nFolder: ' + r.folder, SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ============================================================
 *  ACCOUNTS — only the emails in CFG.accounts can sign in.
 *  First time (or "Forgot password"): a 6-digit code is emailed, then the person sets a password.
 *  After that they get a login token that never expires (until they log out or a password reset).
 *  Passwords and tokens are stored only as salted SHA-256 hashes in Script Properties.
 * ============================================================ */
function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function accountTab_(email) { return CFG.accounts[normEmail_(email)] || ''; }
function sha_(s) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}
function hashPw_(pw, salt) { let h = salt + '|' + pw; for (let i = 0; i < 300; i++) h = sha_(h + salt); return h; }
function props_() { return PropertiesService.getScriptProperties(); }
function memberName_(tab) { const m = CFG.members.find(x => x.tab === tab); return m ? m.name : tab; }

function sendCode_(email) {
  const p = props_(), key = 'CODE_' + email, old = p.getProperty(key);
  if (old && Date.now() - Number(old.split('|')[2]) < 60000) throw new Error('A code was just sent. Wait a minute before asking again.');
  const code = String(Math.floor(100000 + Math.random() * 900000));
  p.setProperty(key, [sha_(code + email), Date.now() + 15 * 60000, Date.now(), 0].join('|'));
  MailApp.sendEmail({
    to: email,
    subject: 'Your Banana Thesis Tracker code: ' + code,
    htmlBody: '<div style="font-family:Arial,sans-serif;font-size:15px">Your code is <b style="font-size:24px;letter-spacing:3px">' + code +
      '</b><br><br>It expires in 15 minutes. If you didn\'t ask for it, ignore this email.</div>',
  });
}

/** Step 1 of sign-in: is this email allowed, and does it already have a password? (No token needed.) */
function authStart(email) {
  email = normEmail_(email);
  if (!accountTab_(email)) throw new Error('This email doesn\'t have access.');
  const has = !!props_().getProperty('PW_' + email);
  if (!has) sendCode_(email);
  return { hasPassword: has, codeSent: !has };
}
function authForgot(email) {
  email = normEmail_(email);
  if (!accountTab_(email)) throw new Error('This email doesn\'t have access.');
  sendCode_(email);
  return { codeSent: true };
}
/** Code from the email + new password → signed in. Used for first-time setup and for resets. */
function authVerify(email, code, pw) {
  email = normEmail_(email);
  const tab = accountTab_(email);
  if (!tab) throw new Error('This email doesn\'t have access.');
  if (String(pw || '').length < 8) throw new Error('Use at least 8 characters for the password.');
  const p = props_(), key = 'CODE_' + email, rec = p.getProperty(key);
  if (!rec) throw new Error('Ask for a new code.');
  const [h, exp, sent, tries] = rec.split('|');
  if (Date.now() > Number(exp)) { p.deleteProperty(key); throw new Error('That code expired. Ask for a new one.'); }
  if (Number(tries) >= 5) { p.deleteProperty(key); throw new Error('Too many tries. Ask for a new code.'); }
  if (sha_(String(code).trim() + email) !== h) { p.setProperty(key, [h, exp, sent, Number(tries) + 1].join('|')); throw new Error('Wrong code.'); }
  p.deleteProperty(key);
  const salt = Utilities.getUuid();
  p.setProperty('PW_' + email, salt + '|' + hashPw_(pw, salt));
  revokeTokens_(email);                       // a reset signs out old devices
  return issueToken_(email, tab);
}
function authLogin(email, pw) {
  email = normEmail_(email);
  const tab = accountTab_(email);
  if (!tab) throw new Error('This email doesn\'t have access.');
  const p = props_(), fk = 'FAIL_' + email, fail = (p.getProperty(fk) || '0|0').split('|').map(Number);
  if (fail[0] >= 5 && Date.now() - fail[1] < 10 * 60000) throw new Error('Too many wrong passwords. Try again in 10 minutes.');
  const rec = p.getProperty('PW_' + email);
  if (!rec) throw new Error('Set your password first.');
  const [salt, h] = rec.split('|');
  if (hashPw_(String(pw || ''), salt) !== h) {
    p.setProperty(fk, (fail[0] >= 5 ? 1 : fail[0] + 1) + '|' + Date.now());
    Utilities.sleep(800);
    throw new Error('Wrong password.');
  }
  p.deleteProperty(fk);
  return issueToken_(email, tab);
}
function issueToken_(email, tab) {
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  props_().setProperty('TOK_' + sha_(token), [email, tab, Date.now()].join('|'));
  return { token: token, user: tab, email: email, name: memberName_(tab) };
}
function tokenAccount_(token) {
  if (!token) return null;
  const rec = props_().getProperty('TOK_' + sha_(String(token)));
  if (!rec) return null;
  const [email, tab] = rec.split('|');
  return accountTab_(email) === tab ? { email: email, tab: tab } : null;   // removed from CFG.accounts → no access
}
function revokeTokens_(email) {
  const p = props_(), all = p.getProperties();
  Object.keys(all).forEach(k => { if (k.indexOf('TOK_') === 0 && all[k].split('|')[0] === email) p.deleteProperty(k); });
}
function authLogout(token) { props_().deleteProperty('TOK_' + sha_(String(token || ''))); return true; }

/** Menu: 🔑 Reset someone's password (they get a new code the next time they sign in). */
function resetMemberPassword() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Reset a password', 'Email to reset:\n' + Object.keys(CFG.accounts).join('\n'), ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const email = normEmail_(res.getResponseText());
  if (!accountTab_(email)) { ui.alert('That email isn\'t in the account list.'); return; }
  props_().deleteProperty('PW_' + email);
  revokeTokens_(email);
  ui.alert('Done. ' + email + ' is signed out everywhere and will set a new password with an emailed code.');
}


/* ============================================================
 *  Records (Training Runs, Consultations, Final Defense), goals, RCPC hand-over, photo gallery
 * ============================================================ */
function recordSheet_(kind) {
  const R = RECORDS[kind];
  if (!R) throw new Error('Unknown list: ' + kind);
  return { R: R, sh: sheet_(R.tab) };
}
function recordLabel_(kind, o) {
  o = o || {};
  if (kind === 'training') return [o.model, o.run].filter(String).join(' · ') || 'run';
  if (kind === 'consults') return [o.with, o.topic].filter(String).join(' · ') || 'consultation';
  return o.item || 'item';
}
function recordUsed_(R, r) { return R.fields.some((f, i) => f[0] !== 'by' && f[0] !== 'doneBy' && r[i] !== '' && r[i] !== false && r[i] !== null); }
function recordValue_(f, v) {
  if (f[2] === 'date') return parseDate_(v);
  if (f[2] === 'num') return v === '' || v == null ? '' : Number(v);
  if (f[2] === 'bool') return v === true || v === 'true';
  if (f[2].indexOf('list:') === 0) { const ok = f[2].slice(5).split('|'); return ok.indexOf(v) > -1 ? v : ok[0]; }
  return String(v == null ? '' : v).slice(0, 2000);
}
function readRecords_(tz) {
  const out = {};
  Object.keys(RECORDS).forEach(kind => {
    const R = RECORDS[kind], sh = SpreadsheetApp.getActive().getSheetByName(R.tab), list = [];
    if (sh && sh.getLastRow() >= 3) {
      sh.getRange(3, 1, sh.getLastRow() - 2, R.fields.length).getValues().forEach((r, i) => {
        if (!recordUsed_(R, r)) return;
        const o = { row: i + 3 };
        R.fields.forEach((f, j) => { const v = r[j]; o[f[0]] = f[2] === 'date' ? fmtDate_(v, tz) : f[2] === 'bool' ? v === true : f[2] === 'num' ? (v === '' ? '' : Number(v)) : String(v == null ? '' : v); });
        list.push(o);
      });
    }
    out[kind] = list;
  });
  return out;
}
function addRecord(kind, obj) {
  return withLock_(() => {
    const { R, sh } = recordSheet_(kind);
    obj = obj || {};
    const n = R.fields.length, last = Math.max(3, sh.getLastRow());
    const vals = sh.getRange(3, 1, last - 2, n).getValues();
    let row = -1;
    for (let i = 0; i < vals.length; i++) if (!recordUsed_(R, vals[i])) { row = i + 3; break; }
    if (row < 0) { row = last + 1; if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 50); }
    const line = R.fields.map(f => f[0] === 'by' ? (CURRENT_USER || '') : f[0] === 'doneBy' ? (obj.done ? CURRENT_USER || '' : '') : recordValue_(f, obj[f[0]]));
    sh.getRange(row, 1, 1, n).setValues([line]);
    const o = { row: row };
    R.fields.forEach((f, j) => { o[f[0]] = f[2] === 'date' ? (obj[f[0]] || '') : line[j]; });
    return o;
  });
}
function updateRecord(kind, row, field, value) {
  return withLock_(() => {
    const { R, sh } = recordSheet_(kind);
    row = Number(row);
    const col = R.fields.findIndex(f => f[0] === field);
    if (row < 3 || col < 0 || field === 'by') throw new Error('Field not editable: ' + field);
    const v = recordValue_(R.fields[col], value);
    sh.getRange(row, col + 1).setValue(v);
    const patch = {}; patch[field] = R.fields[col][2] === 'date' ? value : v;
    if (field === 'done') {
      const dc = R.fields.findIndex(f => f[0] === 'doneBy');
      if (dc > -1) { const by = v ? (CURRENT_USER || '') : ''; sh.getRange(row, dc + 1).setValue(by); patch.doneBy = by; }
    }
    return patch;
  });
}
function deleteRecord(kind, row) {
  return withLock_(() => {
    const { R, sh } = recordSheet_(kind);
    row = Number(row);
    if (row < 3) throw new Error('Bad row');
    sh.getRange(row, 1, 1, R.fields.length).clearContent();   // checkboxes stay as checkboxes
    return true;
  });
}
function readSettings_() {
  const p = PropertiesService.getScriptProperties(), o = {};
  Object.keys(SETTINGS).forEach(k => { const v = p.getProperty('SET_' + k); o[k] = v == null ? '' : SETTINGS[k] === 'number' ? Number(v) : v; });
  return o;
}
function setSetting(key, value) {
  if (!SETTINGS[key]) throw new Error('Unknown setting: ' + key);
  const p = PropertiesService.getScriptProperties();
  if (value === '' || value == null) p.deleteProperty('SET_' + key);
  else if (SETTINGS[key] === 'number') { const n = Math.max(0, Math.round(Number(value))); if (!isFinite(n)) throw new Error('Not a number'); p.setProperty('SET_' + key, String(n)); }
  else { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error('Bad date'); p.setProperty('SET_' + key, String(value)); }
  return readSettings_();
}
/** Hand-over day: stamp many samples "Submitted to RCPC" at once. */
function submitSamples(ids, iso) {
  const d = parseDate_(iso);
  if (!d) throw new Error('Pick a date');
  (ids || []).forEach(id => createSample(id));
  return withLock_(() => {
    const sh = sheet_('DA RCPC Samples');
    (ids || []).forEach(id => { const r = sampleRow_(sh, String(id).toUpperCase()); if (r > 0) sh.getRange(r, 10).setValue(d); });
    return true;
  });
}
/** For the desktop gallery: every sample photo in the Drive folder, grouped by label. */
function listPhotos() {
  const out = {};
  const it = photoFolder_().getFiles();
  while (it.hasNext()) {
    const f = it.next(), m = f.getName().match(/^([A-Z]{2}-\d{3,})_(\d{2})\.jpe?g$/i);
    if (!m) continue;
    (out[m[1].toUpperCase()] = out[m[1].toUpperCase()] || []).push({ angle: Number(m[2]), file: f.getId() });
  }
  Object.keys(out).forEach(k => out[k].sort((a, b) => a.angle - b.angle));
  return out;
}
