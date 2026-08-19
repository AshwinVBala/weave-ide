use crate::parser::ParseError;
use crate::typecheck::TypeError;
use std::ops::Range;

#[derive(Debug, Clone)]
pub struct Diagnostic {
    pub message: String,
    pub span: Range<usize>,
    pub line: usize,
    pub column: usize,
}

impl Diagnostic {
    pub fn from_parse_error(source: &str, error: &ParseError) -> Self {
        let (line, column) = offset_to_line_col(source, error.span.start);
        Self {
            message: error.message.clone(),
            span: error.span.clone(),
            line,
            column,
        }
    }

    pub fn from_type_error(source: &str, error: &TypeError) -> Self {
        let range = error.range();
        let (line, column) = offset_to_line_col(source, range.start);
        Self {
            message: error.message(),
            span: range,
            line,
            column,
        }
    }

    pub fn render(&self, file_path: &str, source: &str) -> String {
        let mut out = String::new();
        out.push_str(&format!(
            "error: {}\n  --> {}:{}:{}\n",
            self.message, file_path, self.line, self.column
        ));

        let lines: Vec<&str> = source.lines().collect();
        if self.line > 0 && self.line <= lines.len() {
            let line_content = lines[self.line - 1];
            let line_num_str = format!("{}", self.line);
            let padding = " ".repeat(line_num_str.len());

            out.push_str(&format!("{} |\n", padding));
            out.push_str(&format!("{} | {}\n", line_num_str, line_content));
            out.push_str(&format!(
                "{} | {}{}\n",
                padding,
                " ".repeat(self.column.saturating_sub(1)),
                "^"
            ));
        }

        out
    }
}

pub fn offset_to_line_col(source: &str, offset: usize) -> (usize, usize) {
    let mut line = 1;
    let mut col = 1;

    for (i, c) in source.char_indices() {
        if i >= offset {
            break;
        }
        if c == '\n' {
            line += 1;
            col = 1;
        } else {
            col += 1;
        }
    }

    (line, col)
}
