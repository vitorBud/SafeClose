import { useActivitySnapshot, useDevSimulator } from "../providers/ActivityContext";
import type { SimulatorScenario } from "../providers/mockActivityProvider";

const scenarios: Array<{ id: SimulatorScenario; label: string; icon: string }> = [
  { id: "safe", label: "Safe", icon: "✓" },
  { id: "download", label: "Chrome download", icon: "↓" },
  { id: "upload", label: "Upload", icon: "↑" },
  { id: "terminal", label: "Terminal", icon: ">_" },
  { id: "file_transfer", label: "Transferência", icon: "⇄" },
  { id: "single", label: "1 atividade", icon: "1" },
  { id: "multiple", label: "Várias atividades", icon: "3" },
  { id: "error", label: "Erro", icon: "!" },
  { id: "keep_awake", label: "Keep awake", icon: "☼" },
];

export function DevSimulator() {
  const simulator = useDevSimulator();
  const snapshot = useActivitySnapshot();
  if (!simulator) return null;

  return (
    <section className="simulator">
      <div className="section-title">
        <div><span className="eyebrow">SOMENTE EM DEVELOPMENT</span><h2>SafeClose Dev Simulator</h2></div>
        <span className="dev-pill">DEV</span>
      </div>
      <p className="section-intro">Troque a fonte simulada sem alterar nenhum componente da interface.</p>

      <div className="scenario-grid">
        {scenarios.map((scenario) => (
          <button key={scenario.id} onClick={() => simulator.simulate(scenario.id)}>
            <span>{scenario.icon}</span>{scenario.label}
          </button>
        ))}
      </div>

      <button className="complete-button" onClick={() => simulator.completeSimulation()} disabled={snapshot.provider !== "mock" || snapshot.activities.length === 0}>
        Marcar atividades como concluídas
      </button>

      <button className="real-data-button" onClick={() => simulator.useRealData()}>
        Voltar para dados reais
      </button>

      <div className="metrics-card">
        <div><span>Estado</span><strong>{snapshot.state}</strong></div>
        <div><span>Eventos</span><strong>{snapshot.metrics.eventsEmitted}</strong></div>
        <div><span>Timers ativos</span><strong>{snapshot.metrics.activeTimers}</strong></div>
        <div><span>Intervalo</span><strong>{snapshot.metrics.pollingIntervalMs ? `${snapshot.metrics.pollingIntervalMs} ms` : "nenhum"}</strong></div>
      </div>
    </section>
  );
}
