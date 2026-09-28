use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    pub os: &'static str,
    pub arch: &'static str,
    pub top_offset: i16,
}

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::{
    configure_main_window, current, read_power_assertions, set_background_mode, set_settings_mode,
    KeepAwakeGuard,
};

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::{
    configure_main_window, current, read_power_assertions, set_background_mode, set_settings_mode,
    KeepAwakeGuard,
};

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod generic;
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub use generic::{
    configure_main_window, current, read_power_assertions, set_background_mode, set_settings_mode,
    KeepAwakeGuard,
};
