"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "bot";
  text: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hi! I'm MetroGo's support assistant. Ask me about fares, refunds, passes, rewards, or how QR tickets work.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "bot", text: data.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {open && (
        <div className="mb-3 flex h-96 w-80 flex-col overflow-hidden rounded-lg border-2 border-[var(--ink)] bg-white shadow-[5px_5px_0_0_var(--ink)]">
          <div className="signage-band flex items-center justify-between px-4 py-3">
            <p className="board-num text-xs font-semibold uppercase tracking-wide text-[#FFC83D]">
              MetroGo Support
            </p>
            <button
              onClick={() => setOpen(false)}
              className="text-sm text-white/70 hover:text-white"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-[var(--ink)] text-white"
                    : "bg-[var(--paper)] text-[var(--ink)]"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] rounded-md bg-[var(--paper)] px-3 py-2 text-sm text-[var(--text-mute)]">
                Typing…
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t border-[var(--line-rule)] p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask a question…"
              className="flex-1 rounded-md border border-[var(--line-rule)] px-3 py-2 text-sm outline-none focus:border-[var(--ink)]"
            />
            <button
              onClick={send}
              disabled={loading}
              className="rounded-md bg-[var(--ink)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[#FFC83D] text-2xl shadow-[3px_3px_0_0_var(--ink)] transition hover:scale-105"
        aria-label="Open support chat"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
