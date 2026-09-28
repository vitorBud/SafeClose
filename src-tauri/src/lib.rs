mod platform;

#[tauri::command]
fn platform_info() -> platform::PlatformInfo {
    platform::current()
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![platform_info])
        .run(tauri::generate_context!())
        .expect("error while running SafeClose");
}

