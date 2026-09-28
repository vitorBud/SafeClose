use super::PlatformInfo;

pub fn current() -> PlatformInfo {
    PlatformInfo {
        os: "linux",
        arch: std::env::consts::ARCH,
        top_offset: 8,
    }
}

