// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::{Read, Write};
use std::path::Path;

// 读取Markdown文件内容
#[tauri::command]
fn read_markdown(path: &str) -> Result<String, String> {
    let path: &Path = Path::new(path);

    // 检查文件是否存在
    if !path.exists() {
        return Err(format!("文件不存在: {}", path.display()));
    }

    // 打开文件
    let mut file = match fs::File::open(path) {
        Ok(file) => file,
        Err(e) => return Err(format!("无法打开文件: {}", e)),
    };

    // 读取内容
    let mut content = String::new();
    if let Err(e) = file.read_to_string(&mut content) {
        return Err(format!("读取文件失败: {}", e));
    }

    Ok(content)
}

// 保存Markdown文件内容
#[tauri::command]
fn save_markdown(path: &str, content: &str) -> Result<(), String> {
    let path = Path::new(path);

    // 创建或打开文件
    let mut file = match fs::File::create(path) {
        Ok(file) => file,
        Err(e) => return Err(format!("无法创建文件: {}", e)),
    };

    // 写入内容
    if let Err(e) = file.write_all(content.as_bytes()) {
        return Err(format!("写入文件失败: {}", e));
    }

    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![read_markdown, save_markdown])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
