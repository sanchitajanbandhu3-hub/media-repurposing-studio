import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Gemini is not configured. Add GEMINI_API_KEY to .env.local and restart." }, { status: 503 });
  try {
    const { audio, mimeType } = await request.json() as { audio?: string; mimeType?: string };
    if (!audio || !mimeType?.startsWith("audio/")) return NextResponse.json({ error: "Choose a supported audio file." }, { status: 400 });
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ model: "gemini-3.5-flash-lite", input: [{ type: "text", text: "Transcribe the speech verbatim. Add timestamps in [MM:SS] format at natural intervals. Return only the transcript." }, { type: "audio", data: audio, mime_type: mimeType }] }) });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message ?? "Gemini transcription failed." }, { status: 502 });
    const transcript = data.steps?.filter((step: { type?: string }) => step.type === "model_output").flatMap((step: { content?: { type?: string; text?: string }[] }) => step.content ?? []).filter((part: { type?: string }) => part.type === "text").map((part: { text?: string }) => part.text ?? "").join("") ?? data.output_text ?? "";
    if (!transcript.trim()) return NextResponse.json({ error: "Gemini returned an empty transcript." }, { status: 502 });
    return NextResponse.json({ transcript });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Audio transcription failed." }, { status: 500 }); }
}
