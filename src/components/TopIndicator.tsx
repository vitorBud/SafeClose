import type { SafeCloseState } from "../types/activity";

const stateLabels: Record<SafeCloseState, string> = {
  safe: "Tudo tranquilo",
  busy: "Atividades em andamento",
  keep_awake: "Mantendo o Mac acordado",
  error: "Atenção necessária",
};

export function TopIndicator({ state, expanded, onClick }: { state: SafeCloseState; expanded: boolean; onClick: () => void }) {
  return (
    <button className="top-indicator" data-state={state} data-expanded={expanded} onClick={onClick} aria-label={`${stateLabels[state]}. ${expanded ? "Fechar" : "Abrir"} SafeClose`}>
      <span className="line-topbar" aria-hidden="true">
        <span className="line-segment line-segment--left" />
        <span className="line-node" />
        <span className="line-segment line-segment--right" />
      </span>
      <span className="line-hover-label" aria-hidden="true">SAFECLOSE</span>
    </button>
  );
}

export { stateLabels };
