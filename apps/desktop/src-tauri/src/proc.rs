//! Subprocess helpers that suppress the flashing console window on Windows.
//!
//! A GUI (windows subsystem) app has no console, so every console-subsystem
//! child process Windows spawns gets a brand-new console window that flashes
//! on screen. Passing the CREATE_NO_WINDOW creation flag prevents that.

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Build a `std::process::Command` that does not pop a console window on Windows.
pub fn command(program: &str) -> std::process::Command {
    #[allow(unused_mut)]
    let mut cmd = std::process::Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

/// Build a `tokio::process::Command` that does not pop a console window on Windows.
pub fn async_command(program: &str) -> tokio::process::Command {
    #[allow(unused_mut)]
    let mut cmd = tokio::process::Command::new(program);
    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}
