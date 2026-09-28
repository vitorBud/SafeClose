use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{self, Sender},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use notify::RecommendedWatcher;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::platform::KeepAwakeGuard;

use super::{
    classifier::{classify, Classification},
    downloads::{self, DownloadSignals},
    models::{
        Activity, ActivitySnapshot, ConnectionStatus, Preferences, ProcessInfo, ProviderMetrics,
        WatchedProcess,
    },
    preferences,
};

pub struct ActivityEngine {
    snapshot: Arc<Mutex<ActivitySnapshot>>,
    processes: Arc<Mutex<Vec<ProcessInfo>>>,
    watched: Arc<Mutex<HashMap<u32, WatchedProcess>>>,
    preferences: Arc<Mutex<Preferences>>,
    preferences_path: PathBuf,
    keep_awake_requested: Arc<AtomicBool>,
    ui_active: Arc<AtomicBool>,
    shutdown: Arc<AtomicBool>,
    wake: Sender<()>,
    power: Arc<Mutex<KeepAwakeGuard>>,
    watcher: Mutex<Option<RecommendedWatcher>>,
    thread: Mutex<Option<thread::JoinHandle<()>>>,
}

impl ActivityEngine {
    pub fn new(app: AppHandle) -> Self {
        let snapshot = Arc::new(Mutex::new(ActivitySnapshot::default()));
        let processes = Arc::new(Mutex::new(Vec::new()));
        let watched = Arc::new(Mutex::new(HashMap::new()));
        let keep_awake_requested = Arc::new(AtomicBool::new(false));
        let ui_active = Arc::new(AtomicBool::new(false));
        let shutdown = Arc::new(AtomicBool::new(false));
        let power = Arc::new(Mutex::new(KeepAwakeGuard::new()));
        let signals: DownloadSignals = Arc::new(Mutex::new(HashMap::new()));
        let preferences_path = app
            .path()
            .app_config_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("preferences.json");
        let stored_preferences = preferences::load(&preferences_path);
        let preferences = Arc::new(Mutex::new(stored_preferences));
        let (wake, receiver) = mpsc::channel();

        let downloads_dir = app.path().download_dir().ok();
        let watcher = downloads_dir
            .as_deref()
            .and_then(|path| downloads::start(path, signals.clone(), wake.clone()).ok());
        let watcher_active = watcher.is_some();

        let thread_snapshot = snapshot.clone();
        let thread_processes = processes.clone();
        let thread_watched = watched.clone();
        let thread_preferences = preferences.clone();
        let thread_keep_requested = keep_awake_requested.clone();
        let thread_ui_active = ui_active.clone();
        let thread_shutdown = shutdown.clone();
        let thread_power = power.clone();
        let thread_signals = signals.clone();

        let monitor = thread::Builder::new()
            .name("safeclose-activity-engine".into())
            .spawn(move || {
                let mut system = System::new();
                let mut event_count = 0_u64;
                let mut last_signature = String::new();
                let mut previous_keep_active = false;
                let refresh_kind = ProcessRefreshKind::nothing()
                    .with_memory()
                    .with_cpu()
                    .with_disk_usage()
                    .with_cmd(UpdateKind::OnlyIfNotSet)
                    .with_exe(UpdateKind::OnlyIfNotSet)
                    .without_tasks();

                while !thread_shutdown.load(Ordering::Relaxed) {
                    let started = Instant::now();
                    system.refresh_processes_specifics(ProcessesToUpdate::All, true, refresh_kind);
                    let watched_snapshot = thread_watched.lock().map(|items| items.clone()).unwrap_or_default();
                    let prefs = thread_preferences.lock().map(|value| value.clone()).unwrap_or_default();
                    let mut completed = Vec::new();
                    let process_rows = collect_processes(&system, &watched_snapshot);
                    let mut activities = collect_activities(&system, &watched_snapshot, &prefs, &thread_signals);

                    if let Ok(mut items) = thread_watched.lock() {
                        items.retain(|pid, item| {
                            let running = system.process(sysinfo::Pid::from_u32(*pid)).is_some();
                            if !running {
                                completed.push(item.name.clone());
                            }
                            running
                        });
                    }

                    activities.sort_by(|a, b| b.importance.cmp(&a.importance).then_with(|| a.started_at.cmp(&b.started_at)));
                    let has_activities = !activities.is_empty();
                    if !has_activities {
                        thread_keep_requested.store(false, Ordering::Relaxed);
                    }
                    let requested = thread_keep_requested.load(Ordering::Relaxed);
                    let keep_active = requested && has_activities;
                    if let Ok(mut guard) = thread_power.lock() {
                        let _ = guard.set_enabled(keep_active);
                    }

                    let interval = if thread_ui_active.load(Ordering::Relaxed) || has_activities {
                        1_500
                    } else {
                        5_000
                    };
                    let state = if keep_active { "keep_awake" } else if has_activities { "busy" } else { "safe" };
                    let signature = semantic_signature(state, &activities, requested, keep_active);
                    let changed = signature != last_signature;
                    if changed {
                        event_count += 1;
                        last_signature = signature;
                    }
                    let next_snapshot = ActivitySnapshot {
                        state: state.into(),
                        activities,
                        metrics: ProviderMetrics {
                            events_emitted: event_count,
                            active_timers: 0,
                            polling_interval_ms: Some(interval),
                            process_count: system.processes().len(),
                            last_scan_duration_ms: started.elapsed().as_millis() as u64,
                            downloads_watcher_active: watcher_active,
                        },
                        provider: "real".into(),
                        keep_awake_requested: requested,
                        keep_awake_active: keep_active,
                    };

                    if let Ok(mut current) = thread_snapshot.lock() {
                        *current = next_snapshot.clone();
                    }
                    if let Ok(mut current) = thread_processes.lock() {
                        *current = process_rows.clone();
                    }

                    if changed {
                        #[cfg(debug_assertions)]
                        eprintln!(
                            "[SafeClose dev] state={} activities={} processes={} scan={}ms interval={}ms",
                            next_snapshot.state,
                            next_snapshot.activities.len(),
                            next_snapshot.metrics.process_count,
                            next_snapshot.metrics.last_scan_duration_ms,
                            interval,
                        );
                        let _ = app.emit("activity-snapshot", &next_snapshot);
                    }
                    if thread_ui_active.load(Ordering::Relaxed) {
                        let _ = app.emit("process-list-updated", &process_rows);
                    }
                    if prefs.notifications && previous_keep_active && !keep_active && !has_activities {
                        let _ = app.notification().builder().title("SafeClose").body("Todas as atividades terminaram.").show();
                    } else if prefs.notifications && !completed.is_empty() {
                        let body = if completed.len() == 1 { format!("{} terminou.", completed[0]) } else { format!("{} processos acompanhados terminaram.", completed.len()) };
                        let _ = app.notification().builder().title("SafeClose").body(body).show();
                    }
                    previous_keep_active = keep_active;

                    let _ = receiver.recv_timeout(Duration::from_millis(interval));
                }

                if let Ok(mut guard) = thread_power.lock() {
                    let _ = guard.set_enabled(false);
                }
            })
            .expect("failed to start SafeClose activity engine");

        Self {
            snapshot,
            processes,
            watched,
            preferences,
            preferences_path,
            keep_awake_requested,
            ui_active,
            shutdown,
            wake,
            power,
            watcher: Mutex::new(watcher),
            thread: Mutex::new(Some(monitor)),
        }
    }

