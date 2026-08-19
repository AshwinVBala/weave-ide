use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentProviderStatus {
    pub provider: String,
    pub installed: bool,
    pub authenticated: bool,
    pub auth_mode: String,
    pub has_api_key: bool,
    pub executable: Option<String>,
    pub detail: String,
}

const KEYRING_SERVICE: &str = "com.weave.ide.ai";

fn api_key_entry(provider: &str) -> Result<keyring::Entry, String> {
    provider_binary(provider)?;
    keyring::Entry::new(KEYRING_SERVICE, &provider.to_lowercase())
        .map_err(|error| format!("Could not access the system credential store: {error}"))
}

fn stored_api_key(provider: &str) -> Result<String, String> {
    api_key_entry(provider)?
        .get_password()
        .map_err(|_| format!("No {provider} API key is saved."))
}

fn has_stored_api_key(provider: &str) -> bool {
    api_key_entry(provider)
        .and_then(|entry| entry.get_password().map_err(|error| error.to_string()))
        .map(|key| !key.trim().is_empty())
        .unwrap_or(false)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AgentExecutionResult {
    pub success: bool,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

fn provider_binary(provider: &str) -> Result<&'static str, String> {
    match provider {
        "OpenAI" => Ok("codex"),
        "Anthropic" => Ok("claude"),
        "Google" => Ok("agy"),
        "Ollama" => Ok("ollama"),
        _ => Err(format!("Unsupported AI provider: {provider}")),
    }
}

fn executable_candidates(binary: &str) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Some(path_var) = env::var_os("PATH") {
        paths.extend(env::split_paths(&path_var).map(|path| path.join(binary)));
    }
    paths.push(PathBuf::from(format!("/opt/homebrew/bin/{binary}")));
    paths.push(PathBuf::from(format!("/usr/local/bin/{binary}")));
    paths.push(PathBuf::from(format!("/usr/bin/{binary}")));
    if let Some(home) = env::var_os("HOME") {
        let home = PathBuf::from(home);
        paths.push(home.join(".local/bin").join(binary));
        paths.push(home.join(".npm-global/bin").join(binary));
    }
    #[cfg(target_os = "windows")]
    {
        if let Some(app_data) = env::var_os("APPDATA") {
            paths.push(
                PathBuf::from(app_data)
                    .join("npm")
                    .join(format!("{binary}.cmd")),
            );
        }
        if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
            paths.push(
                PathBuf::from(local_app_data)
                    .join("Programs")
                    .join(binary)
                    .join(format!("{binary}.exe")),
            );
        }
    }
    paths
}

fn find_executable(binary: &str) -> Option<PathBuf> {
    executable_candidates(binary)
        .into_iter()
        .find(|candidate| candidate.is_file())
}

