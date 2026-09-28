import { useEffect, useState } from "react";
import { native, type ConnectionStatus } from "../platform/native";
import { SettingsPage } from "./GeneralSettings";

export function ConnectionsSettings() {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const load = () => void native.connections().then(setConnections);
  useEffect(load, []);
  return (
    <SettingsPage eyebrow="CONNECTIONS" title="Integrações">
      <p className="page-intro">Detectado significa apenas que o aplicativo está rodando. Nenhum connector está conectado nesta versão.</p>
      <div className="connection-grid">{connections.map((connection) => <article key={connection.id}><div className="connection-mark">{connection.name.slice(0, 2).toUpperCase()}</div><div><strong>{connection.name}</strong><p>{connection.detail}</p></div><span className={`connection-status ${connection.status}`}>{connection.status.replace("_", " ")}</span></article>)}</div>
      <button className="secondary-button" onClick={load}>Atualizar detecção</button>
    </SettingsPage>
  );
}

