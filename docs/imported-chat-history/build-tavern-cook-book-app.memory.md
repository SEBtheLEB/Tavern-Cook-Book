# Build Tavern Cook Book App - Imported Working Memory

Imported from Codex thread `019e00a1-d76a-7db1-bdc1-69130df53a65` titled `Build Tavern Cook Book app`.

Full readable transcript: `docs/imported-chat-history/build-tavern-cook-book-app.transcript.md`

Use this file as the quick project memory before making changes. Use the full transcript when an exact prior request or wording matters.

## Core Project

- Project name: `The Tavern Cook Book`.
- Studio branding: `STL Productionz`.
- Game: `Tales of the Tavern`.
- Purpose: local-first living lore bible, story database, quest tracker, recipe book, wiki, production tracker, media/art organizer, and AI-assisted lore cleanup tool.
- Stack: Vite, React, TypeScript, Tailwind CSS, local browser persistence, Node/Express backend for assistant calls.
- Security rule: never put the OpenAI API key in browser/client code. The browser calls the local Express backend; the backend reads `OPENAI_API_KEY` from `.env`.
- Product posture: do not rewrite from scratch. Preserve localStorage, imported user data, navigation, search, edit mode, read-only mode, and existing styling unless the request specifically targets them.

## Design Preferences

- The app should feel like a magical cookbook, tavern journal, story bible, game design wiki, production tracker, and lore detective board.
- UI should be clean, modern, button-y, visual, and writer-friendly rather than code-editor-like.
- Favor warm fantasy/tavern styling, cream/parchment surfaces, dark readable text, gold accents, softened card edges, and clear section headers.
- Avoid showing raw JSON, visible code braces, or implementation-looking data in normal editing UI.
- Prefer edit controls near the thing being edited over a global edit/view switch.
- Preserve readable text, polished modals, good hover states, and responsive layouts.
- User likes image-forward workflows: character buttons, hover images, portrait/banner/sprite slots, Drive-backed image pickers, and adjustable image fit.

## Current App Feature History

- Initial app included dashboard, sidebar/hubs, entry cards, full entry modal, wiki-style layout, timeline/secrets views, settings, media controls, local import/export, and an assistant preview/apply workflow.
- AI assistant can suggest structured patches, find contradictions, generate spoiler-safe marketing copy, rename references, preview changes, apply selected changes, back up before applying, and undo last AI-backed change.
- Read-only workflows were added:
  - `Open Live View Copy` uses `?readonly=1` and the same local browser data.
  - `Download Shareable HTML` creates a portable read-only snapshot.
  - GitHub Pages workflow builds the real React app as a forced read-only viewer that loads `public/lore-data.json`.
  - Public hosted viewer does not live-sync from localStorage; update by exporting website data, replacing `public/lore-data.json`, and pushing.
- Sidebar history:
  - Sidebar stays sticky with bottom controls always visible.
  - Sidebar has edit mode for folders, ordering, drag/drop, and saved layout in local storage.
  - Collapsed sidebar icon buttons have custom hover tooltips.
- Character UI history:
  - Characters use image-forward roster buttons with normal/hover images and animated hover feel.
  - Character detail/profile view supports portrait, banner, main image, icon, dialogue sprite, in-game sprite, gallery/story sections, timeline/events, rich text controls, and a character mini assistant import/export prompt flow.
  - Edit mode reset bug was fixed so clicking Edit no longer jerks back to view mode when the same entry rerenders.
- Google Drive and image system history:
  - Character Art Gallery stores lightweight metadata only, not image files.
  - Character gallery entries include title, category, Drive file ID, thumbnail URL, web view link, date, featured flag, notes, and upload/import status.
  - Character entries have `driveFolderId` and `driveFolderLink`.
  - Google Drive settings live in the app settings area and include API key, OAuth Client ID, and default folder IDs.
  - Manual Google Drive links extract file IDs and generate Drive thumbnail/view URLs.
  - Real Drive upload uses Google Identity Services and Drive API with `drive.file` scope.
  - Google Picker import selects existing Drive images without copying or deleting files.
  - Duplicate protection, filters, sorting, empty states, preview modal, status badges, and broken-image fallbacks were added.
  - Removing or clearing an image in the app must only remove local metadata/assignment; never delete from Google Drive.
  - Drive security audit added teammate warning language: users must manage folder permissions in Google Drive, and app settings are browser-local.
- Image Manager history:
  - Reusable Image Manager popup manages image slots across Characters, Bestiary, Pantry, Story Journey, World Building, Art Vault, and Art Binder.
  - It supports local/Drive images, Drive folders, image adjust/fit, remove/reset fit, and a top shortcut to paste one image link and apply it to every slot in the current manager.
  - Google Picker was raised above all app modals with global iframe/dialog z-index overrides.
  - Uploads to Drive now rename PC files before upload using contextual names such as entity/category/slot/state/date.
- Art Vault and Art Binder history:
  - Art Vault and Art Binder are internal/team editing areas and should be restricted away from read-only/viewer users.
  - Art Binder works as an internal upload board. Clicking a slot opens Image Manager directly.
  - Art Binder supports per-category folder routing and per-subject folder rows, so a category like Dialogue Sprites can route Gwen, Tohm, etc. to different folders.
  - Art Binder supports Assign Mode batching, slot selection, teammate assignment, assigned-slot navigation/highlight, and statuses `Missing`, `WIP`, `Final`, and `Needs Revision`.
  - Art Binder category names can be edited and more categories/slots can be added.
- Pantry/Bestiary/World/Story image history:
  - Pantry has a default Drive folder for all ingredients, with per-ingredient override.
  - Drive-backed picker actions in Pantry and Bestiary were made to persist immediately so images do not vanish after refresh.
  - Bestiary has image/drop icon Drive picker support and related Drive file moving into assigned folders.
