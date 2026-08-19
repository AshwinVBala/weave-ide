use crate::ast::*;
use crate::syntax::{SyntaxKind, SyntaxNode};
use crate::typecheck::error::TypeError;
use crate::typecheck::scope::{ScopeTable, Symbol};
use crate::typecheck::types::Type;
use std::collections::HashMap;
use std::ops::Range;

#[derive(Debug, Clone)]
pub struct TypeCheckResult {
    pub errors: Vec<TypeError>,
    pub scopes: ScopeTable,
}

impl TypeCheckResult {
    pub fn is_ok(&self) -> bool {
        self.errors.is_empty()
    }
}

pub struct TypeChecker {
    scopes: ScopeTable,
    errors: Vec<TypeError>,
    current_return_type: Option<Type>,
}

impl Default for TypeChecker {
    fn default() -> Self {
        Self::new()
    }
}

impl TypeChecker {
    pub fn new() -> Self {
        Self {
            scopes: ScopeTable::new(),
            errors: Vec::new(),
            current_return_type: None,
        }
    }

    pub fn check(mut self, root: &SourceFile) -> TypeCheckResult {
        // Pass 1: Collect top-level declarations
        self.collect_top_level(root);

        // Pass 2: Type check bodies
        for item in root.items() {
            match item {
                Item::Component(comp) => self.check_component(&comp),
                Item::Store(store) => self.check_store(&store),
                Item::Server(server) => self.check_server(&server),
                Item::Resource(res) => self.check_resource_def(&res, false),
                Item::Theme(theme) => self.check_theme_def(&theme),
                Item::Style(style) => self.check_style(&style),
                Item::Function(func) => self.check_function(&func),
                Item::Var(var) => {
                    self.check_var_def(&var, false);
                }
                Item::Statement(stmt) => self.check_stmt(&stmt),
                Item::Ui(ui) => self.check_ui_element(&ui),
            }
        }

        TypeCheckResult {
            errors: self.errors,
            scopes: self.scopes,
        }
    }

    fn range_of(node: &SyntaxNode) -> Range<usize> {
        let r = node.text_range();
        r.start().into()..r.end().into()
    }


