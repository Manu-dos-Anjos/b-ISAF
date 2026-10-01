const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_PROMPT_DELAY_MS = 3 * DAY_MS;
const PROMPT_WINDOW_MS = 3 * DAY_MS;
const GAP_AFTER_DISMISSAL_MS = 7 * DAY_MS;
const PROMPT_CYCLE_MS = PROMPT_WINDOW_MS + GAP_AFTER_DISMISSAL_MS;

export type DonationPromptStatus = {
  status: string | null;
  validatedAt: string | null;
};

export function shouldShowSupportPrompt(
  accountCreatedAt: string,
  now: number,
  donation: DonationPromptStatus | null
): boolean {
  if (donation?.status === "pending") return true;

  const accountCreatedAtMs = new Date(accountCreatedAt).getTime();
  if (!Number.isFinite(accountCreatedAtMs)) return false;

  let firstWindowStart = accountCreatedAtMs + FIRST_PROMPT_DELAY_MS;
  if (donation?.status === "confirmed" && donation.validatedAt) {
    const validatedAtMs = new Date(donation.validatedAt).getTime();
    if (Number.isFinite(validatedAtMs)) firstWindowStart = validatedAtMs + GAP_AFTER_DISMISSAL_MS;
  }

  if (now < firstWindowStart) return false;
  const currentWindowStart = firstWindowStart
    + Math.floor((now - firstWindowStart) / PROMPT_CYCLE_MS) * PROMPT_CYCLE_MS;
  return now < currentWindowStart + PROMPT_WINDOW_MS;
}