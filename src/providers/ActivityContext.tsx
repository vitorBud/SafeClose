import { createContext, useContext, useSyncExternalStore, type PropsWithChildren } from "react";
import type { ActivityProvider } from "./activityProvider";
import { MockActivityProvider } from "./mockActivityProvider";
import { SystemActivityProvider } from "./systemActivityProvider";

interface ProviderBundle {
  provider: ActivityProvider;
  simulator?: MockActivityProvider;
}

const bundle: ProviderBundle = import.meta.env.DEV
  ? (() => {
      const simulator = new MockActivityProvider();
      return { provider: simulator, simulator };
    })()
  : { provider: new SystemActivityProvider() };

const ActivityContext = createContext<ProviderBundle>(bundle);

export function ActivityProviderRoot({ children }: PropsWithChildren) {
  return <ActivityContext.Provider value={bundle}>{children}</ActivityContext.Provider>;
}

export function useActivitySnapshot() {
  const { provider } = useContext(ActivityContext);
  return useSyncExternalStore(provider.subscribe, provider.getSnapshot, provider.getSnapshot);
}

export function useActivityProviderName() {
  return useContext(ActivityContext).provider.name;
}

export function useDevSimulator() {
  return useContext(ActivityContext).simulator;
}

