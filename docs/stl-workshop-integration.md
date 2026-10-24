# The Tavern Cook Book in STL Workshop

STL Workshop hosts this repository's own React app as a development tool. It never redesigns, rebuilds or replaces the Cook Book: everything inside the preview is this source tree's UI. Workshop only adds its toolbar around the view, a local server, network policy and the identity handoff. Workshop-side details: `docs/web-app-host.md` and `docs/tavern-cook-book.md` in the STL Engine repository.

`stl.project.json` registers the project (`editor.webApplication`) and its two modes. `thumbnail.jpg` is the Project Browser picture.

## Two separate modes

| | Workshop Preview (offline) | Launch Live Cookbook |
|---|---|---|
| Source | This checkout through Vite (`dev:client`), hot reload | The same checkout, same Vite |
| Port | 5181 preferred, another free loopback port if busy | 5182 preferred, another free loopback port if busy |
| `/api/*` | Answered locally: `503 {offline:true}` | Proxied to `https://the-tavern-cook-book.vercel.app` |
| Other network | Refused by Workshop's session and by `installOfflineNetworkGuard` | Normal (Google, Drive, Liveblocks, Vercel) |
| Data | Last team snapshot Workshop cached, local offline drafts, or starter data | Current published team database and settings |
| Identity | Local preview user (`workshop-preview@stl-workshop.local`), role from **Preview as** | Your Google account through the browser sign-in below |
| Indicator | “Workshop Offline Preview” badge | “Connected Live Preview” badge |

Neither mode commits, pushes, deploys to Vercel or publishes anything. Live edits are real team edits, saved through the existing team sync exactly like the production site.

## Runtime contract

`src/utils/workshopRuntime.ts` resolves the mode once at startup:

- `VITE_STL_WORKSHOP_MODE` — set by Workshop's Vite runner (`offline` or `live`). Workshop sets it in `process.env`, which outranks local `.env` files.
- `window.stlWorkshopHost` — the Workshop preload bridge (`version: 1`, `mode`, `appId`). It also supplies the mode to compiled builds in installed Workshop.
- Offline wins: if either signal says offline, or the flag has any unrecognized value, the app is offline. Neither signal grants anything; without them (Vercel, Tauri, `npm run dev`) the app is unchanged.

Offline mode (`App.tsx`, `remoteDisabled`) skips the secure-session calls, team load/poll/autosave/backup, settings save, realtime room and access refresh, never writes the pending-team-change marker, and loads `loadWorkshopSnapshot()` → `chooseOfflineDatabase()`: a newer snapshot replaces local data only when nothing was edited offline; otherwise drafts stay and the message says so (**Reset offline data** in Workshop clears this preview's browser storage). `src/utils/workshopBoot.ts` is imported first by `main.tsx` and installs the fetch/XHR/WebSocket/EventSource/beacon guard before any other module runs. Google script loading refuses with an explanation.

Live mode caches `sanitizeDatabaseForPersistence(publishedDatabase)` and the team settings (Drive API key removed) through `stlWorkshopHost.cacheSnapshot` a few seconds after the published copy loads. Workshop stores it in its own user data, strips credential-shaped keys again and caps the size.

## Launcher session contract (`src/utils/launcherBridge.ts`, `src/utils/launcherProtocol.ts`)

Messages (unchanged names, backward compatible):

- Request: `{type:"stl-workshop-session-request", appId:"tavern-cook-book"}`, posted to `window.parent` / `window.opener` with each approved origin as `targetOrigin` (no `*`).
- Session: `{type:"stl-workshop-session", appId?, user?:{name?, email, picture?, role?, permissions?}, googleCredential?}`.
- Progress: request `{type:"stl-workshop-progress-request", appId?}` → reply `{type:"stl-workshop-progress", appId:"tavern-cook-book", progress}` to the requesting window and its exact origin.

Accepted only when:

- the origin is exactly listed in `VITE_STL_WORKSHOP_ORIGINS` (comma-separated exact `http(s)` origins; default `https://stl-workshop.vercel.app`), or is this app's own origin;
- the source is `window.parent` or `window.opener` (or this window for same-origin); `null` origins are refused;
- `type` matches and `appId`, when present, is `tavern-cook-book` or legacy `tales-codex`;
- `user` is an object with a valid email and string fields; permissions are at most 32 short strings; non-HTTPS pictures and oversized names are dropped;
- `googleCredential` is JWT-shaped, readable, unexpired and, with a user, for the same email;
- there is an identity (a user or a credential).

The former hostname heuristic (any host containing `stl-workshop`, any loopback port with `?launcher=stl-workshop`) is removed. Roles still go through the existing access system: shared settings override the launcher's role as before.

Inside STL Workshop the app is a top-level view, so the same payloads arrive through `stlWorkshopHost.requestSession()` / `onSession()` and are validated by the same function. Production should set `VITE_STL_WORKSHOP_ORIGINS` to the exact web-launcher origins it embeds under.

## Live sign-in

Google Identity Services only works on registered origins, so the live preview uses the desktop flow: **Sign in with Google in Browser** asks Workshop to open `https://the-tavern-cook-book.vercel.app/?desktopAuth=1&desktopReturn=http://127.0.0.1:<port>/stl-workshop/auth/<nonce>`. After you sign in there (the production page creates its session and checks access first), it returns the credential to Workshop's one-time loopback receiver. Workshop checks issuer, audience, verified email and expiry, then hands the credential to the live view, which completes the existing `completeCredentialSignIn` (secure session cookie through the proxy, settings, access). `desktopReturn` is now restricted to `stl-tavern-cook-book://auth` or that loopback receiver shape (`isAllowedDesktopReturnUrl`); previously any URL was accepted. **Reconnect Google in Browser** replaces the in-page Google button in the session guard for the same reason.

Private Google Drive thumbnails need a Google sign-in in the browser session that shows them. The live preview has its own isolated session, so they appear only after **Drive images** sign-in in Workshop's toolbar (if Google accepts the embedded sign-in) or for files shared by link.

## Tests

`npm test` runs `tests/*.test.ts` with Node and tsx: launcher origins/sources/payloads (accepted and rejected), mode resolution, the offline network guard, snapshot choice and the desktop return allowlist. `npm run typecheck` and `npm run build` are unchanged.
