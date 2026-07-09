"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { apiFetch, getUser } from "@/lib/apiClient";
import StripeCardForm from "@/components/StripeCardForm";
import Link from "next/link";

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

const PASS_INFO = [
  { type: "DAY" as const, label: "Day Pass", price: 100, desc: "Unlimited rides for 24 hours" },
  { type: "WEEK" as const, label: "Week Pass", price: 500, desc: "Unlimited rides for 7 days" },
  { type: "MONTH" as const, label: "Month Pass", price: 1500, desc: "Unlimited rides for 30 days" },
];

export default function PassesPage() {
  const [myPasses, setMyPasses] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<"DAY" | "WEEK" | "MONTH" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "UPI" | "WALLET">("CARD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingPassId, setPendingPassId] = useState<string | null>(null);
  const router = useRouter();
  const user = getUser();
  const stripeReady = Boolean(stripePromise);
  const willUseRealStripe = paymentMethod === "CARD" && stripeReady;

  useEffect(() => {
    if (user) {
      apiFetch("/api/passes/me").then(setMyPasses).catch(() => {});
    }
  }, []);

  async function handleBuy() {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!selectedType) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch("/api/passes/purchase", {
        method: "POST",
        body: JSON.stringify({ type: selectedType, paymentMethod }),
      });
      if (data.requiresPayment) {
        setClientSecret(data.clientSecret);
        setPendingPassId(data.pass.id);
      } else {
        const q = new URLSearchParams({
          pass: data.pass.id,
          type: selectedType,
          fare: data.price?.toString() || "",
        });
        router.push(`/booking-confirmed?${q}`);
      }
    } catch (e: any) {
      const msg = e.data?.message || e.message || "Purchase failed";
      if (e.status === 401) {
        router.push("/auth/login");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // ---- Step 2: real card entry, once a PaymentIntent exists ----
  if (clientSecret && pendingPassId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
          Step 2 of 2
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">Enter card details</h1>
        <p className="mt-1 text-sm text-[var(--text-mute)]">
          Secure card payment.
        </p>
        <div className="mt-8 rounded-lg border-2 border-[var(--ink)] bg-white p-6 shadow-[5px_5px_0_0_var(--ink)]">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripeCardForm onSuccess={() => {
              const q = new URLSearchParams({ pass: pendingPassId!, type: selectedType || "" });
              router.push(`/booking-confirmed?${q}`);
            }} />
          </Elements>
        </div>
      </div>
    );
  }

  // ---- Step 1b: payment method selection for the chosen pass ----
  if (selectedType) {
    const info = PASS_INFO.find((p) => p.type === selectedType)!;
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <button
          onClick={() => setSelectedType(null)}
          className="text-sm font-medium text-[var(--ink)] hover:underline"
        >
          ← Back to passes
        </button>
        <p className="board-num mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
          Step 1 of {willUseRealStripe ? "2" : "1"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">Checkout</h1>

        <div className="mt-8 rounded-lg border-2 border-[var(--ink)] bg-white p-6 shadow-[5px_5px_0_0_var(--ink)]">
          <div className="flex items-center justify-between border-b border-[var(--line-rule)] pb-4">
            <div>
              <p className="text-sm text-[var(--text-mute)]">Pass</p>
              <p className="font-semibold text-[var(--ink)]">{info.label}</p>
            </div>
            <span className="board-num rounded-sm bg-[#FFC83D] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--signal-ink)]">
              ₹{info.price}
            </span>
          </div>

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
                      : "border-[var(--line-rule)] bg-white text-[var(--text-mute)] hover:border-[var(--ink)]"
                  }`}
                >
                  {m === "CARD" ? "Card" : m === "UPI" ? "UPI" : "Wallet"}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-md border border-[var(--line-rule)] bg-[var(--paper)] px-4 py-3">
              {paymentMethod === "CARD" && stripeReady && (
                <span className="board-num text-sm text-emerald-700">
                  Card payment — secure checkout.
                </span>
              )}
              {paymentMethod === "CARD" && !stripeReady && (
                <span className="board-num text-sm text-[var(--text-mute)]">
                  Card payment
                </span>
              )}
              {paymentMethod === "UPI" && (
                <span className="board-num text-sm text-[var(--text-mute)]">
                  UPI payment
                </span>
              )}
              {paymentMethod === "WALLET" && (
                <span className="board-num text-sm text-[var(--text-mute)]">
                  MetroGo Wallet
                </span>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleBuy}
            disabled={loading}
            className="mt-4 w-full rounded-md bg-[var(--ink)] px-6 py-3.5 font-semibold text-white transition hover:bg-[var(--ink-soft)] disabled:opacity-60"
          >
            {loading ? "Processing…" : willUseRealStripe ? "Continue to card details" : "Confirm & pay"}
          </button>
        </div>
      </div>
    );
  }

  // ---- Step 1a: pick a pass ----
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="board-num text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
        Frequent rider
      </p>
      <h1 className="mt-1 text-2xl font-bold text-[var(--ink)]">Passes</h1>
      <p className="mt-1 text-sm text-[var(--text-mute)]">
        Unlimited travel for frequent riders — buy once, tap in as many times as you like.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PASS_INFO.map((p) => (
          <div
            key={p.type}
            className="rounded-lg border-2 border-[var(--ink)] bg-white p-6 shadow-[5px_5px_0_0_var(--ink)]"
          >
            <p className="board-num text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink)]">
              {p.label}
            </p>
            <p className="board-num mt-2 text-3xl font-bold text-[var(--ink)]">₹{p.price}</p>
            <p className="mt-1 text-sm text-[var(--text-mute)]">{p.desc}</p>
            <button
              onClick={() => setSelectedType(p.type)}
              className="mt-6 w-full rounded-md bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ink-soft)]"
            >
              Buy pass
            </button>
          </div>
        ))}
      </div>

      {user && myPasses.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-bold text-[var(--ink)]">Your passes</h2>
          <div className="mt-4 space-y-3">
            {myPasses.map((p) => (
              <Link
                key={p.id}
                href={`/passes/${p.id}`}
                className="flex items-center justify-between rounded-md border-2 border-[var(--ink)] bg-white p-4 shadow-[3px_3px_0_0_var(--ink)] transition hover:bg-[var(--paper)]"
              >
                <div>
                  <p className="font-semibold text-[var(--ink)]">{p.type} Pass</p>
                  <p className="board-num text-xs text-[var(--text-mute)]">
                    Valid {new Date(p.validFrom).toLocaleDateString()} –{" "}
                    {new Date(p.validTo).toLocaleDateString()} · used {p.usageCount}x
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    p.status === "AWAITING_PAYMENT"
                      ? "bg-amber-50 text-amber-700"
                      : p.status === "ACTIVE" && new Date(p.validTo) > new Date()
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {p.status === "AWAITING_PAYMENT"
                    ? "Awaiting payment"
                    : new Date(p.validTo) > new Date()
                    ? "Active"
                    : "Expired"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!user && (
        <p className="mt-8 text-sm text-slate-400">
          Log in to view and manage your passes after purchase.
        </p>
      )}
    </div>
  );
}
