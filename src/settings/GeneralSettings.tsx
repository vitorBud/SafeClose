import { useEffect, useState } from "react";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import type { Preferences } from "../platform/native";

export function GeneralSettings({ preferences, save }: { preferences: Preferences; save: (next: Preferences) => Promise<void> }) {
  const [autostart, setAutostart] = useState(false);
  const [status, setStatus] = useState<string>();

  useEffect(() => { void isEnabled().then(setAutostart).catch((error) => setStatus(String(error))); }, []);

  const toggleAutostart = async () => {
    try {
      if (autostart) await disable();
      else await enable();
      setAutostart(!autostart);
      setStatus(undefined);
    } catch (error) { setStatus(String(error)); }
  };

  const toggleNotifications = async () => {
    let enabled = !preferences.notifications;
    if (enabled && !(await isPermissionGranted())) {
      enabled = (await requestPermission()) === "granted";
    }
    await save({ ...preferences, notifications: enabled });
  };

  return (
    <SettingsPage eyebrow="GERAL" title="Comportamento">
      <SettingRow title="Iniciar SafeClose com o sistema" description="Abre silenciosamente após o login do usuário.">
        <Switch checked={autostart} onChange={toggleAutostart} />
      </SettingRow>
      <SettingRow title="Notificações" description="Avisa somente quando processos acompanhados terminam.">
        <Switch checked={preferences.notifications} onChange={toggleNotifications} />
      </SettingRow>
      <SettingRow title="Idioma" description="Idioma utilizado pela interface.">
        <select value={preferences.language} onChange={(event) => void save({ ...preferences, language: event.target.value })}>
          <option value="pt-BR">Português (Brasil)</option><option value="en">English (parcial)</option>
        </select>
      </SettingRow>
      {status && <p className="settings-error">{status}</p>}
    </SettingsPage>
  );
}

export function SettingsPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="settings-page"><span className="settings-eyebrow">{eyebrow}</span><h1>{title}</h1><div className="settings-stack">{children}</div></section>;
}

export function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="setting-row"><div><strong>{title}</strong><p>{description}</p></div><div className="setting-control">{children}</div></div>;
}

export function Switch({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return <button className={`switch ${checked ? "on" : ""}`} onClick={onChange} disabled={disabled} role="switch" aria-checked={checked}><span /></button>;
}

