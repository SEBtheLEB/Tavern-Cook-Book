import { useEffect, useRef, useState } from "react";
import type { GoogleAccountUser } from "../types";
import {
  clearGoogleAccount,
  decodeGoogleCredential,
  isApprovedGoogleUser,
  renderGoogleSignInButton,
  saveGoogleAccount
} from "../utils/accessControl";
import { Icon } from "./Icon";

interface AccessGateProps {
  onSignIn: (user: GoogleAccountUser) => void;
}

export function AccessGate({ onSignIn }: AccessGateProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("Loading Google Sign-In...");
  const [deniedUser, setDeniedUser] = useState<GoogleAccountUser | null>(null);

  useEffect(() => {
    if (deniedUser) return;
    let cancelled = false;
    const button = buttonRef.current;
    if (!button) return;

    renderGoogleSignInButton(button, (response) => {
      try {
        if (!response.credential) throw new Error("Google sign-in did not return a credential.");
        const user = decodeGoogleCredential(response.credential);
        if (!isApprovedGoogleUser(user.email)) {
          clearGoogleAccount();
          setDeniedUser(user);
          setMessage("");
          return;
        }
        saveGoogleAccount(user);
        onSignIn(user);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Google Sign-In failed. Try again.");
      }
    }).then(() => {
      if (!cancelled) setMessage("");
    }).catch((error) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "Google Sign-In could not load.");
    });

    return () => {
      cancelled = true;
    };
  }, [deniedUser, onSignIn]);

  if (deniedUser) {
    return (
      <main className="access-gate">
        <section className="access-card access-denied-card">
          <div className="access-card-icon denied">
            <Icon name="ShieldAlert" className="h-8 w-8" />
          </div>
          <p className="access-eyebrow">Access Denied</p>
          <h1 className="font-display">The Tavern Cook Book</h1>
          <p>You do not have access to this Cook Book. Please contact Sebastien to be added.</p>
          <div className="access-user-preview">
            {deniedUser.picture ? <img src={deniedUser.picture} alt="" /> : <Icon name="UserRound" className="h-5 w-5" />}
            <div>
              <strong>{deniedUser.name}</strong>
              <span>{deniedUser.email}</span>
            </div>
          </div>
          <button
            className="button-frame access-button"
            onClick={() => {
              clearGoogleAccount();
              setDeniedUser(null);
              setMessage("Choose an approved Google account.");
            }}
          >
            Try Another Account
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="access-gate">
      <section className="access-card">
        <div className="access-card-icon">
          <Icon name="BookOpen" className="h-8 w-8" />
        </div>
        <p className="access-eyebrow">STL Productionz</p>
        <h1 className="font-display">The Tavern Cook Book</h1>
        <p>Sign in with an approved Google account to open the Tales of the Tavern lore bible.</p>
        <div ref={buttonRef} className="access-google-button" />
        {message && <span className="access-message">{message}</span>}
      </section>
    </main>
  );
}
