// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::{Read, Write};
use std::path::Path;
use serde::{Deserialize, Serialize};
use pulldown_cmark::{Parser, Options, html};
use std::sync::Mutex;
use std::sync::OnceLock;
use std::env;
use chrono::Local;
use std::path::PathBuf;
use dirs;

// 全局当前目录变量
static CURRENT_DIRECTORY: OnceLock<Mutex<Option<String>>> = OnceLock::new();

// 最近文件结构
#[derive(Serialize, Deserialize, Clone, Debug)]
struct RecentFile {
    path: String,
    name: String,
    last_opened: String, // ISO 8601 格式的时间戳
}

// 最近文件列表管理
static RECENT_FILES: OnceLock<Mutex<Vec<RecentFile>>> = OnceLock::new();

// 获取当前目录实例
fn get_current_directory() -> &'static Mutex<Option<String>> {
    CURRENT_DIRECTORY.get_or_init(|| Mutex::new(None))
}

// 获取最近文件列表实例
fn get_recent_files_mutex() -> &'static Mutex<Vec<RecentFile>> {
    RECENT_FILES.get_or_init(|| {
        let mut files = Vec::new();
        // 尝试从文件加载最近文件列表
        if let Ok(loaded_files) = load_recent_files_from_disk() {
            files = loaded_files;
        }
        Mutex::new(files)
    })
}

// 获取配置目录路径
fn get_config_dir() -> Result<PathBuf, String> {
    match dirs::config_dir() {
        Some(config_dir) => {
            let app_config_dir = config_dir.join("just-md");
            // 确保目录存在
            if !app_config_dir.exists() {
                if let Err(e) = fs::create_dir_all(&app_config_dir) {
                    return Err(format!("无法创建配置目录: {}", e));
                }
            }
            Ok(app_config_dir)
        }
        None => Err("无法获取配置目录".to_string()),
    }
}

// 从磁盘加载最近文件列表
fn load_recent_files_from_disk() -> Result<Vec<RecentFile>, String> {
    let config_dir = get_config_dir()?;
    let recent_files_path = config_dir.join("recent_files.json");
    
    if !recent_files_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = match fs::read_to_string(&recent_files_path) {
        Ok(content) => content,
        Err(e) => return Err(format!("读取最近文件配置失败: {}", e)),
    };
    
    match serde_json::from_str::<Vec<RecentFile>>(&content) {
        Ok(files) => Ok(files),
        Err(e) => {
            eprintln!("解析最近文件配置失败: {}", e);
            // 如果解析失败，返回空列表而不是错误
            Ok(Vec::new())
        }
    }
}

// 保存最近文件列表到磁盘
fn save_recent_files_to_disk(files: &[RecentFile]) -> Result<(), String> {
    let config_dir = get_config_dir()?;
    let recent_files_path = config_dir.join("recent_files.json");
    
    let json_content = match serde_json::to_string_pretty(files) {
        Ok(content) => content,
        Err(e) => return Err(format!("序列化最近文件列表失败: {}", e)),
    };
    
    if let Err(e) = fs::write(&recent_files_path, json_content) {
        return Err(format!("保存最近文件配置失败: {}", e));
    }
    
    Ok(())
}

// 设置当前目录
#[tauri::command]
fn set_current_directory(path: &str) -> Result<(), String> {
    let path_obj = Path::new(path);
    
    // 检查路径是否存在且是目录
    if !path_obj.exists() {
        return Err(format!("路径不存在: {}", path));
    }
    
    if !path_obj.is_dir() {
        return Err(format!("路径不是目录: {}", path));
    }
    
    // 保存当前目录
    let mut current_dir = get_current_directory().lock().unwrap();
    *current_dir = Some(path.to_string());
    
    Ok(())
}

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

