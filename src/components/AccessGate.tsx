import { useEffect, useRef, useState } from "react";
import type { GoogleAccountUser } from "../types";
import {
  clearGoogleAccount,
  decodeGoogleCredential,
  getAccessGoogleClientId,
  isApprovedGoogleUser,
  renderGoogleSignInButton,
  saveAccessGoogleClientId,
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
  const [clientIdDraft, setClientIdDraft] = useState("");
  const [needsClientIdSetup, setNeedsClientIdSetup] = useState(() => !getAccessGoogleClientId());

  useEffect(() => {
    if (deniedUser || needsClientIdSetup) return;
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
      if (cancelled) return;
      const errorMessage = error instanceof Error ? error.message : "Google Sign-In could not load.";
      if (errorMessage.includes("Google OAuth Client ID is missing")) {
        setNeedsClientIdSetup(true);
      }
      setMessage(errorMessage);
    });

    return () => {
      cancelled = true;
    };
  }, [deniedUser, needsClientIdSetup, onSignIn]);

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
        {needsClientIdSetup ? (
          <form
            className="access-client-setup"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                saveAccessGoogleClientId(clientIdDraft);
                setNeedsClientIdSetup(false);
                setMessage("Loading Google Sign-In...");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Could not save the OAuth Client ID.");
              }
            }}
          >
            <label>
              <span>Google OAuth Client ID</span>
              <input
                value={clientIdDraft}
                onChange={(event) => setClientIdDraft(event.target.value)}
                placeholder="1234567890-abc.apps.googleusercontent.com"
                autoComplete="off"
              />
            </label>
            <button className="button-frame access-button" type="submit">
              Save Sign-In ID
            </button>
            <small>
              Use the OAuth Client ID from Google Cloud, not the client secret. Add this Vercel domain to the OAuth
              Authorized JavaScript origins.
            </small>
          </form>
        ) : (
          <div ref={buttonRef} className="access-google-button" />
        )}
        {message && <span className="access-message">{message}</span>}
      </section>
    </main>
  );
}
