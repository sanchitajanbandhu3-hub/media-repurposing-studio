import { NextResponse } from "next/server";

type Clip = { start: string; end: string; text: string; score: number; reason: string };

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "AI is not configured yet. Add GEMINI_API_KEY to .env.local and restart the app." }, { status: 503 });
  try {
    const body = await request.json() as { transcript?: string; tone?: string; language?: string; brandVoice?: { tone?: string; length?: string; emoji?: string }; performance?: { bestPlatform?: string; averageEngagement?: number } };
    const transcript = body.transcript?.trim();
    if (!transcript || transcript.length > 60000) return NextResponse.json({ error: "Please provide a transcript under 60,000 characters." }, { status: 400 });
    const prompt = `You are a careful content repurposing agent. Analyze this timestamped transcript and return JSON only: {"steps":[{"name":"Transcript analyzer","reason":"..."},{"name":"Clip picker","reason":"..."},{"name":"Safety checker","reason":"..."},{"name":"Copywriter","reason":"..."}],"clips":[{"start":"timestamp","end":"timestamp","text":"exact transcript words","score":0,"reason":"plain English reason","safety":"clear or review","captions":{"LinkedIn":"...","Instagram":"...","X":"...","YouTube Shorts":"...","Email":"..."}}]}. Select up to 5 short excerpts. Keep timestamps exactly as present. Score potential from 0-100 as a heuristic; never promise virality. Give a clear reason and flag potentially risky claims. Write separate concise copy for each platform in a ${body.tone || "warm"} tone and ${body.language || "English"}. Keep quoted clip text in its original language. Use this creator voice profile when supplied: ${JSON.stringify(body.brandVoice ?? {})}. When performance results are supplied, treat them as a weak signal and favor ${body.performance?.bestPlatform ?? "no platform yet"}; average engagement is ${body.performance?.averageEngagement ?? 0}%. State this influence in an agent step. Do not invent facts. Transcript:\n${transcript}`;
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ model: "gemini-3.5-flash-lite", input: prompt })
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message ?? "The AI provider request failed." }, { status: 502 });
    const raw = data.steps?.filter((step: { type?: string }) => step.type === "model_output").flatMap((step: { content?: { type?: string; text?: string }[] }) => step.content ?? []).filter((part: { type?: string }) => part.type === "text").map((part: { text?: string }) => part.text ?? "").join("") ?? data.output_text ?? "";
    const content = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error("Gemini did not return a JSON object. Please try again.");
    const result = JSON.parse(content.slice(firstBrace, lastBrace + 1)) as { clips: (Clip & { safety?: string; captions?: Record<string, string> })[]; steps?: { name: string; reason: string }[] };
    if (!Array.isArray(result.clips)) throw new Error("AI response did not include clips.");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not analyze transcript." }, { status: 500 });
  }
}
