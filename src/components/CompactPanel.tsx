import { useState } from "react";
import { native } from "../platform/native";
import type { ActivitySnapshot } from "../types/activity";
import { ActivityRow } from "./ActivityRow";

interface CompactPanelProps {
  snapshot: ActivitySnapshot;
  onCollapse: () => void;
  onSimulator: () => void;
}

export function CompactPanel({ snapshot, onCollapse, onSimulator }: CompactPanelProps) {
  const [leaving, setLeaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const running = snapshot.activities.filter((activity) => activity.status === "running");

  const toggleKeepAwake = async () => {
    try {
      await native.setKeepAwake(!snapshot.keepAwakeRequested);
      setMessage(undefined);
    } catch (error) {
      setMessage(String(error));
    }
  };

  const visibleActivities = 4;
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <section className="compact-panel" aria-label="SafeClose">
      <header>
        <div className="panel-title"><strong>SAFECLOSE</strong><small>visão completa</small></div>
        <div className="panel-status">
          <span className={`status-word status-word--${snapshot.state}`}>{snapshot.state.replace("_", " ")}</span>
          <button className="panel-toggle" onClick={(event) => { stop(event); onCollapse(); }} aria-label="Recolher SafeClose">⌃</button>
        </div>
      </header>

      {leaving && (
        <div className={`leaving-summary ${running.length ? "is-busy" : "is-safe"}`}>
          <strong>{running.length ? "ANTES DE IR" : "TUDO CERTO"}</strong>
          <span>{running.length ? `${running.length} atividade(s) ainda em execução.` : "Nenhuma atividade importante detectada."}</span>
          <small>{running.length ? "Considere aguardar ou manter o Mac acordado." : "Seguro para deixar o computador."}</small>
        </div>
      )}

      <div className="compact-activities">
        {snapshot.activities.length === 0 ? (
          <div className="compact-safe"><span>✓</span><div><strong>No important activity</strong><small>Safe to leave.</small></div></div>
        ) : snapshot.activities.slice(0, visibleActivities).map((activity) => <ActivityRow key={activity.id} activity={activity} compact />)}
      </div>

      {snapshot.activities.length > visibleActivities && <p className="more-activities">+{snapshot.activities.length - visibleActivities} outras atividades</p>}
      {message && <p className="inline-error">{message}</p>}

      <div className="panel-expanded-content">
        <div className="compact-actions">
          <button className={snapshot.keepAwakeActive ? "keep-awake active" : "keep-awake"} onClick={(event) => { stop(event); void toggleKeepAwake(); }} disabled={!running.length && !snapshot.keepAwakeRequested}>
            <span>ϟ</span>{snapshot.keepAwakeActive ? "Keep Awake ativo" : "Keep Awake"}
          </button>
          <button onClick={(event) => { stop(event); setLeaving((value) => !value); }}>Estou indo embora</button>
        </div>
      </div>

      <footer>
        <span>{running.length ? `${running.length} running` : "Idle"} · {snapshot.provider}</span>
        <div>
          {import.meta.env.DEV && <button onClick={(event) => { stop(event); onSimulator(); }} aria-label="Abrir simulador">DEV</button>}
          <button className="settings-button" onClick={(event) => { stop(event); void native.openSettings(); }} aria-label="Abrir configurações">⚙</button>
        </div>
      </footer>
    </section>
  );
}
