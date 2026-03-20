use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// Represents a single line in the config file, preserving structure.
#[derive(Debug, Clone)]
pub enum Line {
    Comment(String),
    Empty,
    Entry { key: String, value: String },
}

pub fn config_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".config").join("ghostty").join("config")
}

pub fn parse(content: &str) -> Vec<Line> {
    content
        .lines()
        .map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                Line::Empty
            } else if trimmed.starts_with('#') {
                Line::Comment(line.to_string())
            } else if let Some((k, v)) = trimmed.split_once('=') {
                Line::Entry {
                    key: k.trim().to_string(),
                    value: v.trim().to_string(),
                }
            } else {
                Line::Comment(line.to_string())
            }
        })
        .collect()
}

pub fn serialize(lines: &[Line]) -> String {
    lines
        .iter()
        .map(|line| match line {
            Line::Comment(s) => s.clone(),
            Line::Empty => String::new(),
            Line::Entry { key, value } => format!("{} = {}", key, value),
        })
        .collect::<Vec<_>>()
        .join("\n")
}

pub fn to_map(lines: &[Line]) -> HashMap<String, String> {
    lines
        .iter()
        .filter_map(|line| {
            if let Line::Entry { key, value } = line {
                Some((key.clone(), value.clone()))
            } else {
                None
            }
        })
        .collect()
}

/// Update or insert a key. Existing entry is updated in-place; new entries appended.
pub fn upsert(lines: &mut Vec<Line>, key: &str, value: &str) {
    for line in lines.iter_mut() {
        if let Line::Entry { key: k, value: v } = line {
            if k == key {
                *v = value.to_string();
                return;
            }
        }
    }
    lines.push(Line::Entry {
        key: key.to_string(),
        value: value.to_string(),
    });
}

pub fn load() -> Result<Vec<Line>, String> {
    let path = config_path();
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(parse(&content))
}

/// Rotate backups before each save, keeping at most 3.
/// config.bak.1 (newest) … config.bak.3 (oldest)
fn rotate_backups(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    let bak = |n: u8| {
        let mut p = path.clone();
        p.set_file_name(format!(
            "{}.bak.{}",
            path.file_name().unwrap_or_default().to_string_lossy(),
            n
        ));
        p
    };
    // Drop the oldest slot then shift: .bak.2 → .bak.3, .bak.1 → .bak.2
    let _ = fs::remove_file(bak(3)); // ignore error if it doesn't exist
    for n in (1..=2u8).rev() {
        let src = bak(n);
        if src.exists() {
            fs::rename(&src, bak(n + 1)).map_err(|e| e.to_string())?;
        }
    }
    // Copy current config → .bak.1
    fs::copy(path, bak(1)).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn save(lines: &[Line]) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    rotate_backups(&path)?;
    fs::write(&path, serialize(lines)).map_err(|e| e.to_string())
}
