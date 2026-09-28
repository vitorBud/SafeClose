import type { Activity, ActivitySnapshot, SafeCloseState } from "../types/activity";
import type { ActivityListener, ActivityProvider } from "./activityProvider";

export type SimulatorScenario =
  | "safe"
  | "download"
  | "upload"
  | "terminal"
  | "file_transfer"
  | "single"
  | "multiple"
  | "error"
  | "keep_awake";

const now = () => Date.now();

function activity(overrides: Partial<Activity> & Pick<Activity, "id" | "app" | "label" | "type">): Activity {
  return {
    status: "running",
    startedAt: now(),
    importance: "normal",
    source: "mock",
    ...overrides,
  };
}

function stateFor(activities: Activity[], keepAwake: boolean): SafeCloseState {
  if (activities.some((item) => item.status === "failed")) return "error";
  if (keepAwake) return "keep_awake";
  if (activities.some((item) => item.status === "running")) return "busy";
  return "safe";
}

export class MockActivityProvider implements ActivityProvider {
  readonly name = "mock";
  private listeners = new Set<ActivityListener>();
  private activities: Activity[] = [];
  private keepAwake = false;
  private progressTimer: number | undefined;
  private completionTimer: number | undefined;
  private eventCount = 0;
  private snapshot = this.createSnapshot();

  getSnapshot = () => this.snapshot;

  subscribe = (listener: ActivityListener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setScenario(scenario: SimulatorScenario) {
    this.stopTimers();
    this.keepAwake = scenario === "keep_awake";

    switch (scenario) {
      case "safe":
        this.activities = [];
        break;
      case "download":
        this.activities = [activity({ id: "chrome-download", app: "Chrome", label: "Transferindo dados", detail: "Fonte simulada", type: "download", progress: 0, importance: "high" })];
        this.startProgress();
        break;
      case "upload":
        this.activities = [activity({ id: "drive-upload", app: "Drive", label: "Enviando arquivos", detail: "3 itens", type: "upload", progress: 0 })];
        this.startProgress();
        break;
      case "terminal":
        this.activities = [activity({ id: "terminal-build", app: "Terminal", process: "npm run build", label: "npm run build", detail: "Processo acompanhado", type: "build", importance: "high" })];
        break;
      case "file_transfer":
        this.activities = [activity({ id: "finder-copy", app: "Finder", label: "Transferindo arquivos", detail: "Operação local", type: "file_transfer", progress: 46 })];
        break;
      case "single":
        this.activities = [activity({ id: "single-sync", app: "OneDrive", label: "Sincronizando", type: "sync" })];
        break;
      case "multiple":
        this.activities = [
          activity({ id: "multi-download", app: "Chrome", label: "Transferindo dados", type: "download", progress: 62, importance: "high" }),
          activity({ id: "multi-terminal", app: "Terminal", process: "cargo build", label: "cargo build", detail: "1m 42s", type: "build" }),
          activity({ id: "multi-sync", app: "OneDrive", label: "Sincronizando", type: "sync" }),
        ];
        break;
      case "error":
        this.activities = [activity({ id: "failed-render", app: "Terminal", process: "ffmpeg", label: "Renderização interrompida", detail: "Processo encerrou com erro", type: "render", status: "failed", importance: "high" })];
        break;
      case "keep_awake":
        this.activities = [activity({ id: "awake-build", app: "Terminal", process: "npm run build", label: "Build em andamento", detail: "Manter acordado simulado", type: "build", importance: "high" })];
        break;
    }

    this.emit();
  }

  completeCurrent() {
    this.stopTimers();
    this.keepAwake = false;
    this.activities = this.activities.map((item) => ({ ...item, status: "completed", progress: item.progress === undefined ? undefined : 100 }));
    this.completionTimer = window.setTimeout(() => {
      this.activities = [];
      this.completionTimer = undefined;
      this.emit();
    }, 1600);
    this.emit();
  }

  private startProgress() {
    this.progressTimer = window.setInterval(() => {
      let finished = false;
      this.activities = this.activities.map((item) => {
        if (item.progress === undefined) return item;
        const progress = Math.min(item.progress + 10, 100);
        finished = progress === 100;
        return { ...item, progress, status: finished ? "completed" : "running" };
      });
      this.emit();
      if (finished) this.completeCurrent();
    }, 800);
  }

  private createSnapshot(): ActivitySnapshot {
    return {
      state: stateFor(this.activities, this.keepAwake),
      activities: this.activities,
      metrics: {
        eventsEmitted: this.eventCount,
        activeTimers: Number(this.progressTimer !== undefined) + Number(this.completionTimer !== undefined),
        pollingIntervalMs: this.progressTimer === undefined ? null : 800,
      },
    };
  }

  private emit() {
    this.eventCount += 1;
    this.snapshot = this.createSnapshot();
    if (import.meta.env.DEV) {
      console.debug("[SafeClose dev] activity event", {
        state: this.snapshot.state,
        activities: this.snapshot.activities.length,
        metrics: this.snapshot.metrics,
      });
    }
    this.listeners.forEach((listener) => listener());
  }

  private stopTimers() {
    if (this.progressTimer !== undefined) window.clearInterval(this.progressTimer);
    if (this.completionTimer !== undefined) window.clearTimeout(this.completionTimer);
    this.progressTimer = undefined;
    this.completionTimer = undefined;
  }

  dispose() {
    this.stopTimers();
    this.listeners.clear();
  }
}
