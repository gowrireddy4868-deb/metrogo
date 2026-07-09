/**
 * Reward points: 1 point per ₹10 spent, rounded down, minimum 5 per booking.
 * Booking streak: increments by 1 if the user's last booking was exactly
 * "yesterday" relative to today; stays unchanged if they already booked
 * today; resets to 1 if there's a gap of more than a day or no prior booking.
 */

export function calculateRewardPoints(fareAmount: number): number {
  return Math.max(5, Math.floor(fareAmount / 10));
}

export function calculateStreak(
  currentStreak: number,
  lastBookingDate: Date | null,
  now: Date = new Date()
): number {
  if (!lastBookingDate) return 1;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startOfDay(now).getTime() - startOfDay(lastBookingDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return currentStreak || 1; // already booked today, no change
  if (diffDays === 1) return (currentStreak || 0) + 1; // booked yesterday, streak continues
  return 1; // gap of more than a day, streak resets
}
