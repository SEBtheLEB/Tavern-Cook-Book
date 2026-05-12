# STL Productionz Desktop App

The desktop app is a Tauri wrapper around the live Vercel app:

- Live app URL: `https://the-tavern-cook-book.vercel.app`
- Desktop return scheme: `stl-tavern-cook-book://auth`
- Windows installers are produced as GitHub Actions artifacts by the `Desktop App` workflow.

## How Sign-In Works

Google sign-in should not happen inside the Tauri WebView. In the desktop shell, the sign-in page opens Google in the user's default browser. After Google returns a credential to the Vercel page, that page sends the credential back into the installed app through the custom return link.

Flow:

1. User opens `STL Productionz Launcher`.
2. User clicks `Sign in with Google in Browser`.
3. Default browser opens the Vercel app in desktop auth mode.
4. User signs in with Google.
5. Browser returns to `stl-tavern-cook-book://auth`.
6. The Tauri app receives the credential and opens the launcher.

## Build Locally

Local Tauri builds require the Windows Tauri prerequisites:

- Rust / Cargo
- Microsoft C++ Build Tools
- Microsoft Edge WebView2
- Node dependencies from `npm ci`

Then run:

```powershell
npm.cmd run desktop:build
```

Installers are written under:

```text
src-tauri/target/release/bundle/
```

## Build In GitHub

The GitHub workflow `.github/workflows/desktop.yml` builds the Windows installer on push to `main` when desktop-relevant files change. It can also be run manually from GitHub Actions.

Download the artifact named:

```text
stl-productionz-launcher-windows
```
