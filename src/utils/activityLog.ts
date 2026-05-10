import type { ArtVaultActivityLogEntry, GoogleAccountUser } from "../types";

export const ART_VAULT_ACTIVITY_LOG_KEY = "tavernCookbookArtVaultActivityLog";
const MAX_ACTIVITY_LOG_ENTRIES = 400;

export function loadArtVaultActivityLog(): ArtVaultActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(ART_VAULT_ACTIVITY_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is ArtVaultActivityLogEntry => Boolean(entry) && typeof entry === "object")
      .map((entry) => ({
        id: String(entry.id || `activity-${Date.now()}`),
        actionType: String(entry.actionType || "update"),
        slotName: String(entry.slotName || "Unnamed slot"),
        subjectName: String(entry.subjectName || "Unknown"),
        subjectType: String(entry.subjectType || "character"),
        userName: String(entry.userName || "Unknown user"),
        userEmail: String(entry.userEmail || ""),
        timestamp: String(entry.timestamp || new Date().toISOString()),
        fileName: typeof entry.fileName === "string" ? entry.fileName : undefined,
        driveFileId: typeof entry.driveFileId === "string" ? entry.driveFileId : undefined
      }))
      .slice(0, MAX_ACTIVITY_LOG_ENTRIES);
  } catch {
    return [];
  }
}

export function recordArtVaultActivity({
  actionType,
  slotName,
  subjectName,
  subjectType,
  user,
  fileName,
  driveFileId
}: {
  actionType: string;
  slotName: string;
  subjectName: string;
  subjectType: ArtVaultActivityLogEntry["subjectType"];
  user: GoogleAccountUser;
  fileName?: string;
  driveFileId?: string;
}) {
  try {
    const entry: ArtVaultActivityLogEntry = {
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actionType,
      slotName,
      subjectName,
      subjectType,
      userName: user.name,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
      fileName,
      driveFileId
    };
    localStorage.setItem(
      ART_VAULT_ACTIVITY_LOG_KEY,
      JSON.stringify([entry, ...loadArtVaultActivityLog()].slice(0, MAX_ACTIVITY_LOG_ENTRIES))
    );
  } catch {
    // Activity history is helpful context, but the app should keep working if browser storage rejects it.
  }
}
