import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { native, type Preferences } from "../platform/native";

export const DEFAULT_PREFERENCES: Preferences = {
  notifications: false,
  language: "pt-BR",
  appRules: [
    { app: "Spotify", mode: "ignore" },
    { app: "Discord", mode: "ignore" },
  ],
  animations: true,
  topbarWidth: 224,
  topbarThickness: 3,
  transparency: 100,
};

export function usePreferences() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    void native.preferences().then(setPreferences).catch(() => undefined);
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<Preferences>("preferences-changed", (event) => setPreferences(event.payload)).then((dispose) => {
      if (disposed) dispose();
      else unlisten = dispose;
    });
    return () => { disposed = true; unlisten?.(); };
  }, []);

  const save = useCallback(async (next: Preferences) => {
    setPreferences(next);
    await native.savePreferences(next);
  }, []);

  return { preferences, setPreferences, save };
}
