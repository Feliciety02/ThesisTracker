/**
 * ============================================================
 *  BANANA LEAF DISEASE THESIS — TEAM TASK TRACKER
 *  "An Enhanced EfficientNetB0 Architecture for Mobile
 *   Banana Leaf Disease Classification"
 * ============================================================
 *  HOW TO INSTALL
 *  1. Create a blank Google Sheet (sheets.new).
 *  2. Extensions → Apps Script. Delete the sample code, paste this file, Save.
 *  3. Choose the function "setupTracker" in the toolbar and click Run.
 *     Approve the permissions prompt (it's your own script).
 *  4. Go back to the sheet — a "🍌 Thesis Tracker" menu appears.
 *
 *  WHAT IT BUILDS
 *  Dashboard · Fe Anne · Rho · Cha · All Open Tasks · Panel Revisions
 *  DA RCPC Samples · Supplies · Links · Lists (hidden)
 *
 *  Each member edits their OWN tab. The Dashboard and "All Open Tasks"
 *  update automatically. Marking a task "Done" stamps the completion date.
 * ============================================================
 */

const CFG = {
  title: '🍌 Banana Leaf Disease Thesis Tracker',
  thesisTitle: 'An Enhanced EfficientNetB0 Architecture for Mobile Banana Leaf Disease Classification',
  timezone: 'Asia/Manila',
  maxRows: 200,
  sampleRows: 300,        // room for this many samples; labels are handed out by the app (FA-001, RJ-001, CP-001 …)
  photoAngles: ['Top surface', 'Underside', 'Lesion close-up', 'Side / angled', 'Extra'],  // 3 required, 5 max
  members: [
    { tab: 'Fe Anne', name: 'Fe Anne Malasarte',     role: 'Team Leader',           email: 'f.malasarte.543849@umindanao.edu.ph', color: '#6a1b9a', light: '#f3e5f5', prefix: 'FA' },
    { tab: 'Rho',     name: 'Rho Alphone Jornadal',  role: 'Machine Learning Lead', email: 'r.jornadal.544960@umindanao.edu.ph',  color: '#1565c0', light: '#e3f2fd', prefix: 'RJ' },
    { tab: 'Cha',     name: 'Charisse Priego',       role: 'Documentation Lead',    email: 'c.priego.545409@umindanao.edu.ph',    color: '#c62828', light: '#ffebee', prefix: 'CP' },
  ],
  statuses:   ['Not Started', 'In Progress', 'Waiting', 'Done'],
  priorities: ['High', 'Medium', 'Low'],
  categories: ['DA RCPC', 'Dataset', 'Model', 'Paper', 'Letters', 'Panel Revision', 'Admin'],
    classes:    ['Cordana Leaf Spot', 'Black Sigatoka', 'Healthy', 'Unsure'],  // the study's 3 classes (Section 1.3 of the paper)
  revStatuses: ['C', 'NC', 'NA'],
};

const DOC = 'https://docs.google.com/document/d/1du8tYoex9vLWZCVAy1BsPHyzAsmjxJSJKiu2rBhTa40/edit';
const LINKS = {
  daQuestions:      { label: 'DA Questions',             url: DOC + '?tab=t.masbs5zb7cep' },
  trainingResults:  { label: 'Training Results',         url: DOC + '?tab=t.rkkrikwydqrw' },
  publicSources:    { label: 'Public Dataset Sources',   url: DOC + '?tab=t.s4c9q6mu8vpe' },
  validationLetter: { label: 'Dataset Validation Letter',url: DOC + '?tab=t.37d5kfl379y3' },
  requestLetter:    { label: 'Dataset Request Letter',   url: DOC + '?tab=t.6pxmo4idkk59' },
  curatedFolder:    { label: 'Curated Dataset (Drive)',  url: 'https://drive.google.com/drive/folders/1OxFuhfrEIChjzVFISjBL0J8yrMM2af-P' },
  thesisDoc:        { label: 'Thesis Working Doc',       url: DOC },
};

const OCT2 = new Date(2026, 9, 2); // original task-bar deadline (Fri, Oct 2)

