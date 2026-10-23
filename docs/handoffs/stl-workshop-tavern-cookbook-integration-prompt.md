# Master Prompt: Integrate The Tavern Cook Book Into STL Workshop

Use this prompt with Opus 5.5 on the development PC that contains STL Workshop.

## Repositories And Existing Products

- Tavern Cook Book source: `https://github.com/SEBtheLEB/Tavern-Cook-Book`
- STL Workshop source: `https://github.com/SEBtheLEB/stl-engine-desktop`
- Current production Cook Book: `https://the-tavern-cook-book.vercel.app`
- The Tavern Cook Book is a Vite, React, and TypeScript application with an Express development backend.
- STL Workshop is an Electron application with project adapters, `DocumentHost`, child `WebContentsView` tools, source-preserving website/UI workflows, and managed project builds.

## Objective

Integrate the existing Tavern Cook Book into STL Workshop as an internal development tool while preserving the Cook Book exactly as it currently looks and behaves.

Do not redesign it. Do not recreate its pages in STL Workshop controls. Do not rewrite it as a generic Workshop panel. The existing React application, its fantasy styling, navigation, responsive behavior, modals, art tools, story tools, Combat section, and all other current UI remain the visual and functional source of truth.

The integration needs two deliberately separate modes:

1. **Workshop Mode**
   - Opens the Cook Book inside STL Workshop for source development, navigation, layout inspection, and local testing.
   - Uses the locally checked-out Cook Book source and its current UI.
   - Must not connect to or modify the live team database automatically.
   - Must remain useful without an internet connection by loading starter data or the most recent safe local snapshot.
   - Local inspection must never overwrite Supabase, Google Drive metadata, assignments, or production data.

2. **Launch Live Cookbook**
   - A clear button in the Tavern Cook Book Workshop tool.
   - Builds or runs the Cook Book from the source currently checked out in STL Workshop, including unsent local UI/code changes after they are saved.
   - Opens that local build in a managed Workshop view/window.
   - Connects through the internet to the existing production services so it displays the newest characters, story information, art metadata, team changes, permissions, Google Drive links, and other shared data.
   - This is a connected local preview, not a Vercel deployment.
   - It must not push Git, deploy Vercel, update the production frontend, or publish an STL Workshop release.

The result should let Sebastien change the Cook Book source through the Workshop development environment, save it, click **Launch Live Cookbook**, and inspect those local code/UI changes with the latest team data.

## First: Inspect Both Repositories

Do not begin implementation until you understand both applications.

### In STL Workshop

Read and follow:

- `AGENTS.md`
- `CLAUDE.md`
- `WORK_PC_SETUP.md`
- `workspace-repositories.json`
- `docs/project-format.md`
- the UI Workshop and source-adapter documentation
- the `DocumentHost` and child `WebContentsView` implementation
- `project-system/websites.cjs`
- existing managed preview/dev-server implementations
- existing external source integrations, especially the ownership and pinned-source pattern used for FilmCraft
- Save All, Refresh Local Source, process cleanup, build profiles, project thumbnails, permissions, and packaged-resource behavior

Inspect the working tree before editing. Preserve unrelated work. Use a new branch/worktree if the current checkout is dirty.

### In Tavern Cook Book

Read and follow:

- `AGENTS.md`
- `docs/imported-chat-history/build-tavern-cook-book-app.memory.md`
- `docs/desktop-app.md`
- `docs/supabase-sync.md`
- `package.json`
- `src/App.tsx`
- `src/styles.css`
- `src/types.ts`
- `src/utils/storage.ts`
- `src/utils/cloudSync.ts`
- `src/utils/launcherBridge.ts`
- `src/utils/accessControl.ts`
- `src/utils/driveSettings.ts`
- `src/utils/googlePicker.ts`
- `server/index.ts`
- `server/syncBackend.ts`
- `src-tauri/tauri.conf.json`

Inventory all pages and systems before changing integration behavior. This includes Story Journey, Characters, World Building, Bestiary, Pantry, Art Vault, Art Binder, Art Direction, Roadmap, Development Board, Combat, Tavern Scribe, Speechify narration, assignments, image management, sprite animation, role visibility, Supabase sync, Google Drive, and launcher session handoff.

## Required Architecture

### 1. Keep The Cook Book As Its Own Authoritative Repository

Do not copy and fork the React application into unrelated STL Workshop files.

