import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { native, type ProcessInfo } from "../platform/native";

export function useProcessList() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);

  useEffect(() => {
    void native.setUiActive(true);
    void native.processes().then(setProcesses).catch(() => undefined);
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<ProcessInfo[]>("process-list-updated", (event) => setProcesses(event.payload)).then((dispose) => {
      if (disposed) dispose();
      else unlisten = dispose;
    });
    return () => {
      disposed = true;
      unlisten?.();
      void native.setUiActive(false);
    };
  }, []);

  return processes;
}

