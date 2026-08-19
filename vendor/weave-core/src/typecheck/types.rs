use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Type {
    Int,
    Float,
    String,
    Bool,
    Null,
    Void,
    Any,
    Custom(String),
    Function {
        params: Vec<Type>,
        ret: Box<Type>,
    },
    Unknown,
}

impl Type {
    pub fn from_str(name: &str) -> Self {
        match name.trim() {
            "Int" | "i32" | "i64" | "number" => Type::Int,
            "Float" | "f32" | "f64" => Type::Float,
            "String" | "str" => Type::String,
            "Bool" | "boolean" => Type::Bool,
            "Null" | "null" => Type::Null,
            "Void" | "void" | "()" => Type::Void,
            "Any" | "any" => Type::Any,
            other => {
                if other.is_empty() {
                    Type::Unknown
                } else {
                    Type::Custom(other.to_string())
                }
            }
        }
    }

    pub fn is_numeric(&self) -> bool {
        matches!(self, Type::Int | Type::Float | Type::Any)
    }

    pub fn is_assignable_to(&self, target: &Type) -> bool {
        if self == target || *self == Type::Any || *target == Type::Any || *self == Type::Unknown || *target == Type::Unknown {
            return true;
        }

        match (self, target) {
            (Type::Int, Type::Float) => true,
            (Type::Null, Type::Custom(_)) | (Type::Null, Type::String) => true,
            _ => false,
        }
    }

    pub fn to_ts_type(&self) -> String {
        match self {
            Type::Int | Type::Float => "number".to_string(),
            Type::String => "string".to_string(),
            Type::Bool => "boolean".to_string(),
            Type::Null => "null".to_string(),
            Type::Void => "void".to_string(),
            Type::Any | Type::Unknown => "any".to_string(),
            Type::Custom(name) => name.clone(),
            Type::Function { params, ret } => {
                let params_str: Vec<String> = params
                    .iter()
                    .enumerate()
                    .map(|(i, p)| format!("arg{}: {}", i, p.to_ts_type()))
                    .collect();
                format!("({}) => {}", params_str.join(", "), ret.to_ts_type())
            }
        }
    }
}

impl fmt::Display for Type {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Type::Int => write!(f, "Int"),
            Type::Float => write!(f, "Float"),
            Type::String => write!(f, "String"),
            Type::Bool => write!(f, "Bool"),
            Type::Null => write!(f, "Null"),
            Type::Void => write!(f, "Void"),
            Type::Any => write!(f, "Any"),
            Type::Custom(name) => write!(f, "{}", name),
            Type::Function { params, ret } => {
                let p_str: Vec<String> = params.iter().map(|p| p.to_string()).collect();
                write!(f, "({}) -> {}", p_str.join(", "), ret)
            }
            Type::Unknown => write!(f, "<unknown>"),
        }
    }
}
