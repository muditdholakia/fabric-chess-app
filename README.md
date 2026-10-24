# Fabric Chess Arena ♟

**A real, playable chess application that deploys as a native Microsoft Fabric App** using Fabric Apps / Rayfin static hosting.

![Platform: Microsoft Fabric Apps](https://img.shields.io/badge/Deploy-Microsoft%20Fabric%20Apps-7767dc) ![Chess rules](https://img.shields.io/badge/Chess-Rules%20validated-54bbb9) ![License](https://img.shields.io/badge/License-MIT-blue)

## What's included

- Polished, responsive chessboard with legal move highlighting, last-move markers, check warnings, promotion picker and board flipping.
- **Fabric Bot** offline chess opponent with three difficulties (Easy, Medium, Hard) — runs locally in the browser.
- **2 Players** pass-and-play on one screen.
- Legal chess moves: checks, checkmate, stalemate, castling, en passant, all promotion types, threefold repetition, 50-move draw, and dead-material draws for standard cases.
- Undo (last full turn versus bot), FEN copy, PGN export, move history, optional move sounds, game resignation.
- Games resume after page refresh and personal stats are stored in the **current browser's localStorage**.
- **Native Fabric Apps package** (`rayfin/rayfin.yml`) using protected static hosting. No database or external chess API is needed.

## 1. Preview locally (no dependencies)

Prerequisite: **Node.js 20 or later**.

```bash
npm run dev
```

Open **http://localhost:5173**. The game works without installing `node_modules` or connecting to Fabric.

Run automated chess tests and create deployable static output:

```bash
npm test
npm run build
```

Build output is in `dist/`, including `index.html`, `src/`, and `assets/`.

## 2. Deploy to Microsoft Fabric

### Prerequisites

1. An active Microsoft Fabric tenant and a workspace on an eligible Fabric capacity.
2. **Fabric Apps (preview)** workload enabled by a tenant admin (tenant settings → Fabric apps, or OneLake catalog → Govern → Configurations → Workloads, depending on current portal navigation).
3. Fabric workspace **Contributor**, Member or Admin rights; Microsoft Entra user account authorized to deploy apps.
4. Node.js 20+ and internet access on your deployment computer for the Rayfin CLI.

### Deploy from the unpacked project

Open a terminal inside the extracted project folder:

```bash
npm test
npm run build
npx rayfin login
npx rayfin up --workspace "YOUR FABRIC WORKSPACE NAME"
npx rayfin up status
```

Alternatively, `npx rayfin up` can prompt for a workspace. The CLI creates or updates a **Fabric App** item in the selected workspace, deploys the files from `dist/`, and prints the hosted app URL and its Fabric portal link.

> This project uses **static hosting only**. The `auth` and `data` service modules are disabled, but `staticHosting.assetAccess: protected` requires authorized Fabric access to the hosted content. It is not an externally hosted website or a Power BI organizational App.

### Edit and redeploy

Change `src/main.js`, `src/styles.css`, `src/chess.js` or `index.html`. Test and redeploy:

```bash
npm test
npx rayfin up staticapp deploy
```

For updates to `rayfin/rayfin.yml` (including access posture), always use **`npx rayfin up`** for a full deployment.

### Make the app public (optional)

In `rayfin/rayfin.yml`, switch `assetAccess: protected` to `assetAccess: public`, then run `npx rayfin up`. Public permits anonymous access to the static assets; avoid it for internal company content.

## 3. Deploy configuration

The project ships a working `rayfin/rayfin.yml`:

```yaml
id: fabric-chess-arena
name: Fabric Chess Arena
version: 1.0.0
services:
  auth:
    enabled: false
  data:
    enabled: false
  staticHosting:
    enabled: true
    root: .
    folder: dist
    buildCommand: npm run build
    indexDocument: index.html
    assetAccess: protected
```

**No connection strings, gateways, SPNs, Fabric SQL database, Lakehouse or Power BI license features are required by the game.** You will still need a Fabric Apps-enabled workspace for native deployment.

## 4. File map

```text
fabric-chess-arena/
├── index.html               # Main SPA
├── src/
│   ├── chess.js            # Chess rules and notation (zero dependencies)
│   ├── ai.js               # Local chess AI (minimax / alpha-beta)
│   ├── main.js             # Game state, rendering, browser interactions
│   └── styles.css          # Responsive Fabric-inspired theme
├── assets/favicon.svg
├── rayfin/rayfin.yml       # Native Fabric Apps deployment configuration
├── scripts/
│   ├── build.mjs           # Static distribution build
│   └── serve.mjs           # Local dev server
├── tests/chess.test.mjs    # Regression tests
├── package.json
└── LICENSE
```

## 5. Functionality and limitations

| Item | Behavior |
|---|---|
| Chess engine | Built-in, works offline; no third-party licensing/dependencies |
| AI opponent | Client-side, lightweight, beginner/intermediate strength (not Stockfish) |
| Game saves | Browser localStorage only, per device/browser |
| Fabric backend | Not needed for this version; no SQL tables or APIs are created |
| Multiplayer | Same-screen only, **not** online multiplayer |
| User auth | Protected Fabric-hosted files; no in-app sign-in/profile |
| Accessibility | Click/tap squares and keyboard focusable board buttons with ARIA labels |
| Desktop/mobile | Responsive interface |
| Internet for gameplay | None, once assets are served |

This is a **working native Fabric App**, not a Fabric custom workload SDK item, Fabric notebook, Power BI report, or organizational Power BI app. For a cloud leaderboard, per-user synced game history, online multiplayer, or Lakehouse telemetry, add a Fabric Apps Data service with per-user row policies / Functions and an appropriate real-time transport.

## 6. Troubleshooting

- **No `App` item available:** Fabric Apps is currently a preview workload; ask your Fabric tenant admin to enable it for your group and check workspace eligibility.
- **CLI needs login / 401:** Run `npx rayfin login` and verify workspace permissions.
- **Static content not found:** Run `npm run build` and confirm `dist/index.html` exists.
- **App deployed but only colleagues with permission can open:** This is intended with `assetAccess: protected`. Grant appropriate item/workspace access or consciously switch to `public`.
- **Move history disappears in another device/browser:** This version intentionally saves locally. PGN export is the portable record.

Official docs:

- [Create a Fabric App with Rayfin CLI](https://learn.microsoft.com/en-us/fabric/apps/create-app-with-cli)
- [Fabric Apps static hosting](https://learn.microsoft.com/en-us/fabric/apps/hosting)
- [Deploy a Fabric App](https://learn.microsoft.com/en-us/fabric/apps/deploy-app)
- [Rayfin agent/deployment rules](https://rayfin.ai/docs/reference/agent-rules)

---

The included chess engine and frontend are MIT licensed. This is a community-created app and not an official Microsoft product.
