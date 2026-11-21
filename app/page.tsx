"use client";
import { useEffect, useState } from "react";
import { useRef } from "react";

const demo = `[00:00] Welcome back to the studio. Today I want to talk about why creative work gets stuck.\n[00:18] Most people think they need more discipline. Usually, they need a smaller first step.\n[00:42] When a project feels too big, make the first action so small that it feels almost silly. Open the document. Write one sentence.\n[01:08] Momentum is not something you wait for. It is something you build by keeping promises to yourself.\n[01:34] Try this tomorrow: set a timer for ten minutes and stop when it rings. You may find you want to keep going.`;
type Clip = { start: string; end: string; text: string; score: number; reason: string };
type ScheduledPost = { id: string; date: string; platform: string; clip: number; copy: string };
type Metrics = { postId: string; views: number; likes: number; shares: number };
type AgentStep = { name: string; reason: string };
const platforms = ["LinkedIn", "Instagram", "X", "YouTube Shorts", "Email"];

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("Your transcript stays in this browser for now.");
  const [clips, setClips] = useState<Clip[]>([]);
  const [copies, setCopies] = useState<Record<string, Record<string, string>>>({});
  const [activePlatform, setActivePlatform] = useState<Record<number, string>>({});
  const [voice, setVoice] = useState({ edits: 0, tone: "Not learned yet", length: "Not learned yet", emoji: "Not learned yet" });
  const [scheduleDate, setScheduleDate] = useState("");
  const [schedulePlatform, setSchedulePlatform] = useState("LinkedIn");
  const [scheduleClip, setScheduleClip] = useState(0);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [calendarStatus, setCalendarStatus] = useState("");
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [tone, setTone] = useState("Warm");
  const [language, setLanguage] = useState("English");
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const performanceSummary = (() => {
    const scored = posts.map(post => ({ post, metric: metrics.find(m => m.postId === post.id) })).filter((item): item is { post: ScheduledPost; metric: Metrics } => !!item.metric && item.metric.views > 0);
    if (!scored.length) return null;
    const ranked = [...scored].sort((a, b) => ((b.metric.likes + b.metric.shares) / b.metric.views) - ((a.metric.likes + a.metric.shares) / a.metric.views));
    return { best: ranked[0], average: scored.reduce((sum, item) => sum + (item.metric.likes + item.metric.shares) / item.metric.views, 0) / scored.length, count: scored.length };
  })();
  const transcriptBox = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setTranscript(localStorage.getItem("studio-transcript") ?? ""); try { const savedVoice = localStorage.getItem("studio-brand-voice"); if (savedVoice) setVoice(JSON.parse(savedVoice)); } catch { /* keep starter profile */ } }, []);
  useEffect(() => { try { setPosts(JSON.parse(localStorage.getItem("studio-calendar") ?? "[]")); } catch { setPosts([]); } }, []);
  useEffect(() => { try { setMetrics(JSON.parse(localStorage.getItem("studio-metrics") ?? "[]")); } catch { setMetrics([]); } }, []);
  function save(value: string) { setTranscript(value); localStorage.setItem("studio-transcript", value); setStatus("Transcript saved in this browser."); }
  async function readFile(file?: File) {
    if (!file) return;
    if (!/\.(txt|vtt)$/i.test(file.name)) { setStatus("Please choose a .txt or .vtt transcript file."); return; }
    const raw = await file.text();
    if (/\.vtt$/i.test(file.name)) {
      const lines = raw.replace(/^\uFEFF?WEBVTT[^\n]*\n/i, "").split(/\r?\n/);
      const cues: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/(\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?\s*-->\s*(\d{2}:\d{2}(?::\d{2})?)/);
        if (!match) continue;
        const textLines: string[] = [];
        for (i++; i < lines.length && lines[i].trim(); i++) if (!/^\d+$/.test(lines[i].trim())) textLines.push(lines[i].replace(/<[^>]+>/g, "").trim());
        if (textLines.length) cues.push(`[${match[1]}] ${textLines.join(" ")}`);
      }
      if (!cues.length) { setStatus("I couldn't read any caption cues from this VTT file."); return; }
      save(cues.join("\n")); return;
    }
    save(raw);
  }
  async function transcribeAudio(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setStatus("Please choose audio smaller than 10 MB for this demo."); return; }
    setStatus("Sending audio to Gemini for transcription…");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = ""; bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    try {
      const response = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio: btoa(binary), mimeType: file.type || "audio/mpeg" }) });
      const data = await response.json();
      if (!response.ok) { setStatus(data.error ?? "Audio transcription failed."); return; }
      save(data.transcript); setStatus("Audio transcribed by Gemini. Review the transcript, then find clip moments.");
    } catch { setStatus("Could not reach the transcription route. Check that the app is running and try again."); }
  }
  async function analyze() {
    if (!transcript.trim()) { setStatus("Add a transcript first."); return; }
    setStatus("AI agent is analyzing the transcript…");
    let fallbackReason = "";
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript, tone, language, brandVoice: voice, performance: performanceSummary ? { bestPlatform: performanceSummary.best.post.platform, averageEngagement: Number((performanceSummary.average * 100).toFixed(1)) } : undefined }) });
      const data = await response.json();
      if (response.ok && Array.isArray(data.clips) && data.clips.length) {
        const aiClips = data.clips as (Clip & { captions?: Record<string, string> })[];
        setAgentSteps(Array.isArray(data.steps) ? data.steps : []);
        setClips(aiClips); localStorage.setItem("studio-clips", JSON.stringify(aiClips));
        const generated: Record<string, Record<string, string>> = {};
        aiClips.forEach((clip, i) => { generated[i] = clip.captions ?? { LinkedIn: clip.text, Instagram: clip.text, X: clip.text, "YouTube Shorts": clip.text, Email: clip.text }; Object.entries(generated[i]).forEach(([platform, draft]) => localStorage.setItem(`studio-voice-${i}-${platform}`, draft)); });
        setCopies(generated); setActivePlatform(Object.fromEntries(aiClips.map((_, i) => [i, "LinkedIn"])));
        setStatus(`AI agent completed its analysis and selected ${aiClips.length} clips.`); return;
      }
      fallbackReason = `${data.error ?? "AI analysis unavailable."} Showing local demo suggestions instead.`;
    } catch { fallbackReason = "Could not reach the AI route. Showing local demo suggestions instead."; }
    const rows = transcript.split(/\r?\n/).map(line => {
      const match = line.match(/^\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.*)$/);
      return match ? { time: match[1], text: match[2] } : null;
    }).filter((row): row is { time: string; text: string } => !!row && !!row.text.trim());
    if (!rows.length) { setStatus("I couldn't find timestamped lines. Add lines like [00:18] Your words here."); return; }
    const picked = rows.map((row, i) => ({ ...row, score: Math.min(94, 66 + Math.min(row.text.length, 90) / 5 + (/\?|!|usually|most people|try this|why/i.test(row.text) ? 10 : 0)), reason: /\?|!/.test(row.text) ? "A question or strong punctuation may help hold attention." : /try this|most people|usually/i.test(row.text) ? "A relatable insight or practical prompt makes this easy to share." : "A concise, self-contained thought could work as a short clip." , next: rows[i + 1]?.time ?? "" }))
      .filter(row => row.text.length >= 35).slice(0, 5);
    if (!picked.length) { setStatus("Add a few more words after each timestamp so I can suggest moments."); return; }
    const result = picked.map(row => ({ start: row.time, end: row.next || row.time, text: row.text, score: Math.round(row.score), reason: row.reason }));
    setClips(result); localStorage.setItem("studio-clips", JSON.stringify(result)); setAgentSteps([]);
    const drafts: Record<string, Record<string, string>> = {};
    const ending = tone === "Professional" ? "A practical point to consider in your next session." : tone === "Casual" ? "Give it a try next time you sit down to create." : "A small, kind reminder for your next creative session.";
    result.forEach((clip, i) => { drafts[i] = { LinkedIn: `${clip.text}\n\n${ending}`, Instagram: `${clip.text}\n\nSave this for later.`, X: `${clip.text}`, "YouTube Shorts": `${clip.text}\n\n${ending}`, Email: `A thought for your week:\n\n${clip.text}\n\n${ending}` }; Object.entries(drafts[i]).forEach(([platform, draft]) => localStorage.setItem(`studio-voice-${i}-${platform}`, draft)); });
    setCopies(drafts); setActivePlatform(Object.fromEntries(result.map((_, i) => [i, "LinkedIn"]))); setStatus(fallbackReason || "Demo analysis complete. Scores and draft copy are examples, not AI-generated recommendations.");
  }
  function learnFromEdit(index: number, platform: string, edited: string) {
    const key = `studio-voice-${index}-${platform}`;
    const original = localStorage.getItem(key) ?? copies[index]?.[platform] ?? "";
    if (edited.trim() === original.trim()) return;
    localStorage.setItem(key, original);
    setCopies(prev => ({ ...prev, [index]: { ...prev[index], [platform]: edited } }));
    const next = { edits: voice.edits + 1, tone: /!|amazing|love|excited|✨|😊/i.test(edited) ? "Energetic and expressive" : "Calm and direct", length: edited.length < original.length ? "Prefers shorter edits" : edited.length > original.length ? "Prefers more detail" : "Similar length to draft", emoji: /[✨😊🔥❤️🎉]/u.test(edited) ? "Uses some emojis" : "Few or no emojis" };
    setVoice(next); localStorage.setItem("studio-brand-voice", JSON.stringify(next));
  }
  function chooseHook(index: number, hook: string) { const p = activePlatform[index] ?? "LinkedIn"; setCopies(prev => ({ ...prev, [index]: { ...prev[index], [p]: hook } })); }
  function schedulePost() {
    if (!scheduleDate || !clips[scheduleClip]) { setCalendarStatus("Choose a date and generate clip suggestions first."); return; }
    const safety = (clips[scheduleClip] as Clip & { safety?: string }).safety?.toLowerCase() ?? "";
    if (safety && !/^(clear|safe|no issues?)\b/.test(safety)) { setCalendarStatus(`Please review this clip's safety note before scheduling: ${safety}`); return; }
    const post = { id: `${Date.now()}`, date: scheduleDate, platform: schedulePlatform, clip: scheduleClip, copy: copies[scheduleClip]?.[schedulePlatform] ?? clips[scheduleClip].text };
    const updated = [...posts, post].sort((a, b) => a.date.localeCompare(b.date));
    setPosts(updated); localStorage.setItem("studio-calendar", JSON.stringify(updated)); setCalendarStatus("Draft scheduled in this browser.");
  }
  function updateMetric(postId: string, field: "views" | "likes" | "shares", value: number) {
    const existing = metrics.find(metric => metric.postId === postId) ?? { postId, views: 0, likes: 0, shares: 0 };
    const updated = [...metrics.filter(metric => metric.postId !== postId), { ...existing, [field]: Math.max(0, value) }];
    setMetrics(updated); localStorage.setItem("studio-metrics", JSON.stringify(updated));
  }
  return <main className="min-h-screen bg-paper text-ink">
    <header className="sticky top-0 z-30 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 border-b border-neutral-200/70 bg-paper/90 px-6 py-5 backdrop-blur-md md:px-12"><a className="text-xs uppercase tracking-[0.3em]" href="/">STUDIO / 01</a><nav aria-label="Main navigation" className="flex flex-wrap gap-5">{[["Transcript", "#transcript"], ["Clips", "#clip-results"], ["Calendar", "#calendar"], ["Performance", "#performance"]].map(([label, href]) => <a key={href} href={href} className="text-[10px] uppercase tracking-[0.16em] text-neutral-500 hover:text-forest">{label}</a>)}</nav><span className="hidden text-xs uppercase tracking-[0.2em] text-neutral-500 md:inline">A quieter way to create</span></header>
    <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:px-12 md:pt-24">
      <div className="min-w-0"><p className="mb-6 text-xs uppercase tracking-[0.3em] text-forest">From long form to lasting</p><h1 className="hero-title max-w-xl text-5xl font-light uppercase leading-[1.08] tracking-[0.1em] md:text-6xl"><span className="hero-word hero-from-top">Make</span><span className="hero-word hero-from-bottom">more</span><span className="hero-word hero-from-top hero-delay-two">from every</span><span className="hero-word hero-from-bottom hero-delay-three">conversation.</span></h1><p className="mt-7 max-w-md text-sm leading-7 text-neutral-500">Bring a transcript into the studio. We’ll find the moments worth sharing and shape them into thoughtful content.</p><button onClick={() => { transcriptBox.current?.scrollIntoView({ behavior: "smooth", block: "center" }); transcriptBox.current?.focus({ preventScroll: true }); }} className="mt-8 bg-ink px-6 py-4 text-[10px] uppercase tracking-[0.18em] text-white">Start with a transcript</button><div className="mt-10 flex gap-3"><span className="h-px w-10 self-center bg-forest"/><span className="text-xs uppercase tracking-[0.2em]">01 / Transcript intake</span></div><div className="hero-preview" aria-label="Abstract preview of a selected podcast clip"><div className="preview-back"></div><div className="preview-card"><div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-neutral-400"><span>Selected moment</span><span>00:42 — 01:08</span></div><p className="mt-4 max-w-xs text-sm leading-6 text-ink">“Momentum is something you build by keeping promises to yourself.”</p><div className="mt-5 flex h-8 items-center gap-1" aria-hidden="true">{[10,18,24,13,30,20,14,26,33,17,25,12,29,18,22,31,15,25,12,19].map((height, i) => <span key={i} className="wave-bar" style={{height: `${height}px`, animationDelay: `${i * 35}ms`}} />)}</div><div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-[9px] uppercase tracking-[0.15em]"><span className="text-neutral-400">A moment worth sharing</span><span className="text-forest">Clip 01</span></div></div></div>
      </div>
      <section id="transcript" className="relative mt-3 min-w-0 bg-white p-6 shadow-[0_24px_70px_rgba(32,37,34,0.08)] md:p-9"><div className="absolute -top-3 left-6 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-forest">Start here</div><div className="flex items-center justify-between"><h2 className="text-sm uppercase tracking-[0.2em]">Your source material</h2><button onClick={() => save(demo)} className="text-[10px] uppercase tracking-[0.18em] text-forest underline underline-offset-4">Load demo data</button></div><label className="mt-5 block text-xs text-neutral-500">Copy tone · demo<select value={tone} onChange={e => setTone(e.target.value)} className="mt-2 block w-full border border-neutral-200 bg-[#fbfbf9] p-3 text-sm"><option>Casual</option><option>Warm</option><option>Professional</option></select></label><label className="mt-4 block text-xs text-neutral-500">Caption language<select value={language} onChange={e => setLanguage(e.target.value)} className="mt-2 block w-full border border-neutral-200 bg-[#fbfbf9] p-3 text-sm"><option>English</option><option>Hindi</option><option>Spanish</option></select></label>
        <p className="mt-3 text-xs leading-5 text-neutral-500">Paste a transcript with timestamps, or upload a .txt or .vtt file.</p><textarea ref={transcriptBox} value={transcript} onChange={e => save(e.target.value)} placeholder="[00:00] Paste your transcript here..." className="mt-6 min-h-64 w-full resize-y border border-neutral-200 bg-[#fbfbf9] p-4 text-sm leading-6 outline-none transition focus:border-forest" aria-label="Transcript text" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-3"><label className="cursor-pointer border border-neutral-300 px-5 py-3 text-[10px] uppercase tracking-[0.16em] hover:border-ink">Choose transcript file<input type="file" accept=".txt,.vtt,text/plain,text/vtt" className="sr-only" onChange={e => readFile(e.target.files?.[0])}/></label><label className="cursor-pointer border border-neutral-300 px-5 py-3 text-[10px] uppercase tracking-[0.16em] hover:border-ink">Transcribe audio<input type="file" accept="audio/*" className="sr-only" onChange={e => transcribeAudio(e.target.files?.[0])}/></label></div><span className="text-xs text-neutral-400">{transcript.length.toLocaleString()} characters</span></div>
        <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-5"><p className="text-xs text-neutral-500" role="status">{status}</p><button onClick={analyze} className="bg-ink px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-white">Find clip moments</button></div>
        <p className="mt-4 text-[10px] leading-5 text-neutral-400">Audio uses Gemini transcription. For this demo, choose a file under 10 MB. Review its transcript before analysis.</p>
      </section>
    </section>
    {clips.length > 0 && <section className="mx-auto max-w-7xl px-6 pb-24 md:px-12" id="clip-results"><div className="mb-8 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.25em] text-forest">02 / First pass</p><h2 className="mt-3 text-2xl font-light uppercase tracking-[0.12em]">Clip moments</h2></div><span className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">AI or local demo</span></div>{agentSteps.length > 0 && <div className="mb-6 bg-white p-6 shadow-sm"><p className="text-[10px] uppercase tracking-[0.2em] text-forest">Agent activity · Gemini</p>{agentSteps.map((step, index) => <p key={`${step.name}-${index}`} className="mt-3 text-xs"><strong>{step.name}:</strong> <span className="text-neutral-500">{step.reason}</span></p>)}</div>}<div className="mb-6 bg-white p-6 shadow-sm"><p className="text-[10px] uppercase tracking-[0.2em] text-forest">Brand voice · local demo memory</p><div className="mt-4 grid gap-4 text-sm sm:grid-cols-4"><p><span className="block text-[10px] uppercase text-neutral-400">Edits learned</span>{voice.edits}</p><p><span className="block text-[10px] uppercase text-neutral-400">Tone signal</span>{voice.tone}</p><p><span className="block text-[10px] uppercase text-neutral-400">Length signal</span>{voice.length}</p><p><span className="block text-[10px] uppercase text-neutral-400">Emoji signal</span>{voice.emoji}</p></div><p className="mt-4 text-[10px] leading-5 text-neutral-400">Edit a draft below to teach the demo profile. It compares the edit with the original draft using simple rules.</p></div><div className="grid gap-5 md:grid-cols-2">{clips.map((clip, i) => { const platform = activePlatform[i] ?? "LinkedIn"; return <article key={`${clip.start}-${i}`} className="bg-white p-6 shadow-[0_14px_40px_rgba(32,37,34,0.06)]"><div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-neutral-400"><span>Clip {String(i + 1).padStart(2, "0")} · {clip.start}–{clip.end}</span><span className="text-forest">{clip.score} / 100</span></div><p className="mt-5 text-lg leading-7">“{clip.text}”</p><p className="mt-5 border-t border-neutral-100 pt-4 text-xs leading-5 text-neutral-500"><span className="mr-2 uppercase tracking-[0.15em] text-forest">Why it may work</span>{clip.reason}</p>{"safety" in clip && <p className="mt-2 bg-amber-50 px-3 py-2 text-xs text-amber-900">Safety review: {(clip as Clip & { safety?: string }).safety}</p>}<div className="mt-6 border-t border-neutral-100 pt-5"><p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-forest">Draft copy · demo</p><div className="flex flex-wrap gap-2">{platforms.map(name => <button key={name} onClick={() => setActivePlatform(prev => ({ ...prev, [i]: name }))} className={`px-3 py-2 text-[9px] uppercase tracking-[0.1em] ${platform === name ? "bg-ink text-white" : "border border-neutral-200 text-neutral-500"}`}>{name}</button>)}</div><textarea aria-label={`${platform} draft`} value={copies[i]?.[platform] ?? ""} onChange={e => setCopies(prev => ({ ...prev, [i]: { ...prev[i], [platform]: e.target.value } }))} onBlur={e => learnFromEdit(i, platform, e.currentTarget.value)} className="mt-3 min-h-28 w-full border border-neutral-200 bg-[#fbfbf9] p-3 text-sm leading-6 outline-none focus:border-forest"/><div className="mt-3 flex flex-wrap gap-2">{[clip.text, `A simple idea: ${clip.text}`, `One thing worth remembering — ${clip.text}`].map((hook, hi) => <button key={hi} onClick={() => chooseHook(i, hook)} className="border border-neutral-200 px-3 py-2 text-left text-[10px] leading-4 text-neutral-500 hover:border-forest">Hook {hi + 1}</button>)}</div></div></article>; })}</div></section>}
    <section className="mx-auto max-w-7xl px-6 pb-24 md:px-12" id="calendar"><div className="mb-8"><p className="text-[10px] uppercase tracking-[0.25em] text-forest">03 / Planning</p><h2 className="mt-3 text-2xl font-light uppercase tracking-[0.12em]">Content calendar</h2></div><div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div className="bg-white p-6 shadow-sm"><p className="text-[10px] uppercase tracking-[0.2em]">Schedule a draft · local demo</p><label className="mt-5 block text-xs text-neutral-500">Clip<select value={scheduleClip} onChange={e => setScheduleClip(Number(e.target.value))} className="mt-2 block w-full border border-neutral-200 bg-[#fbfbf9] p-3">{clips.map((clip, i) => <option key={i} value={i}>Clip {i + 1} · {clip.start}</option>)}</select></label><label className="mt-4 block text-xs text-neutral-500">Platform<select value={schedulePlatform} onChange={e => setSchedulePlatform(e.target.value)} className="mt-2 block w-full border border-neutral-200 bg-[#fbfbf9] p-3">{platforms.map(p => <option key={p}>{p}</option>)}</select></label><label className="mt-4 block text-xs text-neutral-500">Post date<input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="mt-2 block w-full border border-neutral-200 bg-[#fbfbf9] p-3"/></label><button onClick={schedulePost} className="mt-5 bg-ink px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white">Schedule draft</button><p role="status" className="mt-3 text-xs text-neutral-500">{calendarStatus}</p></div><div className="bg-white p-6 shadow-sm"><p className="text-[10px] uppercase tracking-[0.2em]">Scheduled posts</p>{posts.length ? <div className="mt-4 space-y-3">{posts.map(post => <article key={post.id} className="border-l-2 border-forest bg-[#fbfbf9] p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">{post.date} · {post.platform} · Clip {post.clip + 1}</p><p className="mt-2 text-sm leading-6">{post.copy}</p></article>)}</div> : <p className="mt-5 text-sm text-neutral-400">No drafts scheduled yet.</p>}<p className="mt-5 text-[10px] text-neutral-400">This calendar saves in this browser. It does not publish posts.</p></div></div></section>
    <section className="mx-auto max-w-7xl px-6 pb-24 md:px-12" id="performance"><div className="mb-8"><p className="text-[10px] uppercase tracking-[0.25em] text-forest">04 / Learning</p><h2 className="mt-3 text-2xl font-light uppercase tracking-[0.12em]">Performance notes</h2><p className="mt-3 max-w-lg text-sm leading-6 text-neutral-500">Add results from published posts. The local demo compares engagement rates and uses the strongest post as a simple signal for future choices.</p></div>{performanceSummary && <div className="mb-6 bg-white p-6 shadow-sm"><p className="text-[10px] uppercase tracking-[0.2em] text-forest">Feedback summary · demo</p><p className="mt-3 text-sm">You have results for {performanceSummary.count} post{performanceSummary.count === 1 ? "" : "s"}. Average engagement is <strong>{(performanceSummary.average * 100).toFixed(1)}%</strong>.</p><p className="mt-2 text-sm leading-6 text-neutral-500">The strongest result is {performanceSummary.best.post.platform} at {((performanceSummary.best.metric.likes + performanceSummary.best.metric.shares) / performanceSummary.best.metric.views * 100).toFixed(1)}%. Future demo suggestions will favor this platform when engagement is higher.</p></div>}{posts.length === 0 ? <p className="bg-white p-6 text-sm text-neutral-500">Schedule a draft first to add performance numbers.</p> : <div className="grid gap-5 md:grid-cols-2">{posts.map(post => { const m = metrics.find(metric => metric.postId === post.id) ?? { postId: post.id, views: 0, likes: 0, shares: 0 }; const rate = m.views ? ((m.likes + m.shares) / m.views * 100).toFixed(1) : "0.0"; return <article key={post.id} className="bg-white p-6 shadow-sm"><p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">{post.date} · {post.platform}</p><p className="mt-3 text-sm leading-6">{post.copy}</p><div className="mt-5 grid grid-cols-3 gap-3">{(["views", "likes", "shares"] as const).map(field => <label key={field} className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">{field}<input type="number" min="0" value={m[field]} onChange={e => updateMetric(post.id, field, Number(e.target.value))} className="mt-2 w-full border border-neutral-200 bg-[#fbfbf9] p-2 text-sm text-ink"/></label>)}</div><p className="mt-4 border-t border-neutral-100 pt-4 text-xs text-neutral-500">Engagement signal: <strong className="font-medium text-forest">{rate}%</strong> (likes + shares / views)</p><p className="mt-2 text-[10px] leading-5 text-neutral-400">{m.views ? "Saved locally. This rate contributes to the feedback summary above." : "Enter post results to see a summary. Numbers are saved in this browser."}</p></article>; })}</div>}</section>
    <footer className="border-t border-neutral-200 px-6 py-8 text-center text-[10px] uppercase tracking-[0.24em] text-neutral-500">By Sanchita Janbandhu</footer>
  </main>;
}