    pub fn snapshot(&self) -> ActivitySnapshot {
        self.snapshot
            .lock()
            .map(|value| value.clone())
            .unwrap_or_default()
    }

    pub fn processes(&self) -> Vec<ProcessInfo> {
        self.processes
            .lock()
            .map(|value| value.clone())
            .unwrap_or_default()
    }

    pub fn watch_process(&self, pid: u32) -> Result<(), String> {
        let process = self
            .processes()
            .into_iter()
            .find(|process| process.pid == pid)
            .ok_or_else(|| "O processo não existe mais.".to_string())?;
        let item = WatchedProcess {
            name: process.name,
            command: process.command,
            started_at: epoch_seconds().saturating_sub(process.elapsed_seconds),
        };
        self.watched
            .lock()
            .map_err(|_| "Estado indisponível")?
            .insert(pid, item);
        let _ = self.wake.send(());
        Ok(())
    }

    pub fn unwatch_process(&self, pid: u32) {
        if let Ok(mut items) = self.watched.lock() {
            items.remove(&pid);
        }
        let _ = self.wake.send(());
    }

    pub fn set_keep_awake(&self, enabled: bool) -> Result<(), String> {
        if enabled && self.snapshot().activities.is_empty() {
            return Err("Não há atividades para acompanhar.".into());
        }
        self.keep_awake_requested.store(enabled, Ordering::Relaxed);
        let _ = self.wake.send(());
        Ok(())
    }

