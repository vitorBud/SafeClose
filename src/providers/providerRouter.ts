import type { ActivityProvider, ActivityListener } from "./activityProvider";
import type { MockActivityProvider, SimulatorScenario } from "./mockActivityProvider";

export class ProviderRouter implements ActivityProvider {
  private active: ActivityProvider;
  private listeners = new Set<ActivityListener>();
  private unsubscribeActive: () => void;

  constructor(private real: ActivityProvider, private mock?: MockActivityProvider) {
    this.active = real;
    this.unsubscribeActive = this.active.subscribe(this.emit);
  }

  get name() {
    return this.active.name;
  }

  getSnapshot = () => this.active.getSnapshot();

  subscribe = (listener: ActivityListener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  simulate(scenario: SimulatorScenario) {
    if (!this.mock) return;
    this.mock.setScenario(scenario);
    this.switchTo(this.mock);
  }

  completeSimulation() {
    this.mock?.completeCurrent();
  }

  useRealData() {
    this.switchTo(this.real);
  }

  private switchTo(next: ActivityProvider) {
    if (this.active === next) {
      this.emit();
      return;
    }
    this.unsubscribeActive();
    this.active = next;
    this.unsubscribeActive = this.active.subscribe(this.emit);
    this.emit();
  }

  private emit = () => this.listeners.forEach((listener) => listener());

  dispose() {
    this.unsubscribeActive();
    this.real.dispose();
    this.mock?.dispose();
    this.listeners.clear();
  }
}