    fn collect_top_level(&mut self, root: &SourceFile) {
        for item in root.items() {
            match item {
                Item::Component(comp) => {
                    if let Some(name_node) = comp.name() {
                        let name = name_node.text();
                        let span = Self::range_of(name_node.syntax());
                        let params = comp
                            .param_list()
                            .map(|pl| {
                                pl.params()
                                    .filter_map(|p| {
                                        let p_name = p.name()?.text();
                                        let p_ty = p
                                            .type_ref()
                                            .map(|tr| Type::from_str(&tr.text()))
                                            .unwrap_or(Type::Any);
                                        Some((p_name, p_ty))
                                    })
                                    .collect()
                            })
                            .unwrap_or_default();

                        let sym = Symbol::Component {
                            name: name.clone(),
                            params,
                            span: span.clone(),
                        };
                        if self.scopes.define(sym).is_err() {
                            self.errors.push(TypeError::DuplicateDeclaration {
                                name,
                                range: span,
                            });
                        }
                    }
                }
                Item::Store(store) => {
                    if let Some(name_node) = store.name() {
                        let name = name_node.text();
                        let span = Self::range_of(name_node.syntax());

                        if store.body().is_none() {
                            let ty = store
                                .type_ref()
                                .map(|tr| Type::from_str(&tr.text()))
                                .unwrap_or(Type::Unknown);
                            let sym = Symbol::Variable {
                                name: name.clone(),
                                ty,
                                is_mut: true,
                                is_state: true,
                                span: span.clone(),
                            };
                            if self.scopes.define(sym).is_err() {
                                self.errors.push(TypeError::DuplicateDeclaration {
                                    name: name.clone(),
                                    range: span,
                                });
                            }
                            continue;
                        }

                        let mut vars = HashMap::new();
                        let mut functions = HashMap::new();

                        for v in store.vars() {
                            if let Some(v_name) = v.name() {
                                let ty = v
                                    .type_ref()
                                    .map(|tr| Type::from_str(&tr.text()))
                                    .unwrap_or(Type::Unknown);
                                vars.insert(v_name.text(), ty);
                            }
                        }

                        for f in store.functions() {
                            if let Some(f_name) = f.name() {
                                let params: Vec<(String, Type)> = f
                                    .param_list()
                                    .map(|pl| {
                                        pl.params()
                                            .filter_map(|p| {
                                                let p_name = p.name()?.text();
                                                let p_ty = p
                                                    .type_ref()
                                                    .map(|tr| Type::from_str(&tr.text()))
                                                    .unwrap_or(Type::Any);
                                                Some((p_name, p_ty))
                                            })
                                            .collect()
                                    })
                                    .unwrap_or_default();
                                let ret_ty = f
                                    .return_type()
                                    .map(|tr| Type::from_str(&tr.text()))
                                    .unwrap_or(Type::Void);
                                functions.insert(f_name.text(), (params, ret_ty));
                            }
                        }

                        let sym = Symbol::Store {
                            name: name.clone(),
                            vars: vars.clone(),
                            functions: functions.clone(),
                            span: span.clone(),
                        };
                        if self.scopes.define(sym).is_err() {
                            self.errors.push(TypeError::DuplicateDeclaration {
                                name: name.clone(),
                                range: span.clone(),
                            });
                        }

                        // Also expose store vars in top-level scope for reactive bindings
                        for (v_name, v_ty) in vars {
                            let _ = self.scopes.define(Symbol::Variable {
                                name: v_name,
                                ty: v_ty,
                                is_mut: true,
                                is_state: true,
                                span: span.clone(),
                            });
                        }
                    }
                }
                Item::Style(style) => {
                    if let Some(name_node) = style.name() {
                        let name = name_node.text();
                        let span = Self::range_of(name_node.syntax());
                        let mut properties = HashMap::new();
                        for prop in style.properties() {
                            if let Some(p_name) = prop.name() {
                                let val_str = prop
                                    .value()
                                    .map(|e| e.syntax().text().to_string())
                                    .unwrap_or_default();
                                properties.insert(p_name.text(), val_str);
                            }
                        }
                        let sym = Symbol::Style {
                            name: name.clone(),
                            properties,
                            span: span.clone(),
                        };
                        if self.scopes.define(sym).is_err() {
                            self.errors.push(TypeError::DuplicateDeclaration {
                                name,
                                range: span,
                            });
                        }
                    }
                }
                Item::Function(func) => {
                    if let Some(name_node) = func.name() {
                        let name = name_node.text();
                        let span = Self::range_of(name_node.syntax());
                        let params: Vec<(String, Type)> = func
                            .param_list()
                            .map(|pl| {
                                pl.params()
                                    .filter_map(|p| {
                                        let p_name = p.name()?.text();
                                        let p_ty = p
                                            .type_ref()
                                            .map(|tr| Type::from_str(&tr.text()))
                                            .unwrap_or(Type::Any);
                                        Some((p_name, p_ty))
                                    })
                                    .collect()
                            })
                            .unwrap_or_default();
                        let ret_type = func
                            .return_type()
                            .map(|tr| Type::from_str(&tr.text()))
                            .unwrap_or(Type::Void);

                        let sym = Symbol::Function {
                            name: name.clone(),
                            params,
                            ret_type,
                            span: span.clone(),
                        };
                        if self.scopes.define(sym).is_err() {
                            self.errors.push(TypeError::DuplicateDeclaration {
                                name,
                                range: span,
                            });
                        }
                    }
                }
                Item::Resource(res) => {
                    if let Some(name_node) = res.name() {
                        let name = name_node.text();
                        let span = Self::range_of(name_node.syntax());
                        let ty = res
                            .type_ref()
                            .map(|tr| Type::from_str(&tr.text()))
                            .unwrap_or(Type::Any);
                        let sym = Symbol::Variable {
                            name: name.clone(),
                            ty,
                            is_mut: false,
                            is_state: true,
                            span: span.clone(),
                        };
                        if self.scopes.define(sym).is_err() {
                            self.errors.push(TypeError::DuplicateDeclaration {
                                name,
                                range: span,
                            });
                        }
                    }
                }
                Item::Theme(theme) => {
                    let name = theme
                        .name()
                        .map(|n| n.text())
                        .unwrap_or_else(|| "theme".to_string());
                    let span = theme
                        .name()
                        .map(|n| Self::range_of(n.syntax()))
                        .unwrap_or_else(|| Self::range_of(theme.syntax()));
                    let _ = self.scopes.define(Symbol::Variable {
                        name: name.clone(),
                        ty: Type::Any,
                        is_mut: false,
                        is_state: false,
                        span: span.clone(),
                    });
                    if name != "theme" {
                        let _ = self.scopes.define(Symbol::Variable {
                            name: "theme".to_string(),
                            ty: Type::Any,
                            is_mut: false,
                            is_state: false,
                            span,
                        });
                    }
                }
                _ => {}
            }
        }
    }

