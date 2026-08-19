use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::UNIX_EPOCH;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified_at: Option<u64>,
    pub extension: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NativeWeaveStatus {
    pub available: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub supports_test: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NativeExecResult {
    pub success: bool,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !p.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let entries =
        fs::read_dir(p).map_err(|e| format!("Failed to read directory {}: {}", path, e))?;
    let mut result = Vec::new();

    for entry in entries {
        if let Ok(entry) = entry {
            let file_name = entry.file_name().to_string_lossy().to_string();
            // Avoid eagerly walking generated dependency/build trees in the editor explorer.
            if matches!(
                file_name.as_str(),
                ".git" | "node_modules" | "target" | ".next" | ".cache"
            ) {
                continue;
            }

            let file_path = entry.path();
            let metadata = entry.metadata().ok();
            let is_dir = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
            let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            let modified_at = metadata
                .as_ref()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs());
            let extension = file_path
                .extension()
                .map(|e| e.to_string_lossy().to_string());

            result.push(FileEntry {
                name: file_name,
                path: file_path.to_string_lossy().to_string(),
                is_dir,
                size,
                modified_at,
                extension,
            });
        }
    }

    // Sort: directories first, then alphabetical by name
    result.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(result)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    if p.is_dir() {
        return Err(format!(
            "Target is a directory, cannot read as file: {}",
            path
        ));
    }

    fs::read_to_string(p).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }

    fs::write(p, content).map_err(|e| format!("Failed to write file {}: {}", path, e))
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.exists() {
        return Err(format!("File already exists: {}", path));
    }
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    fs::write(p, "").map_err(|e| format!("Failed to create file {}: {}", path, e))
}

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.exists() {
        return Err(format!("Directory already exists: {}", path));
    }
    fs::create_dir_all(p).map_err(|e| format!("Failed to create directory {}: {}", path, e))
}

#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| format!("Failed to remove directory {}: {}", path, e))
    } else {
        fs::remove_file(p).map_err(|e| format!("Failed to remove file {}: {}", path, e))
    }
}

#[tauri::command]
pub fn rename_entry(source_path: String, target_path: String) -> Result<(), String> {
    let source = Path::new(&source_path);
    let target = Path::new(&target_path);
    if !source.exists() {
        return Err(format!("Path does not exist: {}", source_path));
    }
    if target.exists() {
        return Err(format!("Path already exists: {}", target_path));
    }
    let parent = target
        .parent()
        .ok_or_else(|| format!("Target has no parent directory: {}", target_path))?;
    if !parent.exists() {
        return Err(format!(
            "Target directory does not exist: {}",
            parent.display()
        ));
    }

    fs::rename(source, target)
        .map_err(|e| format!("Failed to rename {} to {}: {}", source_path, target_path, e))
}

#[tauri::command]
pub fn check_native_weave() -> Result<NativeWeaveStatus, String> {
    let mut candidates = Vec::<PathBuf>::new();
    if let Some(configured) = std::env::var_os("WEAVE_BINARY") {
        candidates.push(PathBuf::from(configured));
    }
    if let Ok(current_executable) = std::env::current_exe() {
        if let Some(executable_dir) = current_executable.parent() {
            let bundled_name = if cfg!(target_os = "windows") {
                "weave.exe"
            } else {
                "weave"
            };
            candidates.push(executable_dir.join(bundled_name));
        }
    }
    candidates.push(PathBuf::from("weave"));
    if let Some(home) = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE")) {
        candidates.push(PathBuf::from(home).join(".cargo/bin/weave"));
    }
    candidates.push(PathBuf::from("/opt/homebrew/bin/weave"));
    candidates.push(PathBuf::from("/usr/local/bin/weave"));
    if let Ok(current_dir) = std::env::current_dir() {
        if let Some(parent) = current_dir.parent() {
            candidates.push(parent.join("weave-core/target/release/weave"));
            candidates.push(parent.join("weave-core/target/debug/weave"));
        }
    }

    for candidate in candidates {
        if let Ok(output) = std::process::Command::new(&candidate)
            .arg("--version")
            .output()
        {
            if output.status.success() {
                let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let supports_test = Command::new(&candidate)
                    .args(["test", "--help"])
                    .output()
                    .map(|output| output.status.success())
                    .unwrap_or(false);
                return Ok(NativeWeaveStatus {
                    available: true,
                    path: Some(candidate.to_string_lossy().into_owned()),
                    version: Some(ver),
                    supports_test,
                });
            }
        }
    }

    Ok(NativeWeaveStatus {
        available: false,
        path: None,
        version: None,
        supports_test: false,
    })
}

#[tauri::command]
pub fn execute_native_weave(
    binary_path: Option<String>,
    subcommand: String,
    args: Vec<String>,
    cwd: Option<String>,
) -> Result<NativeExecResult, String> {
    let bin = binary_path.unwrap_or_else(|| "weave".to_string());
    let mut cmd = std::process::Command::new(&bin);
    cmd.arg(&subcommand);
    for arg in args {
        cmd.arg(arg);
    }
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    match cmd.output() {
        Ok(output) => {
            let exit_code = output.status.code().unwrap_or(-1);
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            Ok(NativeExecResult {
                success: output.status.success(),
                exit_code,
                stdout,
                stderr,
            })
        }
        Err(e) => Err(format!(
            "Failed to execute native weave binary '{}': {}",
            bin, e
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::rename_entry;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_test_dir(test_name: &str) -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "weave-ide-{test_name}-{}-{unique}",
            std::process::id()
        ))
    }

    #[test]
    fn rename_entry_moves_a_real_file_without_losing_content() {
        let root = temp_test_dir("rename-file");
        fs::create_dir_all(&root).expect("create temp test directory");
        let source = root.join("main.wv");
        let target = root.join("app.wv");
        fs::write(&source, "fn main() {}").expect("write source file");

        rename_entry(
            source.to_string_lossy().into_owned(),
            target.to_string_lossy().into_owned(),
        )
        .expect("rename should succeed");

        assert!(!source.exists());
        assert_eq!(fs::read_to_string(&target).unwrap(), "fn main() {}");
        fs::remove_dir_all(&root).expect("clean temp test directory");
    }

    #[test]
    fn rename_entry_refuses_to_overwrite_an_existing_path() {
        let root = temp_test_dir("rename-collision");
        fs::create_dir_all(&root).expect("create temp test directory");
        let source = root.join("main.wv");
        let target = root.join("app.wv");
        fs::write(&source, "source").expect("write source file");
        fs::write(&target, "target").expect("write target file");

        let error = rename_entry(
            source.to_string_lossy().into_owned(),
            target.to_string_lossy().into_owned(),
        )
        .expect_err("rename should reject an existing target");

        assert!(error.contains("Path already exists"));
        assert_eq!(fs::read_to_string(&source).unwrap(), "source");
        assert_eq!(fs::read_to_string(&target).unwrap(), "target");
        fs::remove_dir_all(&root).expect("clean temp test directory");
    }
}
