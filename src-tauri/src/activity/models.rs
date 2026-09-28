use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub id: String,
    pub app: String,
    pub process: Option<String>,
    pub label: String,
    pub detail: Option<String>,
    #[serde(rename = "type")]
    pub activity_type: String,
    pub status: String,
    pub progress: Option<u8>,
    pub started_at: u64,
    pub importance: String,
    pub source: String,
    pub confidence: String,
    pub pid: Option<u32>,
    pub cpu_usage: Option<f32>,
    pub memory_bytes: Option<u64>,
    pub elapsed_seconds: Option<u64>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderMetrics {
    pub events_emitted: u64,
    pub active_timers: u8,
    pub polling_interval_ms: Option<u64>,
    pub process_count: usize,
    pub last_scan_duration_ms: u64,
    pub downloads_watcher_active: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivitySnapshot {
    pub state: String,
    pub activities: Vec<Activity>,
    pub metrics: ProviderMetrics,
    pub provider: String,
    pub keep_awake_requested: bool,
    pub keep_awake_active: bool,
}

impl Default for ActivitySnapshot {
    fn default() -> Self {
        Self {
            state: "safe".into(),
            activities: Vec::new(),
            metrics: ProviderMetrics {
                events_emitted: 0,
                active_timers: 0,
                polling_interval_ms: Some(5_000),
                process_count: 0,
                last_scan_duration_ms: 0,
                downloads_watcher_active: false,
            },
            provider: "real".into(),
            keep_awake_requested: false,
            keep_awake_active: false,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub name: String,
    pub app: String,
    pub command: String,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
    pub disk_read_bytes: u64,
    pub disk_written_bytes: u64,
    pub elapsed_seconds: u64,
    pub status: String,
    pub potentially_relevant: bool,
    pub reason: Option<String>,
    pub watched: bool,
}

#[derive(Clone, Debug)]
pub struct WatchedProcess {
    pub name: String,
    pub command: String,
    pub started_at: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppRule {
    pub app: String,
    pub mode: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Preferences {
    pub notifications: bool,
    pub language: String,
    pub app_rules: Vec<AppRule>,
    pub animations: bool,
    pub topbar_width: u16,
    pub topbar_thickness: u16,
    pub transparency: u8,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            notifications: false,
            language: "pt-BR".into(),
            app_rules: vec![
                AppRule {
                    app: "Spotify".into(),
                    mode: "ignore".into(),
                },
                AppRule {
                    app: "Discord".into(),
                    mode: "ignore".into(),
                },
            ],
            animations: true,
            topbar_width: 224,
            topbar_thickness: 3,
            transparency: 100,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerAssertions {
    pub available: bool,
    pub summary: String,
    pub relevant: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatus {
    pub id: String,
    pub name: String,
    pub status: String,
    pub detail: String,
}
