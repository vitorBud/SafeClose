import type { ActivitySnapshot } from "../types/activity";
import { ActivityRow } from "./ActivityRow";
import { stateLabels } from "./TopIndicator";

export function QuickPanel({ snapshot, onOpen }: { snapshot: ActivitySnapshot; onOpen: () => void }) {
  const visible = snapshot.activities.slice(0, 3);
  const runningCount = snapshot.activities.filter((item) => item.status === "running").length;

  return (
    <section className="quick-panel" onClick={onOpen} aria-label="Resumo do SafeClose">
      <header>
        <div>
          <span className="eyebrow">SAFECLOSE</span>
          <h2>{stateLabels[snapshot.state]}</h2>
        </div>
        <span className="open-hint">Clique para abrir <span>↗</span></span>
      </header>

      <div className="quick-content">
        {visible.length === 0 ? (
          <div className="empty-quick"><span>✓</span><p>Nenhuma atividade importante detectada.</p></div>
        ) : (
          visible.map((item) => <ActivityRow key={item.id} activity={item} compact />)
        )}
      </div>

      <footer>
        {runningCount > 0 ? `${runningCount} ${runningCount === 1 ? "atividade importante" : "atividades importantes"}` : "Seguro para deixar o computador"}
      </footer>
    </section>
  );
}

