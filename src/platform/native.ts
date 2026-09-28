import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { invoke } from "@tauri-apps/api/core";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";

export interface PlatformInfo {
  os: "macos" | "windows" | "linux" | "unknown";
  arch: string;
  topOffset: number;
}

const fallbackPlatform = (): PlatformInfo => ({
  os: navigator.userAgent.includes("Mac") ? "macos" : navigator.userAgent.includes("Windows") ? "windows" : "unknown",
  arch: "unknown",
  topOffset: navigator.userAgent.includes("Mac") ? 38 : 8,
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
    const monitor = await currentMonitor();
    await appWindow.setSize(new LogicalSize(width, height));
    if (!monitor) return;

    const monitorSize = monitor.size.toLogical(monitor.scaleFactor);
    const monitorPosition = monitor.position.toLogical(monitor.scaleFactor);
    const x = monitorPosition.x + Math.round((monitorSize.width - width) / 2);
    await appWindow.setPosition(new LogicalPosition(x, monitorPosition.y + topOffset));
  } catch {
    // Browser-only Vite previews do not expose a Tauri window.
  }
}
