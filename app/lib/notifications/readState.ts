export const READ_NOTIFICATION_IDS_KEY = "b-isaf:header:read-notifications:v1";
export const READ_NOTIFICATION_STATE_EVENT = "b-isaf:notifications-read-state-changed";

export function getReadNotificationIds(): Set<string> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(READ_NOTIFICATION_IDS_KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(ids: Set<string>): void {
  const values = [...ids];
  try {
    localStorage.setItem(READ_NOTIFICATION_IDS_KEY, JSON.stringify(values));
  } catch {
    // A sessão atual continua a refletir as leituras mesmo sem storage persistente.
  }
  window.dispatchEvent(new CustomEvent<string[]>(READ_NOTIFICATION_STATE_EVENT, { detail: values }));
}

export function markNotificationIdsRead(ids: string[]): Set<string> {
  const next = getReadNotificationIds();
  for (const id of ids) next.add(id);
  saveReadNotificationIds(next);
  return next;
}