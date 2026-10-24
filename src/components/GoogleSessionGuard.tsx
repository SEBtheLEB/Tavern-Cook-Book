import { useEffect, useRef, useState } from "react";
import type { GoogleAccountUser } from "../types";
import { renderGoogleSignInButton } from "../utils/accessControl";
import { listenForDesktopAuthCredential, openDesktopSignInInSystemBrowser } from "../utils/desktopShell";
import { workshopSignInAvailable } from "../utils/workshopRuntime";
import { Icon } from "./Icon";

interface GoogleSessionGuardProps {
  currentUser: GoogleAccountUser;
  open: boolean;
  onCredential: (credential: string) => Promise<void>;
}

export function GoogleSessionGuard({ currentUser, open, onCredential }: GoogleSessionGuardProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  // STL Workshop's Launch Live Cookbook preview reconnects through the system browser, like its sign-in page.
  const browserReconnect = workshopSignInAvailable();

  useEffect(() => {
    if (!open || !browserReconnect) return;
    let disposed = false;
    let cleanup = () => {};
    void listenForDesktopAuthCredential(
      (credential) => {
        setWorking(true);
        void onCredential(credential)
          .then(() => setMessage("Connected."))
          .catch((error) => setMessage(error instanceof Error ? error.message : "Google could not reconnect."))
          .finally(() => setWorking(false));
      },
      (errorMessage) => setMessage(errorMessage)
    ).then((unlisten) => {
      if (disposed) unlisten();
      else cleanup = unlisten;
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [open, browserReconnect, onCredential]);

  useEffect(() => {
    if (!open || browserReconnect || !buttonRef.current) return;
    let cancelled = false;
    setMessage("");
    void renderGoogleSignInButton(buttonRef.current, (response) => {
      if (!response.credential || cancelled) return;
      setWorking(true);
      void onCredential(response.credential)
        .then(() => setMessage("Connected."))
        .catch((error) => setMessage(error instanceof Error ? error.message : "Google could not reconnect."))
        .finally(() => setWorking(false));
    }).catch((error) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "Google Sign-In could not load.");
    });
    return () => {
      cancelled = true;
    };
  }, [open, browserReconnect, onCredential]);

  if (!open) return null;

  return (
    <div className="google-session-guard" role="dialog" aria-modal="true" aria-labelledby="google-session-title">
      <section>
        <div className="google-session-guard-icon"><Icon name="ShieldCheck" className="h-6 w-6" /></div>
        <div>
          <p>Secure session paused</p>
          <h2 id="google-session-title" className="font-display">Reconnect Google</h2>
          <span>
            Your Cookbook account remains signed in as <strong>{currentUser.email}</strong>. Reconnect once to restore team saves,
            live collaboration, and protected tools.
          </span>
        </div>
        {browserReconnect ? (
          <button
            className="button-frame access-button"
            disabled={working}
            onClick={() => {
              void openDesktopSignInInSystemBrowser()
                .then(() => setMessage("Finish Google sign-in in your browser. You will be returned here automatically."))
                .catch((error) => setMessage(error instanceof Error ? error.message : "Could not open Google sign-in in your browser."));
            }}
          >
            <Icon name="ExternalLink" className="h-4 w-4" />
            Reconnect Google in Browser
          </button>
        ) : (
          <div ref={buttonRef} className={working ? "google-session-button working" : "google-session-button"} />
        )}
        {message && <small>{message}</small>}
      </section>
    </div>
  );
}
