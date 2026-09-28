import { useMemo, useState } from "react";
import { useProcessList } from "../hooks/useProcessList";
import { native, type AppRule, type Preferences } from "../platform/native";
import { SettingsPage } from "./GeneralSettings";

const bytes = (value: number) => value > 1_073_741_824 ? `${(value / 1_073_741_824).toFixed(1)} GB` : `${Math.round(value / 1_048_576)} MB`;
const elapsed = (seconds: number) => seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m` : `${Math.floor(seconds / 60)}m`;

export function AppsSettings({ preferences, save }: { preferences: Preferences; save: (next: Preferences) => Promise<void> }) {
  const processes = useProcessList();
  const [search, setSearch] = useState("");
  const visible = useMemo(() => processes.filter((process) => `${process.app} ${process.name} ${process.command}`.toLowerCase().includes(search.toLowerCase())).slice(0, 80), [processes, search]);

  const setRule = async (app: string, mode: AppRule["mode"]) => {
    const appRules = preferences.appRules.filter((rule) => rule.app !== app);
    if (mode !== "default") appRules.push({ app, mode });
    await save({ ...preferences, appRules });
  };

  return (
    <SettingsPage eyebrow="DETECÇÃO REAL" title="Apps e processos">
      <div className="apps-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar processo, app ou comando…" /><span>{processes.length} exibidos</span></div>
      <div className="process-list">
        {visible.map((process) => {
          const rule = preferences.appRules.find((item) => item.app === process.app)?.mode ?? "default";
          return (
            <article className={process.potentiallyRelevant ? "process-card relevant" : "process-card"} key={process.pid}>
              <div className="process-icon">{process.app.slice(0, 2).toUpperCase()}</div>
              <div className="process-copy"><strong>{process.app} <small>PID {process.pid}</small></strong><span>{process.command || process.name}</span><em>{process.cpuUsage.toFixed(1)}% CPU · {bytes(process.memoryBytes)} · {elapsed(process.elapsedSeconds)}</em>{process.reason && <p>{process.reason}</p>}</div>
              <div className="process-actions">
                <select value={rule} onChange={(event) => void setRule(process.app, event.target.value as AppRule["mode"])}><option value="default">Padrão</option><option value="monitor">Monitorar app</option><option value="ignore">Ignorar</option></select>
                <button className={process.watched ? "watched" : ""} onClick={() => void (process.watched ? native.unwatchProcess(process.pid) : native.watchProcess(process.pid))}>{process.watched ? "Acompanhando" : "Monitorar até terminar"}</button>
              </div>
            </article>
          );
        })}
      </div>
    </SettingsPage>
  );
}
