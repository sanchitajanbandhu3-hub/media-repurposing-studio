# Media Content Repurposing Studio

A Next.js web app that helps creators turn timestamped podcast or video transcripts into short clips and platform-ready copy.

## What works in this MVP

- Paste a transcript or upload `.txt` / `.vtt`; WebVTT cues are converted to timestamped lines.
- Upload a small audio file (up to 10 MB) for Gemini transcription. Review the transcript before analysis.
- Gemini 3.5 Flash-Lite analyzes clips, returns reasons and safety notes, and writes copy for LinkedIn, Instagram, X, YouTube Shorts, and email.
- Select warm/casual/professional tone and English, Hindi, or Spanish captions.
- Edit captions; a browser-local demo profile summarizes simple tone, length, and emoji signals.
- Schedule drafts and enter views, likes, and shares. Data stays in browser localStorage.
- Local demo suggestions remain available when Gemini is not configured or hits a quota.

## Run locally

1. Install Node.js and npm.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to a key from Google AI Studio.
4. Run `npm run dev` and open `http://localhost:3000`.
5. Load the sample transcript, click **Find clip moments**, then review results, edit, schedule, and add metrics.
6. Restart the dev server after changing `.env.local`.

Never commit `.env.local` or share the key. `.gitignore` excludes it. Gemini free-tier limits and model access are controlled by Google; when unavailable, the UI falls back to local demo mode.

## Architecture

Next.js App Router provides the UI and server routes. `/api/analyze` calls Gemini through the Interactions API; `/api/transcribe` sends audio for transcription. The user reviews AI-selected excerpts before scheduling. Caption edits, scheduled drafts, and performance numbers currently use localStorage, so they are limited to this browser and device.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the flow. This is a hackathon MVP: it does not publish to social platforms, use a hosted database, or persist data across devices. The agent returns analysis steps in its response; the current implementation does not call separate autonomous tools for each step.
