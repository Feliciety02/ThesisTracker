# 🍌 Banana Thesis Tracker

Installable task tracker app for the thesis
**"An Enhanced EfficientNetB0 Architecture for Mobile Banana Leaf Disease Classification"**
(BSCS Capstone, University of Mindanao).

- **Team:** Fe Anne Malasarte (Team Leader), Rho Alphone Jornadal (ML Lead), Charisse Priego (Documentation Lead)
- **Frontend:** this repo, hosted free on GitHub Pages. It's an installable app (PWA) that works offline with the last synced data.
- **Database:** the team's Google Sheet, reached through a small Apps Script API. Every change is logged with who made it on the sheet's **Activity** tab.

## Setup

### 1. Google Sheet + Apps Script (once)
1. In the tracker Google Sheet, open **Extensions → Apps Script**. You need two script files there:
   - `ThesisTracker.gs`
   - `WebApp.gs` (the API)

   If an HTML file named `Index` is there from before, delete it.
2. In Apps Script, go to **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
3. Copy the **Web app URL**. It ends in `/exec`.
4. In Apps Script, run **setupTracker** (or, in the sheet, **🍌 Thesis Tracker → 🛠 Repair / update tracker**). It is safe to run any time: tabs that already have data — tasks, panel items, DA RCPC samples, supplies — are kept untouched; only missing or empty tabs are built.
5. Back in the sheet, run **🍌 Thesis Tracker → 📷 Connect photo folder** once. This connects the Curated Banana Leaf Disease Dataset folder (photos go into its **DA RCPC Sample Photos** subfolder) and grants Drive permission. If you deployed before this step, make a **New version** of the deployment.

### 2. GitHub Pages
1. Upload all files in this folder to the repo root, including `.nojekyll` and the `icons/` folder.
2. Edit `config.js` and paste the Web app URL between the quotes.
3. Go to **Settings → Pages → Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**, folder **/ (root)**
   - Save.
4. After about a minute, the app is live at `https://<your-username>.github.io/<repo-name>/`.

### 3. Install on phones
- **Android (Chrome):** open the link, then tap **⬇ Install app** in the header (or ⋮ → Install app).
- **iPhone (Safari):** open the link, then Share → **Add to Home Screen**.
- **Laptop (Chrome / Edge):** use the install icon in the address bar.

The first time, each member taps their name. The app remembers them on that device, so they stay logged in. **Switch user** (top-right name chip, or the bottom of the app) changes who is logged in.

## Samples, labels and photos
- Tap **＋ New sample** on the DA RCPC Samples page. The app gives the next label automatically: **FA-###** (Fe Anne), **RJ-###** (Rho), **CP-###** (Cha). It works offline too, and two people can never get the same label.
- The camera opens right away and guides you one photo at a time: **3 required** (top, underside, lesion close-up), then **✓ Finish** or **＋ add up to 2 optional** angles. Photos are named `<ID>_01.jpg … <ID>_05.jpg`. Tap any thumbnail to retake it.
- The last screen reminds you to **cut the leaf, wrap it in damp cotton, bag it, and write the label (e.g. FA-004) on masking tape** — the same label as the spreadsheet row and the photo names.
- Photos are saved automatically to the team's **Curated Banana Leaf Disease Dataset** folder, inside **DA RCPC Sample Photos**. Retaking an angle replaces that file.
- Photos are resized to 1600 px (about 0.3–0.7 MB each) and upload one at a time, so the app stays fast.

## Working on the farm (no signal)
- **Before leaving:** open the app once with signal and make sure you're logged in. That saves the app and the latest data on the phone.
- **On the farm:** use it normally. Sample details, checkboxes, tasks, and photos are all saved on the phone. A **📴 No signal** bar and a **⏳ N to sync** counter show what's waiting.
- **Back in signal:** open the app. It syncs everything by itself, in order: changes first, then photos. The ⏳ counter disappears when it's done.
- Don't uninstall the app or clear the browser's data while ⏳ is showing, or the waiting photos are lost.

## Everyone is an admin
All three members can add, edit and delete tasks (✏️ on a task) and supplies (＋ Add, edit any field, 🗑 delete), and edit any sample. Every change is logged with who made it on the sheet's **Activity** tab.

## Updating
- **Changed `index.html`?** Bump `VERSION` in `sw.js` (for example `bt-v2`) so installed apps pick up the change.
- **Changed `WebApp.gs`?** In Apps Script: Deploy → Manage deployments → ✏️ → Version: **New version** → Deploy. The URL stays the same.

## Notes
- There is no password. Anyone who has the app link can open the tracker and pick a name, so share the link only within the team. Every edit is logged on the **Activity** tab, so you can always see who changed what.
- If `config.js` still has the placeholder, the app runs in **demo mode** with sample data.
- If your school account doesn't offer "Anyone" as a deployment option, deploy the Apps Script from a personal Gmail copy of the sheet instead.
