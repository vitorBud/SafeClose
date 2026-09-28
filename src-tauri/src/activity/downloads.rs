use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{mpsc::Sender, Arc, Mutex},
    time::{Duration, Instant},
};

use notify::{RecommendedWatcher, RecursiveMode, Watcher};

#[derive(Clone, Debug)]
pub struct DownloadSignal {
    pub path: PathBuf,
    pub last_event: Instant,
    pub size: u64,
}

pub type DownloadSignals = Arc<Mutex<HashMap<PathBuf, DownloadSignal>>>;

pub fn start(
    downloads_dir: &Path,
    signals: DownloadSignals,
    wake: Sender<()>,
) -> Result<RecommendedWatcher, notify::Error> {
    let mut watcher = notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
        let Ok(event) = result else { return };
        let mut changed = false;
        for path in event.paths {
            if !is_temporary_download(&path) {
                continue;
            }
            let size = path.metadata().map(|metadata| metadata.len()).unwrap_or(0);
            if let Ok(mut items) = signals.lock() {
                items.insert(
                    path.clone(),
                    DownloadSignal {
                        path,
                        last_event: Instant::now(),
                        size,
                    },
                );
                changed = true;
            }
        }
        if changed {
            let _ = wake.send(());
        }
    })?;
    watcher.watch(downloads_dir, RecursiveMode::NonRecursive)?;
    Ok(watcher)
}

pub fn recent(signals: &DownloadSignals) -> Vec<DownloadSignal> {
    let Ok(mut items) = signals.lock() else {
        return Vec::new();
    };
    items.retain(|_, signal| signal.last_event.elapsed() < Duration::from_secs(12));
    items.values().cloned().collect()
}

fn is_temporary_download(path: &Path) -> bool {
    let value = path.to_string_lossy().to_ascii_lowercase();
    value.ends_with(".crdownload") || value.ends_with(".download") || value.ends_with(".part")
}
