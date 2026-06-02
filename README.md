# World Scribe Codex

STL Productionz worldbuilding and character workspace.

World Scribe Codex is a local-first app focused on character profiles, relationships, locations, cultures, factions, myths, rules, mysteries, and AI-assisted worldbuilding cleanup. It was forked from the Tavern Cook Book app, but the active product surface is now Characters + World Building only.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Local-first browser persistence
- Node/Express backend for Scribe AI
- OpenAI API calls from the backend only

## Run

Use Node 22 or newer.

```bash
npm install
npm run dev
```

The Vite app runs at `http://127.0.0.1:5173`.

The local backend runs at `http://127.0.0.1:5174`.

## Scribe AI Setup

Create a `.env` file from `.env.example`, then add the backend key:

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
PORT=5174
```

Do not put an OpenAI API key in browser code. The browser calls `/api/assistant`; the Express backend reads `process.env.OPENAI_API_KEY` and calls the OpenAI Responses API server-side.

Scribe AI can:

- Update character text, tags, and structured fields
- Add or remove character entries
- Update existing World Building records
- Add new World Building records
- Preview changes before applying them
- Apply only selected changes
- Create a restore point before applying
- Undo the last AI-backed change

Scribe AI is intentionally constrained away from gameplay systems, story journey chapters, recipes, bestiary records, marketing pages, archives, and art production boards in this first pass.

## Data

The app still migrates existing Tavern Cook Book data so character and world-building material can be reused. Non-character/gameplay-oriented records remain in storage for compatibility, but they are not part of the active navigation.

Use Settings to export JSON, import JSON, reset starter data, change theme, manage sync/access settings, and check storage size.