// [ID, Task, Category, Priority, Status, Due, LinkKey, Notes]
const TASKS = {
  'Fe Anne': [
    ['F-01', 'Visit DA main office to request datasets / validation', 'DA RCPC', 'High', 'Done', OCT2, '', 'Redirected to DA RCPC Davao. Validation requires fresh physical leaf samples.'],
    ['F-02', 'Prepare DA Questions for the visit', 'DA RCPC', 'High', 'Done', OCT2, 'daQuestions', ''],
    ['F-03', 'Draft the Dataset Validation Letter', 'Letters', 'Medium', 'Done', '', 'validationLetter', ''],
    ['F-04', 'Draft the Dataset Request Letter', 'Letters', 'Medium', 'Done', '', 'requestLetter', ''],
    ['F-05', 'Make the new docs file from scratch with the re-arranged structure', 'Paper', 'Medium', 'Done', '', 'thesisDoc', ''],
    ['F-06', 'Request datasets from DA (follow up through DA RCPC)', 'DA RCPC', 'Medium', 'Waiting', '', '', 'Main office redirected us to RCPC.'],
    ['F-07', 'Sort the Curated Banana Leaf Disease Dataset folder (with Cha)', 'Dataset', 'High', 'Not Started', OCT2, 'curatedFolder', 'Shared with Cha (C-04).'],
    ['F-08', 'Contact DA RCPC Davao: confirm submission day, office hours, and samples needed per class', 'DA RCPC', 'High', 'Not Started', '', '', 'Put the agreed date on the Dashboard (yellow cell).'],
    ['F-09', 'Buy supplies: cotton, plastic bags, markers, masking tape', 'DA RCPC', 'High', 'Not Started', '', '', 'See Supplies tab.'],
    ['F-10', 'Lead field collection of fresh banana leaf samples (whole team)', 'DA RCPC', 'High', 'Not Started', '', '', 'Collect close to submission day so leaves stay fresh.'],
    ['F-11', 'Submit fresh, labeled samples to DA RCPC Davao', 'DA RCPC', 'High', 'Not Started', '', '', 'Bring the printed Sample Log.'],
    ['F-13', 'Collect + photograph your samples: tap ＋ New sample in the app for each leaf (labels FA-001, FA-002 … are automatic)', 'DA RCPC', 'High', 'Not Started', '', '', 'Copy the label the app shows onto masking tape. The app names the photos for you.'],
    ['F-14', 'Run 🍌 Thesis Tracker → 📷 Connect photo folder (once) so app photos save into the Curated dataset folder', 'DA RCPC', 'High', 'Not Started', '', '', 'Do this before the field collection day.'],
    ['F-12', 'Lead panel revisions: Problem, Purpose, Objectives, Scope & Limitations', 'Panel Revision', 'High', 'Not Started', '', '', 'See Panel Revisions tab.'],
  ],
  'Rho': [
    ['R-01', 'Retrain the baseline model from scratch and record results in the Training Results tab', 'Model', 'High', 'Not Started', OCT2, 'trainingResults', ''],
    ['R-02', 'Re-curate the dataset', 'Dataset', 'High', 'Not Started', OCT2, 'curatedFolder', ''],
    ['R-03', 'Record the image count for each class', 'Dataset', 'Medium', 'Not Started', OCT2, '', ''],
    ['R-04', 'Get the public dataset links from Public Dataset Sources and send them to Cha for citation', 'Dataset', 'Medium', 'Not Started', OCT2, 'publicSources', 'Send to c.priego.545409@umindanao.edu.ph'],
    ['R-05', 'Collect + photograph your samples: tap ＋ New sample in the app for each leaf (labels RJ-001, RJ-002 … are automatic)', 'DA RCPC', 'High', 'Not Started', '', '', 'Copy the label the app shows onto masking tape. The app names the photos for you.'],
    ['R-08', 'Check all sample photos in the Drive photo folder (3+ angles each, correct names) before adding them to the dataset', 'Dataset', 'Medium', 'Not Started', '', '', 'Curated Banana Leaf Disease Dataset → DA RCPC Sample Photos.'],
    ['R-06', 'Add RCPC-validated images to the dataset and update the per-class counts', 'Dataset', 'Medium', 'Not Started', '', '', 'After RCPC returns results.'],
    ['R-07', 'Methodology revisions: preprocessing, training split, model construction, hyperparameter tuning', 'Panel Revision', 'High', 'Not Started', '', '', 'See Panel Revisions tab.'],
  ],
  'Cha': [
    ['C-01', 'Fill in the Dataset Validation Letter', 'Letters', 'Medium', 'Done', '', 'validationLetter', ''],
    ['C-02', 'Fill in the Dataset Request Letter', 'Letters', 'Medium', 'Done', '', 'requestLetter', ''],
    ['C-03', 'Fill in the new docs file, including the public dataset link from Rho', 'Paper', 'Medium', 'Done', '', 'thesisDoc', ''],
    ['C-04', 'Sort the Curated Banana Leaf Disease Dataset folder (with Fe Anne)', 'Dataset', 'High', 'Not Started', OCT2, 'curatedFolder', 'Shared with Fe Anne (F-07).'],
    ['C-05', 'Cite the public dataset sources in the paper (IEEE)', 'Paper', 'Medium', 'Waiting', '', 'publicSources', 'Waiting for links from Rho (R-04).'],
    ['C-06', 'Collect + photograph your samples: tap ＋ New sample in the app for each leaf (labels CP-001, CP-002 … are automatic)', 'DA RCPC', 'High', 'Not Started', '', '', 'Copy the label the app shows onto masking tape. The app names the photos for you.'],
    ['C-10', 'Before submission: check the Sample Log is complete for all three batches (FA, RJ, CP)', 'DA RCPC', 'High', 'Not Started', '', '', 'Every submitted bag needs disease, date, site and 3+ photos.'],
    ['C-07', 'Write up the DA RCPC validation process in Methodology – Data Collection', 'Paper', 'Medium', 'Not Started', '', '', ''],
    ['C-09', 'Paper 2.1.2 Local Test Set: replace [name] / [position] with the DA RCPC validator, fill in [phone model], and fix the "August 90" collection dates', 'Paper', 'High', 'Not Started', '', 'thesisDoc', 'Do this once RCPC returns the validation.'],
    ['C-08', 'Formatting revisions: CCS concepts, general terms, keywords, tables/figures, IEEE refs, ACM format', 'Panel Revision', 'High', 'Not Started', '', '', 'See Panel Revisions tab.'],
  ],
};

