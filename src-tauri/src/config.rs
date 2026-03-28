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

/// Map schema category id to the Chinese section name used in the config file.
fn category_to_section_name(category: &str) -> &'static str {
    match category {
        "font"       => "字体",
        "appearance" => "外观",
        "window"     => "窗口",
        "terminal"   => "终端行为",
        "mouse"      => "鼠标",
        "clipboard"  => "剪贴板",
        "macos"      => "macOS",
        _            => "其他",
    }
}

/// Returns true if the line looks like a section header (e.g. `# ── 字体 ───…`).
fn is_section_header(line: &Line) -> bool {
    matches!(line, Line::Comment(s) if s.contains("── "))
}

/// Find the position at which to insert lines at the end of a named section.
/// Inserts before any trailing blank lines that separate sections.
fn find_section_insert_pos(lines: &[Line], section_name: &str) -> Option<usize> {
    // Find the header line for this section
    let header_idx = lines.iter().position(|l| {
        matches!(l, Line::Comment(s) if s.contains(&format!("── {}", section_name)))
    })?;

    // Find the start of the next section (or EOF)
    let next_section = lines[header_idx + 1..]
        .iter()
        .position(|l| is_section_header(l))
        .map(|i| header_idx + 1 + i)
        .unwrap_or(lines.len());

    // Walk back past trailing blank lines so we insert inside the section
    let mut pos = next_section;
    while pos > header_idx + 1 && matches!(lines.get(pos - 1), Some(Line::Empty)) {
        pos -= 1;
    }
    Some(pos)
}

/// Update or insert a key with schema metadata.
/// - If the key already exists anywhere in the file, it is updated in-place
///   and its surrounding comments are left untouched.
/// - If the key is new, it is inserted at the end of its category section
///   preceded by a description comment.  If the section does not exist yet,
///   a new section block is appended at the end of the file.
pub fn upsert_structured(
    lines: &mut Vec<Line>,
    key: &str,
    value: &str,
    category: &str,
    description: &str,
) {
    // Update in-place when the key already exists
    if let Some(idx) = lines.iter().position(|l| matches!(l, Line::Entry { key: k, .. } if k == key)) {
        // Update the value
        if let Line::Entry { value: v, .. } = &mut lines[idx] {
            *v = value.to_string();
        }
        // Sync the description comment directly above the entry
        if !description.is_empty() {
            if idx > 0 && !is_section_header(&lines[idx - 1]) {
                if let Line::Comment(_) = &lines[idx - 1] {
                    // Replace the existing comment with the current schema description
                    lines[idx - 1] = Line::Comment(format!("# {}", description));
                    return;
                }
            }
            // No description comment yet — insert one right above the entry
            lines.insert(idx, Line::Comment(format!("# {}", description)));
        }
        return;
    }

    // New key — place it inside the right section
    let section_name = category_to_section_name(category);

    if let Some(pos) = find_section_insert_pos(lines, section_name) {
        // If the section already has content (not just the header), add a blank separator
        let needs_blank = pos > 0 && !matches!(lines.get(pos - 1), Some(Line::Empty));
        let mut offset = 0;
        if needs_blank {
            lines.insert(pos, Line::Empty);
            offset += 1;
        }
        if !description.is_empty() {
            lines.insert(pos + offset, Line::Comment(format!("# {}", description)));
            lines.insert(pos + offset + 1, Line::Entry { key: key.to_string(), value: value.to_string() });
        } else {
            lines.insert(pos + offset, Line::Entry { key: key.to_string(), value: value.to_string() });
        }
    } else {
        // Section not found — create it at the end of the file
        if !matches!(lines.last(), Some(Line::Empty)) {
            lines.push(Line::Empty);
        }
        let pad = "─".repeat(60usize.saturating_sub(section_name.chars().count() + 4));
        lines.push(Line::Comment(format!("# ── {} {}", section_name, pad)));
        if !description.is_empty() {
            lines.push(Line::Comment(format!("# {}", description)));
        }
        lines.push(Line::Entry { key: key.to_string(), value: value.to_string() });
    }
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
