# SafeClose

SafeClose is a lightweight, local-first desktop utility that answers one question: **is something important still running before I leave, sleep, or shut down the computer?**

Version 0.2 runs as a macOS accessory application: `LSUIElement` prevents a Dock flash during launch, and Tauri's native activation policy keeps the topbar available while the app stays out of the Dock. A normal Settings window temporarily restores the Dock icon and closing Settings does not stop monitoring.

## Run on macOS

Requirements:

- Apple Silicon or Intel macOS 13+
- Node.js 20.19+ or 22.12+
- Rust stable through `rustup`
- Xcode Command Line Tools

```bash
npm install
npm run tauri dev
```

The first Rust build is slower. React and CSS changes use Vite HMR after the app is open.

## Production build

```bash
npm run tauri build
```

Unsigned macOS artifacts are generated under `src-tauri/target/release/bundle/`. Distribution to other Macs still requires Apple signing/notarization.

## What is real

- Running processes, PID and parent PID.
- CPU, memory, per-process disk I/O and elapsed time through `sysinfo`.
- Conservative classifiers for bounded builds, renders, Git operations, Docker operations and command-line file transfers.
- Manual **Monitor until done** for any visible PID.
- Event-driven observation of temporary Chrome/Safari/Firefox files in the Downloads folder.
- Native macOS power assertion through `/usr/bin/caffeinate -i -w <SafeClose PID>`.
- Automatic assertion cleanup when tasks end, Keep Awake is disabled, or SafeClose exits/crashes.
- Native notifications for watched-process completion and Keep Awake completion.
- Native login startup using the official Tauri autostart plugin; default is off.
- On-demand inspection of relevant macOS power assertions with `pmset`.
- Local JSON preferences in the standard application config directory.

SafeClose never assumes that an open browser, Spotify, Discord, a Node server, or generic network traffic is important. Network activity per process is not displayed because this version does not have a sufficiently reliable source. Download percentages are not shown without a connector that provides the total byte count.

## Interface

- The collapsed black/red topbar is pinned to the top center of the primary display.
- Hover expands downward into a compact activity panel.
- The gear opens a normal Settings window with General, Apps, Connections, Appearance, Detection, Energy and About.
- Settings includes the only explicit **Quit SafeClose** action.
- The Dev Simulator remains available only in development through the `DEV` button in the compact panel. Real data is the default even in development.

## Architecture

```text
React UI
  ├─ RealActivityProvider / MockActivityProvider
  └─ Tauri commands + events
       └─ ActivityEngine (Rust)
            ├─ conservative process classifier
            ├─ process watch registry
            ├─ Downloads filesystem watcher
            ├─ preference store
            └─ platform adapter
                 ├─ macOS: accessory mode, caffeinate, pmset
                 └─ Windows/generic: explicit adapter boundary
```

The engine scans processes every 5 seconds while idle and every 1.5 seconds while Settings is open or an important activity exists. Filesystem events wake it immediately. Snapshots are emitted only when meaningful state changes; there is no React render loop or 100 ms polling.

## Privacy and macOS behavior

- No backend, account, analytics, telemetry or cloud storage.
- Process and file information never leaves the computer.
- The Downloads watcher observes only the immediate Downloads directory and only retains temporary-download paths briefly in memory.
- Notifications are opt-in in Settings.
- Startup is off by default.

The frameless transparent topbar uses Tauri's `macOSPrivateApi`. This does not request a macOS privacy permission, but it prevents Mac App Store distribution. A future App Store build must use a public window treatment instead.

## Checks

```bash
npm run typecheck
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```