// [Item, Section, Panel comment, Owner, Status]
const REVISIONS = [
  ['1', 'Title Page', 'Title must be under 20 words (current title is 10 words)', 'Fe Anne', 'NC'],
  ['1', 'Title Page', 'Change title (finalize new title)', 'Fe Anne', 'NC'],
  ['2', 'Abstract', 'NA for Capstone 1', '—', 'NA'],
  ['3', 'CCS Concepts', 'Use the ACM Computing Classification Scheme (dl.acm.org/ccs)', 'Cha', 'NC'],
  ['4', 'General Terms', 'Use only the allowed ACM general terms (e.g., Algorithms, Performance, Experimentation)', 'Cha', 'NC'],
  ['5', 'Keywords', 'Limit to 5 keywords', 'Cha', 'NC'],
  ['6', 'Background – Problem', 'Establish the problems to provide a significant solution', 'Fe Anne', 'NC'],
  ['6', 'Background – Problem', 'Indicate the main problem of the baseline (re-read the baseline paper)', 'Fe Anne + Rho', 'NC'],
  ['6', 'Background – Problem', 'Add real banana symptom data aside from the 900 original images (DA RCPC samples)', 'Fe Anne', 'NC'],
  ['6', 'Background – Problem', 'Review similar banana leaf studies for additional diseases; rectify datasets to find the main source of confusion', 'Rho', 'NC'],
  ['6', 'Background – Problem', '⚠ If the baseline study changes, the architecture changes too → re-defense required', 'Team', 'NC'],
  ['6', 'Related Literature', 'State the main problems of the baseline and which ones the proposed model addresses', 'Fe Anne + Rho', 'NC'],
  ['6', 'Approach', 'State the solutions of the proposed model based on the identified problems', 'Rho', 'NC'],
  ['7', 'Purpose & Description', 'Revise the purpose to address the problem indicated in the baseline study', 'Fe Anne', 'NC'],
  ['7', 'Purpose & Description', 'State which problem of the baseline algorithm the study addresses', 'Fe Anne', 'NC'],
  ['8', 'Objectives', 'Revise objectives to a CS (not IT) approach', 'Fe Anne + Rho', 'NC'],
  ['8', 'Objectives', 'Objective: replicate the preprocessing method of the baseline', 'Rho', 'NC'],
  ['8', 'Objectives', 'Objective: "To enhance the … by …"', 'Rho', 'NC'],
  ['8', 'Objectives', 'Objective: evaluate baseline vs proposed (accuracy, precision, F1, confusion matrix)', 'Rho', 'NC'],
  ['8', 'Objectives', 'Objective: assess the proposed model on local or other datasets', 'Rho', 'NC'],
  ['9', 'Scope & Limitations', 'Two paragraphs only: 1st = scope, 2nd = limitations', 'Fe Anne', 'NC'],
  ['10', 'Methodology – Data Collection', 'Aside from the 900 original images, test and add more relevant datasets', 'Rho', 'NC'],
  ['10', 'Methodology – Preprocessing', 'Follow the preprocessing of the baseline', 'Rho', 'NC'],
  ['10', 'Methodology – Training Split', 'Use the same training split as the baseline', 'Rho', 'NC'],
  ['10', 'Methodology – Model Construction', '⚠ Add a sample computation of the detection', 'Rho', 'NC'],
  ['10', 'Methodology – Model Construction', '⚠ Show the changes from the baseline to the proposed model', 'Rho', 'NC'],
  ['10', 'Methodology – Training Config', 'Add hyperparameter tuning to determine which setting gives the better result', 'Rho', 'NC'],
  ['11', 'Results & Discussion', 'NA for Capstone 1', '—', 'NA'],
  ['12', 'Conclusion & Recommendation', 'NA for Capstone 1', '—', 'NA'],
  ['13', 'Tables & Figures', 'Captions in Times New Roman 9-pt bold, numbered (Table 1 / Figure 1)', 'Cha', 'NC'],
  ['13', 'Tables & Figures', 'Figure captions centered below; table captions centered above', 'Cha', 'NC'],
  ['13', 'Tables & Figures', 'Add a brief discussion of every table', 'Cha + Rho', 'NC'],
  ['13', 'Tables & Figures', 'Arrange tables/figures properly; adjust the font inside tables', 'Cha', 'NC'],
  ['13', 'Tables & Figures', 'Add more references', 'Cha', 'NC'],
  ['14', 'References', 'Every in-text citation appears in References; follow IEEE style', 'Cha', 'NC'],
  ['14', 'References', 'Add more references from 2022 onward', 'Cha + Fe Anne', 'NC'],
  ['14', 'References', 'Number citations in order of appearance [1] … [n]', 'Cha', 'NC'],
  ['15', 'Others', 'Page numbers bottom-center; justify paragraphs', 'Cha', 'NC'],
  ['15', 'Others', 'Replace propose/proposal/proponents with "study"/"researchers"; third person', 'Cha', 'NC'],
  ['15', 'Others', 'Past tense for what was done; present tense for general truths and what the paper covers', 'Cha', 'NC'],
  ['15', 'Others', 'Follow ACM formatting (alignment, spacing); remove non-ACM components; citations in sequence', 'Cha', 'NC'],
  ['15', 'Output / Project', 'Output must show the baseline result and the proposed model', 'Rho', 'NC'],
];

// [Item, Purpose, Qty, Unit cost, Assigned, Notes]
const SUPPLIES = [
  ['Cotton', 'Wrap cut leaf ends (slightly damp) to keep samples fresh', 1, '', 'Fe Anne', 'Required by DA RCPC'],
  ['Plastic bags (resealable)', 'One bag per sample', 1, '', 'Fe Anne', 'Required by DA RCPC'],
  ['Permanent markers', 'Write sample ID on labels', 2, '', 'Fe Anne', 'Required by DA RCPC'],
  ['Masking tape', 'Labels on each bag', 1, '', 'Fe Anne', 'Required by DA RCPC'],
  ['Cooler / ice box', 'Keep samples cool during transport', 1, '', '', 'Suggested'],
  ['Pruning shears / scissors', 'Clean cuts when collecting', 1, '', '', 'Suggested'],
];

/* ============================================================
 *  MENU & TRIGGERS
 * ============================================================ */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🍌 Thesis Tracker')
    .addItem('📷 Connect photo folder', 'setupPhotoFolder')
    .addItem('📧 Email each member their open tasks', 'emailOpenTasks')
    .addItem('⏰ Turn ON daily 8 AM email reminders', 'enableDailyReminder')
    .addItem('🔕 Turn OFF daily reminders', 'disableDailyReminder')
    .addSeparator()
    .addItem('🛠 Rebuild tracker (erases data!)', 'setupTracker')
    .addToUi();
}

