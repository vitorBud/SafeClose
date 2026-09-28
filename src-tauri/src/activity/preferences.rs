use std::{fs, io, path::Path};

use super::models::Preferences;

pub fn load(path: &Path) -> Preferences {
    fs::read_to_string(path)
        .ok()
        .and_then(|contents| serde_json::from_str(&contents).ok())
        .unwrap_or_default()
}

pub fn save(path: &Path, preferences: &Preferences) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, serde_json::to_vec_pretty(preferences)?)?;
    fs::rename(temporary, path)
}
