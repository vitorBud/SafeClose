# SafeClose

SafeClose is a lightweight desktop indicator that answers one question: is something important still happening before you leave, sleep, or shut down the computer?

This repository currently contains **Milestone 1 — Visual Prototype**. Activity data is simulated in development. Real process detection, keep-awake behavior, notifications, and browser connections are intentionally not implemented yet.

## Requirements

- macOS 13+ (development target: Apple Silicon)
- Node.js 20.19+ or 22.12+
- Rust stable, installed with [rustup](https://rustup.rs/)
- Xcode Command Line Tools

## Run the desktop app

```bash
npm install
npm run tauri dev
```

React and CSS changes are updated by Vite HMR while the Tauri window stays open.

## Try the Dev Simulator

1. Hover the thin status line to see the quick panel.
2. Click the line or quick panel to open the main panel.
3. Select **Simulador** in the sidebar.
4. Choose Safe, download, upload, terminal, multiple activities, error, or keep-awake.

Download and upload advance from 0 to 100 automatically. The simulator and its controls are excluded from production builds through `import.meta.env.DEV`.

## Structure

```text
src/
  components/     React views with no native detection logic
  platform/       Small frontend bridge to platform-specific native behavior
  providers/      ActivityProvider contract plus mock/system implementations
  types/          Shared activity and state types
src-tauri/
  capabilities/   Explicit Tauri permissions
  src/platform/   Rust adapters for macOS, Windows, and other desktop systems
```

The frontend consumes only `ActivityProvider`. In development, it receives `MockActivityProvider`; production currently receives an inert `SystemActivityProvider` so SafeClose never invents real activity. Milestone 2 can implement native detection behind that same contract.

## Privacy and permissions

Milestone 1 has no analytics, accounts, network backend, database, file access, process inspection, or persistent monitoring. Its only additional Tauri permissions let the app resize and center its own window as the bar expands. No sensitive macOS permission is requested.

The prototype enables Tauri's `macOSPrivateApi` setting solely to support a truly transparent frameless window. It does not request a macOS privacy permission, but apps using this private window API are not eligible for the Mac App Store. Before a store release, the window treatment must be revisited using only public macOS effects.

## Checks

```bash
npm run typecheck
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```
