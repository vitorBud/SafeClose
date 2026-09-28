import { native } from "../platform/native";
import { SettingsPage } from "./GeneralSettings";

export function AboutSettings() {
  return (
    <SettingsPage eyebrow="ABOUT" title="SafeClose 0.2.0">
      <div className="about-card"><div className="about-logo">S</div><strong>Local-first. Sem conta. Sem telemetria.</strong><p>SafeClose observa somente sinais locais necessários para avisar sobre atividades interrompíveis. Nenhum processo, arquivo ou histórico é enviado para servidores.</p></div>
      <div className="about-notes"><p>Detecção real no macOS ARM64.</p><p>Connectors de navegador ainda não estão instalados.</p><p>Fechar esta janela não encerra o monitoramento.</p></div>
      <button className="quit-button" onClick={() => void native.quit()}>Quit SafeClose</button>
    </SettingsPage>
  );
}

