mod config;
mod schema;

use std::collections::HashMap;
use std::fs;
use schema::ConfigField;
use tauri::Manager;

// ── Theme support ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ThemeColors {
    pub background: String,
    pub foreground: String,
    pub palette: Vec<String>,             // 16 entries, hex without #
    pub cursor_color: Option<String>,
    pub selection_background: Option<String>,
    pub selection_foreground: Option<String>,
}

fn themes_dir() -> Option<std::path::PathBuf> {
    [
        "/Applications/Ghostty.app/Contents/Resources/ghostty/themes",
        "/usr/share/ghostty/themes",
        "/usr/local/share/ghostty/themes",
    ]
    .iter()
    .map(std::path::PathBuf::from)
    .find(|p| p.exists())
}

/// Normalise a raw color string (strips #, expands 3-digit shorthand) to 6-char hex.
fn parse_hex(s: &str) -> String {
    let s = s.trim().trim_start_matches('#');
    if s.len() == 3 {
        s.chars().flat_map(|c| [c, c]).collect::<String>().to_lowercase()
    } else {
        s.to_lowercase()
    }
}

fn parse_theme_file(content: &str) -> ThemeColors {
    let mut bg = "1d1f21".to_string();
    let mut fg = "c5c8c6".to_string();
    let mut palette = vec!["000000".to_string(); 16];
    let mut cursor_color = None;
    let mut selection_bg = None;
    let mut selection_fg = None;

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, val)) = line.split_once('=') {
            match key.trim() {
                "background" => bg = parse_hex(val.trim()),
                "foreground" => fg = parse_hex(val.trim()),
                "cursor-color" => cursor_color = Some(parse_hex(val.trim())),
                "selection-background" => selection_bg = Some(parse_hex(val.trim())),
                "selection-foreground" => selection_fg = Some(parse_hex(val.trim())),
                "palette" => {
                    // value looks like "0=#21222c"
                    if let Some((idx_s, color)) = val.trim().split_once('=') {
                        if let Ok(idx) = idx_s.trim().parse::<usize>() {
                            if idx < 16 {
                                palette[idx] = parse_hex(color.trim());
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    ThemeColors {
        background: bg,
        foreground: fg,
        palette,
        cursor_color,
        selection_background: selection_bg,
        selection_foreground: selection_fg,
    }
}

#[tauri::command]
fn get_theme(name: String) -> Result<ThemeColors, String> {
    let dir = themes_dir().ok_or_else(|| "未找到 Ghostty 主题目录".to_string())?;
    let path = dir.join(&name);
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(parse_theme_file(&content))
}

#[tauri::command]
fn get_all_themes() -> Result<HashMap<String, ThemeColors>, String> {
    let dir = themes_dir().ok_or_else(|| "未找到 Ghostty 主题目录".to_string())?;
    let mut result = HashMap::new();

    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().into_string().unwrap_or_default();
        if name.is_empty() {
            continue;
        }
        if let Ok(content) = fs::read_to_string(entry.path()) {
            result.insert(name, parse_theme_file(&content));
        }
    }

    Ok(result)
}

#[tauri::command]
fn list_fonts() -> Result<Vec<String>, String> {
    use font_kit::source::SystemSource;
    let source = SystemSource::new();
    let mut families = source.all_families().map_err(|e| e.to_string())?;
    families.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(families)
}

#[tauri::command]
fn get_schema() -> Vec<ConfigField> {
    schema::get_schema()
}

#[tauri::command]
fn get_config_path() -> String {
    config::config_path().to_string_lossy().to_string()
}

#[tauri::command]
fn load_config() -> Result<HashMap<String, String>, String> {
    let lines = config::load()?;
    Ok(config::to_map(&lines))
}

#[tauri::command]
fn save_config(entries: HashMap<String, String>) -> Result<(), String> {
    let mut lines = config::load().unwrap_or_default();
    let schema = schema::get_schema();
    for (key, value) in &entries {
        // Skip empty values — treat as "unset" (don't write to file)
        if !value.is_empty() {
            let (category, description) = schema
                .iter()
                .find(|f| f.key == *key)
                .map(|f| (f.category.as_str(), f.description.as_str()))
                .unwrap_or(("misc", ""));
            config::upsert_structured(&mut lines, key, value, category, description);
        }
    }
    config::save(&lines)
}

#[tauri::command]
fn reload_ghostty() -> Result<(), String> {
    use std::process::Command;
    // Ghostty uses SIGUSR2 (not SIGHUP) to trigger a config reload.
    // The macOS app bundle executable is lowercase "ghostty".
    // Try killall first; fall back to pkill -i for safety.
    let candidates: &[&[&str]] = &[
        &["killall", "-USR2", "ghostty"],
        &["pkill", "-USR2", "-i", "ghostty"],
    ];
    for args in candidates {
        let output = Command::new(args[0])
            .args(&args[1..])
            .output()
            .map_err(|e| e.to_string())?;
        // exit code 0 = signal sent; exit code 1 = no process found (not an error)
        if output.status.success() {
            return Ok(());
        }
        if output.status.code() == Some(1) {
            continue;
        }
        return Err(format!(
            "{} failed: {}",
            args[0],
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    // No running Ghostty process found — not an error
    Ok(())
}

/// Center the window within the screen's visible frame (excludes menu bar and Dock).
/// Tauri's built-in `window.center()` uses the full screen bounds and misses the
/// menu bar / Dock, so we call NSScreen.visibleFrame directly via objc2.
#[cfg(target_os = "macos")]
fn center_in_visible_frame(window: &tauri::WebviewWindow) {
    use objc2::MainThreadMarker;
    use objc2_app_kit::NSScreen;

    let Some(mtm) = MainThreadMarker::new() else { return };
    let Some(screen) = NSScreen::mainScreen(mtm) else { return };

    // visibleFrame: Cocoa coords, origin at bottom-left, excludes menu bar + Dock
    let visible = screen.visibleFrame();
    let full    = screen.frame();

    let scale = window.current_monitor()
        .ok().flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0);

    let win_phys = window.outer_size().unwrap_or_default();
    let win_w = win_phys.width  as f64 / scale;
    let win_h = win_phys.height as f64 / scale;

    // Center within visible area (Cocoa coords, Y from bottom)
    let x       = visible.origin.x + (visible.size.width  - win_w).max(0.0) / 2.0;
    let y_cocoa = visible.origin.y + (visible.size.height - win_h).max(0.0) / 2.0;

    // Convert Cocoa Y (bottom-left) → screen Y (top-left) as Tauri expects
    let y_screen = full.size.height - y_cocoa - win_h;

    let _ = window.set_position(tauri::LogicalPosition::new(x, y_screen));
}

#[cfg(not(target_os = "macos"))]
fn center_in_visible_frame(window: &tauri::WebviewWindow) {
    let _ = window.center();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                center_in_visible_frame(&window);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_schema,
            get_config_path,
            load_config,
            save_config,
            reload_ghostty,
            get_theme,
            get_all_themes,
            list_fonts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
