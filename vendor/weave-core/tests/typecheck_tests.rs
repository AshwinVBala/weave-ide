use weave_core::parser::Parser;
use weave_core::typecheck::{self, TypeError};

fn check_source(source: &str) -> Vec<TypeError> {
    let parsed = Parser::parse(source);
    assert!(parsed.is_ok(), "Source should parse cleanly");
    let res = typecheck::check(&parsed.root());
    res.errors
}

#[test]
fn test_typecheck_valid_counter_wv() {
    let source = include_str!("../examples/counter.wv");
    let errors = check_source(source);
    assert!(errors.is_empty(), "Expected no type errors in counter.wv, found: {:?}", errors);
}

#[test]
fn test_typecheck_valid_todo_app_wv() {
    let source = include_str!("../examples/todo_app.wv");
    let errors = check_source(source);
    assert!(errors.is_empty(), "Expected no type errors in todo_app.wv, found: {:?}", errors);
}

#[test]
fn test_typecheck_valid_dashboard_wv() {
    let source = include_str!("../examples/dashboard.wv");
    let errors = check_source(source);
    assert!(errors.is_empty(), "Expected no type errors in dashboard.wv, found: {:?}", errors);
}

#[test]
fn test_typecheck_undeclared_identifier() {
    let source = r#"
        component BadComponent() {
            var a: Int = 10;
            VStack {
                Text(undeclaredVar);
            }
        }
    "#;
    let errors = check_source(source);
    assert_eq!(errors.len(), 1);
    match &errors[0] {
        TypeError::UndeclaredIdentifier { name, .. } => {
            assert_eq!(name, "undeclaredVar");
        }
        other => panic!("Expected UndeclaredIdentifier, got {:?}", other),
    }
}

#[test]
fn test_typecheck_duplicate_declaration() {
    let source = r#"
        component DuplicateComponent() {
            var x: Int = 1;
            var x: String = "shadow";
        }
    "#;
    let errors = check_source(source);
    assert_eq!(errors.len(), 1);
    match &errors[0] {
        TypeError::DuplicateDeclaration { name, .. } => {
            assert_eq!(name, "x");
        }
        other => panic!("Expected DuplicateDeclaration, got {:?}", other),
    }
}

#[test]
fn test_typecheck_type_mismatch_var_init() {
    let source = r#"
        component MismatchComponent() {
            var count: Int = "not a number";
        }
    "#;
    let errors = check_source(source);
    assert_eq!(errors.len(), 1);
    match &errors[0] {
        TypeError::TypeMismatch { context, .. } => {
            assert!(context.contains("count"));
        }
        other => panic!("Expected TypeMismatch, got {:?}", other),
    }
}

#[test]
fn test_typecheck_invalid_binary_operations() {
    let source = r#"
        component BinaryOpComponent() {
            var a: Bool = true;
            var b: Int = 42;
            var c: Int = a - b;
        }
    "#;
    let errors = check_source(source);
    assert!(!errors.is_empty());
    assert!(errors.iter().any(|e| matches!(e, TypeError::InvalidBinaryOperation { op, .. } if op == "-")));
}

#[test]
fn test_typecheck_compound_assignment_types() {
    let valid_source = r#"
        component ValidCompound() {
            var count: Int = 0;
            var label: String = "item";
            VStack {
                Button("Inc", onClick: () -> {
                    count += 1;
                    count -= 2;
                    count *= 3;
                    count /= 4;
                    label += "s";
                });
            }
        }
    "#;
    let errors = check_source(valid_source);
    assert!(errors.is_empty(), "Compound assignments with valid types should pass: {:?}", errors);

    let invalid_source = r#"
        component InvalidCompound() {
            var label: String = "item";
            VStack {
                Button("Err", onClick: () -> {
                    label -= 2;
                });
            }
        }
    "#;
    let invalid_errors = check_source(invalid_source);
    assert!(!invalid_errors.is_empty());
    assert!(invalid_errors.iter().any(|e| matches!(e, TypeError::InvalidBinaryOperation { op, .. } if op == "-=")));
}