Use an auditable source relationship. Prefer STL Workshop's proven pinned external-source pattern, such as a Git submodule or the repository mechanism already established by the engine after inspection.

Recommended source location:

`external/tavern-cookbook`

Requirements:

- The Cook Book repository remains where Cook Book feature commits are made.
- STL Workshop stores only its integration adapter plus a tested source revision/pin.
- Updating the Cook Book and updating the Workshop pin are explicit operations.
- Never force-push either repository.
- Never overwrite existing local Cook Book work.
- Preserve full Git history.

If the engine already has a better first-class repository/project registration mechanism, use it and explain why it is safer than a submodule.

### 2. Use A Native STL Workshop Host, Not A Nested Desktop Wrapper

The current Tauri package is a separate desktop wrapper around the Vercel application. Do not run Tauri inside Electron and do not make STL Workshop launch the Tauri executable.

Reuse the React frontend directly inside STL Workshop through the engine's existing project adapter and child `WebContentsView`/document host architecture.

Create a focused integration adapter under the established engine integration boundary, for example:

`editor/integrations/tavern-cookbook/`

The final location must follow the current engine conventions discovered during inspection.

The adapter should own:

- registering the Cook Book tool/project
- starting and stopping the local source preview process
- choosing a free loopback port
- waiting for readiness
- opening the correct Workshop view
- exposing connection state and logs
- Refresh Local Source
- Launch Live Cookbook
- stopping child processes on close/restart
- mapping Workshop identity/session information into the existing Cook Book launcher bridge

It must not own or duplicate Cook Book page UI.

### 3. Preserve The Existing Cook Book UI Exactly

The rendered application must continue using the current Cook Book source, CSS, components, fonts, spacing, icons, themes, responsive layouts, overlays, and interactions.

Do not:

- replace Cook Book navigation with Workshop navigation
- restyle the Cook Book to look like a generic Windows panel
- convert its pages into engine-native forms
- rebuild Story Journey, Art Binder, Combat, or other areas as separate Workshop tools
- flatten the app into an iframe pointed at production
- remove features because they are difficult to integrate

STL Workshop chrome may surround the tool, but everything inside the Cook Book viewport must remain the Cook Book.

### 4. Workshop Mode Must Be Offline And Non-Production

Workshop Mode is for inspecting and developing the application without touching live team data.

Implement an explicit Workshop/offline runtime mode. Use a clear flag or launch contract rather than hostname guessing. For example:

- `VITE_STL_WORKSHOP_MODE=offline`
- a Workshop launch query parameter
- a preload/adapter handshake

Use whichever fits the existing architecture best.

In this mode:

- disable Supabase polling and writes
- disable automatic live-team saves
- do not upload to Google Drive
- do not call OpenAI, Speechify, or other paid services
- do not mutate production assignments or permissions
- show a subtle, unambiguous **Workshop Offline Preview** indicator
- load a local sanitized snapshot, starter data, or last successfully cached team snapshot
- keep navigation and page rendering functional
- keep source/UI development and hot refresh functional

Store cached preview data in Workshop/project user data, not as secret-filled committed files. Never cache API keys, OAuth credentials, Supabase service keys, Google access tokens, or Speechify/OpenAI secrets.

If offline content editing is exposed, keep it isolated as a local draft. Do not invent automatic merging into production. A future explicit review/merge workflow may handle that separately.

### 5. Launch Live Cookbook Must Run Local Source With Live Team Data

The connected preview must use the local Cook Book frontend source, not the already deployed production frontend. Otherwise Sebastien cannot test UI/code changes before deployment.

Recommended flow:

1. Save the current Cook Book source through Workshop.
2. Click **Launch Live Cookbook**.
3. The adapter starts the local Vite frontend and necessary local development process using a managed free loopback port.
4. The local frontend connects to the existing production backend endpoints for sync and server-only services.
5. The view requests the existing STL Workshop session through `src/utils/launcherBridge.ts`.
6. The current user and role are applied using the existing Cook Book access system.
7. The app loads the latest shared team database and Drive-backed media metadata.
8. A clear **Connected Live Preview** indicator shows that this view is using real team data.

Do not place Supabase secret keys, service-role keys, OpenAI keys, Speechify keys, or privileged Google credentials in the frontend, STL project files, or packaged engine.

Prefer routing local `/api/*` requests through a controlled development proxy to the existing Vercel backend:

`https://the-tavern-cook-book.vercel.app`

