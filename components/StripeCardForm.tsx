"use client";

import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

export default function StripeCardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (confirmError) {
      setError(confirmError.message || "Payment failed. Please try again.");
      setLoading(false);
      return;
    }
    onSuccess();
  }

  return (
    <div>
      <PaymentElement />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleConfirm}
        disabled={!stripe || loading}
        className="mt-4 w-full rounded-md bg-[var(--ink)] px-6 py-3.5 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Processing…" : "Pay now"}
      </button>
    </div>
  );
}
