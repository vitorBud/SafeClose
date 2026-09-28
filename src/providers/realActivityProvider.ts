import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { ActivitySnapshot } from "../types/activity";
import { EMPTY_SNAPSHOT, type ActivityListener, type ActivityProvider } from "./activityProvider";

export class RealActivityProvider implements ActivityProvider {
  readonly name = "real";
  private listeners = new Set<ActivityListener>();
  private snapshot: ActivitySnapshot = EMPTY_SNAPSHOT;
  private unlisten?: UnlistenFn;
  private disposed = false;

  constructor() {
    void this.initialize();
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: ActivityListener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private async initialize() {
    try {
      this.unlisten = await listen<ActivitySnapshot>("activity-snapshot", (event) => {
        this.setSnapshot(event.payload);
      });
      const initial = await invoke<ActivitySnapshot>("get_activity_snapshot");
      this.setSnapshot(initial);
    } catch (error) {
      if (import.meta.env.DEV) console.warn("[SafeClose dev] RealActivityProvider unavailable", error);
    }
  }

  private setSnapshot(snapshot: ActivitySnapshot) {
    if (this.disposed) return;
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  dispose() {
    this.disposed = true;
    this.unlisten?.();
    this.listeners.clear();
  }
}