Use the engine's existing secure preview/proxy facilities if available. If proxying is not sufficient because an endpoint requires a session that is not currently verified server-side, fix the authentication contract safely. Do not weaken authentication or add unrestricted CORS.

Google Drive image requests may continue using the current Drive metadata and browser-side APIs where appropriate. Preserve the rule that removing app metadata never deletes a Drive file.

### 6. Reuse And Harden The Existing Launcher Bridge

The Cook Book already supports these messages in `src/utils/launcherBridge.ts`:

- `stl-workshop-session-request`
- `stl-workshop-session`
- `stl-workshop-progress-request`
- `stl-workshop-progress`
- app IDs `tavern-cook-book` and legacy `tales-codex`

Extend this contract instead of replacing it.

Requirements:

- use exact allowed Workshop origins
- configure `VITE_STL_WORKSHOP_ORIGINS` appropriately
- do not rely on unrestricted wildcard messaging for trusted session data
- validate message type, app ID, source window, origin, payload shape, user email, role, and permissions
- preserve Google sign-in fallback when Workshop session handoff is unavailable
- do not persist privileged credentials in committed source
- keep admin/editor/freelancer/viewer behavior consistent with current Cook Book permissions

Document the final message contract and add automated tests for accepted and rejected origins/payloads.

### 7. Add Clear Workshop Controls

Inside the STL Workshop integration, provide compact controls matching Workshop's existing shell style:

- **Open Cookbook** or **Workshop Preview**
- **Refresh Local Source**
- **Launch Live Cookbook**
- connection badge: Offline Preview, Starting, Connected Live, Error
- development log/details panel using an existing Workshop pattern
- optional **Open Source Folder** and **Open Repository** actions if these already exist elsewhere

Do not put these controls inside or restyle the Cook Book itself unless a small in-app connection indicator is necessary.

The **Launch Live Cookbook** action must explain that it connects to real team data. It must not be named Deploy, Publish, or Production Build.

### 8. Keep Publishing Separate

These are separate actions:

- **Launch Live Cookbook**: local code plus current online team data
- **Commit/Push Cook Book**: updates the source repository
- **Vercel Git deployment**: updates the production frontend after a GitHub push
- **Build STL Workshop Dev**: packages an engine build for teammates
- **Publish STL Workshop release**: follows the engine's formal release process

Never make Launch Live Cookbook automatically perform any of the other four actions.

Do not add automatic Git commits, pushes, Vercel deployments, tags, or engine releases.

### 9. Team Development Builds

After the integration works in a source checkout, support a Workshop development build that teammates can install/use.

The development build should include:

- the tested compiled Cook Book frontend or the engine-approved external-tool payload
- the Workshop adapter
- offline inspection support
- connected live-preview support through public/authorized backend endpoints
- no source-control credentials
- no Supabase secret/service key
- no Google access token
- no OpenAI/Speechify secret

If teammates need editable Cook Book source, use the engine's normal source-workspace setup rather than embedding Git credentials or a writable repository inside the installer.

Follow STL Workshop's build-content isolation rules. Do not package development-only source or secrets into a game build.

### 10. Project Registration And Thumbnail

Register the Cook Book through the current STL project/tool format rather than hardcoding Tales of the Tavern into the engine launcher.

If a `stl.project.json` is required:

- create it in the authoritative project repository
- follow the current `formatVersion` and `engineVersion` contract discovered in the engine
- use stable project and tool IDs
- classify it as an app/tool/website using the engine's existing supported vocabulary
- map UI, source, server, assets, and settings without moving files unnecessarily
- do not expose `.env`, server secrets, Git data, or unrelated folders through a preview server

Create or preserve the required `thumbnail.jpg` at 1280x720 and reference it from the manifest. Prefer a clean Cook Book dashboard capture without Workshop/browser chrome.

## Data And Service Boundaries

Preserve these responsibilities:

- React/Cook Book repository owns the entire Cook Book UI and client behavior.
- STL Workshop owns hosting, process lifecycle, project registration, source refresh, and desktop integration.
- Supabase remains the shared structured-data source.
- Google Drive remains the large media/file source.
- Vercel remains the production web host and privileged API host.
- OpenAI/Tavern Scribe keys remain server-side.
- Speechify keys and shared narration storage remain server-side.
- Liveblocks/presence remains governed by the current Cook Book service configuration.

Do not create a second database or copy team data into a new engine-specific schema.

## Preservation Rules

