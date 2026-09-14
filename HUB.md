# [AoG] Hub (Desktop)

This fork builds the desktop agent client as **[AoG] Hub** (Electron, Windows/macOS/Linux).
Branch: `forge-desktop` (off `dev`). Upstream: `anomalyco/opencode`.

## What changed vs upstream

- Package renamed to `@aog/hub-desktop`, so the Windows install folder is
  `%LOCALAPPDATA%\Programs\@aoghub-desktop` — never the shared
  `@opencode-aidesktop` folder. This was the actual overwrite vector.
- `packages/desktop/electron-builder.config.ts` — product names (`[AoG] Hub` / Beta / Dev),
  app ids (`ai.aog.hub*`), `aog-hub-*` artifacts, `hub://` protocol, explicit
  per-channel NSIS GUIDs, `deleteAppDataOnUninstall: false`, publish owner
  `FireDevOps`.
- `packages/desktop/src/main/index.ts` (`APP_NAMES`/`APP_IDS`) — window/taskbar identity,
  `%APPDATA%\ai.aog.hub` userData, `hub://` second-instance links.
- `packages/desktop/src/main/windows.ts` — window title `[AoG] Hub`.
- `packages/desktop/src/main/background-cli.ts` — Hub-only daemon state dirs.
  The app never adopts upstream OpenCode's background service, so the two
  desktops run side by side.
- `packages/desktop/src/main/migrate.ts` — Tauri migration reads Hub ids only.
- Deep links accept `hub://`, `devhub://`, `forge://`, and `opencode://`
  (`packages/app/src/pages/layout/deep-links.ts`).
- `forge.provider.json` (repo root) — drop-in custom provider preset for Forge models.

## Build (Windows)

Prerequisites: Node 20+, Bun (`npm i -g bun`).

```powershell
bun install
$env:OPENCODE_CHANNEL = "prod"
bun --filter @aog/hub-desktop build
bun --filter @aog/hub-desktop package:win
```

The channel must be set for `build` too — it is baked into the app identity
(app id, taskbar name, updater). Keep it identical for build and package.

Output: `packages/desktop/dist/*.exe` (NSIS installer, `aog-hub-win-x64.exe`).

Channels: `dev` (default) / `beta` / `prod` via `OPENCODE_CHANNEL`.
Dev builds bundle a local CLI sidecar from `resources/`; prod expects release infra.

## Coexistence with OpenCode desktop

Separate install dir, Start Menu entry, taskbar id (`ai.aog.hub`), window
title, `%APPDATA%` data dir, background-service state, and `hub://`
protocol — plus explicit per-channel NSIS GUIDs and
`deleteAppDataOnUninstall: false`, so installing, running, or uninstalling
one never touches the other. The app never adopts upstream OpenCode's
background service or Tauri data.

Cleanup if old builds are present: uninstall the `Forge` and `[AoG] DevHub`
entries first (they shared OpenCode's folder), then install `[AoG] Hub`.
If OpenCode itself misbehaves afterwards, reinstall it — its own installer
repairs the shared folder.

## Link the app to Forge models

1. Serve an OpenAI-compatible endpoint for Forge models and set it as
   `FORGE_GATEWAY_URL` on the developer website (the panel already forwards
   playground/chat/API traffic there and bills credits per call).
2. Copy `forge.provider.json`'s `provider.forge` block into `opencode.json`,
   replacing `YOUR-FORGE-SITE` with the site host.
3. `set FORGE_API_KEY=<key from the site Forge → API Keys page>` and pick a
   `forge/*` model in the app.

## Reasoning in the desktop client

Forge models declare `"reasoning": true` in `forge.provider.json`, and this
fork's `variants()` mapper (`packages/opencode/src/provider/transform.ts`)
gives every `forge` provider model low/medium/high effort options that ride
along OpenRouter-style (`reasoning: { effort }`) — including free
qwen/kimi/deepseek variants and `big-pickle`, which the generic
openai-compatible denylist would otherwise exclude. Thinking traces render
in the session timeline like any other provider.

Note: the panel's `POST /forge/api/chat` is single-shot (chat + machines).
Agent mode (tool use, sessions, streaming) speaks OpenAI against the panel
itself: set the provider `baseURL` to `https://YOUR-FORGE-SITE/forge/v1`
with a Forge API key — see `POST /forge/v1/chat/completions` on the site's
Forge → API page. Model ids are panel slugs; the panel maps them to gateway
ids, bills per-call credits, and streams SSE with `[DONE]`.
