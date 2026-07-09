interface FaqEntry {
  keywords: string[];
  answer: string;
}

const FAQ: FaqEntry[] = [
  {
    keywords: ["refund", "cancel"],
    answer:
      "You can refund any unused ticket from the 'My tickets' page — look for the Refund button next to tickets still in 'ISSUED' status. Once a ticket has been used at a gate (IN_TRANSIT or COMPLETED), it can no longer be refunded.",
  },
  {
    keywords: ["fare", "price", "cost", "how much"],
    answer:
      "Fares are zone-based — they depend on how many zones your journey crosses, and whether you're traveling during peak hours (8-10:30am or 5:30-8pm on weekdays, which add a small surcharge). Use the journey planner on the homepage to see the exact fare before booking.",
  },
  {
    keywords: ["lost", "missing ticket", "can't find"],
    answer:
      "If you booked while logged in, your ticket is always available under 'My tickets' — no need to keep the original confirmation email. If you booked as a guest, check the confirmation email for your ticket link.",
  },
  {
    keywords: ["pass", "monthly", "weekly", "unlimited"],
    answer:
      "Day/week/month unlimited passes are available on the Passes page. They let you tap in as many times as you like within the validity window, no per-trip fare calculation needed.",
  },
  {
    keywords: ["peak", "crowd", "busy"],
    answer:
      "Peak hours are 8-10:30am and 5:30-8pm on weekdays, when fares include a small surcharge and stations tend to be busier. The journey planner shows a live crowd-level estimate for your departure station.",
  },
  {
    keywords: ["reward", "points", "streak"],
    answer:
      "You earn reward points on every ticket (1 point per ₹10 spent, minimum 5). Booking on consecutive days builds your streak — check your progress on the Rewards page.",
  },
  {
    keywords: ["qr", "scan", "gate", "entry", "exit"],
    answer:
      "Your ticket's QR code is shown on the ticket detail page — present it at the gate scanner. It's encrypted, so it can only be read by the actual gate system, and each ticket can only be used once per direction (entry, then exit).",
  },
  {
    keywords: ["payment", "pay", "card", "upi", "wallet"],
    answer:
      "We support Card, UPI, and Wallet at checkout. This is a demo build, so all payment methods are simulated and always succeed — no real charge occurs.",
  },
  {
    keywords: ["delay", "late", "running", "status"],
    answer:
      "Check the Live page for real-time (simulated) train positions on each line based on the current schedule.",
  },
];

const FALLBACK =
  "I'm a simple rule-based assistant for now — I can help with fares, refunds, passes, rewards, QR/gate questions, and payment methods. Could you rephrase your question around one of those topics? For anything else, our staff at the gate or station counter can help.";

export function getFaqAnswer(message: string): string {
  const lower = message.toLowerCase();
  for (const entry of FAQ) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return entry.answer;
    }
  }
  return FALLBACK;
}
