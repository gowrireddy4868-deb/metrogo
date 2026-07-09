"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { apiFetch, getUser } from "@/lib/apiClient";
import StripeCardForm from "@/components/StripeCardForm";

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

function CheckoutInner() {
  const params = useSearchParams();
  const router = useRouter();
  const from = params.get("from")!;
  const to = params.get("to")!;
  const fromName = params.get("fromName");
  const toName = params.get("toName");
  const type = (params.get("type") as "SINGLE" | "RETURN") || "SINGLE";

  const user = getUser();
  const [guestEmail, setGuestEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "UPI" | "WALLET">("CARD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);

  const stripeReady = Boolean(stripePromise);
  const willUseRealStripe = paymentMethod === "CARD" && stripeReady;

  async function handlePay() {
    if (!user && !guestEmail) {
      setError("Enter an email to receive your ticket, or log in.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch("/api/tickets/purchase", {
        method: "POST",
        body: JSON.stringify({
          type,
          sourceStationId: from,
          destStationId: to,
          guestEmail: user ? undefined : guestEmail,
          paymentMethod,
        }),
      });

      if (data.requiresPayment) {
        setClientSecret(data.clientSecret);
        setPendingTicketId(data.ticket.id);
      } else {
        const q = new URLSearchParams({
          ticket: data.ticket.id,
          rewards: data.rewardsEarned?.toString() || "0",
          streak: data.streak?.toString() || "0",
        });
        router.push(`/booking-confirmed?${q}`);
      }
    } catch (e: any) {
      setError(e.data?.message || e.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (clientSecret && pendingTicketId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold text-[var(--ink)]">Enter card details</h1>
        <div className="mt-8 rounded-lg border-2 border-[var(--ink)] bg-[var(--paper-card)] p-6 shadow-[5px_5px_0_0_var(--ink)]">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripeCardForm onSuccess={() => {
              const q = new URLSearchParams({ ticket: pendingTicketId!, rewards: "0", streak: "0" });
              router.push(`/booking-confirmed?${q}`);
            }} />
          </Elements>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
        Checkout
      </p>
      <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">Confirm your journey</h1>

      <div className="mt-8 rounded-lg border-2 border-[var(--ink)] bg-[var(--paper-card)] p-6 shadow-[5px_5px_0_0_var(--ink)]">
        <div className="flex items-center justify-between border-b border-[var(--line-rule)] pb-4">
          <div>
            <p className="text-sm text-[var(--text-mute)]">Journey</p>
            <p className="font-semibold text-[var(--ink)]">
              {fromName || from} → {toName || to}
            </p>
          </div>
          <span className="board-num rounded-sm bg-[#FFC83D] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#5c4400]">
            {type === "SINGLE" ? "Single" : "Return"}
          </span>
        </div>

        {!user && (
          <div className="border-b border-[var(--line-rule)] py-4">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-mute)]">
              Email address (ticket delivery)
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-3 text-sm outline-none focus:border-[var(--ink)]"
            />
            <p className="mt-2 text-xs text-[var(--text-mute)]">
              Or{" "}
              <a href="/auth/login" className="font-medium text-[var(--ink)] hover:underline">
                log in
              </a>{" "}
              to save this ticket to your account.
            </p>
          </div>
        )}

        <div className="py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-mute)]">
            Payment method
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["CARD", "UPI", "WALLET"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`board-num rounded-md border-2 px-3 py-3 text-sm font-semibold transition ${
                  paymentMethod === m
                    ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                    : "border-[var(--line-rule)] text-[var(--text-mute)] hover:border-[var(--ink)]"
                }`}
              >
                {m === "CARD" ? "💳 Card" : m === "UPI" ? "📱 UPI" : "👛 Wallet"}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full rounded-md bg-[var(--ink)] px-6 py-3.5 font-semibold text-white transition hover:bg-[var(--ink-soft)] disabled:opacity-60"
        >
          {loading ? "Processing…" : willUseRealStripe ? "Continue to payment" : "Confirm & pay"}
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="px-6 py-16 text-center text-[var(--text-mute)]">Loading…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
