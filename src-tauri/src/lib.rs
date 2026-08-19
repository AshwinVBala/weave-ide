mod fs_commands;

use fs_commands::{
    check_native_weave, create_dir, create_file, delete_entry, execute_native_weave, list_dir,
    read_file, write_file,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Weave IDE.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            list_dir,
            read_file,
            write_file,
            create_file,
            create_dir,
            delete_entry,
            check_native_weave,
            execute_native_weave,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
