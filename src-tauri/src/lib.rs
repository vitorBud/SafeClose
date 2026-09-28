mod activity;
mod platform;

use activity::{
    ActivityEngine, ActivitySnapshot, ConnectionStatus, PowerAssertions, Preferences, ProcessInfo,
};
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent};

#[tauri::command]
fn platform_info() -> platform::PlatformInfo {
    platform::current()
}

#[tauri::command]
fn get_activity_snapshot(engine: State<'_, ActivityEngine>) -> ActivitySnapshot {
    engine.snapshot()
}

#[tauri::command]
fn list_processes(engine: State<'_, ActivityEngine>) -> Vec<ProcessInfo> {
    engine.processes()
}

#[tauri::command]
fn watch_process(pid: u32, engine: State<'_, ActivityEngine>) -> Result<(), String> {
    engine.watch_process(pid)
}

#[tauri::command]
fn unwatch_process(pid: u32, engine: State<'_, ActivityEngine>) {
    engine.unwatch_process(pid);
}

#[tauri::command]
fn set_keep_awake(enabled: bool, engine: State<'_, ActivityEngine>) -> Result<(), String> {
    engine.set_keep_awake(enabled)
}

#[tauri::command]
fn set_ui_active(active: bool, engine: State<'_, ActivityEngine>) {
    engine.set_ui_active(active);
}

#[tauri::command]
fn get_preferences(engine: State<'_, ActivityEngine>) -> Preferences {
    engine.preferences()
}

#[tauri::command]
fn save_preferences(
    preferences: Preferences,
    app: tauri::AppHandle,
    engine: State<'_, ActivityEngine>,
) -> Result<(), String> {
    engine.save_preferences(preferences.clone())?;
    use tauri::Emitter;
    let _ = app.emit("preferences-changed", preferences);
    Ok(())
}

#[tauri::command]
fn get_connections(engine: State<'_, ActivityEngine>) -> Vec<ConnectionStatus> {
    engine.connections()
}

#[tauri::command]
fn get_power_assertions() -> PowerAssertions {
    platform::read_power_assertions()
}

#[tauri::command]
fn open_settings(app: tauri::AppHandle) -> Result<(), String> {
    app.state::<ActivityEngine>().set_ui_active(true);
    platform::set_settings_mode(&app)?;
    if let Some(window) = app.get_webview_window("settings") {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(
        &app,
        "settings",
        WebviewUrl::App("index.html?view=settings".into()),
    )
    .title("SafeClose Settings")
    .inner_size(860.0, 680.0)
    .min_inner_size(740.0, 560.0)
    .resizable(true)
    .decorations(true)
    .center()
    .focused(true)
    .build()
    .map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn quit_safeclose(app: tauri::AppHandle, engine: State<'_, ActivityEngine>) {
    engine.shutdown();
    app.exit(0);
}

pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_notification::init());
    #[cfg(target_os = "macos")]
    let builder = builder.plugin(tauri_nspanel::init());

    let app = builder
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ))?;
            platform::set_background_mode(app.handle()).map_err(std::io::Error::other)?;
            platform::configure_main_window(app.handle()).map_err(std::io::Error::other)?;
            app.manage(ActivityEngine::new(app.handle().clone()));
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "settings" && matches!(event, WindowEvent::Destroyed) {
                window.state::<ActivityEngine>().set_ui_active(false);
                let _ = platform::set_background_mode(window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![
            platform_info,
            get_activity_snapshot,
            list_processes,
            watch_process,
            unwatch_process,
            set_keep_awake,
            set_ui_active,
            get_preferences,
            save_preferences,
            get_connections,
            get_power_assertions,
            open_settings,
            quit_safeclose,
        ])
        .build(tauri::generate_context!())
        .expect("error while building SafeClose");

    app.run(|handle, event| {
        if matches!(
            event,
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
        ) {
            if let Some(engine) = handle.try_state::<ActivityEngine>() {
                engine.shutdown();
            }
        }
    });
}