fn combined_output(output: &std::process::Output) -> String {
    format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

fn check_provider(provider: &str) -> Result<AgentProviderStatus, String> {
    let binary = provider_binary(provider)?;
    let has_api_key = provider != "Ollama" && has_stored_api_key(provider);
    let Some(executable) = find_executable(binary) else {
        return Ok(AgentProviderStatus {
            provider: provider.to_string(),
            installed: false,
            authenticated: false,
            auth_mode: "unavailable".to_string(),
            has_api_key,
            executable: None,
            detail: if has_api_key {
                "API key saved securely. Install the official client to add account login."
                    .to_string()
            } else {
                format!("Install the official {binary} client to connect this account.")
            },
        });
    };

    let mut status = AgentProviderStatus {
        provider: provider.to_string(),
        installed: true,
        authenticated: false,
        auth_mode: "account".to_string(),
        has_api_key,
        executable: Some(executable.to_string_lossy().to_string()),
        detail: "Installed. Connect your account to use its included limits.".to_string(),
    };

    match provider {
        "OpenAI" => {
            if let Ok(output) = Command::new(&executable).args(["login", "status"]).output() {
                let text = combined_output(&output);
                let normalized = text.to_lowercase();
                status.authenticated = output.status.success()
                    && (normalized.contains("logged in") || normalized.contains("authenticated"));
                status.auth_mode = if normalized.contains("api key") {
                    "api_key".to_string()
                } else if status.authenticated {
                    "oauth".to_string()
                } else {
                    "account".to_string()
                };
                status.detail = if status.auth_mode == "oauth" {
                    "Connected with ChatGPT. Usage follows this account's plan limits.".to_string()
                } else if status.auth_mode == "api_key" {
                    "Codex is using API billing. Reconnect to switch to a ChatGPT plan.".to_string()
                } else {
                    "Codex is installed but is not signed in.".to_string()
                };
            }
        }
        "Anthropic" => {
            let output = Command::new(&executable)
                .args(["auth", "status", "--json"])
                .env_remove("ANTHROPIC_API_KEY")
                .output();
            if let Ok(output) = output {
                if let Ok(value) = serde_json::from_slice::<Value>(&output.stdout) {
                    status.authenticated = value
                        .get("loggedIn")
                        .and_then(Value::as_bool)
                        .unwrap_or(false);
                    let method = value
                        .get("authMethod")
                        .and_then(Value::as_str)
                        .unwrap_or("account");
                    status.auth_mode = if method.contains("oauth") {
                        "oauth".to_string()
                    } else {
                        method.to_string()
                    };
                }
                status.detail = if status.authenticated {
                    "Connected with Claude. Usage follows this account's plan limits.".to_string()
                } else {
                    "Claude Code is installed but is not signed in.".to_string()
                };
            }
        }
        "Google" => {
            // Antigravity has no fast, side-effect-free auth status command. A real request
            // performs the definitive account check without exposing credentials to Weave.
            status.auth_mode = "oauth".to_string();
            status.detail =
                "Antigravity is installed. Google account access is verified on first use."
                    .to_string();
        }
        "Ollama" => {
            status.authenticated = true;
            status.auth_mode = "local".to_string();
            status.detail =
                "Local runtime detected. No account or API key is required.".to_string();
        }
        _ => {}
    }
    Ok(status)
}

async fn provider_error(response: reqwest::Response, provider: &str) -> String {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let summary: String = body.chars().take(300).collect();
    format!("{provider} rejected the request ({status}): {summary}")
}

async fn validate_api_key(provider: &str, api_key: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = match provider {
        "OpenAI" => {
            client
                .get("https://api.openai.com/v1/models")
                .bearer_auth(api_key)
                .send()
                .await
        }
        "Anthropic" => {
            client
                .get("https://api.anthropic.com/v1/models")
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .send()
                .await
        }
        "Google" => {
            client
                .get("https://generativelanguage.googleapis.com/v1beta/models")
                .query(&[("key", api_key)])
                .send()
                .await
        }
        _ => return Err(format!("{provider} does not support API-key login.")),
    }
    .map_err(|_| format!("Could not reach {provider} to verify this key."))?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(provider_error(response, provider).await)
    }
}

#[tauri::command]
pub async fn save_provider_api_key(provider: String, api_key: String) -> Result<String, String> {
    let api_key = api_key.trim().to_string();
    if api_key.len() < 12 {
        return Err("Enter a complete API key.".to_string());
    }
    validate_api_key(&provider, &api_key).await?;
    let provider_for_store = provider.clone();
    tauri::async_runtime::spawn_blocking(move || {
        api_key_entry(&provider_for_store)?
            .set_password(&api_key)
            .map_err(|error| format!("Could not save the API key securely: {error}"))
    })
    .await
    .map_err(|error| format!("Credential storage task failed: {error}"))??;
    Ok(format!(
        "{provider} API key verified and saved in the system credential store."
    ))
}

#[tauri::command]
pub async fn delete_provider_api_key(provider: String) -> Result<String, String> {
    let provider_for_store = provider.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let entry = api_key_entry(&provider_for_store)?;
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(format!("Could not delete the saved API key: {error}")),
        }
    })
    .await
    .map_err(|error| format!("Credential storage task failed: {error}"))??;
    Ok(format!("Removed the saved {provider} API key."))
}

