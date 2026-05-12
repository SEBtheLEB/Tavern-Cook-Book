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
import {
  isDesktopBrowserAuthRequest,
  isTauriDesktopShell,
  listenForDesktopAuthCredential,
  openDesktopSignInInSystemBrowser,
  redirectDesktopBrowserCredential
} from "../utils/desktopShell";
import { BrandImageEditor } from "./BrandImageEditor";
import { Icon } from "./Icon";

interface AccessGateProps {
  onSignIn: (user: GoogleAccountUser) => void;
  brandingLogoImage?: string;
  onBrandingLogoChange?: (logoImage: string) => void;
}

export function AccessGate({
  onSignIn,
  brandingLogoImage = "",
  onBrandingLogoChange
}: AccessGateProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const desktopShell = isTauriDesktopShell();
  const desktopBrowserAuthMode = isDesktopBrowserAuthRequest();
  const desktopExternalSignIn = desktopShell && !desktopBrowserAuthMode;
  const missingClientIdOnLoad = !desktopExternalSignIn && !getAccessGoogleClientId();
  const [message, setMessage] = useState(
    desktopExternalSignIn
      ? "Sign in through your browser. This window will unlock when Google sends you back here."
      : missingClientIdOnLoad
        ? ""
        : "Loading Google Sign-In..."
  );
  const [deniedUser, setDeniedUser] = useState<GoogleAccountUser | null>(null);
  const [clientIdDraft, setClientIdDraft] = useState("");
  const [needsClientIdSetup, setNeedsClientIdSetup] = useState(missingClientIdOnLoad);
  const [openingDesktopBrowser, setOpeningDesktopBrowser] = useState(false);

  const completeCredentialSignIn = (credential: string) => {
    const user = decodeGoogleCredential(credential);
    if (!isApprovedGoogleUser(user.email)) {
      clearGoogleAccount();
      setDeniedUser(user);
      setMessage("");
      return;
    }

    if (desktopBrowserAuthMode && redirectDesktopBrowserCredential(credential)) {
      setMessage("Returning to the desktop app...");
      return;
    }

    saveGoogleAccount(user);
    onSignIn(user);
  };

  useEffect(() => {
    if (deniedUser || needsClientIdSetup || desktopExternalSignIn) return;
    let cancelled = false;
    const button = buttonRef.current;
    if (!button) return;

    renderGoogleSignInButton(button, (response) => {
      try {
        if (!response.credential) throw new Error("Google sign-in did not return a credential.");
        completeCredentialSignIn(response.credential);
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
  }, [deniedUser, desktopExternalSignIn, needsClientIdSetup, onSignIn]);

  useEffect(() => {
    if (!desktopExternalSignIn || deniedUser) return;
    let disposed = false;
    let cleanup = () => {};

    setMessage("Sign in through your browser. This window will unlock when Google sends you back here.");
    void listenForDesktopAuthCredential(
      (credential) => {
        try {
          completeCredentialSignIn(credential);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Desktop sign-in failed. Try again.");
        }
      },
      (errorMessage) => setMessage(errorMessage)
    ).then((unlisten) => {
      if (disposed) {
        unlisten();
        return;
      }
      cleanup = unlisten;
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [deniedUser, desktopExternalSignIn, onSignIn]);

  if (deniedUser) {
    return (
      <main className="access-gate">
        <section className="access-card access-denied-card">
          <div className={`access-card-icon denied ${brandingLogoImage ? "has-image" : ""}`}>
            {brandingLogoImage ? (
              <img src={brandingLogoImage} alt="STL Productionz" />
            ) : (
              <Icon name="ShieldAlert" className="h-8 w-8" />
            )}
          </div>
          <p className="access-eyebrow">Access Denied</p>
          <h1 className="font-display">STL Productionz</h1>
          <p>You do not have access to this launcher. Please contact Sebastien to be added.</p>
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
        <div className={`access-card-icon ${brandingLogoImage ? "has-image" : ""}`}>
          {brandingLogoImage ? (
            <img src={brandingLogoImage} alt="STL Productionz" />
          ) : (
            <Icon name="Sparkles" className="h-8 w-8" />
          )}
        </div>
        <p className="access-eyebrow">Team Launcher</p>
        <h1 className="font-display">STL Productionz</h1>
        <p>Sign in with Google to open your production workspace.</p>
        {desktopExternalSignIn ? (
          <div className="access-desktop-auth">
            <button
              className="button-frame access-button"
              disabled={openingDesktopBrowser}
              onClick={async () => {
                setOpeningDesktopBrowser(true);
                try {
                  const openedInSystemBrowser = await openDesktopSignInInSystemBrowser();
                  setMessage(
                    openedInSystemBrowser
                      ? "Finish Google sign-in in your browser. You will be returned here automatically."
                      : "Your browser should be open. Finish Google sign-in there, then return to this app."
                  );
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Could not open Google sign-in in your browser.");
                } finally {
                  setOpeningDesktopBrowser(false);
                }
              }}
            >
              <Icon name="ExternalLink" className="h-4 w-4" />
              {openingDesktopBrowser ? "Opening Browser..." : "Sign in with Google in Browser"}
            </button>
            <small>
              Google opens outside the desktop app, then sends you back here when sign-in is complete.
            </small>
          </div>
        ) : needsClientIdSetup ? (
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
        {onBrandingLogoChange && (
          <BrandImageEditor
            compact
            logoImage={brandingLogoImage}
            onLogoChange={onBrandingLogoChange}
          />
        )}
      </section>
    </main>
  );
}
