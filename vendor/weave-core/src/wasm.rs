use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::ast::Item;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WasmDiagnostic {
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub severity: String,
    pub code: String,
    pub start_offset: usize,
    pub end_offset: usize,
    pub formatted: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WasmItemSummary {
    pub kind: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WasmParseOutput {
    pub ok: bool,
    pub error_count: usize,
    pub syntax_tree: String,
    pub items: Vec<WasmItemSummary>,
    pub diagnostics: Vec<WasmDiagnostic>,
}

#[wasm_bindgen]
pub fn check_diagnostics(code: &str) -> String {
    let mut diagnostics = Vec::new();

    // 1. Parse errors
    let parse_res = crate::parse(code);
    for err in parse_res.errors() {
        let (line, column) = crate::diagnostics::offset_to_line_col(code, err.span.start);
        let diag = crate::diagnostics::Diagnostic::from_parse_error(code, err);
        diagnostics.push(WasmDiagnostic {
            message: err.message.clone(),
            line,
            column,
            severity: "error".to_string(),
            code: "SYNTAX_ERROR".to_string(),
            start_offset: err.span.start,
            end_offset: err.span.end,
            formatted: diag.render("main.wv", code),
        });
    }

    // 2. Type errors
    let root = parse_res.root();
    let type_res = crate::typecheck(&root);
    for err in &type_res.errors {
        let range = err.range();
        let (line, column) = crate::diagnostics::offset_to_line_col(code, range.start);
        let diag = crate::diagnostics::Diagnostic::from_type_error(code, err);
        diagnostics.push(WasmDiagnostic {
            message: err.message(),
            line,
            column,
            severity: "error".to_string(),
            code: "TYPE_ERROR".to_string(),
            start_offset: range.start,
            end_offset: range.end,
            formatted: diag.render("main.wv", code),
        });
    }

    serde_json::to_string(&diagnostics).unwrap_or_else(|_| "[]".to_string())
}

#[wasm_bindgen]
pub fn parse_source(code: &str) -> String {
    let parse_res = crate::parse(code);
    let mut items = Vec::new();
    let mut diagnostics = Vec::new();

    for err in parse_res.errors() {
        let (line, column) = crate::diagnostics::offset_to_line_col(code, err.span.start);
        let diag = crate::diagnostics::Diagnostic::from_parse_error(code, err);
        diagnostics.push(WasmDiagnostic {
            message: err.message.clone(),
            line,
            column,
            severity: "error".to_string(),
            code: "SYNTAX_ERROR".to_string(),
            start_offset: err.span.start,
            end_offset: err.span.end,
            formatted: diag.render("main.wv", code),
        });
    }

    let root = parse_res.root();
    for item in root.items() {
        match item {
            Item::Component(c) => items.push(WasmItemSummary {
                kind: "component".to_string(),
                name: c.name().map(|n| n.text()).unwrap_or_default(),
            }),
            Item::Store(s) => items.push(WasmItemSummary {
                kind: "store".to_string(),
                name: s.name().map(|n| n.text()).unwrap_or_default(),
            }),
            Item::Server(_) => items.push(WasmItemSummary {
                kind: "server".to_string(),
                name: "server".to_string(),
            }),
            Item::Style(s) => items.push(WasmItemSummary {
                kind: "style".to_string(),
                name: s.name().map(|n| n.text()).unwrap_or_default(),
            }),
            Item::Resource(r) => items.push(WasmItemSummary {
                kind: "resource".to_string(),
                name: r.name().map(|n| n.text()).unwrap_or_default(),
            }),
            Item::Theme(t) => items.push(WasmItemSummary {
                kind: "theme".to_string(),
                name: t.name().map(|n| n.text()).unwrap_or_default(),
            }),
            Item::Function(f) => items.push(WasmItemSummary {
                kind: "fn".to_string(),
                name: f.name().map(|n| n.text()).unwrap_or_default(),
            }),
            Item::Var(v) => items.push(WasmItemSummary {
                kind: "var".to_string(),
                name: v.name().map(|n| n.text()).unwrap_or_default(),
            }),
            Item::Statement(_) => items.push(WasmItemSummary {
                kind: "statement".to_string(),
                name: "".to_string(),
            }),
            Item::Ui(u) => items.push(WasmItemSummary {
                kind: "ui".to_string(),
                name: u.tag_name().unwrap_or_default(),
            }),
        }
    }

    let output = WasmParseOutput {
        ok: parse_res.is_ok(),
        error_count: parse_res.errors().len(),
        syntax_tree: parse_res.debug_tree(),
        items,
        diagnostics,
    };

    serde_json::to_string(&output).unwrap_or_else(|_| "{}".to_string())
}

#[wasm_bindgen]
pub fn compile_to_js(code: &str) -> String {
    let parse_res = crate::parse(code);
    let root = parse_res.root();
    crate::codegen::generate_tsx(&root)
}

#[wasm_bindgen]
pub fn compile_to_html(code: &str, title: &str) -> String {
    let parse_res = crate::parse(code);
    let root = parse_res.root();
    crate::codegen::generate_html(&root, title)
}
