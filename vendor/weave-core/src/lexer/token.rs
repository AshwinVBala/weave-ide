use logos::Logos;

fn block_comment(lex: &mut logos::Lexer<TokenKind>) -> bool {
    let rem = lex.remainder();
    if let Some(end) = rem.find("*/") {
        lex.bump(end + 2);
        true
    } else {
        lex.bump(rem.len());
        true
    }
}

#[derive(Logos, Debug, PartialEq, Eq, Clone, Copy, Hash, PartialOrd, Ord)]
#[repr(u16)]
pub enum TokenKind {
    // -------------------------------------------------------------
    // Keywords
    // -------------------------------------------------------------
    #[token("component")]
    KwComponent,

    #[token("store")]
    KwStore,

    #[token("server")]
    KwServer,

    #[token("var")]
    KwVar,

    #[token("style")]
    KwStyle,

    #[token("resource")]
    KwResource,

    #[token("theme")]
    KwTheme,

    #[token("VStack")]
    KwVStack,

    #[token("HStack")]
    KwHStack,

    #[token("Button")]
    KwButton,

    #[token("Text")]
    KwText,

    #[token("TextField")]
    KwTextField,

    #[token("fn")]
    KwFn,

    #[token("let")]
    KwLet,

    #[token("mut")]
    KwMut,

    #[token("if")]
    KwIf,

    #[token("else")]
    KwElse,

    #[token("for")]
    KwFor,

    #[token("in")]
    KwIn,

    #[token("while")]
    KwWhile,

    #[token("return")]
    KwReturn,

    #[token("true")]
    KwTrue,

    #[token("false")]
    KwFalse,

    #[token("null")]
    KwNull,

    #[token("import")]
    KwImport,

    #[token("export")]
    KwExport,

    #[token("from")]
    KwFrom,

    #[token("as")]
    KwAs,

    #[token("type")]
    KwType,

    // -------------------------------------------------------------
    // Literals & Identifiers
    // -------------------------------------------------------------
    #[regex(r"[a-zA-Z_][a-zA-Z0-9_]*")]
    Ident,

    #[regex(r"[0-9]+")]
    IntLiteral,

    #[regex(r"[0-9]+\.[0-9]+")]
    FloatLiteral,

    #[regex(r#""([^"\\]|\\.)*""#)]
    StringLiteral,

    // -------------------------------------------------------------
    // Operators & Punctuation
    // -------------------------------------------------------------
    #[token("+")]
    Plus,

    #[token("-")]
    Minus,

    #[token("*")]
    Star,

    #[token("/")]
    Slash,

    #[token("%")]
    Percent,

    #[token("+=")]
    PlusAssign,

    #[token("-=")]
    MinusAssign,

    #[token("*=")]
    MulAssign,

    #[token("/=")]
    DivAssign,

    #[token("==")]
    EqEq,

    #[token("!=")]
    BangEq,

    #[token("<=")]
    LtEq,

    #[token(">=")]
    GtEq,

    #[token("<")]
    Lt,

    #[token(">")]
    Gt,

    #[token("&&")]
    AmpAmp,

    #[token("||")]
    PipePipe,

    #[token("!")]
    Bang,

    #[token("=")]
    Eq,

    #[token("->")]
    Arrow,

    #[token("=>")]
    FatArrow,

    #[token(":")]
    Colon,

    #[token("::")]
    ColonColon,

    #[token(";")]
    Semi,

    #[token(",")]
    Comma,

    #[token(".")]
    Dot,

    #[token("(")]
    LParen,

    #[token(")")]
    RParen,

    #[token("{")]
    LBrace,

    #[token("}")]
    RBrace,

    #[token("[")]
    LBracket,

    #[token("]")]
    RBracket,

    // -------------------------------------------------------------
    // Trivia (Whitespace & Comments)
    // -------------------------------------------------------------
    #[regex(r"[ \t\r\n]+")]
    Whitespace,

    #[regex(r"//[^\n]*")]
    LineComment,

    #[regex(r"/\*", block_comment)]
    BlockComment,

    // -------------------------------------------------------------
    // Error / Unknown
    // -------------------------------------------------------------
    Error,
}

impl TokenKind {
    pub fn is_trivia(&self) -> bool {
        matches!(
            self,
            TokenKind::Whitespace | TokenKind::LineComment | TokenKind::BlockComment
        )
    }

    pub fn is_keyword(&self) -> bool {
        matches!(
            self,
            TokenKind::KwComponent
                | TokenKind::KwStore
                | TokenKind::KwServer
                | TokenKind::KwVar
                | TokenKind::KwStyle
                | TokenKind::KwResource
                | TokenKind::KwTheme
                | TokenKind::KwVStack
                | TokenKind::KwHStack
                | TokenKind::KwButton
                | TokenKind::KwText
                | TokenKind::KwTextField
                | TokenKind::KwFn
                | TokenKind::KwLet
                | TokenKind::KwMut
                | TokenKind::KwIf
                | TokenKind::KwElse
                | TokenKind::KwFor
                | TokenKind::KwIn
                | TokenKind::KwWhile
                | TokenKind::KwReturn
                | TokenKind::KwTrue
                | TokenKind::KwFalse
                | TokenKind::KwNull
                | TokenKind::KwImport
                | TokenKind::KwExport
                | TokenKind::KwFrom
                | TokenKind::KwAs
                | TokenKind::KwType
        )
    }

    pub fn is_literal(&self) -> bool {
        matches!(
            self,
            TokenKind::IntLiteral
                | TokenKind::FloatLiteral
                | TokenKind::StringLiteral
                | TokenKind::KwTrue
                | TokenKind::KwFalse
                | TokenKind::KwNull
        )
    }

    pub fn is_ui_keyword(&self) -> bool {
        matches!(
            self,
            TokenKind::KwVStack
                | TokenKind::KwHStack
                | TokenKind::KwButton
                | TokenKind::KwText
                | TokenKind::KwTextField
        )
    }
}