- Sprite sheet system history:
  - Sprite sheet support must be part of the existing image/art/Drive system, not a duplicate upload system.
  - Users manually choose/upload/import a sprite sheet, set slicing values, preview a grid, slice, preview animation, save presets, and reuse those presets in image slots.
  - `src/utils/spriteSheets.ts` stores sprite sheet metadata and presets.
  - `src/components/SpriteAnimation.tsx` renders saved sprite animations.
  - `src/components/SpriteSheetAnimatorPage.tsx` provides a standalone animator page.
  - Image Manager has `Make Sprite Animation`, which opens a large sprite cutter modal in context.
  - Art Binder slots render saved sprite animations instead of static sheet thumbnails.
  - Latest imported state: sprite cutter workspace was enlarged; it seeds the grid from actual loaded image dimensions instead of generic `64x64` guesses; frame hold controls persist in animation presets; build passed after the fix.

## Important Code Areas

- App shell/navigation: `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/TopBar.tsx`, `src/data/navigation.ts`.
- Data model and starter lore: `src/types.ts`, `src/data/starterData.ts`.
- Persistence/import/export: `src/utils/storage.ts`, `src/utils/shareExport.ts`, `public/lore-data.json`.
- Assistant: `src/components/AssistantPanel.tsx`, `src/utils/assistant.ts`, `server/index.ts`.
- Drive/image system: `src/utils/driveSettings.ts`, `src/utils/googlePicker.ts`, `src/utils/media.ts`, `src/utils/imageFit.ts`, `src/components/DriveImageSourceControls.tsx`, `src/components/DriveImagePickerButton.tsx`, `src/components/ImageManagerModal.tsx`, `src/components/ImageAdjustModal.tsx`.
- Characters: `src/components/CharacterRoster.tsx`, `src/components/CharacterDetailPage.tsx`, `src/components/CharacterProfileView.tsx`.
- Art systems: `src/components/ArtVaultDashboard.tsx`, `src/components/ArtBinderPage.tsx`, `src/utils/artVaultDashboard.ts`.
- Assignments: `src/components/AssignmentSystem.tsx`, `src/utils/assignments.ts`.
- Pantry/Bestiary/Story/World: `src/components/PantryPage.tsx`, `src/components/BestiaryPage.tsx`, `src/components/StoryJourneyPage.tsx`, `src/components/WorldBuildingPage.tsx`.
- Sprite sheets: `src/utils/spriteSheets.ts`, `src/components/SpriteSheetAnimatorPage.tsx`, `src/components/SpriteCutterModal.tsx`, `src/components/SpriteAnimation.tsx`.

## Core Lore Imported From Original Build Prompt

- Tales of the Tavern is a cozy fantasy action/adventure built around culinary magic. Food can heal, corrupt, empower, reveal culture, shape combat, and drive story.
- Core gameplay loop: explore, gather ingredients, craft tools, fight enemies, prepare ingredients, cook meals, equip meals for buffs/powers, complete quests, recover torn recipe pages, purify corrupted areas, and uncover Tohm's hidden past.
- Gwen: main protagonist, 23-year-old human woman from Osul, hardworking fighter, practical/sarcastic/protective, works with Tohm Kyatt, gathers ingredients, fights, cooks, protects villages, likes potatoes, and is working through an ale addiction. For marketing/cinematic art, her in-game big nose can be smaller because it translates better visually.
- Tohm Kyatt: world-renowned Whisken/Wiscan chef and food critic, only cat with sweet taste buds, brilliant/secretive/obsessive, recruits Gwen to recover torn recipes, has a redemption arc. He secretly caused the Tabby Island/Cat Cauldron disaster and never drinks from the cauldron. He is tied to the Dragon Knife, Recipe Book, Dark Culinary Arts, and Living Chicken Tavern incident.
- Princess Lillia: major antagonist, human princess obsessed with becoming a faery. The royal family seeks magic for her; the king wars with dwarves to obtain the Dragon Knife; Tohm creates an unstable magical dish; Lillia consumes it, gains dangerous powers, tears recipe pages from Tohm's book, and later mass-produces Dark Culinary Arts in the Faery Realm.
- Lel Kai: faery/magical-side character, soft canon, tied to Whisker Woods and Faery Kingdom content.
- Oswin: alchemist elder, suspicious of Tohm, potential lore/crafting/quest figure.
- Kap: fisherman in Whisken Village, tied to corrupted pond/opening quest, Prawnhusk, and fishing.
- King and Queen: Lillia's parents; the king's war for the Dragon Knife helps trigger the larger magical disaster.
- Datka/Dagda: mythic figure from Tohm's childhood cauldron fairy tale. Naming is unresolved and needs consistency.
- Key locations: Whisker Woods, Whisken Village, Tabby Island, Kap's Pond, Faery Realm, Human Kingdom/Royal Castle, Dwarven Mountains, Saltlick Stones, Mushroom Ring Glade.
- Key systems/items/themes: Recipe Pages, Recipe Book, Cat Cauldron, Dragon Knife, Dark Culinary Arts, corrupted meals, cooking buffs, slimes, village protection, secrets, timeline reveals, spoiler-safe public descriptions, internal lore vs marketing copy.

## Working Rules To Preserve

- Do not store actual uploaded image files in localStorage when Drive metadata is enough.
- Do not stringify or persist temporary object URLs as permanent data.
- Do not delete Drive files when removing app metadata or clearing slots.
- Keep manual image links working even when Drive is not configured.
- Keep app startup safe when Drive settings are empty or Google scripts fail.
- Normalize older saved data so missing fields like galleries, Drive folders, art slots, and sprite metadata do not crash the app.
- Run `npm run build` or `npm run typecheck` after touching shared TS/TSX code.
