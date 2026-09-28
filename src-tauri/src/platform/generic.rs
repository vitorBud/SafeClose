use super::PlatformInfo;
use crate::activity::PowerAssertions;
use tauri::AppHandle;

pub fn current() -> PlatformInfo {
    PlatformInfo {
        os: "linux",
        arch: std::env::consts::ARCH,
        top_offset: 0,
    }
}

pub fn configure_main_window(_app: &AppHandle) -> Result<(), String> {
    Ok(())
}

pub fn set_background_mode(_app: &AppHandle) -> Result<(), String> {
    Ok(())
}
pub fn set_settings_mode(_app: &AppHandle) -> Result<(), String> {
    Ok(())
}

pub struct KeepAwakeGuard;
impl KeepAwakeGuard {
    pub fn new() -> Self {
        Self
    }
    pub fn set_enabled(&mut self, enabled: bool) -> Result<(), String> {
        if enabled {
            Err("Keep Awake não está disponível nesta plataforma.".into())
        } else {
            Ok(())
        }
    }
}

pub fn read_power_assertions() -> PowerAssertions {
    PowerAssertions {
        available: false,
        summary: "Power assertions não estão disponíveis nesta plataforma.".into(),
        relevant: Vec::new(),
    }
}
