#[derive(Clone, Debug)]
pub struct Classification {
    pub activity_type: &'static str,
    pub label: String,
    pub importance: &'static str,
    pub confidence: &'static str,
    pub reason: String,
}

fn contains_any(value: &str, patterns: &[&str]) -> bool {
    patterns.iter().any(|pattern| value.contains(pattern))
}

/// Conservative initial classifier. A process name alone is generally not enough:
/// command arguments must describe a bounded operation that is unsafe to interrupt.
pub fn classify(name: &str, command: &str) -> Option<Classification> {
    let name = name.to_ascii_lowercase();
    let command = command.to_ascii_lowercase();
    let whole = format!("{name} {command}");

    if name.contains("ffmpeg") || whole.contains("/ffmpeg ") {
        return Some(Classification {
            activity_type: "render",
            label: "ffmpeg em execução".into(),
            importance: "high",
            confidence: "high",
            reason: "Renderização ffmpeg é uma operação limitada e interrompível.".into(),
        });
    }

    if contains_any(
        &whole,
        &[
            "npm run build",
            "pnpm run build",
            "pnpm build",
            "yarn build",
            "npm install",
            "pnpm install",
            "yarn install",
        ],
    ) {
        return Some(Classification {
            activity_type: "build",
            label: concise_command(command.as_str(), "Build JavaScript"),
            importance: "high",
            confidence: "high",
            reason: "Comando explícito de build ou instalação.".into(),
        });
    }

    if (name.contains("cargo") || whole.contains("/cargo "))
        && contains_any(
            &whole,
            &[" build", " test", " check", " install", " clippy"],
        )
    {
        return Some(Classification {
            activity_type: "build",
            label: concise_command(command.as_str(), "Cargo em execução"),
            importance: "high",
            confidence: "high",
            reason: "Comando Cargo limitado detectado pelos argumentos.".into(),
        });
    }

    if contains_any(
        &whole,
        &[
            "gradle build",
            "gradlew build",
            "gradle assemble",
            "gradlew assemble",
            "xcodebuild",
        ],
    ) {
        return Some(Classification {
            activity_type: "build",
            label: concise_command(command.as_str(), "Build em execução"),
            importance: "high",
            confidence: "high",
            reason: "Ferramenta de build com ação explícita.".into(),
        });
    }

    if contains_any(
        &whole,
        &["vite build", "next build", "webpack --mode production"],
    ) && !contains_any(&whole, &[" --watch", " dev", " serve"])
    {
        return Some(Classification {
            activity_type: "build",
            label: concise_command(command.as_str(), "Bundling em execução"),
            importance: "high",
            confidence: "medium",
            reason: "Bundler em modo de build, sem sinal de servidor permanente.".into(),
        });
    }

    if (name == "git" || whole.contains("/git "))
        && contains_any(&whole, &[" clone", " fetch", " pull", " push", " lfs"])
    {
        return Some(Classification {
            activity_type: "network",
            label: concise_command(command.as_str(), "Operação Git"),
            importance: "normal",
            confidence: "high",
            reason: "Operação Git remota e limitada.".into(),
        });
    }

    if (name.contains("docker") || whole.contains("/docker "))
        && contains_any(&whole, &[" build", " pull", " push", " save", " load"])
    {
        return Some(Classification {
            activity_type: "build",
            label: concise_command(command.as_str(), "Operação Docker"),
            importance: "high",
            confidence: "medium",
            reason: "Operação Docker limitada; serviços permanentes não são incluídos.".into(),
        });
    }

    if ["cp", "rsync", "ditto", "mv"]
        .iter()
        .any(|candidate| name == *candidate)
    {
        return Some(Classification {
            activity_type: "file_transfer",
            label: format!("{name} transferindo arquivos"),
            importance: "normal",
            confidence: "medium",
            reason: "Utilitário de transferência de arquivos em execução.".into(),
        });
    }

    None
}

fn concise_command(command: &str, fallback: &str) -> String {
    let command = command.trim();
    if command.is_empty() {
        return fallback.into();
    }
    let mut value = command.chars().take(72).collect::<String>();
    if command.chars().count() > 72 {
        value.push('…');
    }
    value
}

#[cfg(test)]
mod tests {
    use super::classify;

    #[test]
    fn recognizes_bounded_builds() {
        assert!(classify("npm", "npm run build").is_some());
        assert!(classify("cargo", "cargo test").is_some());
        assert!(classify("node", "node vite build").is_some());
    }

    #[test]
    fn ignores_open_apps_and_long_running_servers() {
        assert!(classify(
            "Google Chrome",
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        )
        .is_none());
        assert!(classify(
            "Spotify",
            "/Applications/Spotify.app/Contents/MacOS/Spotify"
        )
        .is_none());
        assert!(classify("node", "node server.js").is_none());
        assert!(classify("vite", "vite dev").is_none());
    }
}
