pub mod html;
pub mod react;

pub use html::generate_html_runner;
pub use react::ReactCodeGen;

use crate::ast::SourceFile;

/// Transpiles a Weave AST SourceFile into standard React / TypeScript (.tsx) source code.
pub fn generate_tsx(root: &SourceFile) -> String {
    let codegen = ReactCodeGen::new();
    codegen.generate(root)
}

/// Generates a standalone self-contained HTML page that renders the default component.
pub fn generate_html(root: &SourceFile, title: &str) -> String {
    let tsx = generate_tsx(root);
    let comp_name = root
        .components()
        .next()
        .and_then(|c| c.name().map(|n| n.text()))
        .unwrap_or_else(|| "App".to_string());
    generate_html_runner(title, &comp_name, &tsx)
}

/// Compiles Weave source code string into React / TypeScript (TSX/JSX) code.
pub fn compile_to_js(code: &str) -> String {
    let parse_res = crate::parse(code);
    let root = parse_res.root();
    generate_tsx(&root)
}

/// Compiles Weave source code string into a self-contained HTML page.
pub fn compile_to_html(code: &str, title: &str) -> String {
    let parse_res = crate::parse(code);
    let root = parse_res.root();
    generate_html(&root, title)
}
