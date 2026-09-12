# Build Prompt: Atlys AI Intern Proctored Challenge Platform

> Copy everything below the line into your LLM/Claude Code session as the initial prompt. It's written so the model can either produce a full implementation plan or start scaffolding code directly, depending on what you ask it to do next.

---

## PROMPT START

You are a senior full-stack engineer and security-minded architect. Build a **proctored technical assessment platform** for evaluating AI intern candidates at Atlys. This is NOT a leetcode-style coding test platform — it hosts short, hands-on "find the flaw" engineering challenges (e.g., a candidate must discover a secret leaked in an API response, decode a JWT, spot a prompt-injection vulnerability in a mock chatbot, etc.). The platform must combine three things: (1) a challenge playground, (2) proctoring/anti-cheat, and (3) an admin review dashboard.

Treat this as a real internal hiring tool that will store candidate video and personal data — build it with privacy, security, and reliability as first-class concerns, not afterthoughts.

### 1. High-Level Goals

- Give each candidate a timed, sandboxed environment to attempt a set of ~15–20 short challenges (each challenge is a small mock web app, API, file, or chatbot with an intentional flaw to find).
- Record enough signal (video, tab/window activity, timing, submitted answers) for a human reviewer to trust the result, without being so invasive that it breaks candidates' ability to actually do the challenges (many challenges *require* using browser DevTools — proctoring must not block that).
- Give admins/interviewers a clean dashboard to review sessions, flagged events, and scores.
- Be legally and ethically sound: explicit consent screens, clear data retention policy, and no covert recording.

### 2. User Roles

- **Candidate**: logs in via a unique invite link, goes through consent + system check, attempts challenges within a time limit, submits answers.
- **Admin/Recruiter**: creates assessment sessions, assigns challenge sets, reviews recordings/flags/scores, exports results, manages candidate invites.
- **(Optional) Reviewer**: read-only access to a subset of sessions for calibration/second opinions.

### 3. Candidate Flow

1. **Invite & Auth** — candidate receives a unique, expiring link (magic link or one-time code tied to their email). No public sign-up.
2. **Pre-check screen** — browser/OS compatibility check, webcam + mic permission request, screen-share permission request (for screen recording), and a live preview so the candidate can confirm they're visible before starting.
3. **Consent screen** — plain-language explanation of what is recorded (webcam video, screen activity, tab-switch events, timestamps), how long it's stored, who can view it, and an explicit "I agree" checkbox required to proceed. Do not start any recording before this is accepted.
4. **Instructions screen** — explains the format, that DevTools/Network tab usage is expected and allowed, what *is* prohibited (leaving the assessment tab/window, using a second device to search for help, having another person present), and the total time limit.
5. **Assessment session**:
   - Fullscreen is requested and encouraged (not silently forced) — show a clear prompt with a button, since browsers block silent fullscreen calls.
   - Webcam recording starts and runs for the full session.
   - Screen recording (or at minimum, tab-visibility + window-focus event logging) runs for the full session.
   - Candidate sees a list/sidebar of challenges, can navigate between them freely, and each challenge opens in an embedded sandboxed view (iframe or new isolated route) with its own mock environment.
   - Candidate submits a free-text answer (and optionally supporting evidence, like "what request did you use") per challenge.
   - A visible, persistent timer counts down.
6. **Submission** — on time-up or manual submit, all recordings/logs upload, and the candidate sees a simple "submitted, thank you" confirmation with no score shown to them.

### 4. Proctoring & Anti-Cheat Requirements

Be precise about what's realistically enforceable in a browser — don't overclaim.

