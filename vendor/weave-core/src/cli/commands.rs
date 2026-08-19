use crate::cli::runner::resolve_path;
use crate::codegen::{generate_html, generate_tsx};
use crate::diagnostics::Diagnostic;
use crate::parser::Parser;
use crate::typecheck;
use anyhow::{bail, Context, Result};
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};

pub use crate::cli::runner::{resolve_path as resolve_workspace_path, run, run as run_file};

pub fn check(path: &Path) -> Result<()> {
    let files = collect_wv_files(path)?;
    if files.is_empty() {
        println!("No .wv files found at {}", path.display());
        return Ok(());
    }

    let mut total_errors = 0;
    for file in &files {
        let source = fs::read_to_string(file)
            .with_context(|| format!("Failed to read file {}", file.display()))?;
        let result = Parser::parse(&source);

        if !result.is_ok() {
            for err in result.errors() {
                total_errors += 1;
                let diag = Diagnostic::from_parse_error(&source, err);
                eprintln!("{}", diag.render(&file.to_string_lossy(), &source));
            }
        }

        let typecheck_res = typecheck::check(&result.root());
        if !typecheck_res.is_ok() {
            for err in &typecheck_res.errors {
                total_errors += 1;
                let diag = Diagnostic::from_type_error(&source, err);
                eprintln!("{}", diag.render(&file.to_string_lossy(), &source));
            }
        }
    }

    if total_errors > 0 {
        bail!("Check failed with {} error(s)", total_errors);
    } else {
        println!("✓ Checked {} file(s) with 0 errors.", files.len());
        Ok(())
    }
}

pub fn build(path: &Path, out_dir: &Option<PathBuf>, release: bool) -> Result<PathBuf> {
    let files = collect_wv_files(path)?;
    if files.is_empty() {
        bail!("No .wv files found to build at {}", path.display());
    }

    let out = out_dir
        .clone()
        .unwrap_or_else(|| PathBuf::from("dist"));

    fs::create_dir_all(&out)
        .with_context(|| format!("Failed to create output directory: {}", out.display()))?;

    let mut compiled_count = 0;
    for (idx, file) in files.iter().enumerate() {
        let source = fs::read_to_string(file)
            .with_context(|| format!("Failed to read file {}", file.display()))?;
        let result = Parser::parse(&source);

        if !result.is_ok() {
            for err in result.errors() {
                let diag = Diagnostic::from_parse_error(&source, err);
                eprintln!("{}", diag.render(&file.to_string_lossy(), &source));
            }
            bail!("Build failed due to parse errors in {}", file.display());
        }

        let root = result.root();
        let typecheck_res = typecheck::check(&root);
        if !typecheck_res.is_ok() {
            for err in &typecheck_res.errors {
                let diag = Diagnostic::from_type_error(&source, err);
                eprintln!("{}", diag.render(&file.to_string_lossy(), &source));
            }
        }

        let file_stem = file.file_stem().unwrap_or_default().to_string_lossy();
        let tsx_code = generate_tsx(&root);
        let html_bundle = generate_html(&root, &file_stem);

        // Write TSX artifact
        let tsx_file = out.join(format!("{}.tsx", file_stem));
        fs::write(&tsx_file, &tsx_code)
            .with_context(|| format!("Failed to write TSX output to {}", tsx_file.display()))?;

        // Write JSX artifact
        let jsx_file = out.join(format!("{}.jsx", file_stem));
        fs::write(&jsx_file, &tsx_code)
            .with_context(|| format!("Failed to write JSX output to {}", jsx_file.display()))?;

        // Write HTML runner bundle
        let html_file = out.join(format!("{}.html", file_stem));
        fs::write(&html_file, &html_bundle)
            .with_context(|| format!("Failed to write HTML output to {}", html_file.display()))?;

        // Write index.html and standalone bundle.js for primary file
        if idx == 0 {
            let index_file = out.join("index.html");
            let _ = fs::write(&index_file, &html_bundle);

            let bundle_file = out.join("bundle.js");
            let _ = fs::write(&bundle_file, &tsx_code);
        }

        // Summary JSON artifact
        let meta_file = out.join(format!("{}.json", file_stem));
        let items_summary = format!(
            "{{\n  \"file\": \"{}\",\n  \"components\": {},\n  \"stores\": {},\n  \"servers\": {},\n  \"resources\": {},\n  \"themes\": {},\n  \"release\": {}\n}}",
            file.display(),
            root.components().count(),
            root.stores().count(),
            root.servers().count(),
            root.resources().count(),
            root.themes().count(),
            release
        );
        let _ = fs::write(&meta_file, items_summary);

        compiled_count += 1;
    }

    println!(
        "✓ Successfully compiled {} file(s) to {} [release={}]",
        compiled_count,
        out.display(),
        release
    );
    Ok(out)
}

