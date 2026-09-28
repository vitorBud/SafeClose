import type { ActivitySnapshot } from "../types/activity";

const initials = (name: string) => name.slice(0, 2).toUpperCase();

export function HoverPreview({ snapshot, onOpen }: { snapshot: ActivitySnapshot; onOpen: () => void }) {
  const apps = snapshot.activities
    .filter((activity) => activity.status === "running")
    .filter((activity, index, activities) => activities.findIndex((item) => item.app === activity.app) === index)
    .slice(0, 3);

  return (
    <section className="hover-preview" aria-label="Aplicativos ativos" onClick={onOpen}>
      <header>
        <strong>EM ATIVIDADE</strong>
        <span>{apps.length ? `${apps.length} ${apps.length === 1 ? "app" : "apps"}` : "livre"}</span>
      </header>

      <div className="hover-apps">
        {apps.length ? apps.map((activity) => (
          <div className="hover-app" key={activity.id}>
            <span className="hover-app-mark">{initials(activity.app)}</span>
            <div><strong>{activity.app}</strong><small>{activity.label}</small></div>
            <i aria-hidden="true" />
          </div>
        )) : (
          <div className="hover-empty"><span>✓</span><div><strong>Nenhum app importante ativo</strong><small>Seguro para sair.</small></div></div>
        )}
      </div>

      <footer><span>Clique para ver detalhes</span><b>↘</b></footer>
    </section>
  );
}
