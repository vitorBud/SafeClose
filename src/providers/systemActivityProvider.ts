import { EMPTY_SNAPSHOT, type ActivityListener, type ActivityProvider } from "./activityProvider";

/**
 * Milestone 1 production provider. Real OS detection starts in Milestone 2.
 * Keeping this provider inert guarantees that the visual prototype does not
 * claim to know about activity it cannot yet verify.
 */
export class SystemActivityProvider implements ActivityProvider {
  readonly name = "system";

  getSnapshot() {
    return EMPTY_SNAPSHOT;
  }

  subscribe(_listener: ActivityListener) {
    return () => undefined;
  }

  dispose() {
    // No listeners or polling are active in Milestone 1.
  }
}