    pub fn set_ui_active(&self, active: bool) {
        self.ui_active.store(active, Ordering::Relaxed);
        let _ = self.wake.send(());
    }

    pub fn preferences(&self) -> Preferences {
        self.preferences
            .lock()
            .map(|value| value.clone())
            .unwrap_or_default()
    }

    pub fn save_preferences(&self, next: Preferences) -> Result<(), String> {
        preferences::save(&self.preferences_path, &next).map_err(|error| error.to_string())?;
        *self.preferences.lock().map_err(|_| "Estado indisponível")? = next;
        let _ = self.wake.send(());
        Ok(())
    }

    pub fn connections(&self) -> Vec<ConnectionStatus> {
        let processes = self.processes();
        let definitions = [
            ("chrome", "Chrome", &["Chrome", "Google Chrome"][..]),
            ("edge", "Edge", &["Microsoft Edge"][..]),
            (
                "vscode",
                "VS Code",
                &["Visual Studio Code", "Code Helper"][..],
            ),
            ("steam", "Steam", &["steam_osx", "Steam"][..]),
            ("onedrive", "OneDrive", &["OneDrive"][..]),
            ("google-drive", "Google Drive", &["Google Drive"][..]),
            ("safari", "Safari", &["Safari"][..]),
            ("icloud", "iCloud", &["bird", "cloudd"][..]),
        ];
        definitions
            .into_iter()
            .map(|(id, name, names)| {
                let detected = processes.iter().any(|process| {
                    names.iter().any(|candidate| {
                        process.app.eq_ignore_ascii_case(candidate)
                            || process.name.eq_ignore_ascii_case(candidate)
                    })
                });
                ConnectionStatus {
                    id: id.into(),
                    name: name.into(),
                    status: if detected { "detected" } else { "coming_soon" }.into(),
                    detail: if detected {
                        "Aplicativo em execução; connector ainda não instalado.".into()
                    } else {
                        "Integração ainda não implementada.".into()
                    },
                }
            })
            .collect()
    }

    pub fn shutdown(&self) {
        self.shutdown.store(true, Ordering::Relaxed);
        self.keep_awake_requested.store(false, Ordering::Relaxed);
        let _ = self.wake.send(());
        if let Ok(mut guard) = self.power.lock() {
            let _ = guard.set_enabled(false);
        }
        if let Ok(mut thread) = self.thread.lock() {
            if let Some(handle) = thread.take() {
                let _ = handle.join();
            }
        }
        if let Ok(mut watcher) = self.watcher.lock() {
            watcher.take();
        }
    }
}

impl Drop for ActivityEngine {
    fn drop(&mut self) {
        self.shutdown();
    }
}