fn extract_openai_text(value: &Value) -> Option<String> {
    if let Some(text) = value.get("output_text").and_then(Value::as_str) {
        return Some(text.to_string());
    }
    value
        .get("output")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .flat_map(|item| {
            item.get("content")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
        })
        .filter_map(|content| content.get("text").and_then(Value::as_str))
        .next()
        .map(str::to_string)
}

#[tauri::command]
pub async fn execute_api_prompt(
    provider: String,
    model: String,
    prompt: String,
) -> Result<String, String> {
    let provider_for_key = provider.clone();
    let api_key = tauri::async_runtime::spawn_blocking(move || stored_api_key(&provider_for_key))
        .await
        .map_err(|error| format!("Credential lookup task failed: {error}"))??;
    let client = reqwest::Client::new();

    let response = match provider.as_str() {
        "OpenAI" => {
            client
                .post("https://api.openai.com/v1/responses")
                .bearer_auth(&api_key)
                .json(&serde_json::json!({ "model": model, "input": prompt }))
                .send()
                .await
        }
        "Anthropic" => {
            client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", &api_key)
                .header("anthropic-version", "2023-06-01")
                .json(&serde_json::json!({
                    "model": model,
                    "max_tokens": 8192,
                    "messages": [{ "role": "user", "content": prompt }]
                }))
                .send()
                .await
        }
        "Google" => {
            client
                .post(format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            ))
                .query(&[("key", &api_key)])
                .json(&serde_json::json!({
                    "contents": [{ "role": "user", "parts": [{ "text": prompt }] }]
                }))
                .send()
                .await
        }
        _ => return Err(format!("{provider} does not support API-key execution.")),
    }
    .map_err(|_| format!("Could not reach {provider} to complete the request."))?;

    if !response.status().is_success() {
        return Err(provider_error(response, &provider).await);
    }
    let value: Value = response
        .json()
        .await
        .map_err(|error| format!("Could not parse {provider} response: {error}"))?;
    let text = match provider.as_str() {
        "OpenAI" => extract_openai_text(&value),
        "Anthropic" => value
            .get("content")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|item| item.get("text").and_then(Value::as_str))
            .next()
            .map(str::to_string),
        "Google" => value
            .pointer("/candidates/0/content/parts/0/text")
            .and_then(Value::as_str)
            .map(str::to_string),
        _ => None,
    };
    text.filter(|value| !value.trim().is_empty())
        .ok_or_else(|| format!("{provider} returned an empty response."))
}

