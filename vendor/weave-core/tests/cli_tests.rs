use clap::Parser;
use std::fs;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use weave_core::cli::{commands, Cli, Commands};

#[test]
fn test_cli_arg_parsing() {
    let run_args = vec!["weave", "run", "src/main.wv"];
    let cli = Cli::try_parse_from(run_args).unwrap();
    assert_eq!(
        cli.command,
        Commands::Run {
            path: PathBuf::from("src/main.wv"),
            port: None,
        }
    );

    let check_args = vec!["weave", "check", "examples/counter.wv"];
    let cli = Cli::try_parse_from(check_args).unwrap();
    assert_eq!(
        cli.command,
        Commands::Check {
            path: PathBuf::from("examples/counter.wv"),
        }
    );

    let build_args = vec![
        "weave",
        "build",
        "examples/counter.wv",
        "--out-dir",
        "target/dist",
        "--release",
    ];
    let cli = Cli::try_parse_from(build_args).unwrap();
    assert_eq!(
        cli.command,
        Commands::Build {
            path: PathBuf::from("examples/counter.wv"),
            out_dir: Some(PathBuf::from("target/dist")),
            release: true,
        }
    );

    let dev_args = vec!["weave", "dev", "examples/counter.wv", "--port", "8080"];
    let cli = Cli::try_parse_from(dev_args).unwrap();
    assert_eq!(
        cli.command,
        Commands::Dev {
            path: PathBuf::from("examples/counter.wv"),
            port: 8080,
        }
    );

    let parse_args = vec!["weave", "parse", "examples/counter.wv", "--cst"];
    let cli = Cli::try_parse_from(parse_args).unwrap();
    assert_eq!(
        cli.command,
        Commands::Parse {
            path: PathBuf::from("examples/counter.wv"),
            cst: true,
        }
    );
}

#[test]
fn test_cli_command_check() {
    let path = PathBuf::from("examples/counter.wv");
    assert!(commands::check(&path).is_ok());

    let dir_path = PathBuf::from("examples");
    assert!(commands::check(&dir_path).is_ok());

    let invalid_path = PathBuf::from("nonexistent_file.wv");
    assert!(commands::check(&invalid_path).is_err());
}

#[test]
fn test_cli_command_build() {
    let out_dir = PathBuf::from("target/test_dist");
    let res = commands::build(&PathBuf::from("examples/counter.wv"), &Some(out_dir.clone()), false);
    assert!(res.is_ok());

    // Verify TSX file was generated
    let tsx_file = out_dir.join("counter.tsx");
    assert!(tsx_file.exists());
    let tsx_content = fs::read_to_string(&tsx_file).unwrap();
    assert!(tsx_content.contains("export function CounterApp"));
    assert!(tsx_content.contains("useState"));
    assert!(tsx_content.contains("useCounterStore"));

    // Verify JSX file was generated
    let jsx_file = out_dir.join("counter.jsx");
    assert!(jsx_file.exists());

    // Verify standalone HTML runner and index.html
    let html_file = out_dir.join("counter.html");
    assert!(html_file.exists());
    let index_file = out_dir.join("index.html");
    assert!(index_file.exists());
    let html_content = fs::read_to_string(&html_file).unwrap();
    assert!(html_content.contains("<!DOCTYPE html>"));
    assert!(html_content.contains("<div id=\"root\"></div>"));

    // Verify JSON summary file
    let json_file = out_dir.join("counter.json");
    assert!(json_file.exists());
    let content = fs::read_to_string(&json_file).unwrap();
    assert!(content.contains("components"));
}

#[test]
fn test_cli_command_dev_server() {
    let listener = commands::start_dev_server(&PathBuf::from("examples/counter.wv"), 0).unwrap();
    let port = listener.local_addr().unwrap().port();

    let server_handle = std::thread::spawn(move || {
        commands::serve_single_request(&listener, &PathBuf::from("examples/counter.wv")).unwrap();
    });

    // Send HTTP GET request to dev server
    let mut stream = TcpStream::connect(format!("127.0.0.1:{}", port)).unwrap();
    stream.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n").unwrap();

    let mut response = String::new();
    stream.read_to_string(&mut response).unwrap();

    assert!(response.contains("HTTP/1.1 200 OK"));
    assert!(response.contains("text/html"));
    assert!(response.contains("Weave App"));

    server_handle.join().unwrap();
}

#[test]
fn test_cli_command_parse() {
    let res = commands::parse(&PathBuf::from("examples/counter.wv"), false);
    assert!(res.is_ok());
    let output = res.unwrap();
    assert!(output.contains("Component: CounterApp"));
    assert!(output.contains("Store: CounterStore"));

    let res_cst = commands::parse(&PathBuf::from("examples/counter.wv"), true);
    assert!(res_cst.is_ok());
    let cst_output = res_cst.unwrap();
    assert!(cst_output.contains("SOURCE_FILE"));
}

#[test]
fn test_cli_path_resolution() {
    use weave_core::cli::runner::resolve_path;

    // Relative path resolution
    let rel_path = PathBuf::from("examples/counter.wv");
    let resolved_rel = resolve_path(&rel_path).unwrap();
    assert!(resolved_rel.is_absolute());
    assert!(resolved_rel.exists());
    assert!(resolved_rel.ends_with("examples/counter.wv"));

    // Absolute path resolution
    let cwd = std::env::current_dir().unwrap();
    let abs_path = cwd.join("examples/counter.wv");
    let resolved_abs = resolve_path(&abs_path).unwrap();
    assert_eq!(resolved_abs, fs::canonicalize(&abs_path).unwrap());

    // Non-existent path returns joined path without hardcoded /workspace
    let non_existent = PathBuf::from("some/random/file.wv");
    let resolved_non_existent = resolve_path(&non_existent).unwrap();
    assert!(!resolved_non_existent.exists());
    assert!(resolved_non_existent.ends_with("some/random/file.wv"));
    assert!(!resolved_non_existent.to_string_lossy().starts_with("/workspace"));
}

#[tokio::test]
async fn test_cli_command_run() {
    use weave_core::cli::runner::run;

    let res = run(&PathBuf::from("examples/counter.wv"), None).await;
    assert!(res.is_ok());

    let invalid_res = run(&PathBuf::from("nonexistent_run_target.wv"), None).await;
    assert!(invalid_res.is_err());
    let err_msg = invalid_res.unwrap_err().to_string();
    assert!(err_msg.contains("Path does not exist"));
}
