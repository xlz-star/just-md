// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::{Read, Write};
use std::path::Path;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// 文件树项目结构
#[derive(Serialize, Deserialize, Clone)]
struct FileTreeItem {
    name: String,
    path: String,
    is_directory: bool,
    level: i32,
    is_expanded: bool,
    children: Vec<FileTreeItem>,
}

// 文件树结果结构
#[derive(Serialize)]
struct FileTreeResult {
    root_path: String,
    items: Vec<FileTreeItem>,
}

// 获取文件扩展名
fn get_file_extension(file_name: &str) -> Option<String> {
    Path::new(file_name)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_lowercase())
}

// 检查是否是Markdown文件
fn is_markdown_file(file_name: &str) -> bool {
    if let Some(ext) = get_file_extension(file_name) {
        return ext == "md" || ext == "markdown";
    }
    false
}

// 读取目录内容
fn read_directory(dir_path: &Path, level: i32) -> Result<Vec<FileTreeItem>, String> {
    let mut result = Vec::new();
    
    // 读取目录内容
    let entries = match fs::read_dir(dir_path) {
        Ok(entries) => entries,
        Err(e) => return Err(format!("无法读取目录 {}: {}", dir_path.display(), e)),
    };
    
    // 处理每个目录项
    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(e) => {
                eprintln!("读取目录项失败: {}", e);
                continue;
            }
        };
        
        let path = entry.path();
        let is_dir = path.is_dir();
        
        // 获取文件名
        let file_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };
        
        // 如果是目录或Markdown文件
        if is_dir || is_markdown_file(&file_name) {
            let item = FileTreeItem {
                name: file_name,
                path: path.to_string_lossy().to_string(),
                is_directory: is_dir,
                level,
                is_expanded: false,
                children: Vec::new(),
            };
            result.push(item);
        }
    }
    
    // 对结果进行排序：目录优先，然后按名称排序
    result.sort_by(|a, b| {
        if a.is_directory && !b.is_directory {
            std::cmp::Ordering::Less
        } else if !a.is_directory && b.is_directory {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });
    
    Ok(result)
}

// 获取文件树数据
#[tauri::command]
fn get_file_tree(file_path: &str) -> Result<FileTreeResult, String> {
    // 获取文件所在目录
    let path = Path::new(file_path);
    let dir_path = if path.is_dir() {
        path.to_path_buf()
    } else {
        match path.parent() {
            Some(parent) => parent.to_path_buf(),
            None => return Err("无法获取父目录".to_string()),
        }
    };
    
    // 读取目录内容
    let items = read_directory(&dir_path, 0)?;
    
    // 返回结果
    Ok(FileTreeResult {
        root_path: dir_path.to_string_lossy().to_string(),
        items,
    })
}

// 获取目录子项
#[tauri::command]
fn get_directory_children(dir_path: &str) -> Result<Vec<FileTreeItem>, String> {
    let path = Path::new(dir_path);
    if !path.is_dir() {
        return Err(format!("不是有效的目录: {}", dir_path));
    }
    
    // 获取当前目录的级别（通过计算路径中的分隔符数量）
    let level = path.components().count() as i32;
    
    // 读取子目录内容
    read_directory(path, level)
}

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
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            read_markdown, 
            save_markdown,
            get_file_tree,
            get_directory_children
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
