mod ai_commands;
mod fs_commands;
mod terminal_commands;

use ai_commands::{
    check_agent_providers, delete_provider_api_key, execute_agent_prompt, execute_api_prompt,
    launch_agent_login, save_provider_api_key,
};
use fs_commands::{
    check_native_weave, create_dir, create_file, delete_entry, execute_native_weave, list_dir,
    read_file, rename_entry, write_file,
};
use terminal_commands::{execute_shell_command, get_git_branch, resolve_terminal_directory};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Weave IDE.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            list_dir,
            read_file,
            write_file,
            create_file,
            create_dir,
            delete_entry,
            rename_entry,
            check_native_weave,
            execute_native_weave,
            execute_shell_command,
            resolve_terminal_directory,
            get_git_branch,
            check_agent_providers,
            launch_agent_login,
            execute_agent_prompt,
            save_provider_api_key,
            delete_provider_api_key,
            execute_api_prompt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
