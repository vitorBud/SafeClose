import type { ActivitySnapshot } from "../types/activity";

export type ActivityListener = () => void;

export interface ActivityProvider {
  readonly name: string;
  getSnapshot(): ActivitySnapshot;
  subscribe(listener: ActivityListener): () => void;
  dispose(): void;
}

export const EMPTY_SNAPSHOT: ActivitySnapshot = {
  state: "safe",
  activities: [],
  metrics: {
    eventsEmitted: 0,
    activeTimers: 0,
    pollingIntervalMs: null,
  },
  provider: "real",
  keepAwakeRequested: false,
  keepAwakeActive: false,
};