    fn check_component(&mut self, comp: &ComponentDef) {
        self.scopes.enter_scope();

        // Register component parameters in scope
        if let Some(param_list) = comp.param_list() {
            for param in param_list.params() {
                if let Some(name_node) = param.name() {
                    let name = name_node.text();
                    let span = Self::range_of(name_node.syntax());
                    let ty = param
                        .type_ref()
                        .map(|tr| Type::from_str(&tr.text()))
                        .unwrap_or(Type::Any);

                    if self
                        .scopes
                        .define(Symbol::Variable {
                            name: name.clone(),
                            ty,
                            is_mut: false,
                            is_state: false,
                            span: span.clone(),
                        })
                        .is_err()
                    {
                        self.errors.push(TypeError::DuplicateDeclaration {
                            name,
                            range: span,
                        });
                    }
                }
            }
        }

        // Register component local state variables first
        if let Some(body) = comp.body() {
            for item in body.items() {
                match item {
                    Item::Var(var) => self.check_var_def(&var, true),
                    Item::Store(store) => self.check_store_var_or_def(&store, true),
                    Item::Resource(res) => self.check_resource_def(&res, true),
                    Item::Statement(Stmt::Var(var)) => self.check_var_def(&var, true),
                    Item::Statement(Stmt::Store(store)) => self.check_store_var_or_def(&store, true),
                    Item::Statement(Stmt::Resource(res)) => self.check_resource_def(&res, true),
                    _ => {}
                }
            }

            // Check remaining statements and UI elements
            for item in body.items() {
                match item {
                    Item::Var(_) => {} // Already checked
                    Item::Store(_) => {}
                    Item::Resource(_) => {}
                    Item::Statement(Stmt::Var(_)) => {}
                    Item::Statement(Stmt::Store(_)) => {}
                    Item::Statement(Stmt::Resource(_)) => {}
                    Item::Statement(stmt) => self.check_stmt(&stmt),
                    Item::Ui(ui) => self.check_ui_element(&ui),
                    _ => {}
                }
            }
        }

        self.scopes.exit_scope();
    }

