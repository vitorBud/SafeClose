import { useState } from "react";
import { usePreferences } from "../hooks/usePreferences";
import { AboutSettings } from "./AboutSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { AppsSettings } from "./AppsSettings";
import { ConnectionsSettings } from "./ConnectionsSettings";
import { DetectionSettings } from "./DetectionSettings";
import { EnergySettings } from "./EnergySettings";
import { GeneralSettings } from "./GeneralSettings";

type Page = "general" | "apps" | "connections" | "appearance" | "detection" | "energy" | "about";
const pages: Array<{ id: Page; label: string; icon: string }> = [
  { id: "general", label: "Geral", icon: "●" }, { id: "apps", label: "Apps", icon: "▦" }, { id: "connections", label: "Connections", icon: "⌁" }, { id: "appearance", label: "Appearance", icon: "◇" }, { id: "detection", label: "Detection", icon: "◎" }, { id: "energy", label: "Energy", icon: "ϟ" }, { id: "about", label: "About", icon: "i" },
];

export function SettingsApp() {
  const [page, setPage] = useState<Page>("general");
  const { preferences, setPreferences, save } = usePreferences();
  return (
    <div className="settings-app">
      <aside><div className="settings-brand"><span>S</span><div><strong>SafeClose</strong><small>Settings</small></div></div><nav>{pages.map((item) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav><div className="background-note"><span /><p>Monitoring active<br/><small>Closing Settings is safe.</small></p></div></aside>
      <main>{page === "general" && <GeneralSettings preferences={preferences} save={save} />}{page === "apps" && <AppsSettings preferences={preferences} save={save} />}{page === "connections" && <ConnectionsSettings />}{page === "appearance" && <AppearanceSettings preferences={preferences} setLocal={setPreferences} save={save} />}{page === "detection" && <DetectionSettings />}{page === "energy" && <EnergySettings />}{page === "about" && <AboutSettings />}</main>
    </div>
  );
}

