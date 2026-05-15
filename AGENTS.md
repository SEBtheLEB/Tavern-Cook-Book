# Project Context

Before making changes, read:

- `docs/imported-chat-history/build-tavern-cook-book-app.memory.md`

That file imports the working decisions, feature history, lore context, and latest known state from the prior Codex thread titled `Build Tavern Cook Book app`.

Use `docs/imported-chat-history/build-tavern-cook-book-app.transcript.md` when exact prior wording or historical details matter.

## Version Tagging

- The visible app version lives in `src/utils/appVersion.ts`.
- If the user includes the phrase `TAG IT` in a requested change, bump the visible version by `0.1` in the same change, for example `V1.` -> `V1.1` -> `V1.2`.

## Publish Preference

- After completing a requested project change, commit the work and push it to GitHub.
- Rely on the connected Vercel Git integration to deploy from the GitHub push. Do not run a manual Vercel CLI production deploy unless the user explicitly asks for one.
