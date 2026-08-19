pub mod ast;
pub mod cli;
pub mod codegen;
pub mod diagnostics;
pub mod lexer;
pub mod parser;
pub mod syntax;
pub mod typecheck;
pub mod wasm;

pub use ast::{AstNode, SourceFile};
pub use cli::{Cli, Commands};
pub use codegen::{compile_to_js, generate_html, generate_tsx};
pub use diagnostics::Diagnostic;
pub use lexer::{Lexer, SpannedToken, TokenKind};
pub use parser::{ParseError, ParseResult, Parser};
pub use syntax::{SyntaxElement, SyntaxKind, SyntaxNode, SyntaxToken, WeaveLanguage};
pub use typecheck::{check as typecheck, Type, TypeCheckResult, TypeError};
pub use wasm::{check_diagnostics, parse_source};

/// Helper function to parse a Weave source string into a typed AST SourceFile.
pub fn parse(source: &str) -> ParseResult {
    Parser::parse(source)
}
