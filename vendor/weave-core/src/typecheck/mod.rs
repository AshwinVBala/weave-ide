pub mod checker;
pub mod error;
pub mod scope;
pub mod types;

pub use checker::{TypeCheckResult, TypeChecker};
pub use error::TypeError;
pub use scope::{ScopeTable, Symbol};
pub use types::Type;

use crate::ast::SourceFile;

/// Type checks a Weave AST SourceFile.
pub fn check(root: &SourceFile) -> TypeCheckResult {
    let checker = TypeChecker::new();
    checker.check(root)
}
