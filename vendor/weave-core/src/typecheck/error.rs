use crate::typecheck::types::Type;
use std::fmt;
use std::ops::Range;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TypeError {
    UndeclaredIdentifier {
        name: String,
        range: Range<usize>,
    },
    DuplicateDeclaration {
        name: String,
        range: Range<usize>,
    },
    TypeMismatch {
        expected: Type,
        actual: Type,
        range: Range<usize>,
        context: String,
    },
    InvalidBinaryOperation {
        op: String,
        lhs: Type,
        rhs: Type,
        range: Range<usize>,
    },
    InvalidUnaryOperation {
        op: String,
        expr_type: Type,
        range: Range<usize>,
    },
    StoreBindingError {
        store: String,
        member: String,
        range: Range<usize>,
    },
    InvalidStateMutation {
        name: String,
        range: Range<usize>,
        reason: String,
    },
}

impl TypeError {
    pub fn range(&self) -> Range<usize> {
        match self {
            TypeError::UndeclaredIdentifier { range, .. } => range.clone(),
            TypeError::DuplicateDeclaration { range, .. } => range.clone(),
            TypeError::TypeMismatch { range, .. } => range.clone(),
            TypeError::InvalidBinaryOperation { range, .. } => range.clone(),
            TypeError::InvalidUnaryOperation { range, .. } => range.clone(),
            TypeError::StoreBindingError { range, .. } => range.clone(),
            TypeError::InvalidStateMutation { range, .. } => range.clone(),
        }
    }

    pub fn message(&self) -> String {
        match self {
            TypeError::UndeclaredIdentifier { name, .. } => {
                format!("Undeclared identifier '{}'", name)
            }
            TypeError::DuplicateDeclaration { name, .. } => {
                format!("Duplicate declaration of '{}'", name)
            }
            TypeError::TypeMismatch {
                expected,
                actual,
                context,
                ..
            } => {
                format!(
                    "Type mismatch in {}: expected '{}', found '{}'",
                    context, expected, actual
                )
            }
            TypeError::InvalidBinaryOperation { op, lhs, rhs, .. } => {
                format!(
                    "Cannot apply binary operator '{}' to types '{}' and '{}'",
                    op, lhs, rhs
                )
            }
            TypeError::InvalidUnaryOperation { op, expr_type, .. } => {
                format!(
                    "Cannot apply unary operator '{}' to type '{}'",
                    op, expr_type
                )
            }
            TypeError::StoreBindingError { store, member, .. } => {
                format!("Member '{}' not found on store '{}'", member, store)
            }
            TypeError::InvalidStateMutation { name, reason, .. } => {
                format!("Invalid state mutation on '{}': {}", name, reason)
            }
        }
    }
}

impl fmt::Display for TypeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message())
    }
}

impl std::error::Error for TypeError {}
