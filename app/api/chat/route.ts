import { NextRequest, NextResponse } from "next/server";
import { getFaqAnswer } from "@/lib/faqBot";

const SYSTEM_PROMPT = `You are MetroGo's customer support assistant for a metro ticket booking app.
Answer concisely (2-4 sentences) and only about: fares, zones, peak hours, refunds/cancellations,
passes, reward points/streaks, QR ticket usage, gate entry/exit, and payment methods (Card/UPI/Wallet
— all simulated in this demo, no real charges). If asked something unrelated to the metro service,
politely redirect to station staff. Do not invent specific prices — direct users to the journey
planner for exact fares.`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message = body?.message as string | undefined;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Rule-based fallback — no API key configured.
    return NextResponse.json({ reply: getFaqAnswer(message), mode: "rule_based" });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", await res.text());
      return NextResponse.json({ reply: getFaqAnswer(message), mode: "rule_based_fallback" });
    }

    const data = await res.json();
    const reply = data.content?.find((c: { type: string }) => c.type === "text")?.text;
    return NextResponse.json({ reply: reply || getFaqAnswer(message), mode: "ai" });
  } catch (err) {
    console.error("Chat API call failed:", err);
    return NextResponse.json({ reply: getFaqAnswer(message), mode: "rule_based_fallback" });
  }
}