/** Stamps "Completed On" when a task's status becomes Done. */
function onEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  const isMemberTab = CFG.members.some(m => m.tab === sh.getName());
  if (!isMemberTab || e.range.getColumn() !== 5 || e.range.getRow() < 4) return;
  const rows = e.range.getNumRows();
  for (let i = 0; i < rows; i++) {
    const r = e.range.getRow() + i;
    const status = sh.getRange(r, 5).getValue();
    const stamp = sh.getRange(r, 9);
    if (status === 'Done' && !stamp.getValue()) stamp.setValue(new Date());
    if (status !== 'Done') stamp.clearContent();
  }
}

/* ============================================================
 *  BUILD
 * ============================================================ */
function setupTracker() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  const ourNames = ['Dashboard', ...CFG.members.map(m => m.tab), 'All Open Tasks', 'Panel Revisions', 'DA RCPC Samples', 'Supplies', 'Links', 'Lists'];

  if (ss.getSheets().some(s => ourNames.includes(s.getName()))) {
    const ok = ui.alert('Rebuild tracker?', 'This deletes and recreates all tracker tabs. Any data you typed in them will be lost.', ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) return;
  }

  ss.setSpreadsheetTimeZone(CFG.timezone);
  ss.rename(CFG.title);

  const temp = ss.insertSheet('__temp__' + Date.now());
  ss.getSheets().forEach(s => { if (s.getSheetId() !== temp.getSheetId()) ss.deleteSheet(s); });

  buildLists_(ss);
  CFG.members.forEach(m => buildMemberTab_(ss, m));
  buildOpenTasks_(ss);
  buildRevisions_(ss);
  buildSamples_(ss);
  buildSupplies_(ss);
  buildLinks_(ss);
  buildDashboard_(ss);

  ss.deleteSheet(temp);
  const order = ['Dashboard', ...CFG.members.map(m => m.tab), 'All Open Tasks', 'Panel Revisions', 'DA RCPC Samples', 'Supplies', 'Links'];
  order.forEach((name, i) => { ss.setActiveSheet(ss.getSheetByName(name)); ss.moveActiveSheet(i + 1); });
  ss.setActiveSheet(ss.getSheetByName('Dashboard'));
  ss.getSheetByName('Lists').hideSheet();
  onOpen();
  ui.alert('Tracker ready ✅', 'Each member updates their own tab. The Dashboard updates automatically.\n\nSet the DA RCPC submission date in the yellow cell on the Dashboard.', ui.ButtonSet.OK);
}

function buildLists_(ss) {
  const sh = ss.insertSheet('Lists');
  const cols = [
    ['Status', ...CFG.statuses],
    ['Priority', ...CFG.priorities],
    ['Category', ...CFG.categories],
    ['Disease Class', ...CFG.classes],
    ['Revision Status', ...CFG.revStatuses],
    ['Owner', ...CFG.members.map(m => m.tab), 'Team'],
  ];
  cols.forEach((col, c) => sh.getRange(1, c + 1, col.length, 1).setValues(col.map(v => [v])));
  sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
}

function listRule_(ss, col) {
  const range = ss.getSheetByName('Lists').getRange(2, col, 30, 1);
  return SpreadsheetApp.newDataValidation().requireValueInRange(range, true).setAllowInvalid(false).build();
}

function banner_(sh, row, text, cols, bg, size) {
  sh.getRange(row, 1, 1, cols).merge().setValue(text)
    .setBackground(bg).setFontColor('#ffffff').setFontWeight('bold').setFontSize(size || 14)
    .setVerticalAlignment('middle');
  sh.setRowHeight(row, size && size > 12 ? 36 : 24);
}

function headers_(sh, row, headers, bg) {
  sh.getRange(row, 1, 1, headers.length).setValues([headers])
    .setBackground(bg).setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(row, 30);
}

function linkFormula_(key) {
  if (!key || !LINKS[key]) return '';
  return '=HYPERLINK("' + LINKS[key].url + '","' + LINKS[key].label + '")';
}