- Keep all existing Cook Book saved data compatible.
- Keep import/export compatible.
- Keep Supabase team sync compatible.
- Keep Google Drive folder IDs, links, images, sprite animations, and naming conventions compatible.
- Keep account roles and per-member tab visibility compatible.
- Keep the current launcher session bridge backward compatible.
- Keep the production Vercel app working independently.
- Keep the standalone Tavern Cook Book development commands working.
- Keep the standalone Tauri app build working unless a documented incompatibility requires a narrowly scoped adjustment.
- Do not remove tabs, pages, features, data fields, APIs, or workflows.
- Do not rewrite unrelated Cook Book or STL Workshop systems.
- Do not modify game runtime systems for this editor integration.

## Implementation Sequence

Use this order unless repository inspection proves a safer sequence:

1. Create isolated branches/worktrees in both repositories.
2. Record current builds/tests and screenshots as a baseline.
3. Document the integration contract and source ownership.
4. Register/pin the Cook Book source with STL Workshop.
5. Add the Workshop adapter and lifecycle management.
6. Add offline Workshop Mode without changing the visual UI.
7. Add Launch Live Cookbook with local source plus production service proxying.
8. Complete and test launcher identity/session handoff.
9. Add process cleanup, errors, logs, retry, and refresh behavior.
10. Add project registration and thumbnail if required.
11. Add automated integration tests.
12. Verify the real visible Electron workflow.
13. Build a development package and inspect its contents for secrets and unwanted files.
14. Commit the Cook Book changes in the Cook Book repository.
15. Update the tested Cook Book source pin in STL Workshop and commit it separately.

Do not publish a production Vercel deployment or STL Workshop release unless Sebastien explicitly requests it after reviewing the integration.

## Required Automated Verification

At minimum, verify:

- existing Tavern Cook Book `npm run typecheck`
- existing Tavern Cook Book production build
- existing STL Workshop tests relevant to projects, websites/apps, adapters, UI Workshop, and builds
- new adapter registration tests
- managed process starts, becomes ready, refreshes, and stops
- port conflicts choose another safe loopback port
- offline mode performs no team sync writes
- offline mode performs no Drive/OpenAI/Speechify paid operations
- live mode uses local frontend assets rather than the deployed frontend bundle
- live mode receives current team data through the authorized backend
- launcher bridge accepts valid Workshop messages and rejects invalid origin/app/payload messages
- no secrets appear in renderer bundles, logs, committed files, or packaged output
- standalone Cook Book still runs outside Workshop
- existing Vercel production app still runs independently

## Required Visible Acceptance Test

Use STL Workshop through its visible application controls, not only unit tests.

1. Open the Tavern Cook Book tool in Workshop Mode.
2. Confirm its UI matches the standalone Cook Book: sidebar, top controls, fonts, colors, layouts, dialogs, and representative pages.
3. Disconnect or block network access and navigate several pages successfully.
4. Confirm the offline indicator is visible and no live writes occur.
5. Make a small reversible CSS/UI source change through the source workflow.
6. Save and use Refresh Local Source.
7. Confirm the local Workshop view updates.
8. Click Launch Live Cookbook.
9. Confirm the connected view runs that modified local source.
10. Confirm it loads the latest shared team data and Drive-backed images.
11. Confirm the current user role and hidden-tab permissions are correct.
12. Confirm closing/restarting the preview stops orphaned processes.
13. Revert the temporary test change.
14. Reopen both modes and confirm stability.

Capture screenshots and record exact observations.

## Completion Report

Do not call the work complete until both repositories are clean except for intentional committed changes and all required verification has passed.

Report:

- architecture used and why
- Cook Book commit and branch
- STL Workshop commit and branch
- pinned Cook Book revision, if applicable
- files changed in each repository
- how Workshop Mode remains offline/non-production
- how Launch Live Cookbook uses local source with live data
- authentication/session behavior
- how secrets are protected
- tests and visible verification performed
- development build artifact location
- remaining limitations or follow-up work
- exact steps Sebastien and teammates use to open each mode

## Non-Negotiable Final Result

The Tavern Cook Book must still feel and behave like the same Tavern Cook Book. STL Workshop becomes its development host and launcher, not its replacement.

Inside Workshop, Sebastien can inspect and develop the current UI safely without touching production. When he clicks **Launch Live Cookbook**, the locally edited source opens as a connected preview containing the newest authorized team data. Deployment remains a separate, intentional action.
