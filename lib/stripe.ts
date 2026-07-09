import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

// Only throws when actually used without a key configured — importing this
// file elsewhere (e.g. for type-only purposes) won't crash the app.
export function getStripe(): Stripe {
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env to enable real card payments."
    );
  }
  return new Stripe(secretKey, { apiVersion: "2025-09-30.clover" });
}

export function isStripeConfigured(): boolean {
  return Boolean(secretKey);
}
