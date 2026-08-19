use crate::lexer::TokenKind;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[allow(non_camel_case_types)]
#[repr(u16)]
pub enum SyntaxKind {
    // -------------------------------------------------------------
    // Token Kinds
    // -------------------------------------------------------------
    KwComponent,
    KwStore,
    KwServer,
    KwVar,
    KwStyle,
    KwResource,
    KwTheme,
    KwVStack,
    KwHStack,
    KwButton,
    KwText,
    KwTextField,
    KwFn,
    KwLet,
    KwMut,
    KwIf,
    KwElse,
    KwFor,
    KwIn,
    KwWhile,
    KwReturn,
    KwTrue,
    KwFalse,
    KwNull,
    KwImport,
    KwExport,
    KwFrom,
    KwAs,
    KwType,

    Ident,
    IntLiteral,
    FloatLiteral,
    StringLiteral,

    Plus,
    Minus,
    Star,
    Slash,
    Percent,

    PlusAssign,
    MinusAssign,
    MulAssign,
    DivAssign,

    EqEq,
    BangEq,
    LtEq,
    GtEq,
    Lt,
    Gt,

    AmpAmp,
    PipePipe,
    Bang,

    Eq,
    Arrow,
    FatArrow,

    Colon,
    ColonColon,
    Semi,
    Comma,
    Dot,

    LParen,
    RParen,
    LBrace,
    RBrace,
    LBracket,
    RBracket,

    Whitespace,
    LineComment,
    BlockComment,
    Error,

    // -------------------------------------------------------------
    // Composite CST / AST Nodes
    // -------------------------------------------------------------
    SOURCE_FILE,
    COMPONENT_DEF,
    STORE_DEF,
    SERVER_DEF,
    VAR_DEF,
    STYLE_DEF,
    STYLE_PROPERTY,
    RESOURCE_DEF,
    THEME_DEF,
    THEME_PROPERTY,
    FN_DEF,
    PARAM_LIST,
    PARAM,
    TYPE_REF,
    BLOCK_EXPR,
    UI_ELEMENT,
    UI_ARG_LIST,
    UI_PROPERTY,
    EXPR_STMT,
    LET_STMT,
    RETURN_STMT,
    IF_EXPR,
    ELSE_BRANCH,
    FOR_EXPR,
    WHILE_EXPR,
    BINARY_EXPR,
    COMPOUND_ASSIGN_EXPR,
    PREFIX_EXPR,
    CALL_EXPR,
    ARG_LIST,
    ARG,
    LAMBDA_EXPR,
    FIELD_EXPR,
    INDEX_EXPR,
    LITERAL,
    NAME,
    NAME_REF,
    PATH,
    ERROR_NODE,

    #[doc(hidden)]
    __LAST,
}

