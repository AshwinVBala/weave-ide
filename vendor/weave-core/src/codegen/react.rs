use crate::ast::*;
use std::collections::{HashMap, HashSet};

pub struct ReactCodeGen {
    state_vars: HashSet<String>,
    store_vars: HashSet<String>,
    stores: Vec<String>,
    top_resources: Vec<String>,
    indent_level: usize,
}

impl Default for ReactCodeGen {
    fn default() -> Self {
        Self::new()
    }
}

impl ReactCodeGen {
    pub fn new() -> Self {
        Self {
            state_vars: HashSet::new(),
            store_vars: HashSet::new(),
            stores: Vec::new(),
            top_resources: Vec::new(),
            indent_level: 0,
        }
    }

    pub fn generate(mut self, root: &SourceFile) -> String {
        let mut out = String::new();

        // 1. Imports
        out.push_str("import React, { useState, useEffect, useCallback, useMemo } from 'react';\n\n");

        // Collect stores to know what hooks are available
        for store in root.stores() {
            if let Some(name) = store.name() {
                let sname = name.text();
                if store.body().is_some() {
                    self.stores.push(sname.clone());
                    for v in store.vars() {
                        if let Some(vn) = v.name() {
                            self.store_vars.insert(vn.text());
                        }
                    }
                } else {
                    // Single-variable store: e.g. store count = 0;
                    self.store_vars.insert(sname);
                }
            }
        }

        // Collect top-level resources
        for res in root.resources() {
            if let Some(name) = res.name() {
                self.top_resources.push(name.text());
            }
        }

        // 2. Styles
        for style in root.styles() {
            out.push_str(&self.gen_style(&style));
            out.push('\n');
        }

        // 3. Themes
        for theme in root.themes() {
            out.push_str(&self.gen_theme(&theme));
            out.push('\n');
        }

        // 4. Server Endpoints
        for server in root.servers() {
            out.push_str(&self.gen_server(&server));
            out.push('\n');
        }

        // 5. Top-level Resources (as React Hooks)
        for res in root.resources() {
            out.push_str(&self.gen_top_level_resource(&res));
            out.push('\n');
        }

        // 6. Stores (as React Hooks)
        for store in root.stores() {
            out.push_str(&self.gen_store(&store));
            out.push('\n');
        }

        // 7. Components
        let mut first_comp_name = None;
        for comp in root.components() {
            if let Some(name) = comp.name() {
                if first_comp_name.is_none() {
                    first_comp_name = Some(name.text());
                }
            }
            out.push_str(&self.gen_component(&comp));
            out.push('\n');
        }

        // 8. Default Export
        if let Some(name) = first_comp_name {
            out.push_str(&format!("export default {};\n", name));
        }

        out
    }

    fn indent(&self) -> String {
        "  ".repeat(self.indent_level)
    }

    fn capitalize(s: &str) -> String {
        let mut c = s.chars();
        match c.next() {
            None => String::new(),
            Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
        }
    }

    fn gen_style(&mut self, style: &StyleDef) -> String {
        let name = style.name().map(|n| n.text()).unwrap_or_else(|| "AnonymousStyle".to_string());
        let mut out = format!("export const {}: React.CSSProperties = {{\n", name);

        for prop in style.properties() {
            if let Some(p_name) = prop.name() {
                let key = p_name.text();
                let val_expr = prop.value().map(|v| self.gen_expr(&v)).unwrap_or_else(|| "undefined".to_string());
                out.push_str(&format!("  {}: {},\n", key, val_expr));
            }
        }

        out.push_str("};\n");
        out
    }

    fn gen_theme(&mut self, theme: &ThemeDef) -> String {
        let name = theme.name().map(|n| n.text()).unwrap_or_else(|| "theme".to_string());
        let mut out = format!("export const {} = {{\n", name);
        for prop in theme.properties() {
            self.gen_theme_property(&prop, 1, &mut out);
        }
        out.push_str("};\n");
        if name != "theme" {
            out.push_str(&format!("export const theme = {};\n", name));
        }
        out
    }

    fn gen_theme_property(&mut self, prop: &ThemeProperty, indent: usize, out: &mut String) {
        let pad = "  ".repeat(indent);
        if let Some(p_name) = prop.name() {
            let key = p_name.text();
            let sub_props: Vec<_> = prop.sub_properties().collect();
            if !sub_props.is_empty() {
                out.push_str(&format!("{}{}: {{\n", pad, key));
                for sub in sub_props {
                    self.gen_theme_property(&sub, indent + 1, out);
                }
                out.push_str(&format!("{}}},\n", pad));
            } else if let Some(val_expr) = prop.value() {
                let val_str = self.gen_expr(&val_expr);
                out.push_str(&format!("{}{}: {},\n", pad, key, val_str));
            }
        }
    }

