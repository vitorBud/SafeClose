import { useState } from "react";
import { useActivityProviderName, useActivitySnapshot } from "../providers/ActivityContext";
import type { SafeCloseState } from "../types/activity";
import { ActivityRow } from "./ActivityRow";
import { DevSimulator } from "./DevSimulator";

type Section = "overview" | "apps" | "connections" | "appearance" | "detection" | "energy" | "about" | "simulator";

const nav: Array<{ id: Section; label: string; icon: string }> = [
  { id: "overview", label: "Visão geral", icon: "◉" },
  { id: "apps", label: "Apps", icon: "▦" },
  { id: "connections", label: "Conexões", icon: "⌁" },
  { id: "appearance", label: "Aparência", icon: "◇" },
  { id: "detection", label: "Detecção", icon: "◎" },
  { id: "energy", label: "Energia", icon: "ϟ" },
  { id: "about", label: "Sobre", icon: "i" },
];

const copy: Record<SafeCloseState, { title: string; description: string }> = {
  safe: { title: "Tudo tranquilo por aqui.", description: "Nenhuma atividade importante está sendo informada agora." },
  busy: { title: "Ainda existem atividades acontecendo.", description: "Talvez seja melhor aguardar antes de sair ou desligar o computador." },
  keep_awake: { title: "O modo manter acordado está ativo.", description: "Esta é uma simulação visual; o controle de energia chega no Milestone 3." },
  error: { title: "Uma atividade precisa de atenção.", description: "Confira o item abaixo antes de deixar o computador." },
};

export function MainPanel({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<Section>("overview");
  const [leaving, setLeaving] = useState(false);
  const snapshot = useActivitySnapshot();
  const providerName = useActivityProviderName();
  const currentCopy = copy[snapshot.state];

  return (
    <section className="main-panel" onClick={(event) => event.stopPropagation()}>
      <header className="app-header" data-tauri-drag-region>
        <div className="brand"><span className="brand-mark">S</span><div><strong>SafeClose</strong><small>Seu computador pode esperar.</small></div></div>
        <button className="close-button" onClick={onClose} aria-label="Recolher SafeClose">×</button>
      </header>

      <div className="panel-layout">
        <nav className="side-nav" aria-label="Navegação principal">
          {nav.map((item) => (
            <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
          {import.meta.env.DEV && (
            <button className={section === "simulator" ? "active dev-nav" : "dev-nav"} onClick={() => setSection("simulator")}>
              <span>⌘</span>Simulador <em>DEV</em>
            </button>
          )}
          <div className="provider-badge"><span className="live-dot" /> Provider: {providerName}</div>
        </nav>

        <main className="panel-content">
          {section === "overview" && (
            <div className="overview">
              <div className="status-card" data-state={snapshot.state}>
                <div className="status-symbol">{snapshot.state === "safe" ? "✓" : snapshot.state === "error" ? "!" : "•"}</div>
                <div><span className="eyebrow">ESTADO ATUAL</span><h1>{currentCopy.title}</h1><p>{currentCopy.description}</p></div>
              </div>

              <div className="section-title"><div><span className="eyebrow">AGORA</span><h2>Atividades relevantes</h2></div><span className="count-pill">{snapshot.activities.length}</span></div>
              <div className="activities-list">
                {snapshot.activities.length ? snapshot.activities.map((item) => <ActivityRow key={item.id} activity={item} />) : (
                  <div className="empty-state"><span>Quieto</span><p>O SafeClose não recebeu nenhuma atividade relevante.</p></div>
                )}
              </div>

              <div className="leaving-card">
                <div><strong>{leaving ? (snapshot.state === "safe" ? "Pode ir tranquilo." : "Ainda vale a pena esperar.") : "Está pensando em sair?"}</strong><p>{leaving ? "Esta avaliação usa somente os dados disponíveis acima." : "Faça uma verificação rápida antes de deixar o computador."}</p></div>
                <button onClick={() => setLeaving(true)}>Estou indo embora <span>→</span></button>
              </div>

              <label className="future-toggle" title="Será implementado no Milestone 3">
                <span><strong>Manter acordado até terminar</strong><small>Controle nativo de energia no Milestone 3</small></span>
                <span className="coming-soon">Em breve</span><input type="checkbox" disabled />
              </label>
            </div>
          )}

          {section === "simulator" && <DevSimulator />}

          {section !== "overview" && section !== "simulator" && (
            <div className="placeholder-page">
              <span className="placeholder-icon">{nav.find((item) => item.id === section)?.icon}</span>
              <span className="eyebrow">ESTRUTURA INICIAL</span>
              <h1>{nav.find((item) => item.id === section)?.label}</h1>
              <p>Esta área já faz parte da navegação, mas será implementada nos próximos milestones após a validação visual.</p>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