function buildMemberTab_(ss, m) {
  const sh = ss.insertSheet(m.tab);
  sh.setTabColor(m.color);
  const H = ['ID', 'Task', 'Category', 'Priority', 'Status', 'Due Date', 'Link', 'Notes', 'Completed On'];
  const n = CFG.maxRows;

  banner_(sh, 1, '  ' + m.name + '  ·  ' + m.role, H.length, m.color, 16);
  sh.getRange(2, 1, 1, H.length).merge()
    .setValue('  ' + m.email + '   |   Edit Status / Due Date here. Add new tasks in the next empty row.')
    .setBackground(m.light).setFontColor('#424242').setFontStyle('italic');
  headers_(sh, 3, H, '#37474f');

  const data = TASKS[m.tab] || [];
  if (data.length) {
    sh.getRange(4, 1, data.length, 6).setValues(data.map(t => t.slice(0, 6)));
    sh.getRange(4, 7, data.length, 1).setFormulas(data.map(t => [linkFormula_(t[6])]));
    sh.getRange(4, 8, data.length, 1).setValues(data.map(t => [t[7]]));
    const today = new Date();
    sh.getRange(4, 9, data.length, 1).setValues(data.map(t => [t[4] === 'Done' ? today : '']));
  }

  sh.getRange(4, 3, n, 1).setDataValidation(listRule_(ss, 3));
  sh.getRange(4, 4, n, 1).setDataValidation(listRule_(ss, 2));
  sh.getRange(4, 5, n, 1).setDataValidation(listRule_(ss, 1));
  sh.getRange(4, 6, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build())
    .setNumberFormat('ddd, mmm d');
  sh.getRange(4, 9, n, 1).setNumberFormat('mmm d, yyyy');

  sh.getRange(4, 1, n, H.length).setVerticalAlignment('middle');
  sh.getRange(4, 2, n, 1).setWrap(true);
  sh.getRange(4, 8, n, 1).setWrap(true);
  sh.getRange(4, 1, n, 1).setHorizontalAlignment('center').setFontColor('#757575');
  sh.getRange(4, 4, n, 3).setHorizontalAlignment('center');

  [70, 380, 120, 85, 115, 110, 170, 260, 115].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.setFrozenRows(3);
  sh.getRange(3, 1, n + 1, H.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);

  const rng = sh.getRange(4, 1, n, H.length);
  const status = sh.getRange(4, 5, n, 1);
  const pri = sh.getRange(4, 4, n, 1);
  const rules = [
    rule_('=$E4="Done"', rng, '#eeeeee', '#9e9e9e', true),
    rule_('=AND($F4<>"",$F4<TODAY(),$E4<>"Done")', rng, '#ffcdd2', null),
    rule_('=AND($F4<>"",$F4>=TODAY(),$F4<=TODAY()+3,$E4<>"Done")', rng, '#fff3cd', null),
    textRule_('Done', status, '#c8e6c9', '#1b5e20'),
    textRule_('In Progress', status, '#bbdefb', '#0d47a1'),
    textRule_('Waiting', status, '#ffe0b2', '#e65100'),
    textRule_('Not Started', status, '#f5f5f5', '#616161'),
    textRule_('High', pri, null, '#c62828'),
  ];
  sh.setConditionalFormatRules(rules);
}

function rule_(formula, range, bg, font, strike) {
  const b = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setRanges([range]);
  if (bg) b.setBackground(bg);
  if (font) b.setFontColor(font);
  if (strike) b.setStrikethrough(true);
  return b.build();
}

function textRule_(text, range, bg, font) {
  const b = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setRanges([range]).setBold(true);
  if (bg) b.setBackground(bg);
  if (font) b.setFontColor(font);
  return b.build();
}

function buildOpenTasks_(ss) {
  const sh = ss.insertSheet('All Open Tasks');
  sh.setTabColor('#455a64');
  const H = ['Owner', 'ID', 'Task', 'Category', 'Priority', 'Status', 'Due Date', 'Link', 'Notes'];
  banner_(sh, 1, '  All open tasks — sorted by due date (read-only view; edit on each member\'s tab)', H.length, '#455a64', 13);
  headers_(sh, 2, H, '#37474f');
  const end = 3 + CFG.maxRows;
  const parts = CFG.members.map(m => {
    const t = "'" + m.tab + "'";
    return '{ARRAYFORMULA(IF(' + t + '!B4:B' + end + '<>"","' + m.tab + '","")),' + t + '!A4:H' + end + '}';
  }).join(';');
  sh.getRange('A3').setFormula('=IFERROR(QUERY({' + parts + '},"select * where Col3 is not null and Col6 <> \'Done\' order by Col7 asc",0),"🎉 No open tasks")');
  sh.getRange('G3:G').setNumberFormat('ddd, mmm d');
  [80, 60, 380, 120, 80, 110, 110, 170, 260].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange('C3:C').setWrap(true);
  sh.getRange('I3:I').setWrap(true);
  sh.setFrozenRows(2);
  const rng = sh.getRange(3, 1, 300, H.length);
  sh.setConditionalFormatRules([
    rule_('=AND($G3<>"",$G3<TODAY())', rng, '#ffcdd2', null),
    rule_('=AND($G3<>"",$G3>=TODAY(),$G3<=TODAY()+3)', rng, '#fff3cd', null),
    ...CFG.members.map(m => textRule_(m.tab, sh.getRange(3, 1, 300, 1), m.light, m.color)),
  ]);
}

function buildRevisions_(ss) {
  const sh = ss.insertSheet('Panel Revisions');
  sh.setTabColor('#ef6c00');
  const H = ['Item', 'Section', 'Panel Comment (Outline Defense, Sep 22, 2026)', 'Owner', 'Status', 'Page No. if Complied', 'Adviser Signed', 'Notes'];
  banner_(sh, 1, '  Panel Revisions — Accepted with Major Revision', H.length, '#ef6c00', 15);
  sh.getRange(2, 1, 1, H.length).merge()
    .setValue('  Status: C = Complied · NC = Not Complied · NA = Not Applicable.   Adviser: Ms. Barbosa · Panel: Mr. Aborde, Mr. Hernando, Ms. Yara')
    .setBackground('#fff3e0').setFontStyle('italic').setFontColor('#424242');
  headers_(sh, 3, H, '#37474f');
  const n = REVISIONS.length;
  sh.getRange(4, 1, n, 5).setValues(REVISIONS);
  sh.getRange(4, 5, n, 1).setDataValidation(listRule_(ss, 5));
  sh.getRange(4, 7, n, 1).insertCheckboxes();
  sh.getRange(4, 1, n, H.length).setVerticalAlignment('middle');
  sh.getRange(4, 3, n, 1).setWrap(true);
  sh.getRange(4, 8, n, 1).setWrap(true);
  sh.getRange(4, 1, n, 1).setHorizontalAlignment('center').setFontWeight('bold');
  sh.getRange(4, 4, n, 4).setHorizontalAlignment('center');
  [50, 190, 430, 110, 70, 100, 90, 220].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.setFrozenRows(3);
  const st = sh.getRange(4, 5, n, 1);
  const all = sh.getRange(4, 1, n, H.length);
  sh.setConditionalFormatRules([
    rule_('=$E4="NA"', all, '#f5f5f5', '#9e9e9e'),
    rule_('=$E4="C"', all, '#e8f5e9', null),
    rule_('=LEFT($C4,1)="⚠"', sh.getRange(4, 3, n, 1), null, '#b71c1c'),
    textRule_('C', st, '#a5d6a7', '#1b5e20'),
    textRule_('NC', st, '#ffcdd2', '#b71c1c'),
    ...CFG.members.map(m => SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains(m.tab).setFontColor(m.color).setBold(true)
      .setRanges([sh.getRange(4, 4, n, 1)]).build()),
  ]);
}

