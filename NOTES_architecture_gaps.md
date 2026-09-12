# Standing Note: challenges.md vs prompt.md architecture

Not yet applied to prompt.md — keeping as a reference note for when we build the real
architecture doc / scaffold the platform.

## Why this exists
`prompt.md` §5 assumes every challenge is a mock web app/API served in a sandboxed
`<iframe>` inside a per-session Docker container. The actual challenges in
`challenges.md` don't all fit that shape.

## Challenge type taxonomy (from the 8 concrete challenges we have)

| Type | Challenges | Delivery mechanism | Isolation needs |
|---|---|---|---|
| Web app/API w/ planted flaw | 1 (Leaky Login), 4 (Base64 config), 6 (JWT) | Mock app in container, iframe, DevTools/Network access | Per-session container, teardown after |
| Downloadable artifact | 13 (EXIF image), 15 (password zip) | Static file download; candidate inspects/cracks with **local OS tools/terminal**, no iframe involved | None — read-only, safe to share across all candidates |
| VCS/repo | 11 (Git History Ghost) | Real git repo w/ crafted commit history; candidate `git clone`s and inspects locally | None — read-only repo, shareable; needs lightweight git hosting (bare repo + `git daemon`, or downloadable `.git` bundle) |
| LLM-based | 8 (chatbot), 16 (RAG/poisoned doc) | Live LLM API calls; 16 also needs per-session document upload + retrieval pipeline | Per-session state (esp. 16, since each candidate uploads a doc); no fixed expected-answer, human review mandatory |

## Implications / proposed edits to prompt.md (not yet applied)

1. **§5** — replace single "mock app in iframe" model with the taxonomy above; each type
   gets its own delivery mechanism instead of forcing Docker+iframe everywhere.
2. **§3 candidate flow (step 5)** — acknowledge that some challenges require downloading
   a file/repo and using local tools outside the browser, not just an embedded view.
3. **§4 proctoring** — tab-switch/blur flags need per-challenge context in the reviewer
   timeline, since switching to a terminal/git client during a file- or repo-based
   challenge is expected behavior, not suspicious — reviewers need to see *which*
   challenge was active when a flag fired.
4. **§5 storage** — static artifacts (13, 15) and read-only repos (11) don't need
   per-session container isolation/teardown, only the app-based (1,4,6) and LLM-based
   (8,16) challenges do.
5. **§8 tech stack** — add a lightweight git-hosting component (for 11) and an LLM
   inference dependency/cost-rate-limit plan (for 8, 16); currently unmentioned.

## Also noted separately
Only 8 of the claimed ~15–20 challenges exist in `challenges.md` (numbers 1, 4, 6, 8,
11, 13, 15, 16). The rest are presumably TBD.
