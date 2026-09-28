import { createContext, useContext, useSyncExternalStore, type PropsWithChildren } from "react";
import type { ActivityProvider } from "./activityProvider";
import { MockActivityProvider } from "./mockActivityProvider";
import { RealActivityProvider } from "./realActivityProvider";
import { ProviderRouter } from "./providerRouter";

interface ProviderBundle {
  provider: ActivityProvider;
  simulator?: ProviderRouter;
}

const bundle: ProviderBundle = (() => {
  const real = new RealActivityProvider();
  const mock = import.meta.env.DEV ? new MockActivityProvider() : undefined;
  const router = new ProviderRouter(real, mock);
  return { provider: router, simulator: import.meta.env.DEV ? router : undefined };
})();

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