function buildSamples_(ss) {
  const sh = ss.insertSheet('DA RCPC Samples');
  sh.setTabColor('#2e7d32');
  const H = ['Sample ID', 'Suspected Disease', 'Date Collected', 'Collection Site (farm / barangay)', 'Collected By', 'No. of Photos',
             'Expected Photo File Names', 'Wrapped in Cotton', 'Bagged & Labeled', 'Submitted to RCPC', 'RCPC Validated Class', 'Match?', 'Notes',
             'Photo Folder', 'Angles Taken'];
  const n = CFG.sampleRows;
  banner_(sh, 1, '  DA RCPC Davao — Fresh Leaf Sample Log', H.length, '#2e7d32', 15);
  sh.getRange(2, 1, 1, H.length).merge()
    .setValue('  Rows are added by the app: tap ＋ New sample and it hands out the next label (' + CFG.members.map(m => m.prefix + '-### = ' + m.tab).join(' · ') +
      '). Copy that label onto masking tape. Photos are named from it (FA-003 → FA-003_01.jpg …). Submit samples FRESH.')
    .setBackground('#e8f5e9').setFontWeight('bold').setFontColor('#1b5e20').setWrap(true);
  sh.setRowHeight(2, 40);
  headers_(sh, 3, H, '#37474f');
  if (sh.getMaxRows() < n + 3) sh.insertRowsAfter(sh.getMaxRows(), n + 3 - sh.getMaxRows());

  sh.getRange(4, 2, n, 1).setDataValidation(listRule_(ss, 4));
  sh.getRange(4, 11, n, 1).setDataValidation(listRule_(ss, 4));
  sh.getRange(4, 5, n, 1).setDataValidation(listRule_(ss, 6));
  sh.getRange(4, 3, n, 1).setNumberFormat('mmm d, yyyy');
  sh.getRange(4, 10, n, 1).setNumberFormat('mmm d, yyyy');
  sh.getRange(4, 15, n, 1).setNumberFormat('@');
  sh.getRange(4, 7, n, 1).setFontColor('#616161');        // formulas are written per row when the app adds a sample
  sh.getRange(4, 12, n, 1).setHorizontalAlignment('center');
  sh.getRange(4, 1, n, 1).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(4, 8, n, 2).insertCheckboxes();
  sh.getRange(4, 6, n, 1).setHorizontalAlignment('center');
  [80, 140, 110, 220, 100, 80, 230, 85, 85, 110, 150, 85, 220, 120, 90].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.setFrozenRows(3);
  const lcol = sh.getRange(4, 12, n, 1);
  sh.setConditionalFormatRules([
    textRule_('✓ Match', lcol, '#c8e6c9', '#1b5e20'),
    textRule_('✗ Differs', lcol, '#ffcdd2', '#b71c1c'),
    rule_('=$J4<>""', sh.getRange(4, 1, n, 1), '#c8e6c9', null),
    rule_('=AND($F4<>"",$F4<3)', sh.getRange(4, 6, n, 1), '#fff3cd', '#9a5c00'),
    rule_('=$F4>=3', sh.getRange(4, 6, n, 1), '#c8e6c9', '#1b5e20'),
  ]);
}

function buildSupplies_(ss) {
  const sh = ss.insertSheet('Supplies');
  sh.setTabColor('#6d4c41');
  const H = ['Item', 'Purpose', 'Qty', 'Unit Cost (₱)', 'Subtotal (₱)', 'Assigned To', 'Bought?', 'Notes'];
  banner_(sh, 1, '  Supplies for DA RCPC Sample Collection', H.length, '#6d4c41', 15);
  headers_(sh, 2, H, '#37474f');
  const n = SUPPLIES.length + 6;
  sh.getRange(3, 1, SUPPLIES.length, 4).setValues(SUPPLIES.map(s => s.slice(0, 4)));
  sh.getRange(3, 6, SUPPLIES.length, 1).setValues(SUPPLIES.map(s => [s[4]]));
  sh.getRange(3, 8, SUPPLIES.length, 1).setValues(SUPPLIES.map(s => [s[5]]));
  sh.getRange(3, 5, n, 1).setFormulaR1C1('=IF(OR(RC3="",RC4=""),"",RC3*RC4)');
  sh.getRange(3, 6, n, 1).setDataValidation(listRule_(ss, 6));
  sh.getRange(3, 7, n, 1).insertCheckboxes();
  sh.getRange(3, 4, n, 2).setNumberFormat('₱#,##0.00');
  const totalRow = 3 + n;
  sh.getRange(totalRow, 4).setValue('TOTAL').setFontWeight('bold').setHorizontalAlignment('right');
  sh.getRange(totalRow, 5).setFormula('=SUM(E3:E' + (totalRow - 1) + ')').setNumberFormat('₱#,##0.00').setFontWeight('bold');
  [190, 320, 60, 110, 110, 110, 80, 180].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.setFrozenRows(2);
  sh.setConditionalFormatRules([
    rule_('=$G3=TRUE', sh.getRange(3, 1, n, H.length), '#e8f5e9', '#9e9e9e', true),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Suggested').setFontColor('#9e9e9e').setItalic(true)
      .setRanges([sh.getRange(3, 8, n, 1)]).build(),
  ]);
}

