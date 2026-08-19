use crate::fs_commands::NativeExecResult;
use std::path::{Path, PathBuf};
use std::process::Command;

#[tauri::command]
pub fn execute_shell_command(command: String, cwd: String) -> Result<NativeExecResult, String> {
    if command.trim().is_empty() {
        return Err("Shell command cannot be empty.".to_string());
    }
    let working_directory = Path::new(&cwd);
    if !working_directory.is_dir() {
        return Err(format!("Working directory does not exist: {cwd}"));
    }

    #[cfg(target_os = "windows")]
    let output = Command::new(std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string()))
        .args(["/D", "/S", "/C", &command])
        .current_dir(working_directory)
        .output();

    #[cfg(not(target_os = "windows"))]
    let output = Command::new(std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string()))
        .args(["-lc", &command])
        .current_dir(working_directory)
        .output();

    let output = output.map_err(|error| format!("Failed to start shell command: {error}"))?;
    Ok(NativeExecResult {
        success: output.status.success(),
        exit_code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[tauri::command]
pub fn resolve_terminal_directory(path: String, cwd: String) -> Result<String, String> {
    let requested = if path.trim().is_empty() {
        PathBuf::from(&cwd)
    } else if path == "~" || path.starts_with("~/") || path.starts_with("~\\") {
        let home = std::env::var_os("HOME")
            .or_else(|| std::env::var_os("USERPROFILE"))
            .ok_or_else(|| "Home directory is not available.".to_string())?;
        let suffix = path.trim_start_matches('~').trim_start_matches(['/', '\\']);
        PathBuf::from(home).join(suffix)
    } else {
        let candidate = PathBuf::from(&path);
        if candidate.is_absolute() {
            candidate
        } else {
            Path::new(&cwd).join(candidate)
        }
    };

    let canonical = requested
        .canonicalize()
        .map_err(|error| format!("Could not open directory {}: {error}", requested.display()))?;
    if !canonical.is_dir() {
        return Err(format!("Not a directory: {}", canonical.display()));
    }
    Ok(canonical.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn get_git_branch(cwd: String) -> Result<Option<String>, String> {
    let working_directory = Path::new(&cwd);
    if !working_directory.is_dir() {
        return Err(format!("Working directory does not exist: {cwd}"));
    }

    let output = match Command::new("git")
        .args(["-C", &cwd, "branch", "--show-current"])
        .output()
    {
        Ok(output) => output,
        Err(_) => return Ok(None),
    };
    if !output.status.success() {
        return Ok(None);
    }

    let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !branch.is_empty() {
        return Ok(Some(branch));
    }

    let detached = Command::new("git")
        .args(["-C", &cwd, "rev-parse", "--short", "HEAD"])
        .output();
    match detached {
        Ok(detached) if detached.status.success() => {
            let revision = String::from_utf8_lossy(&detached.stdout).trim().to_string();
            Ok((!revision.is_empty()).then(|| format!("detached@{revision}")))
        }
        _ => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::{execute_shell_command, get_git_branch, resolve_terminal_directory};

    #[test]
    fn executes_a_shell_command_in_the_requested_directory() {
        let cwd = std::env::temp_dir();
        let command = if cfg!(target_os = "windows") {
            "echo weave-terminal"
        } else {
            "printf weave-terminal"
        };
        let result = execute_shell_command(command.to_string(), cwd.to_string_lossy().into_owned())
            .expect("shell command should start");

        assert!(result.success);
        assert!(result.stdout.contains("weave-terminal"));
    }

    #[test]
    fn resolves_parent_directories_canonically() {
        let nested = std::env::temp_dir().join("weave-terminal-resolve");
        std::fs::create_dir_all(&nested).expect("create nested test directory");
        let resolved =
            resolve_terminal_directory("..".to_string(), nested.to_string_lossy().into_owned())
                .expect("parent directory should resolve");

        assert_eq!(
            PathBuf::from(resolved),
            std::env::temp_dir().canonicalize().unwrap()
        );
        std::fs::remove_dir_all(nested).expect("clean nested test directory");
    }

    #[test]
    fn reports_no_branch_for_a_non_repository() {
        let directory = std::env::temp_dir().join("weave-terminal-no-git");
        std::fs::create_dir_all(&directory).expect("create test directory");
        let branch = get_git_branch(directory.to_string_lossy().into_owned())
            .expect("git detection should not fail");

        assert_eq!(branch, None);
        std::fs::remove_dir_all(directory).expect("clean test directory");
    }

    use std::path::PathBuf;
}