    fn check_store_var_or_def(&mut self, store: &StoreDef, is_component_local: bool) {
        if store.body().is_none() {
            let name_node = match store.name() {
                Some(n) => n,
                None => return,
            };
            let name = name_node.text();
            let span = Self::range_of(name_node.syntax());
            let declared_type = store.type_ref().map(|tr| Type::from_str(&tr.text()));

            let val_type = if let Some(init_expr) = store.value() {
                let t = self.infer_expr(&init_expr);
                if let Some(ref decl) = declared_type {
                    if !t.is_assignable_to(decl) {
                        self.errors.push(TypeError::TypeMismatch {
                            expected: decl.clone(),
                            actual: t.clone(),
                            range: Self::range_of(init_expr.syntax()),
                            context: format!("store variable '{}' initializer", name),
                        });
                    }
                }
                t
            } else {
                Type::Unknown
            };

            let final_type = declared_type.unwrap_or(val_type);
            if is_component_local {
                if self
                    .scopes
                    .define(Symbol::Variable {
                        name: name.clone(),
                        ty: final_type,
                        is_mut: true,
                        is_state: true,
                        span: span.clone(),
                    })
                    .is_err()
                {
                    self.errors.push(TypeError::DuplicateDeclaration {
                        name,
                        range: span,
                    });
                }
            }
        } else {
            self.check_store(store);
        }
    }

    fn check_store(&mut self, store: &StoreDef) {
        if store.body().is_none() {
            self.check_store_var_or_def(store, false);
            return;
        }

        self.scopes.enter_scope();

        for v in store.vars() {
            self.check_var_def(&v, true);
        }

        for f in store.functions() {
            self.check_function(&f);
        }

        self.scopes.exit_scope();
    }

    fn check_server(&mut self, server: &ServerDef) {
        for f in server.functions() {
            self.check_function(&f);
        }
    }

    fn check_style(&mut self, _style: &StyleDef) {
        // Styles are syntactic property bags
    }

    fn check_function(&mut self, func: &FnDef) {
        self.scopes.enter_scope();

        let ret_type = func
            .return_type()
            .map(|tr| Type::from_str(&tr.text()))
            .unwrap_or(Type::Void);
        let prev_ret = self.current_return_type.replace(ret_type.clone());

        if let Some(param_list) = func.param_list() {
            for param in param_list.params() {
                if let Some(name_node) = param.name() {
                    let name = name_node.text();
                    let span = Self::range_of(name_node.syntax());
                    let ty = param
                        .type_ref()
                        .map(|tr| Type::from_str(&tr.text()))
                        .unwrap_or(Type::Any);

                    if self
                        .scopes
                        .define(Symbol::Variable {
                            name: name.clone(),
                            ty,
                            is_mut: false,
                            is_state: false,
                            span: span.clone(),
                        })
                        .is_err()
                    {
                        self.errors.push(TypeError::DuplicateDeclaration {
                            name,
                            range: span,
                        });
                    }
                }
            }
        }

        if let Some(body) = func.body() {
            self.check_block(&body);
        }

        self.current_return_type = prev_ret;
        self.scopes.exit_scope();
    }

    fn check_var_def(&mut self, var: &VarDef, is_state: bool) {
        let name_node = match var.name() {
            Some(n) => n,
            None => return,
        };
        let name = name_node.text();
        let span = Self::range_of(name_node.syntax());
        let declared_type = var.type_ref().map(|tr| Type::from_str(&tr.text()));

        let val_type = if let Some(init_expr) = var.value() {
            let t = self.infer_expr(&init_expr);
            if let Some(ref decl) = declared_type {
                if !t.is_assignable_to(decl) {
                    self.errors.push(TypeError::TypeMismatch {
                        expected: decl.clone(),
                        actual: t.clone(),
                        range: Self::range_of(init_expr.syntax()),
                        context: format!("variable '{}' initializer", name),
                    });
                }
            }
            t
        } else {
            Type::Unknown
        };

        let final_type = declared_type.unwrap_or(val_type);
        if self
            .scopes
            .define(Symbol::Variable {
                name: name.clone(),
                ty: final_type,
                is_mut: true,
                is_state,
                span: span.clone(),
            })
            .is_err()
        {
            self.errors.push(TypeError::DuplicateDeclaration {
                name,
                range: span,
            });
        }
    }

