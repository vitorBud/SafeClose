use super::PlatformInfo;
use crate::activity::PowerAssertions;
use objc2_app_kit::NSWindowCollectionBehavior;
use std::process::{Child, Command, Stdio};
use tauri::{ActivationPolicy, AppHandle, Manager};
use tauri_nspanel::{tauri_panel, PanelLevel, WebviewWindowExt};

tauri_panel! {
    panel!(SafeClosePanel {
        config: {
            can_become_key_window: true,
            can_become_main_window: false,
            become_key_if_only_needed: true,
            is_floating_panel: true
        }
    })
}

pub fn current() -> PlatformInfo {
    PlatformInfo {
        os: "macos",
        arch: std::env::consts::ARCH,
        // Kept in the platform adapter because menu bar/notch geometry is OS-specific.
        // The main window is promoted to the native status-window level below, so y=0
        // anchors it to the physical top edge instead of below the menu bar.
        top_offset: 0,
    }
}

pub fn configure_main_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Janela principal não encontrada.".to_string())?;
    let panel = window
        .to_panel::<SafeClosePanel>()
        .map_err(|error| error.to_string())?;

    // A native NSPanel is required for an accessory window to remain visible in
    // another application's full-screen Space. The status level keeps the compact
    // control aligned with the menu bar without making SafeClose the active app.
    panel.set_level(PanelLevel::Status.value());
    panel.set_collection_behavior(
        NSWindowCollectionBehavior::CanJoinAllSpaces
            | NSWindowCollectionBehavior::CanJoinAllApplications
            | NSWindowCollectionBehavior::FullScreenAuxiliary,
    );
    panel.set_hides_on_deactivate(false);
    panel.set_accepts_mouse_moved_events(true);
    panel.show();
    panel.order_front_regardless();
    Ok(())
}

pub fn set_background_mode(app: &AppHandle) -> Result<(), String> {
    app.set_activation_policy(ActivationPolicy::Accessory)
        .map_err(|error| error.to_string())?;
    app.set_dock_visibility(false)
        .map_err(|error| error.to_string())
}

pub fn set_settings_mode(app: &AppHandle) -> Result<(), String> {
    app.set_activation_policy(ActivationPolicy::Regular)
        .map_err(|error| error.to_string())?;
    app.set_dock_visibility(true)
        .map_err(|error| error.to_string())
}

pub struct KeepAwakeGuard {
    child: Option<Child>,
}

impl KeepAwakeGuard {
    pub fn new() -> Self {
        Self { child: None }
    }

    pub fn set_enabled(&mut self, enabled: bool) -> Result<(), String> {
        let running = self
            .child
            .as_mut()
            .and_then(|child| child.try_wait().ok())
            .flatten()
            .is_none()
            && self.child.is_some();
        if enabled && !running {
            let child = Command::new("/usr/bin/caffeinate")
                .args(["-i", "-w", &std::process::id().to_string()])
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|error| error.to_string())?;
            self.child = Some(child);
        } else if !enabled {
            self.stop();
        }
        Ok(())
    }

    fn stop(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

impl Drop for KeepAwakeGuard {
    fn drop(&mut self) {
        self.stop();
    }
}

pub fn read_power_assertions() -> PowerAssertions {
    let output = Command::new("/usr/bin/pmset")
        .args(["-g", "assertions"])
        .output();
    let Ok(output) = output else {
        return PowerAssertions {
            available: false,
            summary: "Não foi possível consultar pmset.".into(),
            relevant: Vec::new(),
        };
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let relevant = text
        .lines()
        .filter(|line| {
            let line = line.trim();
            (line.contains("PreventUserIdleSystemSleep") || line.contains("PreventSystemSleep"))
                && !line.ends_with('0')
        })
        .map(|line| line.trim().to_string())
        .collect::<Vec<_>>();
    PowerAssertions {
        available: output.status.success(),
        summary: if relevant.is_empty() {
            "Nenhuma assertion relevante ativa.".into()
        } else {
            format!("{} assertion(s) relevante(s) ativa(s).", relevant.len())
        },
        relevant,
    }
}

#[cfg(test)]
mod tests {
    use super::KeepAwakeGuard;

    #[test]
    fn keep_awake_guard_starts_and_cleans_up_caffeinate() {
        let mut guard = KeepAwakeGuard::new();
        guard.set_enabled(true).expect("caffeinate should start");
        assert!(guard.child.is_some());
        guard.set_enabled(false).expect("caffeinate should stop");
        assert!(guard.child.is_none());
    }
}
