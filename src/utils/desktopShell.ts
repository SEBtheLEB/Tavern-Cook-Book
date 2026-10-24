import { workshopHost, workshopSignInAvailable } from "./workshopRuntime";

const DESKTOP_AUTH_SCHEME = "stl-tavern-cook-book";
export const DESKTOP_AUTH_RETURN_URL = `${DESKTOP_AUTH_SCHEME}://auth`;
// STL Workshop's one-time loopback receiver (RFC 8252 style): http://127.0.0.1:<port>/stl-workshop/auth/<nonce>
const WORKSHOP_AUTH_RETURN_PATH = /^\/stl-workshop\/auth\/[A-Za-z0-9_-]{16,128}$/;

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

// Google sign-in for the Tauri shell and for STL Workshop's Launch Live Cookbook preview happens in the system browser.
export function usesExternalBrowserSignIn() {
  return isTauriDesktopShell() || workshopSignInAvailable();
}

export async function openDesktopSignInInSystemBrowser() {
  if (workshopSignInAvailable()) {
    await workshopHost?.signIn?.();
    return true;
  }
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
  if (workshopSignInAvailable() && workshopHost?.onCredential) {
    return workshopHost.onCredential((credential) => {
      if (typeof credential === "string" && credential) onCredential(credential);
    });
  }
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

// The credential is only ever returned to the desktop app's scheme or a Workshop loopback receiver.
export function isAllowedDesktopReturnUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === `${DESKTOP_AUTH_SCHEME}:`) {
      return (url.hostname === "auth" || url.pathname.replace(/^\/+/, "") === "auth") && !url.search && !url.hash;
    }
    if (url.protocol !== "http:" || !url.port || url.username || url.password || url.search || url.hash) return false;
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return false;
    return WORKSHOP_AUTH_RETURN_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

function getDesktopReturnUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("desktopReturn") || DESKTOP_AUTH_RETURN_URL;
  return isAllowedDesktopReturnUrl(requested) ? requested : "";
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