pub fn start_dev_server(path: &Path, port: u16) -> Result<TcpListener> {
    let files = collect_wv_files(path)?;
    if files.is_empty() {
        bail!("No .wv files found to serve at {}", path.display());
    }

    // Initial check
    check(path)?;

    let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
        .with_context(|| format!("Failed to bind dev server to port {}", port))?;

    Ok(listener)
}

pub fn serve_single_request(listener: &TcpListener, file_path: &Path) -> Result<()> {
    let (stream, _) = listener.accept()?;
    handle_http_client(stream, file_path)
}

pub async fn dev(path: &Path, port: u16) -> Result<()> {
    let files = collect_wv_files(path)?;
    println!(
        "⚡ Starting Weave dev server on http://127.0.0.1:{} watching {} file(s)...",
        port,
        files.len()
    );

    let listener = start_dev_server(path, port)?;
    println!("⚡ Dev server live at http://127.0.0.1:{}", port);
    println!("Dev server ready. Watching for file modifications.");
    println!("⚡ Press Ctrl+C to stop.");

    let files_clone = files.clone();
    let server_task = tokio::task::spawn_blocking(move || {
        for stream in listener.incoming() {
            match stream {
                Ok(stream) => {
                    let main_file = &files_clone[0];
                    if let Err(e) = handle_http_client(stream, main_file) {
                        eprintln!("Dev server client error: {}", e);
                    }
                }
                Err(e) => eprintln!("Connection error: {}", e),
            }
        }
    });

    tokio::signal::ctrl_c().await.ok();
    println!("\n⚡ Shutting down dev server.");
    server_task.abort();

    Ok(())
}

pub fn handle_http_client(mut stream: TcpStream, file_path: &Path) -> Result<()> {
    let mut buffer = [0u8; 2048];
    let _ = stream.read(&mut buffer);

    let source = fs::read_to_string(file_path)?;
    let parsed = Parser::parse(&source);
    let file_stem = file_path.file_stem().unwrap_or_default().to_string_lossy();
    let html = generate_html(&parsed.root(), &file_stem);

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html.len(),
        html
    );

    stream.write_all(response.as_bytes())?;
    stream.flush()?;
    Ok(())
}

pub fn parse(path: &Path, show_cst: bool) -> Result<String> {
    let resolved = resolve_path(path)?;
    if !resolved.exists() {
        bail!("Path does not exist: {}", path.display());
    }
    let source = fs::read_to_string(&resolved)
        .with_context(|| format!("Failed to read file {}", resolved.display()))?;
    let result = Parser::parse(&source);

    let output = if show_cst {
        result.debug_tree()
    } else {
        let root = result.root();
        let mut out = String::new();
        out.push_str(&format!("SourceFile: {}\n", resolved.display()));
        for comp in root.components() {
            if let Some(name) = comp.name() {
                out.push_str(&format!("  Component: {}\n", name.text()));
            }
        }
        for store in root.stores() {
            if let Some(name) = store.name() {
                out.push_str(&format!("  Store: {}\n", name.text()));
            }
        }
        for srv in root.servers() {
            out.push_str("  Server Block\n");
            for f in srv.functions() {
                if let Some(name) = f.name() {
                    out.push_str(&format!("    Endpoint fn: {}\n", name.text()));
                }
            }
        }
        for style in root.styles() {
            if let Some(name) = style.name() {
                out.push_str(&format!("  Style: {}\n", name.text()));
            }
        }
        out
    };

    println!("{}", output);
    Ok(output)
}

pub fn collect_wv_files(path: &Path) -> Result<Vec<PathBuf>> {
    let resolved = resolve_path(path)?;
    if !resolved.exists() {
        bail!("Path does not exist: {}", path.display());
    }

    if resolved.is_file() {
        return Ok(vec![resolved]);
    }

    let mut files = Vec::new();
    for entry in fs::read_dir(&resolved)? {
        let entry = entry?;
        let entry_path = entry.path();
        if entry_path.is_file() && entry_path.extension().map_or(false, |ext| ext == "wv") {
            files.push(entry_path);
        } else if entry_path.is_dir() {
            files.extend(collect_wv_files(&entry_path)?);
        }
    }
    files.sort();
    Ok(files)
}
