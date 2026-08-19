use weave_core::codegen::{generate_html, generate_tsx};
use weave_core::parser::Parser;

#[test]
fn test_codegen_counter_app() {
    let source = include_str!("../examples/counter.wv");
    let parsed = Parser::parse(source);
    assert!(parsed.is_ok());

    let tsx = generate_tsx(&parsed.root());

    // 1. Check React imports
    assert!(tsx.contains("import React, { useState, useEffect, useCallback, useMemo } from 'react';"));

    // 2. Check Style definition
    assert!(tsx.contains("export const CounterCard: React.CSSProperties = {"));
    assert!(tsx.contains("padding: 20,"));
    assert!(tsx.contains("background: \"#ffffff\","));
    assert!(tsx.contains("borderRadius: 12,"));

    // 3. Check Server endpoint stub
    assert!(tsx.contains("export async function syncCount(val: number): Promise<boolean> {"));
    assert!(tsx.contains("fetch(`/api/syncCount`"));

    // 4. Check Store hook
    assert!(tsx.contains("export function useCounterStore() {"));
    assert!(tsx.contains("const [count, setCount] = useState<number>(0);"));
    assert!(tsx.contains("const increment = useCallback(() => {"));

    // 5. Check Component
    assert!(tsx.contains("export function CounterApp("));
    assert!(tsx.contains("const [title, setTitle] = useState<string>(\"Weave Reactive Counter\");"));
    assert!(tsx.contains("<div style={{ display: 'flex', flexDirection: 'column', ...CounterCard }}>"));
    assert!(tsx.contains("<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>"));
    assert!(tsx.contains("<button"));
    assert!(tsx.contains("<span"));
    assert!(tsx.contains("<input type=\"text\" placeholder=\"Type a note...\" />"));
    assert!(tsx.contains("export default CounterApp;"));
}

#[test]
fn test_codegen_reactive_mutations_and_compound_assignments() {
    let source = r#"
        component Mutator() {
            var count: Int = 10;
            var factor: Int = 2;

            VStack {
                Button("PlusEq", onClick: () -> {
                    count += 1;
                });
                Button("MinusEq", onClick: () -> {
                    count -= 5;
                });
                Button("MulEq", onClick: () -> {
                    factor *= 3;
                });
                Button("DivEq", onClick: () -> {
                    factor /= 2;
                });
                Button("Assign", onClick: () -> {
                    count = 0;
                });
            }
        }
    "#;

    let parsed = Parser::parse(source);
    assert!(parsed.is_ok());

    let tsx = generate_tsx(&parsed.root());

    // Check state initialization
    assert!(tsx.contains("const [count, setCount] = useState<number>(10);"));
    assert!(tsx.contains("const [factor, setFactor] = useState<number>(2);"));

    // Check reactive compound assignment conversions
    assert!(tsx.contains("setCount((prev) => prev + (1))"));
    assert!(tsx.contains("setCount((prev) => prev - (5))"));
    assert!(tsx.contains("setFactor((prev) => prev * (3))"));
    assert!(tsx.contains("setFactor((prev) => prev / (2))"));

    // Check simple reactive assignment
    assert!(tsx.contains("setCount(0)"));
}

#[test]
fn test_codegen_todo_app_two_way_binding() {
    let source = include_str!("../examples/todo_app.wv");
    let parsed = Parser::parse(source);
    assert!(parsed.is_ok());

    let tsx = generate_tsx(&parsed.root());

    // Verify component state & auto-binding on TextField
    assert!(tsx.contains("export function TodoApp("));
    assert!(tsx.contains("const [newTodoText, setNewTodoText] = useState<string>(\"\");"));
    assert!(tsx.contains("onChange={(e) => setNewTodoText(e.target.value) }"));
    assert!(tsx.contains("setNewTodoText(\"\")"));
    assert!(tsx.contains("export function useTodoStore() {"));
}

