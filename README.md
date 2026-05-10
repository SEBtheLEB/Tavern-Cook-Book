# The Tavern Cook Book

STL Productionz lore bible for **Tales of the Tavern**.

The Tavern Cook Book is a local-first creative production app for story lore, quests, recipes, items, secrets, timelines, marketing-safe descriptions, and AI-assisted lore cleanup.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Local-first persistence with browser storage
- Node/Express backend for the AI assistant
- OpenAI API calls from the backend only

## Install

Use Node 22 or newer.

```bash
npm install
```

## Run

```bash
npm run dev
```

The Vite app runs at:

```text
http://127.0.0.1:5173
```

The local backend runs at:

```text
http://127.0.0.1:5174
```

## OpenAI Setup

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Then add your key:

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
PORT=5174
```

Important: do not put an OpenAI API key in browser code. The browser calls the local Express backend at `/api/assistant`; the backend reads `process.env.OPENAI_API_KEY` and calls OpenAI from the server side.

## AI Assistant

The floating assistant can:

- Rename references across the lore database
- Suggest structured lore cleanup patches
- Find contradictions
- Generate spoiler-safe marketing copy
- Sort messy notes into entries
- Preview changes before applying them
- Apply only selected changes
- Create a backup before applying
- Undo the last AI-backed change

If no backend key is configured, use the manual workflow:

1. Enter a command.
2. Click **Build Manual Prompt**.
3. Click **Copy Prompt**.
4. Paste it into ChatGPT manually.
5. Paste the returned JSON patch back into the app.
6. Preview and apply selected changes.

## Data

The app starts with integrated Tales of the Tavern starter lore, including Gwen, Tohm Kyatt, Princess Lillia, Whisker Woods, quests, recipe pages, Dark Culinary Arts, slimes, artifacts, secrets, timeline events, marketing-safe copy, and archive/naming decisions.

Data is stored locally in the browser. Use **Settings** to export JSON, import JSON, reset starter data, replace the STL Productionz logo, and check storage size.

Large uploaded videos may exceed browser storage limits. Use video links for long clips.

## Imported Chat History

The prior Codex thread **Build Tavern Cook Book app** has been imported into this project under `docs/imported-chat-history/`.

- `build-tavern-cook-book-app.memory.md` is the quick working-memory summary.
- `build-tavern-cook-book-app.transcript.md` is the readable user/assistant transcript archive.
- `scripts/import-codex-session.mjs` can regenerate the transcript from the local Codex session JSONL if needed.

## Import / Export

Use **Settings > Export JSON** to create a portable backup.

Use **Settings > Import JSON** to restore or migrate a saved database. Invalid JSON is rejected without changing current data.

Use **Settings > Open Live View Copy** to open the same app in read-only mode in another tab/window. It uses the same local browser data, keeps images and styling, hides editing and AI tools, and updates when you save changes in the main editor.

Use **Settings > Download Shareable HTML** for a portable public snapshot. That file can be uploaded elsewhere, but it is not live-synced with your local editor.

## GitHub Pages Read-Only Viewer

For a public Wix-friendly link, host the actual React app as a forced read-only viewer on GitHub Pages.

1. In the app, go to **Settings > Download Website Data**.
2. Save the downloaded file as `public/lore-data.json` in this project.
3. Push the project to a GitHub repository.
4. In GitHub, open the repository **Settings > Pages**.
5. Under **Build and deployment**, choose **GitHub Actions**.
6. Push to `main`, or run the **Deploy GitHub Pages Viewer** workflow manually.

The workflow builds the app with `VITE_READONLY_VIEWER=true`, so the public site hides editing, settings, the assistant, and backend-only tools. It loads public lore from `public/lore-data.json`.

After GitHub Pages publishes, embed that HTTPS URL in Wix.

## Reset

Use **Settings > Reset Starter Data** to restore the integrated starter lore.

Use **Settings > Clear Local App Data** to return the app to the starter database.
