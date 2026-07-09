export function isPeakTime(date: Date): boolean {
  const day = date.getDay(); // 0 Sun - 6 Sat
  if (day === 0 || day === 6) return false;
  const hour = date.getHours();
  const minute = date.getMinutes();
  const t = hour * 60 + minute;
  const morningStart = 8 * 60;
  const morningEnd = 10 * 60 + 30;
  const eveningStart = 17 * 60 + 30;
  const eveningEnd = 20 * 60;
  return (t >= morningStart && t <= morningEnd) || (t >= eveningStart && t <= eveningEnd);
}

export interface FareRuleLike {
  fromZone: number;
  toZone: number;
  baseFare: number | string; // Prisma Decimal stringifies via toNumber/Number()
  peakMultiplier: number | string;
}

export interface DiscountRuleLike {
  category: string;
  discountPct: number | string;
}

export function calculateFare(
  fareRules: FareRuleLike[],
  discountRules: DiscountRuleLike[],
  fromZone: number,
  toZone: number,
  departureTime: Date,
  discountCategory?: string | null,
  isVerified?: boolean
): { fare: number; peakApplied: boolean; baseFare: number } {
  const zoneLow = Math.min(fromZone, toZone);
  const zoneHigh = Math.max(fromZone, toZone);

  const rule = fareRules.find((r) => r.fromZone === zoneLow && r.toZone === zoneHigh);
  if (!rule) {
    throw new Error(`No fare rule found for zone ${zoneLow} -> ${zoneHigh}`);
  }

  const peak = isPeakTime(departureTime);
  const baseFare = Number(rule.baseFare);
  let fare = baseFare;
  if (peak) fare = fare * Number(rule.peakMultiplier);

  if (discountCategory && isVerified) {
    const discount = discountRules.find((d) => d.category === discountCategory);
    if (discount) {
      fare = fare * (1 - Number(discount.discountPct) / 100);
    }
  }

  return { fare: Math.round(fare * 100) / 100, peakApplied: peak, baseFare };
}

export const PASS_PRICES: Record<"DAY" | "WEEK" | "MONTH", number> = {
  DAY: 100,
  WEEK: 500,
  MONTH: 1500,
};

export function passValidityWindow(type: "DAY" | "WEEK" | "MONTH", from: Date) {
  const validFrom = new Date(from);
  const validTo = new Date(from);
  if (type === "DAY") validTo.setHours(validTo.getHours() + 24);
  if (type === "WEEK") validTo.setDate(validTo.getDate() + 7);
  if (type === "MONTH") validTo.setDate(validTo.getDate() + 30);
  return { validFrom, validTo };
}
