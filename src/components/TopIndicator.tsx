import type { SafeCloseState } from "../types/activity";

const stateLabels: Record<SafeCloseState, string> = {
  safe: "Tudo tranquilo",
  busy: "Atividades em andamento",
  keep_awake: "Mantendo o Mac acordado",
  error: "Atenção necessária",
};

export function TopIndicator({ state, onClick }: { state: SafeCloseState; onClick: () => void }) {
  return (
    <button className="top-indicator" data-state={state} onClick={onClick} aria-label={`${stateLabels[state]}. Abrir SafeClose`}>
      <span className="indicator-glow" />
      <span className="indicator-line" />
    </button>
  );
}

export { stateLabels };