// 将Markdown渲染为HTML (内部函数)
fn convert_markdown_to_html(markdown: &str) -> String {
    // 配置解析器选项，启用表格、脚注等扩展功能
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    
    // 创建解析器
    let parser = Parser::new_ext(markdown, options);
    
    // 渲染HTML
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    
    html_output
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
    } else if path.exists() {
        // 如果是文件，使用其父目录
        match path.parent() {
            Some(parent) => parent.to_path_buf(),
            None => return Err("无法获取父目录".to_string()),
        }
    } else {
        // 如果文件路径不存在，检查是否有保存的当前目录
        let current_dir = get_current_directory().lock().unwrap();
        match &*current_dir {
            Some(dir) => Path::new(dir).to_path_buf(),
            None => return Err("没有有效的目录路径".to_string()),
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

    // 将Markdown内容渲染为HTML
    let html_content = convert_markdown_to_html(&content);
    
    // 返回HTML内容
    Ok(html_content)
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

// 获取原始Markdown内容（不渲染）
#[tauri::command]
fn get_raw_markdown(path: &str) -> Result<String, String> {
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

    // 返回原始Markdown内容
    Ok(content)
}

// 将Markdown文本直接渲染为HTML（用于前端调用）
#[tauri::command]
fn render_markdown_to_html(markdown: &str) -> String {
    convert_markdown_to_html(markdown)
}


// 添加文件到最近文件列表
#[tauri::command]
fn add_recent_file(file_path: &str) -> Result<(), String> {
    let path = Path::new(file_path);
    
    // 检查文件是否存在
    if !path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }
    
    // 检查是否是 Markdown 文件
    if !is_markdown_file(file_path) {
        return Ok(()); // 不是 Markdown 文件，直接返回成功
    }
    
    let file_name = match path.file_name().and_then(|n| n.to_str()) {
        Some(name) => name.to_string(),
        None => return Err("无法获取文件名".to_string()),
    };
    
    let current_time = Local::now().to_rfc3339();
    
    let recent_file = RecentFile {
        path: file_path.to_string(),
        name: file_name,
        last_opened: current_time,
    };
    
    let recent_files_mutex = get_recent_files_mutex();
    let mut recent_files = recent_files_mutex.lock().unwrap();
    
    // 如果文件已存在，移除旧记录
    recent_files.retain(|f| f.path != file_path);
    
    // 添加到列表开头
    recent_files.insert(0, recent_file);
    
    // 限制最近文件数量（保留最近20个）
    const MAX_RECENT_FILES: usize = 20;
    if recent_files.len() > MAX_RECENT_FILES {
        recent_files.truncate(MAX_RECENT_FILES);
    }
    
    // 保存到磁盘
    if let Err(e) = save_recent_files_to_disk(&recent_files) {
        eprintln!("保存最近文件列表失败: {}", e);
    }
    
    Ok(())
}

// 获取最近文件列表
#[tauri::command]
fn get_recent_files() -> Vec<RecentFile> {
    let recent_files_mutex = get_recent_files_mutex();
    let recent_files = recent_files_mutex.lock().unwrap();
    
    // 过滤掉不存在的文件
    let existing_files: Vec<RecentFile> = recent_files
        .iter()
        .filter(|f| Path::new(&f.path).exists())
        .cloned()
        .collect();
    
    // 如果过滤后的列表与原列表不同，更新并保存
    if existing_files.len() != recent_files.len() {
        drop(recent_files); // 释放锁
        let recent_files_mutex = get_recent_files_mutex();
        let mut recent_files = recent_files_mutex.lock().unwrap();
        *recent_files = existing_files.clone();
        
        if let Err(e) = save_recent_files_to_disk(&recent_files) {
            eprintln!("更新最近文件列表失败: {}", e);
        }
    }
    
    existing_files
}

// 从最近文件列表中移除文件
#[tauri::command]
fn remove_recent_file(file_path: &str) -> Result<(), String> {
    let recent_files_mutex = get_recent_files_mutex();
    let mut recent_files = recent_files_mutex.lock().unwrap();
    
    let original_len = recent_files.len();
    recent_files.retain(|f| f.path != file_path);
    
    // 如果确实移除了文件，保存到磁盘
    if recent_files.len() != original_len {
        if let Err(e) = save_recent_files_to_disk(&recent_files) {
            eprintln!("保存最近文件列表失败: {}", e);
        }
    }
    
    Ok(())
}

// 清空最近文件列表
#[tauri::command]
fn clear_recent_files() -> Result<(), String> {
    let recent_files_mutex = get_recent_files_mutex();
    let mut recent_files = recent_files_mutex.lock().unwrap();
    
    recent_files.clear();
    
    // 保存到磁盘
    if let Err(e) = save_recent_files_to_disk(&recent_files) {
        return Err(format!("清空最近文件列表失败: {}", e));
    }
    
    Ok(())
}

// 导出为PDF（简单实现，通过HTML）
#[tauri::command]
fn export_to_pdf(_markdown: &str, _output_path: &str) -> Result<(), String> {
    // 暂时返回错误，提示需要外部工具
    // 在实际应用中，可以使用wkhtmltopdf或其他PDF生成库
    Err("PDF导出功能需要安装额外的依赖。请先导出为HTML，然后使用浏览器的打印功能保存为PDF。".to_string())
}

// 处理命令行参数
#[tauri::command]
fn get_cli_args() -> Vec<String> {
    env::args().collect()
}

// 检查并处理命令行参数中的文件路径
fn process_cli_args() -> Option<String> {
    let args: Vec<String> = env::args().collect();
    
    // 第一个参数是程序路径，检查是否有第二个参数
    if args.len() > 1 {
        let file_path = &args[1];
        let path = Path::new(file_path);
        
        // 检查路径是否存在
        if path.exists() {
            // 如果是文件夹，直接返回
            if path.is_dir() {
                return Some(file_path.clone());
            }
            // 如果是Markdown文件，返回文件路径
            else if is_markdown_file(file_path) {
                return Some(file_path.clone());
            }
        }
    }
    
    None
}

// 发送初始文件路径到前端
#[tauri::command]
fn get_initial_file() -> Option<String> {
    process_cli_args()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    // 处理命令行参数
    if let Some(path) = process_cli_args() {
        // 如果是目录，设置当前目录
        let path_obj = Path::new(&path);
        if path_obj.is_dir() {
            let mut current_dir = get_current_directory().lock().unwrap();
            *current_dir = Some(path.clone());
        }
        // 如果是文件，设置其父目录为当前目录
        else if path_obj.is_file() {
            if let Some(parent) = path_obj.parent() {
                if let Some(parent_str) = parent.to_str() {
                    let mut current_dir = get_current_directory().lock().unwrap();
                    *current_dir = Some(parent_str.to_string());
                }
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            read_markdown, 
            save_markdown,
            get_file_tree,
            get_directory_children,
            get_raw_markdown,
            render_markdown_to_html,
            add_recent_file,
            get_recent_files,
            remove_recent_file,
            clear_recent_files,
            export_to_pdf,
            set_current_directory,
            get_cli_args,
            get_initial_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