function buildLinks_(ss) {
  const sh = ss.insertSheet('Links');
  sh.setTabColor('#00838f');
  banner_(sh, 1, '  Quick Links', 2, '#00838f', 15);
  headers_(sh, 2, ['Resource', 'Open'], '#37474f');
  const keys = Object.keys(LINKS);
  sh.getRange(3, 1, keys.length, 1).setValues(keys.map(k => [LINKS[k].label]));
  sh.getRange(3, 2, keys.length, 1).setFormulas(keys.map(k => ['=HYPERLINK("' + LINKS[k].url + '","Open ↗")']));
  sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 120);
}

function buildDashboard_(ss) {
  const sh = ss.insertSheet('Dashboard');
  sh.setTabColor('#f9a825');
  const W = 11;
  banner_(sh, 1, '  ' + CFG.title, W, '#263238', 18);
  sh.getRange(2, 1, 1, W).merge().setValue('  ' + CFG.thesisTitle + '  ·  BSCS Capstone · University of Mindanao')
    .setBackground('#37474f').setFontColor('#eceff1').setFontStyle('italic');

  sh.getRange('A4').setValue('Today').setFontWeight('bold');
  sh.getRange('B4').setFormula('=TODAY()').setNumberFormat('ddd, mmm d, yyyy');
  sh.getRange('D4').setValue('DA RCPC submission date →').setFontWeight('bold').setHorizontalAlignment('right');
  sh.getRange('E4').setBackground('#fff59d').setNumberFormat('ddd, mmm d, yyyy')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build())
    .setNote('Type the date agreed with DA RCPC Davao.');
  sh.getRange('F4').setFormula('=IF(E4="","⬅ set the date",IF(E4-TODAY()<0,"passed",E4-TODAY()&" day(s) left"))').setFontWeight('bold').setFontColor('#e65100');

  const H = ['Member', 'Role', 'Tasks', 'Done', 'In Progress', 'Waiting', 'Overdue', 'Progress', '%', 'Open Panel Items', 'Next Due'];
  headers_(sh, 6, H, '#263238');

  CFG.members.forEach((m, i) => {
    const r = 7 + i, t = "'" + m.tab + "'!";
    sh.getRange(r, 1).setValue(m.name).setFontWeight('bold').setFontColor(m.color);
    sh.getRange(r, 2).setValue(m.role);
    sh.getRange(r, 3).setFormula('=COUNTA(' + t + 'B4:B)');
    sh.getRange(r, 4).setFormula('=COUNTIF(' + t + 'E4:E,"Done")');
    sh.getRange(r, 5).setFormula('=COUNTIF(' + t + 'E4:E,"In Progress")');
    sh.getRange(r, 6).setFormula('=COUNTIF(' + t + 'E4:E,"Waiting")');
    sh.getRange(r, 7).setFormula('=COUNTIFS(' + t + 'F4:F,"<"&TODAY(),' + t + 'E4:E,"<>Done",' + t + 'B4:B,"<>")');
    sh.getRange(r, 9).setFormula('=IFERROR(D' + r + '/C' + r + ',0)');
    sh.getRange(r, 8).setFormula('=SPARKLINE(I' + r + ',{"charttype","bar";"max",1;"color1","' + m.color + '"})');
    sh.getRange(r, 10).setFormula('=COUNTIFS(\'Panel Revisions\'!D4:D,"*' + m.tab + '*",\'Panel Revisions\'!E4:E,"NC")');
    sh.getRange(r, 11).setFormula('=IF(MINIFS(' + t + 'F4:F,' + t + 'E4:E,"<>Done",' + t + 'F4:F,">0")=0,"—",TEXT(MINIFS(' + t + 'F4:F,' + t + 'E4:E,"<>Done",' + t + 'F4:F,">0"),"ddd, mmm d"))');
    sh.getRange(r, 1, 1, W).setBackground(m.light);
  });

  const tr = 7 + CFG.members.length;
  sh.getRange(tr, 1).setValue('TEAM TOTAL').setFontWeight('bold');
  ['C', 'D', 'E', 'F', 'G', 'J'].forEach(c => sh.getRange(c + tr).setFormula('=SUM(' + c + '7:' + c + (tr - 1) + ')'));
  sh.getRange('I' + tr).setFormula('=IFERROR(D' + tr + '/C' + tr + ',0)');
  sh.getRange('H' + tr).setFormula('=SPARKLINE(I' + tr + ',{"charttype","bar";"max",1;"color1","#263238"})');
  sh.getRange(tr, 1, 1, W).setFontWeight('bold').setBackground('#eceff1');
  sh.getRange(7, 9, tr - 6, 1).setNumberFormat('0%');
  sh.getRange(7, 3, tr - 6, 9).setHorizontalAlignment('center');
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground('#ffcdd2').setFontColor('#b71c1c').setBold(true)
      .setRanges([sh.getRange(7, 7, tr - 6, 1)]).build(),
  ]);

  // Milestones
  const mr = tr + 2;
  headers_(sh, mr, ['Milestone', '', 'Done', 'Total', '', '', '', 'Progress', '%', '', ''], '#455a64');
  const ms = [
    ['Panel revisions complied', '=COUNTIF(\'Panel Revisions\'!E4:E,"C")', '=COUNTA(\'Panel Revisions\'!C4:C)-COUNTIF(\'Panel Revisions\'!E4:E,"NA")', '#ef6c00'],
    ['Samples with a collection date', '=COUNTA(\'DA RCPC Samples\'!C4:C)', '=MAX(1,COUNTA(\'DA RCPC Samples\'!A4:A))', '#2e7d32'],
    ['Collected samples with 3+ photos', '=COUNTIFS(\'DA RCPC Samples\'!C4:C,"<>",\'DA RCPC Samples\'!F4:F,">=3")', '=MAX(1,COUNTA(\'DA RCPC Samples\'!C4:C))', '#2e7d32'],
    ['Samples submitted to RCPC', '=COUNTA(\'DA RCPC Samples\'!J4:J)', '=MAX(1,COUNTA(\'DA RCPC Samples\'!C4:C))', '#2e7d32'],
    ['Samples validated by RCPC', '=COUNTA(\'DA RCPC Samples\'!K4:K)', '=MAX(1,COUNTA(\'DA RCPC Samples\'!J4:J))', '#2e7d32'],
    ['Supplies bought', '=COUNTIF(Supplies!G3:G,TRUE)', '=COUNTA(Supplies!A3:A)', '#6d4c41'],
  ];
  ms.forEach((x, i) => {
    const r = mr + 1 + i;
    sh.getRange(r, 1, 1, 2).merge().setValue(x[0]).setFontWeight('bold');
    sh.getRange(r, 3).setFormula(x[1]);
    sh.getRange(r, 4).setFormula(x[2]);
    sh.getRange(r, 9).setFormula('=IFERROR(C' + r + '/D' + r + ',0)').setNumberFormat('0%');
    sh.getRange(r, 8).setFormula('=SPARKLINE(I' + r + ',{"charttype","bar";"max",1;"color1","' + x[3] + '"})');
    sh.getRange(r, 3, 1, 7).setHorizontalAlignment('center');
  });

  const nr = mr + ms.length + 2;
  sh.getRange(nr, 1, 1, W).merge()
    .setValue('Legend: red row = overdue · yellow row = due within 3 days · grey strikethrough = done. Collected samples must be submitted fresh to DA RCPC Davao.')
    .setFontStyle('italic').setFontColor('#757575').setWrap(true);

  [190, 170, 70, 70, 90, 80, 80, 150, 60, 110, 120].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.setRowHeights(7, tr - 6, 30);
  sh.setFrozenRows(2);
  sh.setHiddenGridlines(true);
}

