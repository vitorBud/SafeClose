import type { Preferences } from "../platform/native";
import { SettingRow, SettingsPage, Switch } from "./GeneralSettings";

export function AppearanceSettings({ preferences, setLocal, save }: { preferences: Preferences; setLocal: (next: Preferences) => void; save: (next: Preferences) => Promise<void> }) {
  return (
    <SettingsPage eyebrow="APPEARANCE" title="Topbar">
      <SettingRow title="Tema" description="Identidade de alto contraste do SafeClose."><span className="value-pill">Dark</span></SettingRow>
      <SettingRow title="Accent" description="Indicadores, progresso e ações importantes."><span className="red-swatch" /> <span className="value-pill">Red</span></SettingRow>
      <SettingRow title="Largura recolhida" description={`${preferences.topbarWidth}px — expansão compacta permanece legível.`}><input type="range" min="190" max="320" value={preferences.topbarWidth} onChange={(event) => setLocal({ ...preferences, topbarWidth: Number(event.target.value) })} onPointerUp={() => void save(preferences)} onBlur={() => void save(preferences)} /></SettingRow>
      <SettingRow title="Espessura da linha" description={`${preferences.topbarThickness}px`}><input type="range" min="2" max="6" value={preferences.topbarThickness} onChange={(event) => setLocal({ ...preferences, topbarThickness: Number(event.target.value) })} onPointerUp={() => void save(preferences)} onBlur={() => void save(preferences)} /></SettingRow>
      <SettingRow title="Animações" description="Transição curta de abertura; nenhuma animação permanente."><Switch checked={preferences.animations} onChange={() => void save({ ...preferences, animations: !preferences.animations })} /></SettingRow>
      <SettingRow title="Opacidade" description={`${preferences.transparency}%`}><input type="range" min="82" max="100" value={preferences.transparency} onChange={(event) => setLocal({ ...preferences, transparency: Number(event.target.value) })} onPointerUp={() => void save(preferences)} onBlur={() => void save(preferences)} /></SettingRow>
    </SettingsPage>
  );
}