**Must implement:**
- Webcam video recording for the full session (chunked upload via `MediaRecorder` API, uploaded periodically so a crash doesn't lose everything).
- Tab-visibility and window-focus/blur event logging (`document.visibilitychange`, `window.blur`/`focus`) — log every switch-away event with a timestamp, don't silently block it (you can't reliably block it anyway; log it and flag it for review instead).
- Fullscreen exit detection — log when candidate exits fullscreen, gently re-prompt to return to fullscreen.
- Copy-paste event logging on the answer text fields (log paste events with content length, don't silently block paste — some legitimate workflows involve pasting short command output).
- Multiple-monitor detection where feasible (`window.screen` API / `getScreenDetails()` where supported) — log if more than one display is detected.
- Basic face-presence check at intervals using a lightweight in-browser face detection model (e.g., a small ML model client-side, or periodic frame snapshots reviewed by a human/automated check) — flag "no face detected" or "multiple faces detected" periods, don't hard-block on it (false positives from lighting/camera angle are common).
- Session integrity: disable right-click context menu on the assessment shell (not inside challenge sandboxes where it may be needed) and block navigating away without a confirmation prompt (`beforeunload`).
- Server-side timestamp validation — don't trust client-reported timers alone for scoring/time limits.

**Explicitly do NOT block:**
- Browser DevTools within the challenge sandboxes — several challenges require opening the Network tab, Console, or Sources panel. Only log DevTools open/close events for review context (via viewport-resize heuristics), never disable or warn against it.
- Right-click/inspect inside the actual challenge iframes/pages.

**Flagging, not auto-failing:** every anti-cheat signal (tab switch, no-face, second monitor, etc.) should produce a timestamped flag visible to the reviewer on a timeline alongside the video — never auto-fail or auto-submit a candidate based on a heuristic alone. Humans make the final call.

### 5. Challenge Playground Architecture

Each challenge is a small, fully isolated, disposable environment — never touching real Atlys infrastructure, data, or credentials.

- Each challenge = a self-contained mock app (a small Node/Express or Flask app, or a static site + mock API) with **deliberately planted, fake, dummy secrets/flaws**, one per challenge, matching the 20-challenge design doc provided separately (leaked API keys, exposed `.env`, hardcoded JWT, Base64 secret, git history secret, race-condition coupon, prompt-injection chatbot, hallucinating mock LLM assistant, undocumented Swagger endpoint, weak-password zip file, etc.).
- Run each mock app in its own container (Docker) per session or per candidate, torn down after the session ends, so candidates can't interfere with each other or persist changes.
- Serve each challenge inside a sandboxed `<iframe>` (with a strict `sandbox` attribute allowing only what's needed) or as a separate isolated subdomain per session, so candidates can use real DevTools/Network tab against it safely.
- Each challenge has: a title, a short task description, an embedded environment, a free-text answer box, and (optionally) a "how did you find it?" field for signal beyond the raw answer.
- Store challenge definitions (mock app config, planted secret, expected answer/regex, scoring notes) in a database so new challenges can be added without redeploying the whole platform.
- Auto-check the submitted answer against an expected pattern where possible (e.g., regex match for "atlys_secret_2026"), but always allow human override, since some challenges (like the AI prompt-injection ones) have variable "gotcha" outputs that aren't a single fixed string.

### 6. Admin Dashboard

- List of assessment sessions with candidate name, status (in progress/submitted/reviewed), score, and flag count.
- Session detail view: synced video player + timeline of flagged events (tab switches, no-face periods, paste events) so a reviewer can jump straight to a flagged moment.
- Per-challenge breakdown: submitted answer, time spent, whether auto-check passed, reviewer's manual pass/fail/partial + notes.
- Bulk actions: invite candidates (CSV upload of emails), assign a challenge set, export results (CSV/PDF).
- Access control: only authenticated Atlys team members, role-based (admin vs reviewer), audit log of who viewed which candidate's recording.

### 7. Data, Privacy & Retention

- Store video/screen recordings encrypted at rest (e.g., S3 with server-side encryption), signed URLs with short expiry for playback, never public buckets.
- Define and enforce a retention window (e.g., auto-delete recordings 90 days after the hiring decision) — make this configurable, not hardcoded.
- Log an explicit consent record (timestamp, IP, version of consent text) per candidate.
- Support a candidate data-deletion request flow (for privacy compliance) that removes their recordings and PII on request, keeping only anonymized scoring data if needed for audit.
- Never store real Atlys credentials, secrets, or production data anywhere in challenge environments — everything planted must be clearly fake/dummy values generated for this platform only.

### 8. Suggested Tech Stack (adjust if you have a stronger opinion, but justify the change)

- **Frontend**: React + TypeScript, Tailwind for styling, `MediaRecorder`/`getUserMedia`/`getDisplayMedia` for capture.
- **Backend**: Node.js (Express or NestJS) for the platform API; separate lightweight containers (Docker) for each challenge's mock app.
- **Database**: PostgreSQL for structured data (sessions, candidates, challenge configs, scores, flags); object storage (S3-compatible) for video/screen recordings.
- **Auth**: magic-link/one-time-code auth for candidates; standard email+password or SSO for admins.
- **Realtime/upload**: chunked video upload (e.g., via presigned S3 multipart upload) rather than one giant file at the end, to survive crashes/network drops.
- **Isolation**: Docker (or lightweight Firecracker/gVisor if you want stronger isolation) to spin up/tear down per-session challenge containers.

### 9. Non-Functional Requirements

- Must work reliably on a typical candidate laptop/browser (Chrome/Edge/Firefox, no special software install required beyond browser permissions).
- Must degrade gracefully if webcam/mic permission is denied — clearly block the candidate from starting the assessment with an explanation, rather than silently failing.
- Must handle network interruptions during recording without losing the whole session (chunked upload, resumable if possible).
- Should support at least 50 concurrent candidate sessions without one candidate's container/session affecting another's.
- All admin actions and data access should be logged for audit purposes.

### 10. Deliverable

First, produce:
1. A system architecture diagram/description.
2. A data model (core tables/entities).
3. A prioritized build plan (MVP first: auth, one working challenge end-to-end with recording, basic admin review — then expand to all 20 challenges and full anti-cheat feature set).

Then, once the plan is confirmed, scaffold the actual codebase incrementally, starting with the MVP slice above.

## PROMPT END

---

### A note before you use this

- Get a quick legal/privacy sign-off internally before recording candidate video at scale — consent screens and retention policies here are a starting point, not a substitute for real legal review in your jurisdiction.
- Since several challenges rely on DevTools, make sure whoever builds this doesn't "over-secure" the platform in a way that blocks the very behavior you're trying to test — the prompt above calls this out explicitly, but it's worth double-checking once a demo is running.
- Consider a short pilot with 2–3 internal team members playing "candidate" before running it on real applicants, to catch UX friction (permission prompts, fullscreen nagging, false-positive face-detection flags) early.