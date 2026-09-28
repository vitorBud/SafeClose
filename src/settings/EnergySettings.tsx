import { useEffect, useState } from "react";
import { native, type PowerAssertions } from "../platform/native";
import { useActivitySnapshot } from "../providers/ActivityContext";
import { SettingRow, SettingsPage, Switch } from "./GeneralSettings";

export function EnergySettings() {
  const snapshot = useActivitySnapshot();
  const [assertions, setAssertions] = useState<PowerAssertions>();
  const load = () => void native.powerAssertions().then(setAssertions);
  useEffect(load, []);
  return (
    <SettingsPage eyebrow="ENERGY" title="Keep Awake">
      <SettingRow title="Manter acordado até terminar" description="Impede somente a suspensão automática. Fechar a tampa ainda pode suspender o Mac."><Switch checked={snapshot.keepAwakeRequested} disabled={!snapshot.activities.length && !snapshot.keepAwakeRequested} onChange={() => void native.setKeepAwake(!snapshot.keepAwakeRequested)} /></SettingRow>
      <div className="power-report"><div><span className={snapshot.keepAwakeActive ? "detected-dot" : "offline-dot"} /><strong>{snapshot.keepAwakeActive ? "Assertion do SafeClose ativa" : "SafeClose não está bloqueando sleep"}</strong></div><p>{assertions?.summary ?? "Consultando o macOS…"}</p>{assertions?.relevant.map((line) => <code key={line}>{line}</code>)}</div>
      <button className="secondary-button" onClick={load}>Atualizar power assertions</button>
    </SettingsPage>
  );
}

