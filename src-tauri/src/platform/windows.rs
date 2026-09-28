use super::PlatformInfo;

pub fn current() -> PlatformInfo {
    PlatformInfo {
        os: "windows",
        arch: std::env::consts::ARCH,
        top_offset: 8,
    }
}