fn collect_processes(system: &System, watched: &HashMap<u32, WatchedProcess>) -> Vec<ProcessInfo> {
    let mut rows = system
        .processes()
        .iter()
        .filter_map(|(pid, process)| {
            let pid = pid.as_u32();
            if pid == std::process::id() || pid == 0 {
                return None;
            }
            let name = process.name().to_string_lossy().into_owned();
            let command = process
                .cmd()
                .iter()
                .map(|value| value.to_string_lossy())
                .collect::<Vec<_>>()
                .join(" ");
            let app = app_name(process.exe(), &name);
            let classification = classify(&name, &command);
            let disk = process.disk_usage();
            Some(ProcessInfo {
                pid,
                parent_pid: process.parent().map(|value| value.as_u32()),
                name,
                app,
                command,
                cpu_usage: process.cpu_usage(),
                memory_bytes: process.memory(),
                disk_read_bytes: disk.read_bytes,
                disk_written_bytes: disk.written_bytes,
                elapsed_seconds: process.run_time(),
                status: format!("{:?}", process.status()),
                potentially_relevant: classification.is_some(),
                reason: classification.map(|value| value.reason),
                watched: watched.contains_key(&pid),
            })
        })
        .collect::<Vec<_>>();
    rows.sort_by(|a, b| {
        b.watched
            .cmp(&a.watched)
            .then_with(|| b.potentially_relevant.cmp(&a.potentially_relevant))
            .then_with(|| b.cpu_usage.total_cmp(&a.cpu_usage))
    });
    rows.truncate(240);
    rows
}

fn collect_activities(
    system: &System,
    watched: &HashMap<u32, WatchedProcess>,
    preferences: &Preferences,
    download_signals: &DownloadSignals,
) -> Vec<Activity> {
    let ignored = rules_for(preferences, "ignore");
    let monitored = rules_for(preferences, "monitor");
    let mut candidates: Vec<(u32, Option<u32>, Activity)> = Vec::new();

    for (pid, process) in system.processes() {
        let raw_pid = pid.as_u32();
        let name = process.name().to_string_lossy().into_owned();
        let command = process
            .cmd()
            .iter()
            .map(|value| value.to_string_lossy())
            .collect::<Vec<_>>()
            .join(" ");
        let app = app_name(process.exe(), &name);
        if let Some(watched_process) = watched.get(&raw_pid) {
            candidates.push((
                raw_pid,
                process.parent().map(|value| value.as_u32()),
                process_activity(
                    process,
                    raw_pid,
                    &app,
                    &watched_process.command,
                    "Processo acompanhado manualmente",
                    "terminal",
                    "manual",
                    "high",
                    "high",
                    watched_process.started_at,
                ),
            ));
            continue;
        }
        if ignored.contains(&app.to_ascii_lowercase())
            || ignored.contains(&name.to_ascii_lowercase())
        {
            continue;
        }
        if monitored.contains(&app.to_ascii_lowercase())
            || monitored.contains(&name.to_ascii_lowercase())
        {
            candidates.push((
                raw_pid,
                process.parent().map(|value| value.as_u32()),
                process_activity(
                    process,
                    raw_pid,
                    &app,
                    &command,
                    "Aplicativo monitorado",
                    "unknown",
                    "system",
                    "normal",
                    "high",
                    process.start_time(),
                ),
            ));
            continue;
        }
        if let Some(classification) = classify(&name, &command) {
            candidates.push((
                raw_pid,
                process.parent().map(|value| value.as_u32()),
                classified_activity(process, raw_pid, &app, &command, classification),
            ));
        }
    }

    let candidate_pids = candidates
        .iter()
        .map(|(pid, _, _)| *pid)
        .collect::<HashSet<_>>();
    let mut activities = candidates
        .into_iter()
        .filter(|(_, parent, _)| {
            parent
                .map(|pid| !candidate_pids.contains(&pid))
                .unwrap_or(true)
        })
        .map(|(_, _, activity)| activity)
        .collect::<Vec<_>>();

    for signal in downloads::recent(download_signals) {
        let path = signal.path.to_string_lossy();
        let (app, suffix) = if path.to_ascii_lowercase().ends_with(".crdownload") {
            ("Chrome", ".crdownload")
        } else if path.to_ascii_lowercase().ends_with(".download") {
            ("Safari", ".download")
        } else {
            ("Browser", ".part")
        };
        let file_name = signal
            .path
            .file_name()
            .map(|value| value.to_string_lossy().into_owned())
            .unwrap_or_else(|| "arquivo".into());
        let clean_name = file_name.strip_suffix(suffix).unwrap_or(&file_name);
        activities.push(Activity {
            id: format!("download:{}", signal.path.display()),
            app: app.into(),
            process: None,
            label: format!("Baixando {clean_name}"),
            detail: Some(format_bytes(signal.size)),
            activity_type: "download".into(),
            status: "running".into(),
            progress: None,
            started_at: epoch_seconds().saturating_sub(signal.last_event.elapsed().as_secs()),
            importance: "high".into(),
            source: "system".into(),
            confidence: "medium".into(),
            pid: None,
            cpu_usage: None,
            memory_bytes: None,
            elapsed_seconds: None,
        });
    }
    activities
}

