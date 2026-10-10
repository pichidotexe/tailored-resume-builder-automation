# 🚀 Tailored Resume Creator & Job Application Automation

> **An automated end-to-end pipeline built with n8n, Playwright Browser Agent, Codex-lb (Multi-Account AI), LaTeX, ExifTool, and Google Sheets & Drive.**

---

## 📖 Table of Contents

1. [🔥 Problem Statement](#-problem-statement)
2. [🌟 What Does This Project Do?](#-what-does-this-project-do)
3. [🏗️ How It Works](#️-how-it-works)
4. [📋 Prerequisites](#-prerequisites)
5. [🍴 Step 1: Fork & Clone the Repository](#-step-1-fork--clone-the-repository)
6. [🛠️ Step 2: Install Node.js, Python, uv, n8n, LaTeX, ExifTool & Codex-lb](#️-step-2-install-nodejs-python-uv-n8n-latex-exiftool--codex-lb)
7. [🌐 Step 3: Set All Environment Variables (n8n, ExifTool, Chrome)](#-step-3-set-all-environment-variables-n8n-exiftool-chrome)
8. [🕵️ Step 4: Configure the Chrome Browser Agent](#️-step-4-configure-the-chrome-browser-agent)
9. [🔐 Step 5: Configure Credentials (GCP Console, Google Sheets & Drive, Codex-lb API Key)](#-step-5-configure-credentials-gcp-console-google-sheets--drive-codex-lb-api-key)
10. [⚙️ Step 6: Import & Configure the n8n Workflow](#️-step-6-import--configure-the-n8n-workflow)
11. [▶️ Step 7: Sample Run](#️-step-7-sample-run)
12. [❓ Step 8: FAQs & Troubleshooting](#-step-8-faqs--troubleshooting)
13. [✅ Pre-Flight Checklist](#-pre-flight-checklist)

---

## 🔥 Problem Statement

Job hunting at scale is brutally manual:

- You open each job link, read the full description, and identify the exact keywords and skills the employer wants.
- You edit your resume carefully to highlight the most relevant experience — without fabricating anything.
- You convert it to PDF, name it properly, upload it to Drive, and copy the shareable link.
- You hunt for referral contacts on LinkedIn and write personalised outreach messages.
- You log all of this into a tracker spreadsheet and keep it updated.

Multiply that by 20, 50, or 100 applications and you have burned days of your life on copy-paste grunt work with zero guarantee of a response.

**There has to be a better way. This project is that better way.**

---

## 🌟 What Does This Project Do?

You paste job links into a Google Sheet. You click one button in n8n. The automation:

1. **Opens every job link** in a real Chrome browser (handles SPAs, cookie banners, "Show more" buttons).
2. **Extracts the full job description** — salary, experience requirements, work mode, applicant count, posting date.
3. **Scores your profile** against the job on a 0–100% weighted rubric and explains what matches and what is missing.
4. **Tailors your LaTeX resume** to the specific role, injecting the right ATS keywords without fabricating experience.
5. **Compiles a pixel-perfect PDF** with `pdflatex`.
6. **Injects PDF metadata** with ExifTool (a clever ATS optimisation prompt in the `Subject` field).
7. **Uploads the PDF** to Google Drive and generates a shareable link.
8. **Generates referral search links** (LinkedIn recruiter + employee searches) and a ready-to-send referral message.
9. **Logs a complete row** into your Job Tracker Google Sheet — match score, missing skills, keywords, referral leads, PDF link, application status.

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Google Sheet   │ ───► │ Playwright      │ ───► │ Codex-lb (AI)   │
│  Job Links      │      │ Browser Agent   │      │ Match + Tailor  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                           │
                                                           ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Google Sheet    │ ◄─── │ Google Drive    │ ◄─── │ pdflatex +      │
│ Job Tracker     │      │ Upload PDF      │      │ ExifTool Meta   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## 🏗️ How It Works

Here is the exact journey each job takes through the pipeline:

<p align="center">
  <img src="assets/flowchart.svg" alt="Tailored Resume Creator Pipeline Flowchart" width="100%" />
</p>

### Step-by-step data flow

| # | n8n Node | What happens |
| :---: | :--- | :--- |
| 1 | `Static Configuration` | Sets the row range to process and holds your master LaTeX resume |
| 2 | `Fetch Job Input Sheet` | Reads job rows from the **Job Links** Google Sheet via OAuth |
| 3 | `Start Debug Chrome` | Launches Chrome in CDP debug mode on port 9222 |
| 4 | `Get Application Page` | Runs `agent.mjs` via Playwright CDP to scrape the full job description |
| 5 | `Read/Write Files from Disk` | Reads the scraped output from `dummy-output.txt` |
| 6 | `Codex-lb — Analyze Job` | Sends job + resume to AI via Codex-lb Bearer Token; gets score, keywords, tailored LaTeX back |
| 7 | `Prepare Resume File` | Extracts values; names the output file `YourName_Company_Role.pdf` |
| 8 | `Write LaTeX File` | Saves the tailored `.tex` to the `resume/` folder |
| 9 | `LaTeX to PDF` | Runs `pdflatex` to compile `resume.pdf` |
| 10 | `Add Meta Data` | Runs `exiftool` to inject ATS prompt into PDF `Subject` field |
| 11 | `Read PDF` | Reads the compiled PDF binary for upload |
| 12 | `Google Drive — Upload PDF` | Uploads to your Drive folder and captures the shareable link |
| 13 | `Google Sheets — Append Row` | Appends the full result row to your **Job Tracker** sheet |
| 14 | `Convert Referral Leads to Rich Text` | Calls the deployed Apps Script to convert raw URLs into clickable hyperlinks |

---

## 📋 Prerequisites

Make sure every item below is in place **before** starting the setup steps.

| Component | Tool / Software | Required For |
| :--- | :--- | :--- |
| **Git** | git-scm.com | Cloning and version controlling the repository |
| **Node.js (v18+)** | nodejs.org | Running n8n & the browser agent |
| **Python (v3.10+)** | python.org | Running `uv` and helper tools |
| **uv** | Astral uv (`uvx`) | Running `codex-lb` without manual virtual environments |
| **n8n** | n8n workflow engine | Main automation workflow orchestration |
| **Codex-lb** | `uvx codex-lb` | Pooling multiple ChatGPT accounts for high-rate AI generation |
| **Google Chrome** | Chrome browser | Real browser session for Playwright CDP scraping |
| **pdflatex** | MiKTeX or TeX Live | Compiling LaTeX resumes to PDF |
| **ExifTool** | Phil Harvey's ExifTool | Injecting metadata into the PDF |
| **GCP Project** | Google Cloud Console | OAuth credentials for Google Sheets & Drive APIs |

---

## 🍴 Step 1: Fork & Clone the Repository

### 1. Fork this repository
1. Go to this repository on GitHub.
2. Click the **Fork** button in the top-right corner.
3. Select your GitHub profile/organization to create your own copy.

### 2. Clone it to your local machine
Open your terminal (PowerShell or Bash) and clone your fork:

```powershell
git clone https://github.com/<your-username>/tailored-resume-builder-automation.git
cd tailored-resume-builder-automation
```

---

## 🛠️ Step 2: Install Node.js, Python, uv, n8n, LaTeX, ExifTool & Codex-lb

### 1. Install Node.js (v18 or v20 LTS)
1. Download Node.js LTS from [nodejs.org](https://nodejs.org/) or install via WinGet:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
2. Verify in PowerShell:
   ```powershell
   node -v
   npm -v
   ```

### 2. Install Python (v3.10+)
1. Download from [python.org](https://www.python.org/) or install via WinGet:
   ```powershell
   winget install Python.Python.3.12
   ```
2. ⚠️ **Critical:** Make sure **"Add python.exe to PATH"** is checked during setup!
3. Verify:
   ```powershell
   python --version
   ```

### 3. Install `uv` (Fast Python Package Runner)
`uv` allows running `codex-lb` instantly with `uvx` without needing manual virtual environments:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Or via WinGet:
```powershell
winget install --id=astral-sh.uv
```

Verify:
```powershell
uv --version
```

### 4. Install n8n Globally & Set Up Local Account
1. Install n8n globally using npm:
   ```powershell
   npm install -g n8n
   ```
2. Start n8n:
   ```powershell
   n8n start
   ```
3. Open your browser and navigate to: 👉 **`http://localhost:5678`**
4. **Login locally using email and password:**
   - On the first run, n8n will prompt you to set up the owner account.
   - Enter your **Email address**, **First name**, **Last name**, and a secure **Password**.
   - Complete the setup to access the n8n dashboard.
   - *(Keep this n8n instance or leave this terminal ready for later steps).*

### 5. Install LaTeX (pdflatex via MiKTeX)
LaTeX compiles your tailored resume into a clean, pixel-perfect PDF.

1. Download **MiKTeX** from [miktex.org/download](https://miktex.org/download) or run:
   ```powershell
   winget install MiKTeX.MiKTeX
   ```
2. During installation, when prompted **"Install missing packages on-the-fly"** → select **Yes**.
3. Restart your PowerShell window and verify:
   ```powershell
   pdflatex --version
   ```

### 6. Install ExifTool
ExifTool injects ATS-optimisation metadata directly into the PDF `Subject` field.

1. Download the Windows executable from [exiftool.org](https://exiftool.org/).
2. Extract the `.zip` file. You will find `exiftool(-k).exe`.
3. **Rename it to `exiftool.exe`** (remove `(-k)`).
4. Move `exiftool.exe` to a permanent folder, e.g. `C:\Tools\`.

### 7. Run `codex-lb`
`codex-lb` runs an AI load-balancer that manages multiple ChatGPT accounts and exposes an OpenAI-compatible API on port `2455`:

```powershell
uvx codex-lb
```

This will automatically download and start `codex-lb` immediately. It will listen on **`http://127.0.0.1:2455`**. Keep this terminal running!

---

## 🌐 Step 3: Set All Environment Variables (n8n, ExifTool, Chrome)

By default, n8n disables dangerous nodes like `Execute Command` and file read/write operations. Because this workflow executes `pdflatex`, `exiftool`, and `node` scripts directly, these permissions must be explicitly enabled. Additionally, `exiftool` and `chrome` should be accessible on your system PATH.

### 1. Set n8n Environment Variables
Add the following user/system environment variables:

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS` | `true` | Prevents file permission conflicts on Windows |
| `N8N_ENABLE_EXECUTE_COMMAND` | `true` | **Critical:** Enables the Execute Command node in n8n |
| `NODES_EXCLUDE` | `[]` | Ensures all built-in filesystem nodes remain enabled |
| `N8N_RESTRICT_FILE_ACCESS_TO` | `""` | Prevents disk read/write restriction errors |

#### To set them permanently in Windows GUI:
1. Press `Win + R`, type `sysdm.cpl`, and press **Enter**.
2. Go to the **Advanced** tab → click **Environment Variables**.
3. Under **User variables** (or System variables), click **New** and add each variable above.

#### Or set them inline in PowerShell for your session:
```powershell
$env:N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS="true"
$env:N8N_ENABLE_EXECUTE_COMMAND="true"
$env:NODES_EXCLUDE="[]"
$env:N8N_RESTRICT_FILE_ACCESS_TO=""
```

### 2. Add ExifTool to System PATH
1. In the **Environment Variables** window (`sysdm.cpl`), locate `Path` under **System variables** → click **Edit**.
2. Click **New** → add `C:\Tools` (where `exiftool.exe` is saved).
3. Click **OK** to save.
4. Restart PowerShell and verify:
   ```powershell
   exiftool -ver
   ```

### 3. Add Chrome to System PATH
Adding Chrome allows the browser agent and automation to launch Chrome using `chrome`:
1. Find your Chrome executable directory:
   - Typically: `C:\Program Files\Google\Chrome\Application\`
   - Check in Chrome by going to `chrome://version/` → **Executable Path**.
2. Add `C:\Program Files\Google\Chrome\Application\` to your `Path` variable.
3. Restart PowerShell and verify:
   ```powershell
   chrome --version
   ```

---

## 🕵️ Step 4: Configure the Chrome Browser Agent

The browser agent utilizes Playwright connected via **Chrome DevTools Protocol (CDP)** on port `9222`. This handles JavaScript-heavy Single Page Applications (Workday, Greenhouse, Lever, LinkedIn), auto-expands "Show more" sections, and bypasses anti-bot hurdles.

### 1. Set Chrome Path & Profile in `start-debug-chrome.mjs`
Open `browser-agent/start-debug-chrome.mjs`:

**Line 6** — Set the Chrome profile directory (absolute path to `chrome-profile` inside `browser-agent/`):
```javascript
// Replace with the absolute path to your browser-agent/chrome-profile folder
const PROFILE = 'ABSOLUTE PATH OF CHROME PROFILE FOLDER';
```
> ⚠️ **Note:** In JavaScript strings on Windows, use escaped backslashes (`\\`) or forward slashes (`/`).

### 2. Install Browser Agent Dependencies
Open PowerShell inside the `browser-agent/` directory:

```powershell
cd browser-agent
npm install
```

### 3. Test the Browser Agent
1. Launch debug Chrome:
   ```powershell
   node start-debug-chrome.mjs
   ```
   Expected output: `Chrome CDP ready after 1 second(s).`
2. Test scraping a job link:
   ```powershell
   node agent.mjs "https://www.google.com" > dummy-output.txt
   ```
3. Check `dummy-output.txt` — it should contain formatted scraped output.

---

## 🔐 Step 5: Configure Credentials (GCP Console, Google Sheets & Drive, Codex-lb API Key)

### 5.1 Start n8n & Open Credentials Tab
1. Ensure n8n is running (`n8n start`).
2. Open `http://localhost:5678` in your browser.
3. On the left sidebar, click **Credentials**.

---

### 5.2 Set Up GCP Console (Google Sheets & Drive OAuth)
1. **Open GCP Console:** Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. **Create Project:** Click the project dropdown (top-left) → **New Project** → name it `n8n-resume-automation` → click **Create**. Ensure it is selected.
3. **Configure OAuth Consent Screen:**
   - Go to **APIs & Services** → **OAuth consent screen**.
   - Choose **External** → click **Create**.
   - Fill in:
     - **App name:** `n8n Resume Automation`
     - **User support email:** Your Gmail address
     - **Developer contact information:** Your Gmail address
   - Click **Save and Continue**.
   - Under **Test Users / Audience:** Click **+ Add Users** → enter your Gmail address → click **Save and Continue**.
4. **Enable APIs:**
   - In GCP Console, go to **APIs & Services** → **Library**.
   - Search for **Google Sheets API** → click **Enable**.
   - Search for **Google Drive API** → click **Enable**.
5. **Create OAuth 2.0 Credentials:**
   - Go to **APIs & Services** → **Credentials** → click **+ Create Credentials** → **OAuth client ID**.
   - Set **Application type** to **Web application**.
   - Name it `n8n OAuth Client`.
   - Under **Authorised redirect URIs**, click **+ Add URI**.
   - Enter n8n's redirect URL:
     ```
     http://localhost:5678/rest/oauth2-credential/callback
     ```
   - Click **Create**.
   - A modal pop-up will display your **Client ID** and **Client Secret**, with an option to download the credentials JSON file. Download the JSON or copy both credentials.

---

### 5.3 Connect Google Sheets & Drive Credentials in n8n
1. **Add Google Sheets Credential:**
   - In n8n (`http://localhost:5678`), go to **Credentials** → **Add Credential**.
   - Search for **Google Sheets OAuth2 API**.
   - Paste your **Client ID** and **Client Secret**.
   - Click **Sign in with Google** → a Google authorization window pops up.
   - Select your Google account and grant permissions until the status displays ✅ **Connected**.
2. **Add Google Drive Credential:**
   - In n8n, click **Add Credential** → search for **Google Drive OAuth2 API**.
   - Paste the same **Client ID** and **Client Secret**.
   - Click **Sign in with Google** and authorize.
   - The status will display ✅ **Connected**.

---

### 5.4 Configure Codex-lb Accounts & Create API Key
1. **Open Codex-lb:** Ensure `uvx codex-lb` is running in your terminal. Open your browser and navigate to the Codex-lb interface at `http://localhost:2455`.
2. **Add Accounts:**
   - Navigate to the **Accounts** tab.
   - Add your ChatGPT account(s). You can add multiple accounts to pool and load balance rate limits.
3. **Generate an API Key:**
   - Go to the **API Keys** tab.
   - Click **Create API Key**, give it any name (e.g. `n8n-tailored-resume`), and generate it.
   - **Copy the generated API key**.
4. **Add Codex-lb Bearer Token in n8n:**
   - Back in n8n, go to **Credentials** → **Add Credential**.
   - Search for **Header Auth** or **HTTP Bearer Auth** (select **Bearer Token** / **Header Auth**).
   - In the **Token** / **Key** field, paste the API key you copied from Codex-lb.
   - Rename this credential to **`codex-lb api key`**.
   - Click **Save**.

---

### 5.5 Google Sheets Setup & Apps Script Deployment
You will need an input spreadsheet, an output tracker spreadsheet, and a Google Drive folder.

#### 1. Input Sheet: "Job Links"
Create a Google Sheet named **Job Links** with this header row in row 1:

| S.No | Company | Role | Application link |
| :---: | :---: | :---: | :---: |
| 1 | Stripe | Software Engineer - Backend | https://stripe.com/jobs/... |

*(You can also upload `Job Links.xlsx` directly to Google Drive).*

#### 2. Output Sheet: "Job Tracker"
Create a Google Sheet named **Job Tracker** with these headers across columns A–V:

| Col | Header | Description |
| :---: | :--- | :--- |
| A | `S.No` | Serial number |
| B | `Company` | Company name |
| C | `Role` | Target role |
| D | `Required Yrs Experience` | Experience requirement extracted by AI |
| E | `Salary` | Compensation info |
| F | `Application Link` | Direct link to job posting |
| G | `No. of Applicants` | Applicant count from page |
| H | `Job Posted Date` | Verified posted date |
| I | `Location` | City / State / Country |
| J | `Work Mode` | Remote / Hybrid / Onsite |
| K | `Job Description` | Concise summary of duties & requirements |
| L | `Matching %` | Weighted score (0–100%) |
| M | `Matching Reason` | Explanation of score and key matches |
| N | `Missing Skills` | Genuine skill gaps |
| O | `Resume Keywords` | ATS keywords integrated into tailored resume |
| P | `Referral Leads` | LinkedIn search URLs (formatted as clickable links) |
| Q | `Referral Message` | Ready-to-send referral request (< 500 chars) |
| R | `Tailored Resume Link` | Clickable Google Drive PDF link |
| S | `Application Status` | Defaults to `"Not Applied"` |
| T | `Applied Date` | Auto-stamped when status → `"Applied"` |
| U | `Follow-up Date` | Auto-stamped for follow-ups |
| V | `Notes` | Personal application notes |

*(You can also upload `Job Tracker.xlsx` directly to Google Drive).*

#### 3. Deploy Google Apps Script Web App
1. Open your **Job Tracker** Google Sheet.
2. Go to **Extensions** → **Apps Script**.
3. Replace the code with the contents of `Job Tracker App Script.gs`.
4. Click **Deploy** → **New deployment**.
5. Select type: **Web app**.
   - **Description:** `Referral Leads & Status Formatter`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone` *(Crucial so n8n can call it without authentication barriers)*
6. Click **Deploy**, authorise Google permissions, and **copy the Web App URL** (`https://script.google.com/macros/s/.../exec`).

#### 4. Create Google Drive Folder
1. Go to [drive.google.com](https://drive.google.com/).
2. Create a folder named `Tailored Resumes`.
3. Open the folder and copy its **Folder ID** from the URL:
   `https://drive.google.com/drive/folders/`**`1a2b3c4d5e6f7g8h9i`**

---

## ⚙️ Step 6: Import & Configure the n8n Workflow

### 1. Import Workflow into n8n
1. In n8n, go to **Workflows** → click **Add Workflow** (or the three dots menu) → **Import from File**.
2. Select `n8n-workflow.json` from this repository.

### 2. Replace Placeholders in Nodes
Find and replace all placeholders with your absolute system paths:

| Placeholder | Node(s) | Description | Example |
| :--- | :--- | :--- | :--- |
| `<NAME>` | `Prepare Resume File`<br>`Google Drive - Upload PDF` | Your name for resume naming | `John_Doe` |
| `<BROWSER_AGENT_PATH>` | `Get Application Page` | Absolute path to `browser-agent/` directory | `R:\...\browser-agent` |
| `<START_DEBUG_CHROME_FILE_PATH>` | `Start Debug Chrome` | Absolute path to `start-debug-chrome.mjs` | `R:\...\browser-agent\start-debug-chrome.mjs` |
| `<DUMMY_OUTPUT_FILE_PATH>` | `Get Application Page`<br>`Read/Write Files from Disk` | Absolute path to `dummy-output.txt` | `R:\...\browser-agent\dummy-output.txt` |
| `<LOCAL_TEMP_FOLDER_FOR_RESUME>` | `Write LaTeX File`<br>`LaTeX to PDF`<br>`Add Meta Data`<br>`Read PDF` | Absolute path to your local `resume/` directory | `R:\...\tailored-resume-builder-automation\resume` |

### 3. Connect Node Credentials & Settings
- **`Static Configuration`**:
  - `start_sno`: Start row index (e.g. `1`).
  - `end_sno`: End row index (e.g. `1` for initial test).
  - `master_resume_latex`: Paste your complete master LaTeX resume code.
- **`Fetch Job Input Sheet`**:
  - Select your **Google Sheets OAuth2 API** credential.
  - Select the `Job Links` spreadsheet and sheet name.
- **`Codex-lb - Analyze Job`**:
  - Credential: Select your **`codex-lb api key`** (HTTP Bearer Auth).
  - URL: `http://127.0.0.1:2455/v1/responses`.
- **`Google Drive - Upload PDF`**:
  - Select your **Google Drive OAuth2 API** credential.
  - Select the `Tailored Resumes` folder (paste your Folder ID).
- **`Google Sheets - Append Row`**:
  - Select your **Google Sheets OAuth2 API** credential.
  - Select the `Job Tracker` spreadsheet.
- **`Convert Referral Leads to Rich Text`**:
  - URL: Paste your Apps Script Web App URL from Step 5.5.
  - Set JSON body with your `spreadsheetId` and `sheetName`.

---

## ▶️ Step 7: Sample Run

### Before Executing
Ensure the following processes are active simultaneously:

| Terminal | Command | Description |
| :--- | :--- | :--- |
| **Terminal 1** | `uvx codex-lb` | Codex AI load balancer (listening on port 2455) |
| **Terminal 2** | `n8n start` | n8n workflow engine (running on port 5678) |

*(Chrome is launched automatically in CDP mode by the `Start Debug Chrome` node).*

### Execution Steps
1. Add 1 test job row to your `Job Links` Google Sheet (e.g. a live software engineering listing).
2. Open n8n, open the workflow, and confirm `Static Configuration` is set to `start_sno: 1` and `end_sno: 1`.
3. Click **Test workflow** (or click **Execute workflow** on the `Manual Trigger` node).

### What Happens Automatically
1. Chrome launches headfully in the background and navigates to the job listing.
2. Playwright extracts the full job description and saves it to `dummy-output.txt`.
3. Codex-lb analyzes your master resume against the job description using your pooled ChatGPT accounts.
4. An ATS-tailored LaTeX resume is written to disk and compiled with `pdflatex`.
5. ExifTool injects the ATS prompt into the PDF metadata.
6. The tailored PDF is uploaded to Google Drive.
7. A complete analysis row (scores, missing skills, keywords, referral message, clickable links) is written to your `Job Tracker` sheet!

---

## ❓ Step 8: FAQs & Troubleshooting

### Q1: `Command failed: pdflatex not found`
- **Cause:** MiKTeX is installed but not added to your system PATH.
- **Fix:** Add the MiKTeX bin directory (e.g. `C:\Users\<User>\AppData\Local\Programs\MiKTeX\miktex\bin\x64\`) to System `Path` and restart terminal and n8n.

### Q2: `Execute Command is disabled in n8n`
- **Cause:** `N8N_ENABLE_EXECUTE_COMMAND` environment variable was not set prior to starting n8n.
- **Fix:** Set `$env:N8N_ENABLE_EXECUTE_COMMAND="true"` and restart n8n.

### Q3: `Chrome CDP did not become available within 30 seconds`
- **Cause:** Incorrect path in `start-debug-chrome.mjs` or another Chrome instance is using port 9222.
- **Fix:** Terminate running Chrome instances (`Get-Process chrome | Stop-Process -Force`) and verify the `CHROME` path on line 4.

### Q4: `ECONNREFUSED 127.0.0.1:2455` or empty output from Codex
- **Cause:** `codex-lb` is not running.
- **Fix:** Open a terminal and run `uvx codex-lb`. Ensure accounts and API keys are configured at `http://localhost:2455`.

### Q5: Google OAuth credential failed or redirects with error
- **Cause:** Redirect URI mismatch or APIs not enabled in GCP Console.
- **Fix:** Check GCP Console → Credentials → ensure `http://localhost:5678/rest/oauth2-credential/callback` is present in Authorised redirect URIs, and verify both Sheets and Drive APIs are enabled.

### Q6: Google Apps Script returns 403 or HTML login page
- **Cause:** Web App deployment access was not set to "Anyone".
- **Fix:** In Apps Script, click **Deploy** → **Manage deployments** → edit access to **Anyone** → Deploy new version → update URL in n8n.

### Q7: `exiftool` is not recognized
- **Cause:** `exiftool.exe` is not located in a directory listed in your system PATH.
- **Fix:** Ensure `exiftool.exe` is inside `C:\Tools` and `C:\Tools` is added to your Windows PATH.

---

## ✅ Pre-Flight Checklist

### 1. Installation
- [ ] Node.js v18+ installed (`node -v`)
- [ ] Python v3.10+ installed (`python --version`)
- [ ] `uv` installed (`uv --version`)
- [ ] n8n installed globally (`npm install -g n8n`) and owner login created locally
- [ ] `uvx codex-lb` running and accessible on port 2455
- [ ] MiKTeX installed with package on-the-fly set to Yes (`pdflatex --version`)
- [ ] ExifTool downloaded, renamed to `exiftool.exe`, and placed in `C:\Tools`

### 2. Environment Variables & PATH
- [ ] `N8N_ENABLE_EXECUTE_COMMAND=true`
- [ ] `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true`
- [ ] `NODES_EXCLUDE=[]`
- [ ] `C:\Tools` (ExifTool) added to system PATH (`exiftool -ver`)
- [ ] Chrome added to system PATH (`chrome --version`)

### 3. Browser Agent
- [ ] `npm install` executed inside `browser-agent/`
- [ ] `CHROME` and `PROFILE` paths set in `start-debug-chrome.mjs`
- [ ] `node start-debug-chrome.mjs` tested successfully

### 4. Credentials & APIs
- [ ] GCP Project created with Sheets and Drive APIs enabled
- [ ] OAuth consent screen configured with your email as a test user
- [ ] OAuth Web client created with redirect URI `http://localhost:5678/rest/oauth2-credential/callback`
- [ ] Google Sheets and Drive credentials created and connected in n8n
- [ ] ChatGPT accounts added in Codex-lb dashboard (`http://localhost:2455`)
- [ ] Codex-lb API key created, added to n8n credentials as Bearer Token, and named `codex-lb api key`

### 5. Sheets, Drive & Apps Script
- [ ] **Job Links** input sheet created
- [ ] **Job Tracker** output sheet created
- [ ] Apps Script deployed as Web App with access set to **Anyone** and URL copied
- [ ] `Tailored Resumes` Google Drive folder created and Folder ID copied

### 6. Workflow Import & Run
- [ ] `n8n-workflow.json` imported
- [ ] All path placeholders updated
- [ ] Master LaTeX resume pasted into `Static Configuration`
- [ ] `uvx codex-lb` & `n8n start` running simultaneously
- [ ] Test workflow run verified end-to-end! 🎉
