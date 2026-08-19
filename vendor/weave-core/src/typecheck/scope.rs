use crate::typecheck::types::Type;
use std::collections::HashMap;
use std::ops::Range;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Symbol {
    Variable {
        name: String,
        ty: Type,
        is_mut: bool,
        is_state: bool,
        span: Range<usize>,
    },
    Function {
        name: String,
        params: Vec<(String, Type)>,
        ret_type: Type,
        span: Range<usize>,
    },
    Store {
        name: String,
        vars: HashMap<String, Type>,
        functions: HashMap<String, (Vec<(String, Type)>, Type)>,
        span: Range<usize>,
    },
    Component {
        name: String,
        params: Vec<(String, Type)>,
        span: Range<usize>,
    },
    Style {
        name: String,
        properties: HashMap<String, String>,
        span: Range<usize>,
    },
    Resource {
        name: String,
        ty: Type,
        span: Range<usize>,
    },
    Theme {
        name: String,
        properties: HashMap<String, String>,
        span: Range<usize>,
    },
}

impl Symbol {
    pub fn name(&self) -> &str {
        match self {
            Symbol::Variable { name, .. } => name,
            Symbol::Function { name, .. } => name,
            Symbol::Store { name, .. } => name,
            Symbol::Component { name, .. } => name,
            Symbol::Style { name, .. } => name,
            Symbol::Resource { name, .. } => name,
            Symbol::Theme { name, .. } => name,
        }
    }

    pub fn span(&self) -> Range<usize> {
        match self {
            Symbol::Variable { span, .. } => span.clone(),
            Symbol::Function { span, .. } => span.clone(),
            Symbol::Store { span, .. } => span.clone(),
            Symbol::Component { span, .. } => span.clone(),
            Symbol::Style { span, .. } => span.clone(),
            Symbol::Resource { span, .. } => span.clone(),
            Symbol::Theme { span, .. } => span.clone(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Scope {
    symbols: HashMap<String, Symbol>,
    parent: Option<usize>,
}

#[derive(Debug, Clone)]
pub struct ScopeTable {
    scopes: Vec<Scope>,
    current: usize,
}

impl Default for ScopeTable {
    fn default() -> Self {
        Self::new()
    }
}

impl ScopeTable {
    pub fn new() -> Self {
        let root = Scope {
            symbols: HashMap::new(),
            parent: None,
        };
        Self {
            scopes: vec![root],
            current: 0,
        }
    }

    pub fn enter_scope(&mut self) -> usize {
        let new_idx = self.scopes.len();
        self.scopes.push(Scope {
            symbols: HashMap::new(),
            parent: Some(self.current),
        });
        self.current = new_idx;
        new_idx
    }

    pub fn exit_scope(&mut self) {
        if let Some(parent) = self.scopes[self.current].parent {
            self.current = parent;
        }
    }

    pub fn define(&mut self, symbol: Symbol) -> Result<(), Symbol> {
        let name = symbol.name().to_string();
        let scope = &mut self.scopes[self.current];
        if let Some(existing) = scope.symbols.get(&name) {
            return Err(existing.clone());
        }
        scope.symbols.insert(name, symbol);
        Ok(())
    }

    pub fn resolve(&self, name: &str) -> Option<&Symbol> {
        let mut curr = Some(self.current);
        while let Some(idx) = curr {
            let scope = &self.scopes[idx];
            if let Some(sym) = scope.symbols.get(name) {
                return Some(sym);
            }
            curr = scope.parent;
        }
        None
    }

    pub fn resolve_var_type(&self, name: &str) -> Option<Type> {
        match self.resolve(name) {
            Some(Symbol::Variable { ty, .. }) => Some(ty.clone()),
            Some(Symbol::Function { params, ret_type, .. }) => {
                let p_types = params.iter().map(|(_, t)| t.clone()).collect();
                Some(Type::Function {
                    params: p_types,
                    ret: Box::new(ret_type.clone()),
                })
            }
            _ => None,
        }
    }

    pub fn is_state_var(&self, name: &str) -> bool {
        match self.resolve(name) {
            Some(Symbol::Variable { is_state, .. }) => *is_state,
            _ => false,
        }
    }
}