    fn gen_top_level_resource(&mut self, res: &ResourceDef) -> String {
        let name = res.name().map(|n| n.text()).unwrap_or_else(|| "Resource".to_string());
        let hook_name = format!("use{}Resource", Self::capitalize(&name));
        let setter = format!("set{}", Self::capitalize(&name));
        let init_expr = res.value().map(|v| self.gen_expr(&v)).unwrap_or_else(|| "\"\"".to_string());

        let fetch_body = if init_expr.starts_with('"') && init_expr.ends_with('"') {
            format!("fetch({})", init_expr)
        } else {
            init_expr
        };

        format!(
            r#"export function {}() {{
  const [{}, {}] = useState<{{ data: any; loading: boolean; error: any }}>({{
    data: null,
    loading: true,
    error: null,
  }});

  useEffect(() => {{
    let isMounted = true;
    Promise.resolve().then(() => {{
      return {};
    }})
    .then((res) => {{
      if (res && typeof (res as any).json === 'function') {{
        if (!(res as any).ok) throw new Error(`HTTP ${{(res as any).status}}: ${{(res as any).statusText}}`);
        return (res as any).json();
      }}
      return res;
    }})
    .then((data) => {{
      if (isMounted) {}({{ data, loading: false, error: null }});
    }})
    .catch((err) => {{
      if (isMounted) {}({{ data: null, loading: false, error: err?.message || String(err) }});
    }});
    return () => {{ isMounted = false; }};
  }}, []);

  return {};
}}
"#,
            hook_name, name, setter, fetch_body, setter, setter, name
        )
    }

    fn gen_server(&self, server: &ServerDef) -> String {
        let mut out = String::new();
        out.push_str("// Server-side RPC stubs\n");
        for f in server.functions() {
            let name = f.name().map(|n| n.text()).unwrap_or_else(|| "endpoint".to_string());
            let ret_ts = f
                .return_type()
                .map(|t| self.to_ts_type(&t.text()))
                .unwrap_or_else(|| "void".to_string());

            let mut params_ts = Vec::new();
            let mut param_names = Vec::new();
            if let Some(pl) = f.param_list() {
                for p in pl.params() {
                    if let Some(pn) = p.name() {
                        let p_name = pn.text();
                        let p_ty = p
                            .type_ref()
                            .map(|t| self.to_ts_type(&t.text()))
                            .unwrap_or_else(|| "any".to_string());
                        params_ts.push(format!("{}: {}", p_name, p_ty));
                        param_names.push(p_name);
                    }
                }
            }

            out.push_str(&format!(
                "export async function {}({}): Promise<{}> {{\n",
                name,
                params_ts.join(", "),
                ret_ts
            ));
            out.push_str(&format!(
                "  const res = await fetch(`/api/{}`, {{\n    method: 'POST',\n    headers: {{ 'Content-Type': 'application/json' }},\n    body: JSON.stringify({{ {} }}),\n  }});\n  return res.json();\n}}\n",
                name,
                param_names.join(", ")
            ));
        }
        out
    }

    fn gen_store(&mut self, store: &StoreDef) -> String {
        let store_name = store.name().map(|n| n.text()).unwrap_or_else(|| "Store".to_string());
        
        // Check if single-variable store (e.g. store count = 0;)
        if store.body().is_none() {
            let hook_name = format!("use{}", Self::capitalize(&store_name));
            let mut out = format!("export function {}() {{\n", hook_name);
            let setter = format!("set{}", Self::capitalize(&store_name));
            let ts_ty = store
                .type_ref()
                .map(|t| self.to_ts_type(&t.text()))
                .unwrap_or_else(|| "any".to_string());
            let init = store
                .value()
                .map(|v| self.gen_expr(&v))
                .unwrap_or_else(|| "0".to_string());
            
            out.push_str(&format!("  const [{}, {}] = useState<{}>({});\n", store_name, setter, ts_ty, init));
            out.push_str(&format!("  return {{ {}, {} }};\n", store_name, setter));
            out.push_str("}\n");
            return out;
        }

        let hook_name = format!("use{}", Self::capitalize(&store_name));
        let mut out = format!("export function {}() {{\n", hook_name);

        let mut returns = Vec::new();
        self.state_vars.clear();

        // Local state in store
        for var in store.vars() {
            if let Some(v_name) = var.name() {
                let name = v_name.text();
                self.state_vars.insert(name.clone());
                let setter = format!("set{}", Self::capitalize(&name));
                let ts_ty = var
                    .type_ref()
                    .map(|t| self.to_ts_type(&t.text()))
                    .unwrap_or_else(|| "any".to_string());
                let init = var
                    .value()
                    .map(|v| self.gen_expr(&v))
                    .unwrap_or_else(|| "undefined".to_string());

                out.push_str(&format!(
                    "  const [{}, {}] = useState<{}>({});\n",
                    name, setter, ts_ty, init
                ));
                returns.push(name.clone());
                returns.push(setter);
            }
        }

        // Store functions
        for f in store.functions() {
            if let Some(f_name) = f.name() {
                let name = f_name.text();
                let mut params_str = Vec::new();
                if let Some(pl) = f.param_list() {
                    for p in pl.params() {
                        if let Some(pn) = p.name() {
                            let p_type = p
                                .type_ref()
                                .map(|t| self.to_ts_type(&t.text()))
                                .unwrap_or_else(|| "any".to_string());
                            params_str.push(format!("{}: {}", pn.text(), p_type));
                        }
                    }
                }

                out.push_str(&format!(
                    "  const {} = useCallback(({}) => {{\n",
                    name,
                    params_str.join(", ")
                ));

                if let Some(body) = f.body() {
                    self.indent_level += 2;
                    for stmt in body.statements() {
                        let stmt_str = self.gen_stmt(&stmt);
                        out.push_str(&stmt_str);
                    }
                    self.indent_level -= 2;
                }

                out.push_str("  }, []);\n");
                returns.push(name);
            }
        }

        out.push_str(&format!("  return {{ {} }};\n", returns.join(", ")));
        out.push_str("}\n");
        out
    }

    fn gen_component(&mut self, comp: &ComponentDef) -> String {
        let name = comp.name().map(|n| n.text()).unwrap_or_else(|| "Component".to_string());
        self.state_vars.clear();

        let mut param_types = Vec::new();
        let mut param_names = Vec::new();
        if let Some(pl) = comp.param_list() {
            for p in pl.params() {
                if let Some(pn) = p.name() {
                    let p_name = pn.text();
                    let p_type = p
                        .type_ref()
                        .map(|t| self.to_ts_type(&t.text()))
                        .unwrap_or_else(|| "any".to_string());
                    param_types.push(format!("{}?: {}", p_name, p_type));
                    param_names.push(p_name);
                }
            }
        }

        let props_sig = if param_names.is_empty() {
            "props: Record<string, any> = {}".to_string()
        } else {
            format!("props: {{ {} }} = {{}}", param_types.join(", "))
        };

        let mut out = format!("export function {}({}) {{\n", name, props_sig);

        if !param_names.is_empty() {
            out.push_str(&format!("  const {{ {} }} = props;\n", param_names.join(", ")));
        }

        // Hook up any available stores
        for store_name in &self.stores {
            let hook_name = format!("use{}", Self::capitalize(store_name));
            out.push_str(&format!("  const store = {}();\n", hook_name));
        }

        // Hook up top-level resources
        for res_name in &self.top_resources {
            let hook_name = format!("use{}Resource", Self::capitalize(res_name));
            out.push_str(&format!("  const {} = {}();\n", res_name, hook_name));
        }

        // Track local state variables, stores, and resources inside component
        if let Some(body) = comp.body() {
            for item in body.items() {
                match item {
                    Item::Var(v) => {
                        if let Some(vn) = v.name() {
                            self.state_vars.insert(vn.text());
                        }
                    }
                    Item::Store(s) => {
                        if let Some(sn) = s.name() {
                            self.state_vars.insert(sn.text());
                        }
                    }
                    Item::Resource(r) => {
                        if let Some(rn) = r.name() {
                            self.state_vars.insert(rn.text());
                        }
                    }
                    Item::Statement(Stmt::Var(v)) => {
                        if let Some(vn) = v.name() {
                            self.state_vars.insert(vn.text());
                        }
                    }
                    Item::Statement(Stmt::Store(s)) => {
                        if let Some(sn) = s.name() {
                            self.state_vars.insert(sn.text());
                        }
                    }
                    Item::Statement(Stmt::Resource(r)) => {
                        if let Some(rn) = r.name() {
                            self.state_vars.insert(rn.text());
                        }
                    }
                    _ => {}
                }
            }

            self.indent_level = 1;

            // Generate state and resource hooks
            for item in body.items() {
                match item {
                    Item::Var(v) => {
                        let state_str = self.gen_var_as_state(&v);
                        out.push_str(&state_str);
                    }
                    Item::Store(s) => {
                        let state_str = self.gen_store_as_state(&s);
                        out.push_str(&state_str);
                    }
                    Item::Resource(r) => {
                        let res_str = self.gen_resource_as_state(&r);
                        out.push_str(&res_str);
                    }
                    Item::Statement(Stmt::Var(v)) => {
                        let state_str = self.gen_var_as_state(&v);
                        out.push_str(&state_str);
                    }
                    Item::Statement(Stmt::Store(s)) => {
                        let state_str = self.gen_store_as_state(&s);
                        out.push_str(&state_str);
                    }
                    Item::Statement(Stmt::Resource(r)) => {
                        let res_str = self.gen_resource_as_state(&r);
                        out.push_str(&res_str);
                    }
                    _ => {}
                }
            }

            // Generate other statements (functions, etc.) before JSX return
            for item in body.items() {
                match item {
                    Item::Var(_)
                    | Item::Store(_)
                    | Item::Resource(_)
                    | Item::Statement(Stmt::Var(_))
                    | Item::Statement(Stmt::Store(_))
                    | Item::Statement(Stmt::Resource(_)) => {}
                    Item::Function(f) => {
                        let fn_str = self.gen_comp_function(&f);
                        out.push_str(&fn_str);
                    }
                    Item::Statement(stmt) => {
                        let stmt_str = self.gen_stmt(&stmt);
                        out.push_str(&stmt_str);
                    }
                    _ => {}
                }
            }

            // Generate UI return JSX
            let ui_elements: Vec<_> = body.ui_elements().collect();
            if !ui_elements.is_empty() {
                out.push_str("  return (\n");
                self.indent_level = 2;
                for ui in ui_elements {
                    let ui_str = self.gen_ui_element(&ui);
                    if !ui_str.is_empty() {
                        out.push_str(&ui_str);
                        out.push('\n');
                    }
                }
                out.push_str("  );\n");
            } else {
                out.push_str("  return null;\n");
            }
        } else {
            out.push_str("  return null;\n");
        }

        out.push_str("}\n");
        out
    }

    fn gen_var_as_state(&mut self, var: &VarDef) -> String {
        let name = var.name().map(|n| n.text()).unwrap_or_else(|| "state".to_string());
        let setter = format!("set{}", Self::capitalize(&name));
        let ts_ty = var
            .type_ref()
            .map(|t| self.to_ts_type(&t.text()))
            .unwrap_or_else(|| {
                if let Some(v) = var.value() {
                    let v_str = self.gen_expr(&v);
                    if v_str.parse::<f64>().is_ok() {
                        "number".to_string()
                    } else if v_str.starts_with('"') {
                        "string".to_string()
                    } else if v_str == "true" || v_str == "false" {
                        "boolean".to_string()
                    } else {
                        "any".to_string()
                    }
                } else {
                    "any".to_string()
                }
            });
        let init = var
            .value()
            .map(|v| self.gen_expr(&v))
            .unwrap_or_else(|| "undefined".to_string());

        format!("{}const [{}, {}] = useState<{}>({});\n", self.indent(), name, setter, ts_ty, init)
    }

    fn gen_store_as_state(&mut self, store: &StoreDef) -> String {
        let name = store.name().map(|n| n.text()).unwrap_or_else(|| "state".to_string());
        let setter = format!("set{}", Self::capitalize(&name));
        let ts_ty = store
            .type_ref()
            .map(|t| self.to_ts_type(&t.text()))
            .unwrap_or_else(|| {
                if let Some(v) = store.value() {
                    let v_str = self.gen_expr(&v);
                    if v_str.parse::<f64>().is_ok() {
                        "number".to_string()
                    } else if v_str.starts_with('"') {
                        "string".to_string()
                    } else if v_str == "true" || v_str == "false" {
                        "boolean".to_string()
                    } else {
                        "any".to_string()
                    }
                } else {
                    "number".to_string()
                }
            });
        let init = store
            .value()
            .map(|v| self.gen_expr(&v))
            .unwrap_or_else(|| "0".to_string());

        format!("{}const [{}, {}] = useState<{}>({});\n", self.indent(), name, setter, ts_ty, init)
    }

    fn gen_resource_as_state(&mut self, res: &ResourceDef) -> String {
        let name = res.name().map(|n| n.text()).unwrap_or_else(|| "resource".to_string());
        let ind = self.indent();
        let setter = format!("set{}", Self::capitalize(&name));
        let val_expr = res.value().map(|v| self.gen_expr(&v)).unwrap_or_else(|| "null".to_string());

        let mut out = String::new();
        out.push_str(&format!(
            "{}const [{}, {}] = useState<{{ data: any; loading: boolean; error: any }}>({{\n{}  data: null,\n{}  loading: true,\n{}  error: null,\n{}}});\n",
            ind, name, setter, ind, ind, ind, ind
        ));

        out.push_str(&format!("{}useEffect(() => {{\n", ind));
        out.push_str(&format!("{}  let isMounted = true;\n", ind));
        out.push_str(&format!("{}  Promise.resolve().then(() => {{\n", ind));

        if val_expr.starts_with('"') && val_expr.ends_with('"') {
            out.push_str(&format!("{}    return fetch({});\n", ind, val_expr));
        } else {
            out.push_str(&format!("{}    return {};\n", ind, val_expr));
        }

        out.push_str(&format!("{}  }})\n", ind));
        out.push_str(&format!("{}  .then((res) => {{\n", ind));
        out.push_str(&format!("{}    if (res && typeof (res as any).json === 'function') {{\n", ind));
        out.push_str(&format!("{}      if (!(res as any).ok) throw new Error(`HTTP ${{(res as any).status}}: ${{(res as any).statusText}}`);\n", ind));
        out.push_str(&format!("{}      return (res as any).json();\n", ind));
        out.push_str(&format!("{}    }}\n", ind));
        out.push_str(&format!("{}    return res;\n", ind));
        out.push_str(&format!("{}  }})\n", ind));
        out.push_str(&format!("{}  .then((data) => {{\n", ind));
        out.push_str(&format!("{}    if (isMounted) {}({{ data, loading: false, error: null }});\n", ind, setter));
        out.push_str(&format!("{}  }})\n", ind));
        out.push_str(&format!("{}  .catch((err) => {{\n", ind));
        out.push_str(&format!("{}    if (isMounted) {}({{ data: null, loading: false, error: err?.message || String(err) }});\n", ind, setter));
        out.push_str(&format!("{}  }});\n", ind));
        out.push_str(&format!("{}  return () => {{ isMounted = false; }};\n", ind));
        out.push_str(&format!("{}}}, []);\n", ind));

        out
    }

    fn gen_comp_function(&mut self, f: &FnDef) -> String {
        let name = f.name().map(|n| n.text()).unwrap_or_else(|| "fn_handler".to_string());
        let mut params_str = Vec::new();
        if let Some(pl) = f.param_list() {
            for p in pl.params() {
                if let Some(pn) = p.name() {
                    let p_type = p
                        .type_ref()
                        .map(|t| self.to_ts_type(&t.text()))
                        .unwrap_or_else(|| "any".to_string());
                    params_str.push(format!("{}: {}", pn.text(), p_type));
                }
            }
        }

        let mut out = format!("{}const {} = useCallback(({}) => {{\n", self.indent(), name, params_str.join(", "));

        if let Some(body) = f.body() {
            self.indent_level += 1;
            for stmt in body.statements() {
                let stmt_str = self.gen_stmt(&stmt);
                out.push_str(&stmt_str);
            }
            self.indent_level -= 1;
        }

        out.push_str(&format!("{}}}, []);\n", self.indent()));
        out
    }

    fn gen_stmt(&mut self, stmt: &Stmt) -> String {
        match stmt {
            Stmt::Let(let_stmt) => {
                let name = let_stmt.name().map(|n| n.text()).unwrap_or_else(|| "x".to_string());
                let val = let_stmt.value().map(|v| self.gen_expr(&v)).unwrap_or_else(|| "undefined".to_string());
                format!("{}const {} = {};\n", self.indent(), name, val)
            }
            Stmt::Var(var) => {
                let name = var.name().map(|n| n.text()).unwrap_or_else(|| "x".to_string());
                let val = var.value().map(|v| self.gen_expr(&v)).unwrap_or_else(|| "undefined".to_string());
                format!("{}let {} = {};\n", self.indent(), name, val)
            }
            Stmt::Store(store) => self.gen_store_as_state(store),
            Stmt::Resource(res) => self.gen_resource_as_state(res),
            Stmt::Expr(expr_stmt) => {
                if let Some(expr) = expr_stmt.expr() {
                    let expr_str = self.gen_expr(&expr);
                    format!("{}{};\n", self.indent(), expr_str)
                } else {
                    String::new()
                }
            }
            Stmt::Return(ret_stmt) => {
                if let Some(expr) = ret_stmt.expr() {
                    let expr_str = self.gen_expr(&expr);
                    format!("{}return {};\n", self.indent(), expr_str)
                } else {
                    format!("{}return;\n", self.indent())
                }
            }
        }
    }

    fn extract_style_props(
        &self,
        props_map: &mut HashMap<String, String>,
        default_styles: Vec<(&str, String)>,
    ) -> String {
        let mut style_entries = default_styles;

        let style_mappings = [
            ("gap", "gap"),
            ("spacing", "gap"),
            ("padding", "padding"),
            ("pad", "padding"),
            ("p", "padding"),
            ("margin", "margin"),
            ("m", "margin"),
            ("bg", "backgroundColor"),
            ("background", "backgroundColor"),
            ("color", "color"),
            ("textColor", "color"),
            ("fg", "color"),
            ("radius", "borderRadius"),
            ("borderRadius", "borderRadius"),
            ("rounded", "borderRadius"),
            ("width", "width"),
            ("w", "width"),
            ("height", "height"),
            ("h", "height"),
            ("fontSize", "fontSize"),
            ("size", "fontSize"),
            ("fontWeight", "fontWeight"),
            ("weight", "fontWeight"),
            ("border", "border"),
            ("borderWidth", "borderWidth"),
            ("borderColor", "borderColor"),
            ("shadow", "boxShadow"),
            ("boxShadow", "boxShadow"),
            ("align", "alignItems"),
            ("alignItems", "alignItems"),
            ("justify", "justifyContent"),
            ("justifyContent", "justifyContent"),
            ("direction", "flexDirection"),
            ("flexDirection", "flexDirection"),
            ("opacity", "opacity"),
            ("cursor", "cursor"),
            ("overflow", "overflow"),
            ("maxWidth", "maxWidth"),
            ("maxHeight", "maxHeight"),
            ("minWidth", "minWidth"),
            ("minHeight", "minHeight"),
        ];

        for (prop_key, css_key) in &style_mappings {
            if let Some(val) = props_map.remove(*prop_key) {
                if let Some(entry) = style_entries.iter_mut().find(|(k, _)| *k == *css_key) {
                    entry.1 = val;
                } else {
                    style_entries.push((css_key, val));
                }
            }
        }

        let explicit_style = props_map.remove("style");

        let entries_str = style_entries
            .iter()
            .map(|(k, v)| format!("{}: {}", k, v))
            .collect::<Vec<_>>()
            .join(", ");

        match explicit_style {
            Some(s) => {
                if entries_str.is_empty() {
                    format!("style={{{}}}", s)
                } else {
                    format!("style={{{{ {}, ...{} }}}}", entries_str, s)
                }
            }
            None => {
                if entries_str.is_empty() {
                    String::new()
                } else {
                    format!("style={{{{ {} }}}}", entries_str)
                }
            }
        }
    }

    fn gen_ui_element(&mut self, ui: &UiElement) -> String {
        let tag = ui.tag_name().unwrap_or_else(|| "div".to_string());
        let mut props_map: HashMap<String, String> = HashMap::new();
        let mut positional_args: Vec<String> = Vec::new();

        if let Some(arg_list) = ui.arg_list() {
            for prop in arg_list.properties() {
                if let Some(name) = prop.name() {
                    let k = name.text();
                    let v = prop.value().map(|e| self.gen_expr(&e)).unwrap_or_default();
                    props_map.insert(k, v);
                } else if let Some(val) = prop.value() {
                    positional_args.push(self.gen_expr(&val));
                }
            }
        }

        let ind = self.indent();

        match tag.as_str() {
            "ui" => {
                // UI container wrapper: render children directly
                self.gen_ui_children(ui)
            }
            "VStack" => {
                let class_prop = props_map.remove("class").or_else(|| props_map.remove("className"));
                let default_styles = vec![
                    ("display", "'flex'".to_string()),
                    ("flexDirection", "'column'".to_string()),
                ];
                let style_str = self.extract_style_props(&mut props_map, default_styles);

                let class_str = match class_prop {
                    Some(c) => format!(" className={}", self.strip_quotes_if_literal(&c)),
                    None => String::new(),
                };

                let other_props = self.format_props(&props_map);
                let children = self.gen_ui_children(ui);

                let style_attr = if style_str.is_empty() { String::new() } else { format!(" {}", style_str) };

                if children.is_empty() {
                    format!("{}<div{}{}{} />", ind, style_attr, class_str, other_props)
                } else {
                    format!("{}<div{}{}{}>\n{}\n{}</div>", ind, style_attr, class_str, other_props, children, ind)
                }
            }
            "HStack" => {
                let class_prop = props_map.remove("class").or_else(|| props_map.remove("className"));
                let default_styles = vec![
                    ("display", "'flex'".to_string()),
                    ("flexDirection", "'row'".to_string()),
                    ("alignItems", "'center'".to_string()),
                ];
                let style_str = self.extract_style_props(&mut props_map, default_styles);

                let class_str = match class_prop {
                    Some(c) => format!(" className={}", self.strip_quotes_if_literal(&c)),
                    None => String::new(),
                };

                let other_props = self.format_props(&props_map);
                let children = self.gen_ui_children(ui);

                let style_attr = if style_str.is_empty() { String::new() } else { format!(" {}", style_str) };

                if children.is_empty() {
                    format!("{}<div{}{}{} />", ind, style_attr, class_str, other_props)
                } else {
                    format!("{}<div{}{}{}>\n{}\n{}</div>", ind, style_attr, class_str, other_props, children, ind)
                }
            }
            "Button" => {
                let label = positional_args.first().cloned();
                let onclick = props_map.remove("onClick").or_else(|| props_map.remove("onclick"));
                let class_prop = props_map.remove("class").or_else(|| props_map.remove("className"));
                let default_styles = vec![("cursor", "'pointer'".to_string())];
                let style_str = self.extract_style_props(&mut props_map, default_styles);

                let mut attrs = Vec::new();
                if let Some(oc) = onclick {
                    attrs.push(format!("onClick={{{}}}", oc));
                }
                if !style_str.is_empty() {
                    attrs.push(style_str);
                }
                if let Some(cl) = class_prop {
                    attrs.push(format!("className={}", self.strip_quotes_if_literal(&cl)));
                }

                let other_props = self.format_props(&props_map);
                let attrs_str = if attrs.is_empty() { String::new() } else { format!(" {}", attrs.join(" ")) };

                // Check if label was in children body
                let children = self.gen_ui_children(ui);
                if label.is_none() && !children.is_empty() {
                    format!("{}<button{}{}>\n{}\n{}</button>", ind, attrs_str, other_props, children, ind)
                } else {
                    let final_label = label.unwrap_or_else(|| "\"Button\"".to_string());
                    let label_jsx = self.strip_quotes_if_literal(&final_label);
                    format!("{}<button{}{}>{}</button>", ind, attrs_str, other_props, label_jsx)
                }
            }
            "Text" => {
                let content = positional_args.first().cloned();
                let class_prop = props_map.remove("class").or_else(|| props_map.remove("className"));
                let style_str = self.extract_style_props(&mut props_map, Vec::new());

                let mut attrs = Vec::new();
                if !style_str.is_empty() {
                    attrs.push(style_str);
                }
                if let Some(cl) = class_prop {
                    attrs.push(format!("className={}", self.strip_quotes_if_literal(&cl)));
                }
                let other_props = self.format_props(&props_map);
                let attrs_str = if attrs.is_empty() { String::new() } else { format!(" {}", attrs.join(" ")) };

                if let Some(cnt) = content {
                    let content_jsx = self.strip_quotes_if_literal(&cnt);
                    format!("{}<span{}{}>{}</span>", ind, attrs_str, other_props, content_jsx)
                } else {
                    let children = self.gen_ui_children(ui);
                    format!("{}<span{}{}>{}</span>", ind, attrs_str, other_props, children)
                }
            }
            "TextField" => {
                let class_prop = props_map.remove("class").or_else(|| props_map.remove("className"));
                let style_str = self.extract_style_props(&mut props_map, Vec::new());
                let mut attrs = vec!["type=\"text\"".to_string()];

                if let Some(val) = props_map.remove("value") {
                    attrs.push(format!("value={{{}}}", val));
                    if !props_map.contains_key("onChange") && (self.state_vars.contains(&val) || self.store_vars.contains(&val)) {
                        let setter = if self.state_vars.contains(&val) {
                            format!("set{}", Self::capitalize(&val))
                        } else {
                            format!("store.set{}", Self::capitalize(&val))
                        };
                        attrs.push(format!("onChange={{(e) => {}(e.target.value) }}", setter));
                    }
                }
                if let Some(ph) = props_map.remove("placeholder") {
                    attrs.push(format!("placeholder={}", ph));
                }
                if let Some(oc) = props_map.remove("onChange").or_else(|| props_map.remove("onchange")) {
                    attrs.push(format!("onChange={{{}}}", oc));
                }
                if !style_str.is_empty() {
                    attrs.push(style_str);
                }
                if let Some(cl) = class_prop {
                    attrs.push(format!("className={}", self.strip_quotes_if_literal(&cl)));
                }
                let other_props = self.format_props(&props_map);
                let attrs_str = if attrs.is_empty() { String::new() } else { format!(" {}", attrs.join(" ")) };

                format!("{}<input{}{} />", ind, attrs_str, other_props)
            }
            custom => {
                let class_prop = props_map.remove("class").or_else(|| props_map.remove("className"));
                let style_str = self.extract_style_props(&mut props_map, Vec::new());
                let mut attrs = Vec::new();
                if !style_str.is_empty() {
                    attrs.push(style_str);
                }
                if let Some(cl) = class_prop {
                    attrs.push(format!("className={}", self.strip_quotes_if_literal(&cl)));
                }
                let other_props = self.format_props(&props_map);
                let attrs_str = if attrs.is_empty() { String::new() } else { format!(" {}", attrs.join(" ")) };
                let children = self.gen_ui_children(ui);
                if children.is_empty() {
                    format!("{}<{}{}{} />", ind, custom, attrs_str, other_props)
                } else {
                    format!("{}<{}{}{}>\n{}\n{}</{}>", ind, custom, attrs_str, other_props, children, ind, custom)
                }
            }
        }
    }

    fn gen_ui_if(&mut self, if_expr: &IfExpr) -> String {
        let cond = if_expr
            .condition()
            .map(|c| self.gen_expr(&c))
            .unwrap_or_else(|| "true".to_string());

        let ind = self.indent();

        let then_jsx = if let Some(then_b) = if_expr.then_branch() {
            self.gen_block_as_jsx(&then_b)
        } else {
            "null".to_string()
        };

        let else_jsx = if let Some(else_b) = if_expr.else_branch() {
            if let Some(b) = else_b.block() {
                self.gen_block_as_jsx(&b)
            } else if let Some(nested_if) = else_b.if_expr() {
                self.gen_ui_if(&nested_if)
            } else {
                "null".to_string()
            }
        } else {
            "null".to_string()
        };

        format!("{}{{({}) ? ({}) : ({})}}", ind, cond, then_jsx, else_jsx)
    }

    fn gen_block_as_jsx(&mut self, block: &BlockExpr) -> String {
        let mut parts = Vec::new();
        for syntax_child in block.syntax().children() {
            if let Some(child_ui) = UiElement::cast(syntax_child.clone()) {
                let rendered = self.gen_ui_element(&child_ui);
                if !rendered.is_empty() {
                    parts.push(rendered);
                }
            } else if let Some(nested_if) = IfExpr::cast(syntax_child.clone()) {
                let rendered = self.gen_ui_if(&nested_if);
                if !rendered.is_empty() {
                    parts.push(rendered);
                }
            } else if let Some(stmt) = Stmt::cast(syntax_child.clone()) {
                match stmt {
                    Stmt::Expr(expr_stmt) => {
                        if let Some(expr) = expr_stmt.expr() {
                            match expr {
                                Expr::If(ref nested_if) => {
                                    let rendered = self.gen_ui_if(nested_if);
                                    if !rendered.is_empty() {
                                        parts.push(rendered);
                                    }
                                }
                                Expr::Ui(ref child_ui) => {
                                    let rendered = self.gen_ui_element(child_ui);
                                    if !rendered.is_empty() {
                                        parts.push(rendered);
                                    }
                                }
                                _ => {
                                    let expr_str = self.gen_expr(&expr);
                                    parts.push(self.strip_quotes_if_literal(&expr_str));
                                }
                            }
                        }
                    }
                    _ => {}
                }
            } else if let Some(expr) = Expr::cast(syntax_child.clone()) {
                match expr {
                    Expr::If(ref nested_if) => {
                        let rendered = self.gen_ui_if(nested_if);
                        if !rendered.is_empty() {
                            parts.push(rendered);
                        }
                    }
                    Expr::Ui(ref child_ui) => {
                        let rendered = self.gen_ui_element(child_ui);
                        if !rendered.is_empty() {
                            parts.push(rendered);
                        }
                    }
                    _ => {
                        let expr_str = self.gen_expr(&expr);
                        parts.push(self.strip_quotes_if_literal(&expr_str));
                    }
                }
            }
        }

        if parts.is_empty() {
            "null".to_string()
        } else if parts.len() == 1 {
            parts[0].trim().to_string()
        } else {
            format!("<>\n{}\n</>", parts.join("\n"))
        }
    }

    fn gen_ui_children(&mut self, ui: &UiElement) -> String {
        let mut out = Vec::new();
        if let Some(body) = ui.body() {
            self.indent_level += 1;
            for syntax_child in body.syntax().children() {
                if let Some(child_ui) = UiElement::cast(syntax_child.clone()) {
                    let rendered = self.gen_ui_element(&child_ui);
                    if !rendered.is_empty() {
                        out.push(rendered);
                    }
                } else if let Some(if_expr) = IfExpr::cast(syntax_child.clone()) {
                    let rendered = self.gen_ui_if(&if_expr);
                    if !rendered.is_empty() {
                        out.push(rendered);
                    }
                } else if let Some(stmt) = Stmt::cast(syntax_child.clone()) {
                    match stmt {
                        Stmt::Expr(expr_stmt) => {
                            if let Some(expr) = expr_stmt.expr() {
                                match expr {
                                    Expr::If(ref nested_if) => {
                                        let rendered = self.gen_ui_if(nested_if);
                                        if !rendered.is_empty() {
                                            out.push(rendered);
                                        }
                                    }
                                    Expr::Ui(ref child_ui) => {
                                        let rendered = self.gen_ui_element(child_ui);
                                        if !rendered.is_empty() {
                                            out.push(rendered);
                                        }
                                    }
                                    _ => {
                                        let expr_str = self.gen_expr(&expr);
                                        out.push(format!("{}{}", self.indent(), self.strip_quotes_if_literal(&expr_str)));
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                } else if let Some(expr) = Expr::cast(syntax_child.clone()) {
                    match expr {
                        Expr::If(ref nested_if) => {
                            let rendered = self.gen_ui_if(nested_if);
                            if !rendered.is_empty() {
                                eprintln!("rendered: {}", rendered);
                            }
                        }
                        Expr::Ui(ref child_ui) => {
                            let rendered = self.gen_ui_element(child_ui);
                            if !rendered.is_empty() {
                                out.push(rendered);
                            }
                        }
                        _ => {
                            let expr_str = self.gen_expr(&expr);
                            out.push(format!("{}{}", self.indent(), self.strip_quotes_if_literal(&expr_str)));
                        }
                    }
                }
            }
            self.indent_level -= 1;
        }
        out.join("\n")
    }

    fn format_props(&self, props: &HashMap<String, String>) -> String {
        if props.is_empty() {
            return String::new();
        }
        let mut list: Vec<String> = props
            .iter()
            .map(|(k, v)| {
                if v.starts_with('"') && v.ends_with('"') {
                    format!("{}=\"{}\"", k, &v[1..v.len() - 1])
                } else {
                    format!("{}={{{}}}", k, v)
                }
            })
            .collect();
        list.sort();
        format!(" {}", list.join(" "))
    }

    fn strip_quotes_if_literal(&self, text: &str) -> String {
        if text.starts_with('"') && text.ends_with('"') && text.len() >= 2 {
            text[1..text.len() - 1].to_string()
        } else {
            format!("{{{}}}", text)
        }
    }

    pub fn gen_expr(&mut self, expr: &Expr) -> String {
        match expr {
            Expr::Literal(lit) => lit.text(),
            Expr::NameRef(name_ref) => {
                let name = name_ref.text();
                if self.store_vars.contains(&name) && !self.state_vars.contains(&name) {
                    format!("store.{}", name)
                } else {
                    name
                }
            }
            Expr::Binary(bin) => {
                let lhs = bin.lhs().map(|e| self.gen_expr(&e)).unwrap_or_default();
                let rhs = bin.rhs().map(|e| self.gen_expr(&e)).unwrap_or_default();
                let op = bin.op_token().map(|t| t.text().to_string()).unwrap_or_default();

                if op == "=" {
                    // Assignment expression: x = expr
                    if let Some(Expr::NameRef(nr)) = bin.lhs() {
                        let name = nr.text();
                        if self.state_vars.contains(&name) {
                            let setter = format!("set{}", Self::capitalize(&name));
                            return format!("{}({})", setter, rhs);
                        } else if self.store_vars.contains(&name) {
                            let setter = format!("store.set{}", Self::capitalize(&name));
                            return format!("{}({})", setter, rhs);
                        }
                    }
                }

                format!("{} {} {}", lhs, op, rhs)
            }
            Expr::CompoundAssign(ca) => {
                let lhs = ca.lhs().map(|e| self.gen_expr(&e)).unwrap_or_default();
                let rhs = ca.rhs().map(|e| self.gen_expr(&e)).unwrap_or_default();
                let op = ca.op_token().map(|t| t.text().to_string()).unwrap_or_default();

                let (setter_call, bin_op) = match op.as_str() {
                    "+=" => (true, "+"),
                    "-=" => (true, "-"),
                    "*=" => (true, "*"),
                    "/=" => (true, "/"),
                    _ => (false, "+"),
                };

                if setter_call {
                    if let Some(Expr::NameRef(nr)) = ca.lhs() {
                        let name = nr.text();
                        if self.state_vars.contains(&name) {
                            let setter = format!("set{}", Self::capitalize(&name));
                            return format!("{}((prev) => prev {} ({}))", setter, bin_op, rhs);
                        } else if self.store_vars.contains(&name) {
                            let setter = format!("store.set{}", Self::capitalize(&name));
                            return format!("{}((prev: any) => prev {} ({}))", setter, bin_op, rhs);
                        }
                    }
                }

                format!("{} {} {}", lhs, op, rhs)
            }
            Expr::Prefix(prefix) => {
                let inner = prefix.expr().map(|e| self.gen_expr(&e)).unwrap_or_default();
                let op = prefix.op_token().map(|t| t.text().to_string()).unwrap_or_default();
                format!("{}{}", op, inner)
            }
            Expr::Call(call) => {
                let callee = call.callee().map(|e| self.gen_expr(&e)).unwrap_or_default();
                let mut args = Vec::new();
                if let Some(arg_list) = call.arg_list() {
                    for arg in arg_list.args() {
                        args.push(self.gen_expr(&arg));
                    }
                }
                format!("{}({})", callee, args.join(", "))
            }
            Expr::Lambda(lambda) => {
                let mut params = Vec::new();
                if let Some(pl) = lambda.param_list() {
                    for p in pl.params() {
                        if let Some(pn) = p.name() {
                            params.push(pn.text());
                        }
                    }
                }

                if let Some(body) = lambda.body() {
                    let mut stmts_str = Vec::new();
                    for stmt in body.statements() {
                        let s = match stmt {
                            Stmt::Expr(es) => {
                                if let Some(e) = es.expr() {
                                    format!("{};", self.gen_expr(&e))
                                } else {
                                    String::new()
                                }
                            }
                            Stmt::Return(rs) => {
                                if let Some(e) = rs.expr() {
                                    format!("return {};", self.gen_expr(&e))
                                } else {
                                    "return;".to_string()
                                }
                            }
                            _ => String::new(),
                        };
                        if !s.is_empty() {
                            stmts_str.push(s);
                        }
                    }
                    format!("({}) => {{ {} }}", params.join(", "), stmts_str.join(" "))
                } else {
                    format!("({}) => {{}}", params.join(", "))
                }
            }
            Expr::Block(block) => {
                let mut stmts = Vec::new();
                for stmt in block.statements() {
                    stmts.push(self.gen_stmt(&stmt));
                }
                format!("{{\n{}}}", stmts.join(""))
            }
            Expr::If(if_expr) => {
                let cond = if_expr.condition().map(|c| self.gen_expr(&c)).unwrap_or_else(|| "true".to_string());
                let then_b = if_expr.then_branch().map(|b| self.gen_expr(&Expr::Block(b))).unwrap_or_default();
                format!("if ({}) {}", cond, then_b)
            }
            Expr::For(for_expr) => {
                let _ = for_expr;
                "/* for loop */".to_string()
            }
            Expr::While(while_expr) => {
                let _ = while_expr;
                "/* while loop */".to_string()
            }
            Expr::Ui(ui) => self.gen_ui_element(ui),
            Expr::Field(field) => field.syntax().text().to_string(),
            Expr::Index(idx) => idx.syntax().text().to_string(),
        }
    }

    fn to_ts_type(&self, weave_type: &str) -> String {
        match weave_type.trim() {
            "Int" | "Float" | "i32" | "i64" | "f32" | "f64" => "number".to_string(),
            "String" | "str" => "string".to_string(),
            "Bool" | "bool" => "boolean".to_string(),
            "Null" | "null" => "null".to_string(),
            "Void" | "void" | "()" => "void".to_string(),
            "Any" | "any" => "any".to_string(),
            other => other.to_string(),
        }
    }
}
