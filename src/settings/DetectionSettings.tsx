import { useActivitySnapshot } from "../providers/ActivityContext";
import { SettingsPage } from "./GeneralSettings";

export function DetectionSettings() {
  const snapshot = useActivitySnapshot();
  return (
    <SettingsPage eyebrow="DETECTION" title="Fontes e confiança">
      <div className="detection-cards"><article><strong>Processos</strong><span className="detected-dot" /> <b>Ativo</b><p>PID, processo pai, CPU, memória, I/O e tempo de execução via API do sistema.</p></article><article><strong>Downloads</strong><span className={snapshot.metrics.downloadsWatcherActive ? "detected-dot" : "offline-dot"} /> <b>{snapshot.metrics.downloadsWatcherActive ? "Watcher ativo" : "Indisponível"}</b><p>Observa somente Downloads e reconhece extensões temporárias. Não inventa percentual.</p></article><article><strong>Rede por processo</strong><span className="offline-dot" /> <b>Não disponível</b><p>Não é exibida como atividade sem uma fonte confiável ou connector.</p></article></div>
      <div className="metrics-panel"><div><span>Processos</span><strong>{snapshot.metrics.processCount ?? 0}</strong></div><div><span>Intervalo atual</span><strong>{snapshot.metrics.pollingIntervalMs ?? 0} ms</strong></div><div><span>Último scan</span><strong>{snapshot.metrics.lastScanDurationMs ?? 0} ms</strong></div><div><span>Eventos emitidos</span><strong>{snapshot.metrics.eventsEmitted}</strong></div></div>
    </SettingsPage>
  );
}

