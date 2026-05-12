const DESKTOP_AUTH_SCHEME = "stl-tavern-cook-book";
export const DESKTOP_AUTH_RETURN_URL = `${DESKTOP_AUTH_SCHEME}://auth`;

type AuthCredentialHandler = (credential: string) => void;
type AuthErrorHandler = (message: string) => void;

export function isTauriDesktopShell() {
  if (typeof window === "undefined") return false;
  const tauriWindow = window as Window & {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  return Boolean(tauriWindow.__TAURI__ || tauriWindow.__TAURI_INTERNALS__);
}

export function isDesktopBrowserAuthRequest() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("desktopAuth") === "1";
}

export function buildDesktopBrowserSignInUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("desktopAuth", "1");
  url.searchParams.set("desktopReturn", DESKTOP_AUTH_RETURN_URL);
  url.searchParams.delete("readonly");
  return url.toString();
}

export async function openDesktopSignInInSystemBrowser() {
  const signInUrl = buildDesktopBrowserSignInUrl();
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(signInUrl);
    return true;
  } catch {
    window.open(signInUrl, "_blank", "noopener,noreferrer");
    return false;
  }
}

export async function listenForDesktopAuthCredential(
  onCredential: AuthCredentialHandler,
  onError: AuthErrorHandler
) {
  if (!isTauriDesktopShell()) return () => {};

  try {
    const { getCurrent, onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
    const handleUrls = (urls: string[] | null) => {
      (urls || []).forEach((url) => {
        const credential = extractDesktopAuthCredential(url);
        if (credential) onCredential(credential);
      });
    };

    handleUrls(await getCurrent().catch(() => null));
    return await onOpenUrl(handleUrls);
  } catch (error) {
    onError(error instanceof Error ? error.message : "Desktop sign-in return could not be started.");
    return () => {};
  }
}

export function redirectDesktopBrowserCredential(credential: string) {
  const returnUrl = getDesktopReturnUrl();
  if (!returnUrl) return false;

  try {
    const url = new URL(returnUrl);
    url.searchParams.set("credential", credential);
    window.location.assign(url.toString());
    return true;
  } catch {
    return false;
  }
}

function getDesktopReturnUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("desktopReturn") || DESKTOP_AUTH_RETURN_URL;
}

function extractDesktopAuthCredential(value: string) {
  try {
    const url = new URL(value);
    const isAuthProtocol = url.protocol === `${DESKTOP_AUTH_SCHEME}:`;
    const isAuthTarget = url.hostname === "auth" || url.pathname.replace(/^\/+/, "") === "auth";
    if (!isAuthProtocol || !isAuthTarget) return "";
    return url.searchParams.get("credential") || "";
  } catch {
    return "";
  }
}
