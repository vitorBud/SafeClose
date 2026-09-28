export type ActivityType =
  | "download"
  | "upload"
  | "network"
  | "file_transfer"
  | "terminal"
  | "build"
  | "render"
  | "sync"
  | "unknown";

export type ActivityStatus = "running" | "completed" | "failed";
export type SafeCloseState = "safe" | "busy" | "keep_awake" | "error";
export type ActivitySource = "system" | "connection" | "manual" | "mock";

export interface Activity {
  id: string;
  app: string;
  process?: string;
  label: string;
  detail?: string;
  type: ActivityType;
  status: ActivityStatus;
  progress?: number;
  startedAt: number;
  importance: "normal" | "high";
  source: ActivitySource;
  confidence?: "low" | "medium" | "high";
  pid?: number;
  cpuUsage?: number;
  memoryBytes?: number;
  elapsedSeconds?: number;
}

export interface ProviderMetrics {
  eventsEmitted: number;
  activeTimers: number;
  pollingIntervalMs: number | null;
  processCount?: number;
  lastScanDurationMs?: number;
  downloadsWatcherActive?: boolean;
}

export interface ActivitySnapshot {
  state: SafeCloseState;
  activities: Activity[];
  metrics: ProviderMetrics;
  provider: "real" | "mock";
  keepAwakeRequested: boolean;
  keepAwakeActive: boolean;
}