    fn check_resource_def(&mut self, res: &ResourceDef, is_state: bool) {
        let name_node = match res.name() {
            Some(n) => n,
            None => return,
        };
        let name = name_node.text();
        let span = Self::range_of(name_node.syntax());
        let declared_type = res.type_ref().map(|tr| Type::from_str(&tr.text()));

        let val_type = if let Some(init_expr) = res.value() {
            let t = self.infer_expr(&init_expr);
            if let Some(ref decl) = declared_type {
                if !t.is_assignable_to(decl) {
                    self.errors.push(TypeError::TypeMismatch {
                        expected: decl.clone(),
                        actual: t.clone(),
                        range: Self::range_of(init_expr.syntax()),
                        context: format!("resource '{}' initializer", name),
                    });
                }
            }
            t
        } else {
            Type::Any
        };

        let final_type = declared_type.unwrap_or(val_type);
        let _ = self.scopes.define(Symbol::Variable {
            name,
            ty: final_type,
            is_mut: false,
            is_state,
            span,
        });
    }

    fn check_theme_def(&mut self, _theme: &ThemeDef) {
        // Theme definitions are property bags checked syntactically
    }

    fn check_stmt(&mut self, stmt: &Stmt) {
        match stmt {
            Stmt::Let(let_stmt) => {
                if let Some(name_node) = let_stmt.name() {
                    let name = name_node.text();
                    let span = Self::range_of(name_node.syntax());
                    let declared_type = let_stmt.type_ref().map(|tr| Type::from_str(&tr.text()));

                    let val_type = if let Some(init_expr) = let_stmt.value() {
                        let t = self.infer_expr(&init_expr);
                        if let Some(ref decl) = declared_type {
                            if !t.is_assignable_to(decl) {
                                self.errors.push(TypeError::TypeMismatch {
                                    expected: decl.clone(),
                                    actual: t.clone(),
                                    range: Self::range_of(init_expr.syntax()),
                                    context: format!("let '{}' initializer", name),
                                });
                            }
                        }
                        t
                    } else {
                        Type::Unknown
                    };

                    let final_type = declared_type.unwrap_or(val_type);
                    if self
                        .scopes
                        .define(Symbol::Variable {
                            name: name.clone(),
                            ty: final_type,
                            is_mut: false,
                            is_state: false,
                            span: span.clone(),
                        })
                        .is_err()
                    {
                        self.errors.push(TypeError::DuplicateDeclaration {
                            name,
                            range: span,
                        });
                    }
                }
            }
            Stmt::Var(var) => {
                self.check_var_def(var, false);
            }
            Stmt::Store(store) => {
                self.check_store_var_or_def(store, true);
            }
            Stmt::Resource(res) => {
                self.check_resource_def(res, true);
            }
            Stmt::Expr(expr_stmt) => {
                if let Some(expr) = expr_stmt.expr() {
                    self.infer_expr(&expr);
                }
            }
            Stmt::Return(ret_stmt) => {
                let actual_ty = if let Some(expr) = ret_stmt.expr() {
                    self.infer_expr(&expr)
                } else {
                    Type::Void
                };

                if let Some(ref expected) = self.current_return_type {
                    if !actual_ty.is_assignable_to(expected) {
                        self.errors.push(TypeError::TypeMismatch {
                            expected: expected.clone(),
                            actual: actual_ty,
                            range: Self::range_of(ret_stmt.syntax()),
                            context: "return statement".to_string(),
                        });
                    }
                }
            }
        }
    }

    fn check_block(&mut self, block: &BlockExpr) {
        self.scopes.enter_scope();
        for item in block.items() {
            match item {
                Item::Statement(stmt) => self.check_stmt(&stmt),
                Item::Ui(ui) => self.check_ui_element(&ui),
                Item::Var(var) => self.check_var_def(&var, false),
                Item::Function(func) => self.check_function(&func),
                _ => {}
            }
        }
        self.scopes.exit_scope();
    }

    fn check_ui_element(&mut self, ui: &UiElement) {
        // Check positional / named properties
        if let Some(arg_list) = ui.arg_list() {
            for prop in arg_list.properties() {
                if let Some(val) = prop.value() {
                    self.infer_expr(&val);
                }
            }
        }

        // Check child elements in body
        if let Some(body) = ui.body() {
            self.check_block(&body);
        }
    }

