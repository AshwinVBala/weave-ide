use weave_core::ast::{Expr, Stmt};
use weave_core::parser::Parser;
use weave_core::syntax::SyntaxKind;

#[test]
fn test_parse_component() {
    let source = r##"
component Counter(title: String) {
    var count: Int = 0;

    VStack {
        Text(title);
        Button("Increment", onClick: () -> {
            count = count + 1;
        });
    }
}
"##;
    let res = Parser::parse(source);
    assert!(res.is_ok(), "Errors: {:?}", res.errors());

    let root = res.root();
    let components: Vec<_> = root.components().collect();
    assert_eq!(components.len(), 1);

    let comp = &components[0];
    assert_eq!(comp.name().unwrap().text(), "Counter");

    let params: Vec<_> = comp.param_list().unwrap().params().collect();
    assert_eq!(params.len(), 1);
    assert_eq!(params[0].name().unwrap().text(), "title");

    let body = comp.body().unwrap();
    let ui_elements: Vec<_> = body.ui_elements().collect();
    assert_eq!(ui_elements.len(), 1);
    assert_eq!(ui_elements[0].tag_name().unwrap(), "VStack");
}

#[test]
fn test_parse_store_and_server() {
    let source = r##"
store UserStore {
    var currentUser: String = "guest";

    fn login(name: String) -> Bool {
        currentUser = name;
        return true;
    }
}

server {
    fn verifyUser(id: Int) -> Bool {
        return true;
    }
}
"##;
    let res = Parser::parse(source);
    assert!(res.is_ok(), "Errors: {:?}", res.errors());

    let root = res.root();
    let stores: Vec<_> = root.stores().collect();
    assert_eq!(stores.len(), 1);
    assert_eq!(stores[0].name().unwrap().text(), "UserStore");

    let store_fns: Vec<_> = stores[0].functions().collect();
    assert_eq!(store_fns.len(), 1);
    assert_eq!(store_fns[0].name().unwrap().text(), "login");

    let servers: Vec<_> = root.servers().collect();
    assert_eq!(servers.len(), 1);
    let srv_fns: Vec<_> = servers[0].functions().collect();
    assert_eq!(srv_fns.len(), 1);
    assert_eq!(srv_fns[0].name().unwrap().text(), "verifyUser");
}

#[test]
fn test_parse_style_definition() {
    let source = r##"
style CardStyle {
    padding: 16;
    background: "#ffffff";
    borderRadius: 8;
}
"##;
    let res = Parser::parse(source);
    assert!(res.is_ok(), "Errors: {:?}", res.errors());

    let root = res.root();
    let styles: Vec<_> = root.styles().collect();
    assert_eq!(styles.len(), 1);
    assert_eq!(styles[0].name().unwrap().text(), "CardStyle");

    let props: Vec<_> = styles[0].properties().collect();
    assert_eq!(props.len(), 3);
    assert_eq!(props[0].name().unwrap().text(), "padding");
    assert_eq!(props[1].name().unwrap().text(), "background");
    assert_eq!(props[2].name().unwrap().text(), "borderRadius");
}

#[test]
fn test_parse_ui_primitives() {
    let source = r##"
component UiDemo() {
    VStack {
        HStack {
            Text("Label");
            TextField(placeholder: "Input here");
            Button("Click Me");
        }
    }
}
"##;
    let res = Parser::parse(source);
    assert!(res.is_ok(), "Errors: {:?}", res.errors());

    let root = res.root();
    let comp = root.components().next().unwrap();
    let vstack = comp.body().unwrap().ui_elements().next().unwrap();
    assert_eq!(vstack.tag_name().unwrap(), "VStack");

    let hstack = vstack.children_elements().next().unwrap();
    assert_eq!(hstack.tag_name().unwrap(), "HStack");

    let children: Vec<_> = hstack.children_elements().collect();
    assert_eq!(children.len(), 3);
    assert_eq!(children[0].tag_name().unwrap(), "Text");
    assert_eq!(children[1].tag_name().unwrap(), "TextField");
    assert_eq!(children[2].tag_name().unwrap(), "Button");
}

#[test]
fn test_lossless_cst_roundtrip() {
    let source = "// Comments preserved\ncomponent MyComponent() {\n    var x = 42;\n    Text(\"Hello\");\n}\n";
    let res = Parser::parse(source);
    assert!(res.is_ok());

    let reconstructed = res.syntax().text().to_string();
    assert_eq!(reconstructed, source);
}