#[tauri::command]
pub fn check_agent_providers() -> Result<Vec<AgentProviderStatus>, String> {
    ["OpenAI", "Anthropic", "Google", "Ollama"]
        .iter()
        .map(|provider| check_provider(provider))
        .collect()
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

#[cfg(target_os = "macos")]
fn open_login_terminal(executable: &Path, args: &[&str]) -> Result<(), String> {
    let mut terminal_command = shell_quote(&executable.to_string_lossy());
    for arg in args {
        terminal_command.push(' ');
        terminal_command.push_str(&shell_quote(arg));
    }
    let escaped = terminal_command.replace('\\', "\\\\").replace('"', "\\\"");
    let script = format!("tell application \"Terminal\" to do script \"{escaped}\"");
    Command::new("osascript")
        .args(["-e", &script])
        .spawn()
        .map_err(|error| format!("Could not open Terminal: {error}"))?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn open_login_terminal(executable: &Path, args: &[&str]) -> Result<(), String> {
    let mut terminal_command = format!("& '{}'", executable.to_string_lossy().replace('\'', "''"));
    for arg in args {
        terminal_command.push_str(&format!(" '{}'", arg.replace('\'', "''")));
    }
    Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Start-Process",
            "powershell",
            "-ArgumentList",
            &format!("'-NoExit','-Command',\"{terminal_command}\""),
        ])
        .spawn()
        .map_err(|error| format!("Could not open PowerShell: {error}"))?;
    Ok(())
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
fn open_login_terminal(executable: &Path, args: &[&str]) -> Result<(), String> {
    Command::new("x-terminal-emulator")
        .arg("-e")
        .arg(executable)
        .args(args)
        .spawn()
        .map_err(|error| format!("Could not open a terminal: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn launch_agent_login(provider: String) -> Result<String, String> {
    let binary = provider_binary(&provider)?;
    let executable = find_executable(binary)
        .ok_or_else(|| format!("{binary} is not installed. Install the official client first."))?;
    let args: Vec<&str> = match provider.as_str() {
        "OpenAI" => vec!["login"],
        "Anthropic" => vec!["auth", "login"],
        "Google" => vec![],
        "Ollama" => return Ok("Ollama is local and does not require sign-in.".to_string()),
        _ => return Err(format!("Unsupported AI provider: {provider}")),
    };
    open_login_terminal(&executable, &args)?;
    Ok(format!(
        "Opened the official {provider} sign-in flow in Terminal."
    ))
}

fn build_agent_command(
    provider: &str,
    executable: &Path,
    model: Option<&str>,
) -> Result<Command, String> {
    let mut command = Command::new(executable);
    match provider {
        "OpenAI" => {
            command.args([
                "exec",
                "-",
                "--json",
                "--sandbox",
                "read-only",
                "--ephemeral",
                "--skip-git-repo-check",
            ]);
            if let Some(model) = model.filter(|value| !value.trim().is_empty()) {
                command.args(["--model", model]);
            }
            command.env_remove("OPENAI_API_KEY");
        }
        "Anthropic" => {
            command.args([
                "-p",
                "--output-format",
                "json",
                "--permission-mode",
                "plan",
                "--no-session-persistence",
            ]);
            if let Some(model) = model.filter(|value| !value.trim().is_empty()) {
                command.args(["--model", model]);
            }
            command.env_remove("ANTHROPIC_API_KEY");
        }
        "Google" => {
            command.args([
                "--output-format",
                "json",
                "--mode",
                "plan",
                "--print-timeout",
                "5m",
            ]);
            if let Some(model) = model.filter(|value| !value.trim().is_empty()) {
                command.args(["--model", model]);
            }
            command.env_remove("GEMINI_API_KEY");
            command.env_remove("GOOGLE_API_KEY");
        }
        _ => {
            return Err(format!(
                "Provider {provider} does not use an account agent runtime."
            ))
        }
    }
    Ok(command)
}

fn execute_agent_prompt_blocking(
    provider: String,
    model: Option<String>,
    prompt: String,
) -> Result<AgentExecutionResult, String> {
    let binary = provider_binary(&provider)?;
    let executable = find_executable(binary)
        .ok_or_else(|| format!("{binary} is not installed. Connect this provider in Settings."))?;
    let mut command = build_agent_command(&provider, &executable, model.as_deref())?;
    let prompt_via_stdin = provider != "Google";
    if !prompt_via_stdin {
        // Antigravity's --print flag requires the prompt as its value. Keeping it last also
        // prevents the CLI from interpreting the next option (such as --output-format) as text.
        command.args(["--print", &prompt]);
    }
    let mut child = command
        .stdin(if prompt_via_stdin {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Failed to start {binary}: {error}"))?;
    if prompt_via_stdin {
        let mut stdin = child
            .stdin
            .take()
            .ok_or_else(|| format!("Failed to open {binary} input"))?;
        stdin
            .write_all(prompt.as_bytes())
            .map_err(|error| format!("Failed to send prompt to {binary}: {error}"))?;
        drop(stdin);
    }
    let output = child
        .wait_with_output()
        .map_err(|error| format!("Failed while waiting for {binary}: {error}"))?;
    Ok(AgentExecutionResult {
        success: output.status.success(),
        exit_code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[tauri::command]
pub async fn execute_agent_prompt(
    provider: String,
    model: Option<String>,
    prompt: String,
) -> Result<AgentExecutionResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        execute_agent_prompt_blocking(provider, model, prompt)
    })
    .await
    .map_err(|error| format!("Agent runtime task failed: {error}"))?
}
