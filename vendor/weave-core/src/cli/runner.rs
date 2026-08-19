use crate::cli::commands::{build, check, collect_wv_files, dev};
use anyhow::{bail, Context, Result};
use std::fs;
use std::path::{Path, PathBuf};

/// Resolves an input path against the host operating system's current working directory.
/// Ensures relative paths (e.g., `src/main.wv`, `examples/counter.wv`) and absolute paths
/// resolve reliably across host platforms without any hardcoded prefixes.
pub fn resolve_path(input_path: &Path) -> Result<PathBuf> {
    if input_path.is_absolute() {
        if input_path.exists() {
            return Ok(fs::canonicalize(input_path).unwrap_or_else(|_| input_path.to_path_buf()));
        }
        return Ok(input_path.to_path_buf());
    }

    let cwd = std::env::current_dir().context("Failed to get current working directory")?;
    let joined = cwd.join(input_path);
    if joined.exists() {
        return Ok(fs::canonicalize(&joined).unwrap_or(joined));
    }

    if input_path.exists() {
        return Ok(fs::canonicalize(input_path).unwrap_or_else(|_| input_path.to_path_buf()));
    }

    // Return the joined path relative to cwd if not found on disk
    Ok(joined)
}

/// Runs a Weave source file or project by checking syntax, compiling artifacts,
/// and executing the standalone runtime or dev server.
pub async fn run(path: &Path, port: Option<u16>) -> Result<()> {
    let resolved = resolve_path(path)?;
    if !resolved.exists() {
        bail!("Path does not exist: {}", path.display());
    }

    let files = collect_wv_files(&resolved)?;
    if files.is_empty() {
        bail!("No .wv files found to run at {}", path.display());
    }

    // 1. Run compiler typecheck and diagnostics verification
    check(&resolved)?;

    let target_file = &files[0];
    println!("🚀 Running Weave program: {}", target_file.display());

    // 2. Compile standalone bundle to a temporary runner cache
    let runner_dist = std::env::temp_dir().join("weave_run_dist");
    let out_dir = build(&resolved, &Some(runner_dist), false)?;

    if let Some(p) = port {
        println!("⚡ Serving live preview at http://127.0.0.1:{}", p);
        dev(&resolved, p).await?;
    } else {
        println!("✓ Compiled executable bundle ready at: {}", out_dir.display());
    }

    Ok(())
}