/* ============================================================
 *  EMAIL REMINDERS
 * ============================================================ */
function emailOpenTasks() {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const rev = ss.getSheetByName('Panel Revisions');
  const revRows = rev ? rev.getRange(4, 1, Math.max(1, rev.getLastRow() - 3), 5).getValues() : [];
  let sent = 0;

  CFG.members.forEach(m => {
    const sh = ss.getSheetByName(m.tab);
    if (!sh || sh.getLastRow() < 4) return;
    const rows = sh.getRange(4, 1, sh.getLastRow() - 3, 8).getValues()
      .filter(r => r[1] && r[4] !== 'Done')
      .sort((a, b) => (a[5] || new Date(2100, 0, 1)) - (b[5] || new Date(2100, 0, 1)));
    const myRev = revRows.filter(r => String(r[3]).indexOf(m.tab) > -1 && r[4] === 'NC');
    if (!rows.length && !myRev.length) return;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const td = 'style="padding:6px 8px;border-bottom:1px solid #eee"';
    const taskRows = rows.map(r => {
      const due = r[5] instanceof Date ? Utilities.formatDate(r[5], tz, 'EEE, MMM d') : '—';
      const late = r[5] instanceof Date && r[5] < today;
      return '<tr' + (late ? ' style="background:#ffebee"' : '') + '><td ' + td + '>' + r[0] + '</td><td ' + td + '>' + r[1] +
        '</td><td ' + td + '>' + r[4] + '</td><td ' + td + '>' + due + (late ? ' ⚠️' : '') + '</td></tr>';
    }).join('');
    const revList = myRev.map(r => '<li>[' + r[0] + '] ' + r[1] + ': ' + r[2] + '</li>').join('');

    const html =
      '<div style="font-family:Arial,sans-serif;font-size:14px">' +
      '<h2 style="color:' + m.color + '">Hi ' + m.name.split(' ')[0] + ' 👋</h2>' +
      '<p>Your open thesis tasks (' + m.role + '):</p>' +
      (rows.length ? '<table style="border-collapse:collapse"><tr style="background:#37474f;color:#fff"><th ' + td + '>ID</th><th ' + td +
        '>Task</th><th ' + td + '>Status</th><th ' + td + '>Due</th></tr>' + taskRows + '</table>' : '<p>No open tasks 🎉</p>') +
      (myRev.length ? '<h3>Panel revisions not yet complied (' + myRev.length + ')</h3><ul>' + revList + '</ul>' : '') +
      '<p><a href="' + ss.getUrl() + '">Open the tracker ↗</a></p></div>';

    MailApp.sendEmail({ to: m.email, subject: '🍌 Thesis tasks — ' + rows.length + ' open', htmlBody: html });
    sent++;
  });

  try { SpreadsheetApp.getActive().toast('Sent ' + sent + ' reminder email(s).', 'Thesis Tracker'); } catch (e) {}
}

function enableDailyReminder() {
  disableDailyReminder(true);
  ScriptApp.newTrigger('emailOpenTasks').timeBased().everyDays(1).atHour(8).inTimezone(CFG.timezone).create();
  SpreadsheetApp.getUi().alert('Daily reminders ON — each member gets their open tasks at about 8 AM.');
}

function disableDailyReminder(silent) {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'emailOpenTasks')
    .forEach(t => ScriptApp.deleteTrigger(t));
  if (silent !== true) SpreadsheetApp.getUi().alert('Daily reminders OFF.');
}
