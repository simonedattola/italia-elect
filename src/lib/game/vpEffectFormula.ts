import { clamp } from "@/lib/utils";

export function swingFromVpProfile(
  vpCompatibility: number,
  vpPopularity: number,
  leaderCompat: number,
  isPublicFigure = false,
): number {
  if (isPublicFigure && vpPopularity >= 35 && vpCompatibility >= 40) {
    return clamp(2.8 + vpPopularity / 32 + vpCompatibility / 80, 2.8, 9);
  }

  const ticketStrength = vpCompatibility * 0.55 + vpPopularity * 0.25 + leaderCompat * 0.2;
  const compatGap = vpCompatibility - leaderCompat;

  if (ticketStrength >= 58 && vpPopularity >= 32) {
    return clamp(1.8 + ticketStrength / 24, 1.8, 8);
  }
  if (vpCompatibility < 25 && vpPopularity < 25) {
    return clamp(-4 - (28 - vpCompatibility) / 6, -10, -2);
  }
  if (compatGap < -50 && vpCompatibility < 35) {
    return clamp(-2.5 + compatGap / 35, -7, -0.5);
  }
  if (vpPopularity < 20) return 0;
  return clamp((ticketStrength - 46) / 20, -2.5, 3);
}
