use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    pub os: &'static str,
    pub arch: &'static str,
    pub top_offset: u16,
}

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::current;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::current;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod generic;
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub use generic::current;

