use super::PlatformInfo;

pub fn current() -> PlatformInfo {
    PlatformInfo {
        os: "macos",
        arch: std::env::consts::ARCH,
        // Kept in the platform adapter because menu bar/notch geometry is OS-specific.
        top_offset: 38,
    }
}