fn process_activity(
    process: &sysinfo::Process,
    pid: u32,
    app: &str,
    command: &str,
    detail: &str,
    kind: &str,
    source: &str,
    importance: &str,
    confidence: &str,
    started_at: u64,
) -> Activity {
    Activity {
        id: format!("process:{pid}"),
        app: app.into(),
        process: Some(command.into()),
        label: if command.is_empty() {
            process.name().to_string_lossy().into_owned()
        } else {
            shorten(command, 72)
        },
        detail: Some(detail.into()),
        activity_type: kind.into(),
        status: "running".into(),
        progress: None,
        started_at,
        importance: importance.into(),
        source: source.into(),
        confidence: confidence.into(),
        pid: Some(pid),
        cpu_usage: Some(process.cpu_usage()),
        memory_bytes: Some(process.memory()),
        elapsed_seconds: Some(process.run_time()),
    }
}

fn classified_activity(
    process: &sysinfo::Process,
    pid: u32,
    app: &str,
    command: &str,
    classification: Classification,
) -> Activity {
    let mut activity = process_activity(
        process,
        pid,
        app,
        command,
        &classification.reason,
        classification.activity_type,
        "system",
        classification.importance,
        classification.confidence,
        process.start_time(),
    );
    activity.label = classification.label;
    activity
}

fn rules_for(preferences: &Preferences, mode: &str) -> HashSet<String> {
    preferences
        .app_rules
        .iter()
        .filter(|rule| rule.mode == mode)
        .map(|rule| rule.app.to_ascii_lowercase())
        .collect()
}

fn app_name(executable: Option<&Path>, fallback: &str) -> String {
    if let Some(path) = executable {
        for component in path.components() {
            let value = component.as_os_str().to_string_lossy();
            if let Some(name) = value.strip_suffix(".app") {
                return name.into();
            }
        }
    }
    fallback.into()
}

fn semantic_signature(
    state: &str,
    activities: &[Activity],
    requested: bool,
    active: bool,
) -> String {
    let items = activities
        .iter()
        .map(|activity| {
            format!(
                "{}:{}:{}",
                activity.id,
                activity.status,
                activity.elapsed_seconds.unwrap_or_default() / 5
            )
        })
        .collect::<Vec<_>>()
        .join("|");
    format!("{state}:{requested}:{active}:{items}")
}

fn shorten(value: &str, max: usize) -> String {
    let mut result = value.chars().take(max).collect::<String>();
    if value.chars().count() > max {
        result.push('…');
    }
    result
}

fn format_bytes(value: u64) -> String {
    if value >= 1_000_000_000 {
        format!("{:.1} GB gravados", value as f64 / 1_000_000_000.0)
    } else if value >= 1_000_000 {
        format!("{:.1} MB gravados", value as f64 / 1_000_000.0)
    } else if value >= 1_000 {
        format!("{:.1} KB gravados", value as f64 / 1_000.0)
    } else {
        format!("{value} B gravados")
    }
}

fn epoch_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
