import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { invoke } from "@tauri-apps/api/core";
import { cursorPosition, getCurrentWindow, primaryMonitor } from "@tauri-apps/api/window";
import type { ActivitySnapshot } from "../types/activity";

export interface PlatformInfo {
  os: "macos" | "windows" | "linux" | "unknown";
  arch: string;
  topOffset: number;
}

export interface ProcessInfo {
  pid: number;
  parentPid?: number;
  name: string;
  app: string;
  command: string;
  cpuUsage: number;
  memoryBytes: number;
  diskReadBytes: number;
  diskWrittenBytes: number;
  elapsedSeconds: number;
  status: string;
  potentiallyRelevant: boolean;
  reason?: string;
  watched: boolean;
}

export interface AppRule { app: string; mode: "default" | "monitor" | "ignore" }
export interface Preferences {
  notifications: boolean;
  language: string;
  appRules: AppRule[];
  animations: boolean;
  topbarWidth: number;
  topbarThickness: number;
  transparency: number;
}

export interface ConnectionStatus { id: string; name: string; status: "detected" | "connected" | "available" | "not_installed" | "coming_soon"; detail: string }
export interface PowerAssertions { available: boolean; summary: string; relevant: string[] }

const fallbackPlatform = (): PlatformInfo => ({
  os: navigator.userAgent.includes("Mac") ? "macos" : navigator.userAgent.includes("Windows") ? "windows" : "unknown",
  arch: "unknown",
  topOffset: 0,
});

export async function loadPlatformInfo(): Promise<PlatformInfo> {
  try {
    return await invoke<PlatformInfo>("platform_info");
  } catch {
    return fallbackPlatform();
  }
}

export async function resizeAndPosition(width: number, height: number, topOffset: number) {
  try {
    const appWindow = getCurrentWindow();
    const monitor = await primaryMonitor();
    if (!monitor) {
      await appWindow.setSize(new LogicalSize(width, height));
      return;
    }

    const monitorSize = monitor.size.toLogical(monitor.scaleFactor);
    const monitorPosition = monitor.position.toLogical(monitor.scaleFactor);
    const x = monitorPosition.x + Math.round((monitorSize.width - width) / 2);
    await Promise.all([
      appWindow.setSize(new LogicalSize(width, height)),
      appWindow.setPosition(new LogicalPosition(x, monitorPosition.y + topOffset)),
    ]);
  } catch {
    // Browser-only Vite previews do not expose a Tauri window.
  }
}

export async function isCursorInsideCurrentWindow(): Promise<boolean> {
  try {
    const appWindow = getCurrentWindow();
    const [cursor, position, size] = await Promise.all([
      cursorPosition(),
      appWindow.outerPosition(),
      appWindow.outerSize(),
    ]);
    return cursor.x >= position.x
      && cursor.x <= position.x + size.width
      && cursor.y >= position.y
      && cursor.y <= position.y + size.height;
  } catch {
    return false;
  }
}

export const native = {
  snapshot: () => invoke<ActivitySnapshot>("get_activity_snapshot"),
  processes: () => invoke<ProcessInfo[]>("list_processes"),
  watchProcess: (pid: number) => invoke<void>("watch_process", { pid }),
  unwatchProcess: (pid: number) => invoke<void>("unwatch_process", { pid }),
  setKeepAwake: (enabled: boolean) => invoke<void>("set_keep_awake", { enabled }),
  setUiActive: (active: boolean) => invoke<void>("set_ui_active", { active }),
  preferences: () => invoke<Preferences>("get_preferences"),
  savePreferences: (preferences: Preferences) => invoke<void>("save_preferences", { preferences }),
  connections: () => invoke<ConnectionStatus[]>("get_connections"),
  powerAssertions: () => invoke<PowerAssertions>("get_power_assertions"),
  openSettings: () => invoke<void>("open_settings"),
  quit: () => invoke<void>("quit_safeclose"),
};
