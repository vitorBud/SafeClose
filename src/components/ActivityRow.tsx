import type { Activity } from "../types/activity";

const initials = (name: string) => name.slice(0, 2).toUpperCase();
const duration = (seconds?: number) => {
  if (seconds === undefined) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}:${String(remaining).padStart(2, "0")}`;
};

export function ActivityRow({ activity, compact = false }: { activity: Activity; compact?: boolean }) {
  return (
    <article className={`activity-row${compact ? " activity-row--compact" : ""}`}>
      <div className="app-mark" aria-hidden="true">{initials(activity.app)}</div>
      <div className="activity-copy">
        <div className="activity-heading">
          <strong>{activity.app}</strong>
          {activity.status === "failed" && <span className="error-label">Falhou</span>}
          {activity.status === "completed" && <span className="done-label">Concluída</span>}
        </div>
        <span>{activity.label}</span>
        {!compact && activity.detail && <small>{activity.detail}</small>}
        {!compact && activity.elapsedSeconds !== undefined && <small>Em execução há {duration(activity.elapsedSeconds)}</small>}
        {activity.progress !== undefined && (
          <div className="progress-wrap" aria-label={`${activity.progress}% concluído`}>
            <div className="progress-track"><span style={{ width: `${activity.progress}%` }} /></div>
            <small>{activity.progress}%</small>
          </div>
        )}
      </div>
      {activity.status === "running" && activity.progress === undefined && <span className="live-dot" aria-label="Em andamento" />}
    </article>
  );
}