#[test]
fn test_parse_expressions_and_precedence() {
    let source = r##"
component ExprTest() {
    var a = 1 + 2 * 3;
    var b = (1 + 2) * 3;
    var c = a > 0 && b <= 10;
}
"##;
    let res = Parser::parse(source);
    assert!(res.is_ok(), "Errors: {:?}", res.errors());

    let root = res.root();
    let comp = root.components().next().unwrap();
    let vars: Vec<_> = comp.body().unwrap().statements().collect();
    assert_eq!(vars.len(), 3);
}

#[test]
fn test_parse_compound_assignments() {
    let source = r##"
component MathTest() {
    count += 1;
    count -= 5;
    total *= rate;
    balance /= 2;
}
"##;
    let res = Parser::parse(source);
    assert!(res.is_ok(), "Errors: {:?}", res.errors());

    let root = res.root();
    let comp = root.components().next().unwrap();
    let stmts: Vec<_> = comp.body().unwrap().statements().collect();
    assert_eq!(stmts.len(), 4);

    // Verify each statement is an ExprStmt containing a CompoundAssignExpr
    let operators = vec![
        SyntaxKind::PlusAssign,
        SyntaxKind::MinusAssign,
        SyntaxKind::MulAssign,
        SyntaxKind::DivAssign,
    ];

    for (i, stmt) in stmts.into_iter().enumerate() {
        match stmt {
            Stmt::Expr(expr_stmt) => {
                let expr = expr_stmt.expr().expect("expected expression");
                match expr {
                    Expr::CompoundAssign(ca) => {
                        assert_eq!(
                            ca.op_token().map(|t| t.kind()),
                            Some(operators[i]),
                            "Operator mismatch at index {}",
                            i
                        );
                        assert!(ca.lhs().is_some());
                        assert!(ca.rhs().is_some());
                    }
                    other => panic!("Expected CompoundAssign at index {}, found {:?}", i, other),
                }
            }
            other => panic!("Expected Stmt::Expr at index {}, found {:?}", i, other),
        }
    }
}

#[test]
fn test_fault_tolerant_parsing() {
    let source = r##"
component ValidFirst() {
    Text("Good");
}

component InvalidMiddle( {
    // missing closing paren
    Text("Broken");
}

component ValidLast() {
    Text("Recovered");
}
"##;
    let res = Parser::parse(source);
    assert!(!res.is_ok());
    assert!(!res.errors().is_empty());

    let root = res.root();
    let comp_names: Vec<String> = root
        .components()
        .filter_map(|c| c.name().map(|n| n.text()))
        .collect();

    assert!(comp_names.contains(&"ValidFirst".to_string()));
    assert!(comp_names.contains(&"ValidLast".to_string()));
}

#[test]
fn test_parse_example_files() {
    let counter_wv = include_str!("../examples/counter.wv");
    let todo_wv = include_str!("../examples/todo_app.wv");
    let dashboard_wv = include_str!("../examples/dashboard.wv");

    let r1 = Parser::parse(counter_wv);
    assert!(r1.is_ok(), "Counter.wv failed: {:?}", r1.errors());

    let r2 = Parser::parse(todo_wv);
    assert!(r2.is_ok(), "Todo_app.wv failed: {:?}", r2.errors());

    let r3 = Parser::parse(dashboard_wv);
    assert!(r3.is_ok(), "Dashboard.wv failed: {:?}", r3.errors());
}

#[test]
fn test_parse_resource_and_theme() {
    let source = r##"
theme AppTheme {
    colors: {
        primary: "#3b82f6";
        bg: "#0f172a";
    };
    spacing: {
        sm: 8;
        lg: 24;
    };
}

resource users = fetch("https://api.example.com/users");

component UserList() {
    resource posts = fetch("https://api.example.com/posts");

    VStack(bg: AppTheme.colors.bg, padding: AppTheme.spacing.lg) {
        if (users.loading) {
            Text("Loading users...");
        } else {
            Text("Loaded");
        }
    }
}
"##;

    let res = Parser::parse(source);
    assert!(res.is_ok(), "Errors: {:?}", res.errors());

    let root = res.root();
    let themes: Vec<_> = root.themes().collect();
    assert_eq!(themes.len(), 1);
    assert_eq!(themes[0].name().unwrap().text(), "AppTheme");

    let resources: Vec<_> = root.resources().collect();
    assert_eq!(resources.len(), 1);
    assert_eq!(resources[0].name().unwrap().text(), "users");

    let comps: Vec<_> = root.components().collect();
    assert_eq!(comps.len(), 1);
}