impl From<TokenKind> for SyntaxKind {
    fn from(token: TokenKind) -> Self {
        match token {
            TokenKind::KwComponent => SyntaxKind::KwComponent,
            TokenKind::KwStore => SyntaxKind::KwStore,
            TokenKind::KwServer => SyntaxKind::KwServer,
            TokenKind::KwVar => SyntaxKind::KwVar,
            TokenKind::KwStyle => SyntaxKind::KwStyle,
            TokenKind::KwResource => SyntaxKind::KwResource,
            TokenKind::KwTheme => SyntaxKind::KwTheme,
            TokenKind::KwVStack => SyntaxKind::KwVStack,
            TokenKind::KwHStack => SyntaxKind::KwHStack,
            TokenKind::KwButton => SyntaxKind::KwButton,
            TokenKind::KwText => SyntaxKind::KwText,
            TokenKind::KwTextField => SyntaxKind::KwTextField,
            TokenKind::KwFn => SyntaxKind::KwFn,
            TokenKind::KwLet => SyntaxKind::KwLet,
            TokenKind::KwMut => SyntaxKind::KwMut,
            TokenKind::KwIf => SyntaxKind::KwIf,
            TokenKind::KwElse => SyntaxKind::KwElse,
            TokenKind::KwFor => SyntaxKind::KwFor,
            TokenKind::KwIn => SyntaxKind::KwIn,
            TokenKind::KwWhile => SyntaxKind::KwWhile,
            TokenKind::KwReturn => SyntaxKind::KwReturn,
            TokenKind::KwTrue => SyntaxKind::KwTrue,
            TokenKind::KwFalse => SyntaxKind::KwFalse,
            TokenKind::KwNull => SyntaxKind::KwNull,
            TokenKind::KwImport => SyntaxKind::KwImport,
            TokenKind::KwExport => SyntaxKind::KwExport,
            TokenKind::KwFrom => SyntaxKind::KwFrom,
            TokenKind::KwAs => SyntaxKind::KwAs,
            TokenKind::KwType => SyntaxKind::KwType,
            TokenKind::Ident => SyntaxKind::Ident,
            TokenKind::IntLiteral => SyntaxKind::IntLiteral,
            TokenKind::FloatLiteral => SyntaxKind::FloatLiteral,
            TokenKind::StringLiteral => SyntaxKind::StringLiteral,
            TokenKind::Plus => SyntaxKind::Plus,
            TokenKind::Minus => SyntaxKind::Minus,
            TokenKind::Star => SyntaxKind::Star,
            TokenKind::Slash => SyntaxKind::Slash,
            TokenKind::Percent => SyntaxKind::Percent,
            TokenKind::PlusAssign => SyntaxKind::PlusAssign,
            TokenKind::MinusAssign => SyntaxKind::MinusAssign,
            TokenKind::MulAssign => SyntaxKind::MulAssign,
            TokenKind::DivAssign => SyntaxKind::DivAssign,
            TokenKind::EqEq => SyntaxKind::EqEq,
            TokenKind::BangEq => SyntaxKind::BangEq,
            TokenKind::LtEq => SyntaxKind::LtEq,
            TokenKind::GtEq => SyntaxKind::GtEq,
            TokenKind::Lt => SyntaxKind::Lt,
            TokenKind::Gt => SyntaxKind::Gt,
            TokenKind::AmpAmp => SyntaxKind::AmpAmp,
            TokenKind::PipePipe => SyntaxKind::PipePipe,
            TokenKind::Bang => SyntaxKind::Bang,
            TokenKind::Eq => SyntaxKind::Eq,
            TokenKind::Arrow => SyntaxKind::Arrow,
            TokenKind::FatArrow => SyntaxKind::FatArrow,
            TokenKind::Colon => SyntaxKind::Colon,
            TokenKind::ColonColon => SyntaxKind::ColonColon,
            TokenKind::Semi => SyntaxKind::Semi,
            TokenKind::Comma => SyntaxKind::Comma,
            TokenKind::Dot => SyntaxKind::Dot,
            TokenKind::LParen => SyntaxKind::LParen,
            TokenKind::RParen => SyntaxKind::RParen,
            TokenKind::LBrace => SyntaxKind::LBrace,
            TokenKind::RBrace => SyntaxKind::RBrace,
            TokenKind::LBracket => SyntaxKind::LBracket,
            TokenKind::RBracket => SyntaxKind::RBracket,
            TokenKind::Whitespace => SyntaxKind::Whitespace,
            TokenKind::LineComment => SyntaxKind::LineComment,
            TokenKind::BlockComment => SyntaxKind::BlockComment,
            TokenKind::Error => SyntaxKind::Error,
        }
    }
}

impl From<SyntaxKind> for rowan::SyntaxKind {
    fn from(kind: SyntaxKind) -> Self {
        Self(kind as u16)
    }
}

impl SyntaxKind {
    pub fn is_trivia(self) -> bool {
        matches!(
            self,
            SyntaxKind::Whitespace | SyntaxKind::LineComment | SyntaxKind::BlockComment
        )
    }

    pub fn is_keyword(self) -> bool {
        (self as u16) <= (SyntaxKind::KwType as u16)
    }

    pub fn is_literal(self) -> bool {
        matches!(
            self,
            SyntaxKind::IntLiteral
                | SyntaxKind::FloatLiteral
                | SyntaxKind::StringLiteral
                | SyntaxKind::KwTrue
                | SyntaxKind::KwFalse
                | SyntaxKind::KwNull
        )
    }

    pub fn is_ui_keyword(self) -> bool {
        matches!(
            self,
            SyntaxKind::KwVStack
                | SyntaxKind::KwHStack
                | SyntaxKind::KwButton
                | SyntaxKind::KwText
                | SyntaxKind::KwTextField
        )
    }

    pub fn from_raw(raw: rowan::SyntaxKind) -> Self {
        assert!(raw.0 <= SyntaxKind::__LAST as u16);
        unsafe { std::mem::transmute::<u16, SyntaxKind>(raw.0) }
    }
}
