# Process Log

## Step 1 — Project check and foundation (2026-11-21)
- Confirmed the workspace had no app source files; it contained only `outputs/` and `work/`.
- Added a minimal Next.js, TypeScript, and Tailwind project foundation and initial project documentation.
- No dependencies were installed and no application run was performed in this step.

## Build configuration fix — 2026-11-21
- Replaced the CommonJS PostCSS config with a .cjs file because .mjs files use ES module syntax.
- Build not run here; user will restart the dev server and check the browser.


## Step 2 — Transcript intake (2026-11-21)
- Added an editorial-style intake screen with transcript paste, .txt/.vtt upload, local browser saving, and sample transcript loading.
- Audio speech-to-text is clearly identified as not connected yet.


## Start button fix — 2026-11-21
- Connected the hero button to scroll to and focus the transcript editor.


## Step 3 — Timestamped clip suggestions (2026-11-21)
- Connected intake action to a local heuristic that extracts timestamped transcript lines and displays clip candidates, time ranges, reasons, and scores.
- Clearly labeled scores and suggestions as demo analysis; no LLM service is connected yet.


## Step 4 — Brand voice demo memory (2026-11-21)
- Added editable caption feedback and a local heuristic profile for tone, length, emoji use, and edit count.
- Profile is browser-local and labeled demo; original draft snapshot is stored on first edit per caption/platform.


## Step 5 — Calendar planning (2026-11-21)
- Added a date/platform/clip scheduler and local calendar list. Clearly labeled as a local draft planner; it does not publish posts.


## Step 6 — Performance entry (2026-11-21)
- Added per scheduled post views, likes, and shares entry with a simple engagement percentage and explanatory demo note. Stored in browser localStorage.


## Step 7 — Performance feedback summary (2026-11-21)
- Compared local engagement rates across posts and surfaced strongest platform plus average. Summary updates as metrics change.
- This is transparent rule-based feedback; clip and caption generation are not yet altered by these data.


## Step 8 — Draft tone control (2026-11-21)
- Added casual, warm, and professional tone selector; selected tone changes draft endings on next analysis. Rule-based demo copy only.


## Step 9 — Real AI analysis route (2026-11-21)
- Added a server-side OpenAI chat-completions route that requests a multi-step transcript/clip/safety/copy JSON result. The key is read only from OPENAI_API_KEY.
- Connected the Analyze button to this route and retained the local heuristic as a fallback when AI is not configured or reachable.
- API usage requires a valid key and provider access; no credential was added.


## Step 10 — Switch to Gemini free tier (2026-11-21)
- Replaced OpenAI API call with Google Gemini generateContent REST call using GEMINI_API_KEY and gemini-2.5-flash-lite.
- Updated .env.example, README, architecture diagram; local demo fallback remains in the UI.
- Free-tier quota and model availability are controlled by Google and may be limited; not verified against a live key.


## Gemini model/API update (2026-11-21)
- Updated the route to Gemini 3.5 Flash-Lite on Google's Interactions API after the prior generateContent model was unavailable to the user's account.
- Response parsing reads text from model_output interaction steps. Local fallback remains.


## Gemini JSON parsing fix (2026-11-21)
- Strip optional Markdown JSON fences and isolate the returned JSON object before parsing Gemini output.


## Agent activity display (2026-11-21)
- Added Gemini activity reasons and per-clip safety review text to the result cards; local fallback stays labeled.


## Step 11 — Safety review before scheduling (2026-11-21)
- Scheduling now pauses when Gemini marks a clip with a non-clear safety result and shows the note for creator review.


## Step 12 — Brand edit learning accuracy (2026-11-21)
- Brand profile now loads after refresh, and caption edits are recorded on blur instead of every typed character. Unchanged drafts are ignored.


## Step 13 — Caption language selection (2026-11-21)
- Added English, Hindi, and Spanish caption language selection to the AI request. Clip excerpts remain in their original transcript language.


## Step 14 — WebVTT cue import (2026-11-21)
- VTT uploads are now parsed into timestamped transcript lines, stripping basic caption markup before analysis.


## Step 15 — Gemini audio transcription
- Added a small-file audio upload route using Gemini Interactions audio input; transcript is returned into the editor for creator review before analysis.
- UI limits audio to 10 MB to keep this hackathon request manageable.


## Step 16 — Brand and performance context to AI
- Analyze requests now send the locally learned voice signals and strongest platform/average engagement to Gemini as context for the next suggestions.
- Data remains browser-local; this does not create durable cross-device memory.


## Step 17 — Preserve original captions for voice learning
- Store each generated platform draft as the comparison baseline before edits, allowing voice learning to compare the creator's final edit against the actual generated text.


## Step 18 — Workflow navigation
- Added anchor navigation to transcript, clip results, calendar, and performance for faster use and presentation.


## Step 19 — Submission setup and secret safety
- Added .gitignore rules for local keys and build output. Rewrote README with accurate implemented scope, run instructions, API fallback, and MVP limits.