    pub fn infer_expr(&mut self, expr: &Expr) -> Type {
        match expr {
            Expr::Literal(lit) => {
                if let Some(tok) = lit.token() {
                    match tok.kind() {
                        SyntaxKind::IntLiteral => Type::Int,
                        SyntaxKind::FloatLiteral => Type::Float,
                        SyntaxKind::StringLiteral => Type::String,
                        SyntaxKind::KwTrue | SyntaxKind::KwFalse => Type::Bool,
                        SyntaxKind::KwNull => Type::Null,
                        _ => Type::Unknown,
                    }
                } else {
                    Type::Unknown
                }
            }
            Expr::NameRef(name_ref) => {
                let name = name_ref.text();
                // Check built-in identifiers
                if matches!(
                    name.as_str(),
                    "VStack"
                        | "HStack"
                        | "Button"
                        | "Text"
                        | "TextField"
                        | "true"
                        | "false"
                        | "null"
                        | "fetch"
                        | "theme"
                        | "props"
                        | "event"
                        | "window"
                        | "document"
                        | "console"
                ) {
                    return Type::Any;
                }

                if let Some(ty) = self.scopes.resolve_var_type(&name) {
                    ty
                } else if self.scopes.resolve(&name).is_some() {
                    Type::Custom(name)
                } else {
                    self.errors.push(TypeError::UndeclaredIdentifier {
                        name,
                        range: Self::range_of(name_ref.syntax()),
                    });
                    Type::Unknown
                }
            }
            Expr::Binary(bin) => {
                let lhs_ty = bin
                    .lhs()
                    .map(|e| self.infer_expr(&e))
                    .unwrap_or(Type::Unknown);
                let rhs_ty = bin
                    .rhs()
                    .map(|e| self.infer_expr(&e))
                    .unwrap_or(Type::Unknown);
                let op = bin.op_token();
                let op_kind = op.as_ref().map(|t| t.kind());
                let span = Self::range_of(bin.syntax());

                match op_kind {
                    Some(SyntaxKind::Plus) => {
                        if lhs_ty == Type::String || rhs_ty == Type::String {
                            Type::String
                        } else if lhs_ty.is_numeric() && rhs_ty.is_numeric() {
                            if lhs_ty == Type::Float || rhs_ty == Type::Float {
                                Type::Float
                            } else {
                                Type::Int
                            }
                        } else if lhs_ty == Type::Unknown || rhs_ty == Type::Unknown {
                            Type::Unknown
                        } else {
                            self.errors.push(TypeError::InvalidBinaryOperation {
                                op: "+".to_string(),
                                lhs: lhs_ty,
                                rhs: rhs_ty,
                                range: span,
                            });
                            Type::Unknown
                        }
                    }
                    Some(SyntaxKind::Minus | SyntaxKind::Star | SyntaxKind::Slash | SyntaxKind::Percent) => {
                        let op_str = op.map(|t| t.text().to_string()).unwrap_or_default();
                        if lhs_ty.is_numeric() && rhs_ty.is_numeric() {
                            if lhs_ty == Type::Float || rhs_ty == Type::Float {
                                Type::Float
                            } else {
                                Type::Int
                            }
                        } else if lhs_ty == Type::Unknown || rhs_ty == Type::Unknown {
                            Type::Unknown
                        } else {
                            self.errors.push(TypeError::InvalidBinaryOperation {
                                op: op_str,
                                lhs: lhs_ty,
                                rhs: rhs_ty,
                                range: span,
                            });
                            Type::Unknown
                        }
                    }
                    Some(SyntaxKind::EqEq | SyntaxKind::BangEq) => Type::Bool,
                    Some(SyntaxKind::Lt | SyntaxKind::LtEq | SyntaxKind::Gt | SyntaxKind::GtEq) => {
                        let op_str = op.map(|t| t.text().to_string()).unwrap_or_default();
                        if (lhs_ty.is_numeric() && rhs_ty.is_numeric()) || (lhs_ty == Type::String && rhs_ty == Type::String) {
                            Type::Bool
                        } else if lhs_ty == Type::Unknown || rhs_ty == Type::Unknown {
                            Type::Bool
                        } else {
                            self.errors.push(TypeError::InvalidBinaryOperation {
                                op: op_str,
                                lhs: lhs_ty,
                                rhs: rhs_ty,
                                range: span,
                            });
                            Type::Bool
                        }
                    }
                    Some(SyntaxKind::AmpAmp | SyntaxKind::PipePipe) => {
                        let op_str = op.map(|t| t.text().to_string()).unwrap_or_default();
                        if (lhs_ty == Type::Bool || lhs_ty == Type::Unknown)
                            && (rhs_ty == Type::Bool || rhs_ty == Type::Unknown)
                        {
                            Type::Bool
                        } else {
                            self.errors.push(TypeError::InvalidBinaryOperation {
                                op: op_str,
                                lhs: lhs_ty,
                                rhs: rhs_ty,
                                range: span,
                            });
                            Type::Bool
                        }
                    }
                    Some(SyntaxKind::Eq) => {
                        // Assignment expression: lhs = rhs
                        if !rhs_ty.is_assignable_to(&lhs_ty) {
                            self.errors.push(TypeError::TypeMismatch {
                                expected: lhs_ty.clone(),
                                actual: rhs_ty.clone(),
                                range: span,
                                context: "assignment".to_string(),
                            });
                        }
                        lhs_ty
                    }
                    _ => Type::Unknown,
                }
            }
            Expr::CompoundAssign(ca) => {
                let lhs_ty = ca
                    .lhs()
                    .map(|e| self.infer_expr(&e))
                    .unwrap_or(Type::Unknown);
                let rhs_ty = ca
                    .rhs()
                    .map(|e| self.infer_expr(&e))
                    .unwrap_or(Type::Unknown);
                let op = ca.op_token();
                let op_kind = op.as_ref().map(|t| t.kind());
                let span = Self::range_of(ca.syntax());

                match op_kind {
                    Some(SyntaxKind::PlusAssign) => {
                        if (lhs_ty.is_numeric() && rhs_ty.is_numeric())
                            || (lhs_ty == Type::String && (rhs_ty == Type::String || rhs_ty.is_numeric()))
                            || lhs_ty == Type::Unknown
                            || rhs_ty == Type::Unknown
                        {
                            lhs_ty
                        } else {
                            self.errors.push(TypeError::InvalidBinaryOperation {
                                op: "+=".to_string(),
                                lhs: lhs_ty.clone(),
                                rhs: rhs_ty,
                                range: span,
                            });
                            lhs_ty
                        }
                    }
                    Some(SyntaxKind::MinusAssign | SyntaxKind::MulAssign | SyntaxKind::DivAssign) => {
                        let op_str = op.map(|t| t.text().to_string()).unwrap_or_default();
                        if (lhs_ty.is_numeric() && rhs_ty.is_numeric())
                            || lhs_ty == Type::Unknown
                            || rhs_ty == Type::Unknown
                        {
                            lhs_ty
                        } else {
                            self.errors.push(TypeError::InvalidBinaryOperation {
                                op: op_str,
                                lhs: lhs_ty.clone(),
                                rhs: rhs_ty,
                                range: span,
                            });
                            lhs_ty
                        }
                    }
                    _ => lhs_ty,
                }
            }
            Expr::Prefix(prefix) => {
                let inner_ty = prefix
                    .expr()
                    .map(|e| self.infer_expr(&e))
                    .unwrap_or(Type::Unknown);
                let op = prefix.op_token();
                let op_kind = op.as_ref().map(|t| t.kind());
                let span = Self::range_of(prefix.syntax());

                match op_kind {
                    Some(SyntaxKind::Minus) => {
                        if inner_ty.is_numeric() || inner_ty == Type::Unknown {
                            inner_ty
                        } else {
                            self.errors.push(TypeError::InvalidUnaryOperation {
                                op: "-".to_string(),
                                expr_type: inner_ty,
                                range: span,
                            });
                            Type::Unknown
                        }
                    }
                    Some(SyntaxKind::Bang) => {
                        if inner_ty == Type::Bool || inner_ty == Type::Unknown {
                            Type::Bool
                        } else {
                            self.errors.push(TypeError::InvalidUnaryOperation {
                                op: "!".to_string(),
                                expr_type: inner_ty,
                                range: span,
                            });
                            Type::Bool
                        }
                    }
                    _ => inner_ty,
                }
            }
            Expr::Call(call) => {
                let callee_ty = call
                    .callee()
                    .map(|e| self.infer_expr(&e))
                    .unwrap_or(Type::Unknown);
                if let Some(arg_list) = call.arg_list() {
                    for arg in arg_list.args() {
                        self.infer_expr(&arg);
                    }
                }
                match callee_ty {
                    Type::Function { ret, .. } => *ret,
                    _ => Type::Unknown,
                }
            }
            Expr::Lambda(lambda) => {
                self.scopes.enter_scope();
                let mut params = Vec::new();
                if let Some(param_list) = lambda.param_list() {
                    for p in param_list.params() {
                        if let Some(name_node) = p.name() {
                            let name = name_node.text();
                            let span = Self::range_of(name_node.syntax());
                            let ty = p
                                .type_ref()
                                .map(|tr| Type::from_str(&tr.text()))
                                .unwrap_or(Type::Any);
                            params.push(ty.clone());
                            let _ = self.scopes.define(Symbol::Variable {
                                name,
                                ty,
                                is_mut: false,
                                is_state: false,
                                span,
                            });
                        }
                    }
                }
                if let Some(body) = lambda.body() {
                    self.check_block(&body);
                }
                self.scopes.exit_scope();
                Type::Function {
                    params,
                    ret: Box::new(Type::Void),
                }
            }
            Expr::Block(block) => {
                self.check_block(block);
                Type::Void
            }
            Expr::If(if_expr) => {
                if let Some(cond) = if_expr.condition() {
                    let cond_ty = self.infer_expr(&cond);
                    if cond_ty != Type::Bool && cond_ty != Type::Unknown {
                        self.errors.push(TypeError::TypeMismatch {
                            expected: Type::Bool,
                            actual: cond_ty,
                            range: Self::range_of(cond.syntax()),
                            context: "if condition".to_string(),
                        });
                    }
                }
                if let Some(then_b) = if_expr.then_branch() {
                    self.check_block(&then_b);
                }
                if let Some(else_b) = if_expr.else_branch() {
                    if let Some(b) = else_b.block() {
                        self.check_block(&b);
                    } else if let Some(nested_if) = else_b.if_expr() {
                        self.infer_expr(&Expr::If(nested_if));
                    }
                }
                Type::Void
            }
            Expr::For(for_expr) => {
                self.scopes.enter_scope();
                // for var in iter
                if let Some(body) = for_expr.syntax().children().find_map(BlockExpr::cast) {
                    self.check_block(&body);
                }
                self.scopes.exit_scope();
                Type::Void
            }
            Expr::While(while_expr) => {
                self.scopes.enter_scope();
                if let Some(body) = while_expr.syntax().children().find_map(BlockExpr::cast) {
                    self.check_block(&body);
                }
                self.scopes.exit_scope();
                Type::Void
            }
            Expr::Ui(ui) => {
                self.check_ui_element(ui);
                Type::Custom("JSX.Element".to_string())
            }
            Expr::Field(field) => {
                let _ = field.syntax();
                Type::Any
            }
            Expr::Index(idx) => {
                let _ = idx.syntax();
                Type::Any
            }
        }
    }
}
