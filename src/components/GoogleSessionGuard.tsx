import { useEffect, useRef, useState } from "react";
import type { GoogleAccountUser } from "../types";
import { renderGoogleSignInButton } from "../utils/accessControl";
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

  useEffect(() => {
    if (!open || !buttonRef.current) return;
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
  }, [open, onCredential]);

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
        <div ref={buttonRef} className={working ? "google-session-button working" : "google-session-button"} />
        {message && <small>{message}</small>}
      </section>
    </div>
  );
}