#[test]
fn test_codegen_dashboard_tabs() {
    let source = include_str!("../examples/dashboard.wv");
    let parsed = Parser::parse(source);
    assert!(parsed.is_ok());

    let tsx = generate_tsx(&parsed.root());

    assert!(tsx.contains("export function Dashboard("));
    assert!(tsx.contains("const [activeTab, setActiveTab] = useState<string>(\"overview\");"));
    assert!(tsx.contains("setActiveTab(\"overview\")"));
    assert!(tsx.contains("setActiveTab(\"analytics\")"));
    assert!(tsx.contains("setActiveTab(\"settings\")"));
    assert!(tsx.contains("export const SidebarStyle: React.CSSProperties = {"));
    assert!(tsx.contains("export const MainContentStyle: React.CSSProperties = {"));
}

#[test]
fn test_codegen_standalone_html_runner() {
    let source = include_str!("../examples/counter.wv");
    let parsed = Parser::parse(source);
    assert!(parsed.is_ok());

    let html = generate_html(&parsed.root(), "CounterApp");

    assert!(html.contains("<!DOCTYPE html>"));
    assert!(html.contains("<title>Weave App - CounterApp</title>"));
    assert!(html.contains("https://unpkg.com/react@18/umd/react.development.js"));
    assert!(html.contains("https://unpkg.com/react-dom@18/umd/react-dom.development.js"));
    assert!(html.contains("https://unpkg.com/@babel/standalone/babel.min.js"));
    assert!(html.contains("<div id=\"root\"></div>"));
    assert!(html.contains("ReactDOM.createRoot(rootElement)"));
    assert!(html.contains("root.render(<CounterApp />);"));
}

#[test]
fn test_codegen_single_variable_store_and_fn_click() {
    let source = r#"
        component Counter() {
            store count = 0;

            VStack(gap: 8, padding: 16) {
                Text("Count: " + count);
                Button("Increment", onClick: fn() {
                    count += 1;
                });
            }
        }
    "#;

    let tsx = weave_core::wasm::compile_to_js(source);
    assert!(tsx.contains("export function Counter("));
    assert!(tsx.contains("const [count, setCount] = useState<number>(0);"));
    assert!(tsx.contains("display: 'flex'") && tsx.contains("flexDirection: 'column'") && tsx.contains("gap: 8") && tsx.contains("padding: 16"));
    assert!(tsx.contains("<span"));
    assert!(tsx.contains("Count: \" + count"));
    assert!(tsx.contains("setCount((prev) => prev + (1))"));
    assert!(tsx.contains("Increment"));
}

#[test]
fn test_codegen_resource_and_theme() {
    let source = r##"
theme AppTheme {
    colors: {
        primary: "#3b82f6";
        bg: "#0f172a";
    };
    spacing: {
        lg: 24;
    };
}

component UserList() {
    resource users = fetch("https://jsonplaceholder.typicode.com/users");

    VStack(bg: AppTheme.colors.bg, padding: AppTheme.spacing.lg) {
        if (users.loading) {
            Text("Loading users...");
        } else {
            Text("Users loaded successfully");
        }
    }
}
"##;

    let parsed = weave_core::parse(source);
    println!("SYNTAX TREE:\n{:#?}", parsed.syntax());
    let tsx = weave_core::wasm::compile_to_js(source);
    println!("TSX OUTPUT:\n{}", tsx);
    assert!(tsx.contains("export const AppTheme = {"));
    assert!(tsx.contains("colors: {"));
    assert!(tsx.contains(r##"primary: "#3b82f6""##));
    assert!(tsx.contains("export function UserList("));
    assert!(tsx.contains("const [users, setUsers] = useState<{ data: any; loading: boolean; error: any }>({"));
    assert!(tsx.contains("useEffect(() => {"));
    assert!(tsx.contains(r#"fetch("https://jsonplaceholder.typicode.com/users")"#));
    assert!(tsx.contains("backgroundColor: AppTheme.colors.bg"));
    assert!(tsx.contains("padding: AppTheme.spacing.lg"));
    assert!(tsx.contains("(users.loading) ?"));
    assert!(tsx.contains("Loading users..."));
    assert!(tsx.contains("Users loaded successfully"));
}
