export interface AppSessionResult {
  ok: boolean;
  email: string;
  error: string;
}

export async function fetchAppSession(): Promise<AppSessionResult> {
  return sessionRequest("GET");
}

export async function createAppSession(googleCredential: string): Promise<AppSessionResult> {
  return sessionRequest("POST", googleCredential);
}

export async function endAppSession() {
  try {
    await fetch("/api/session", { method: "DELETE", credentials: "same-origin", cache: "no-store" });
  } catch {
    // Local account state is still cleared even if the server is unreachable.
  }
}

async function sessionRequest(method: "GET" | "POST", googleCredential = ""): Promise<AppSessionResult> {
  try {
    const response = await fetch("/api/session", {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: googleCredential ? { Authorization: `Bearer ${googleCredential}` } : undefined
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; email?: string; error?: string };
    return {
      ok: response.ok && Boolean(payload.ok),
      email: String(payload.email || "").trim().toLowerCase(),
      error: String(payload.error || (response.ok ? "" : "Secure Cookbook session could not be created."))
    };
  } catch {
    return { ok: false, email: "", error: "Secure Cookbook session backend is not responding." };
  }
}
