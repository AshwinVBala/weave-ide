use weave_core::lexer::{Lexer, TokenKind};

#[test]
fn test_keywords_tokenization() {
    let source = "component store server var style VStack HStack Button Text TextField fn let mut if else for in while return true false null";
    let tokens = Lexer::tokenize_non_trivia(source);
    let kinds: Vec<TokenKind> = tokens.iter().map(|t| t.kind).collect();

    assert_eq!(
        kinds,
        vec![
            TokenKind::KwComponent,
            TokenKind::KwStore,
            TokenKind::KwServer,
            TokenKind::KwVar,
            TokenKind::KwStyle,
            TokenKind::KwVStack,
            TokenKind::KwHStack,
            TokenKind::KwButton,
            TokenKind::KwText,
            TokenKind::KwTextField,
            TokenKind::KwFn,
            TokenKind::KwLet,
            TokenKind::KwMut,
            TokenKind::KwIf,
            TokenKind::KwElse,
            TokenKind::KwFor,
            TokenKind::KwIn,
            TokenKind::KwWhile,
            TokenKind::KwReturn,
            TokenKind::KwTrue,
            TokenKind::KwFalse,
            TokenKind::KwNull,
        ]
    );
}

#[test]
fn test_literals_and_identifiers() {
    let source = r#"my_var 123 45.67 "hello world" "with \"escapes\"""#;
    let tokens = Lexer::tokenize_non_trivia(source);
    
    assert_eq!(tokens[0].kind, TokenKind::Ident);
    assert_eq!(tokens[0].text, "my_var");

    assert_eq!(tokens[1].kind, TokenKind::IntLiteral);
    assert_eq!(tokens[1].text, "123");

    assert_eq!(tokens[2].kind, TokenKind::FloatLiteral);
    assert_eq!(tokens[2].text, "45.67");

    assert_eq!(tokens[3].kind, TokenKind::StringLiteral);
    assert_eq!(tokens[3].text, r#""hello world""#);

    assert_eq!(tokens[4].kind, TokenKind::StringLiteral);
    assert_eq!(tokens[4].text, r#""with \"escapes\"""#);
}

#[test]
fn test_operators_and_delimiters() {
    let source = "+ - * / % == != <= >= < > && || ! = -> => : :: ; , . ( ) { } [ ]";
    let tokens = Lexer::tokenize_non_trivia(source);
    let kinds: Vec<TokenKind> = tokens.iter().map(|t| t.kind).collect();

    assert_eq!(
        kinds,
        vec![
            TokenKind::Plus,
            TokenKind::Minus,
            TokenKind::Star,
            TokenKind::Slash,
            TokenKind::Percent,
            TokenKind::EqEq,
            TokenKind::BangEq,
            TokenKind::LtEq,
            TokenKind::GtEq,
            TokenKind::Lt,
            TokenKind::Gt,
            TokenKind::AmpAmp,
            TokenKind::PipePipe,
            TokenKind::Bang,
            TokenKind::Eq,
            TokenKind::Arrow,
            TokenKind::FatArrow,
            TokenKind::Colon,
            TokenKind::ColonColon,
            TokenKind::Semi,
            TokenKind::Comma,
            TokenKind::Dot,
            TokenKind::LParen,
            TokenKind::RParen,
            TokenKind::LBrace,
            TokenKind::RBrace,
            TokenKind::LBracket,
            TokenKind::RBracket,
        ]
    );
}

#[test]
fn test_compound_assignment_operators() {
    let source = "+= -= *= /=";
    let tokens = Lexer::tokenize_non_trivia(source);
    let kinds: Vec<TokenKind> = tokens.iter().map(|t| t.kind).collect();

    assert_eq!(
        kinds,
        vec![
            TokenKind::PlusAssign,
            TokenKind::MinusAssign,
            TokenKind::MulAssign,
            TokenKind::DivAssign,
        ]
    );

    assert_eq!(tokens[0].text, "+=");
    assert_eq!(tokens[1].text, "-=");
    assert_eq!(tokens[2].text, "*=");
    assert_eq!(tokens[3].text, "/=");
}

#[test]
fn test_comments_and_whitespace_trivia() {
    let source = "// single line comment\n   /* multi\nline\ncomment */  var x = 10;";
    let all_tokens = Lexer::tokenize_all(source);

    assert_eq!(all_tokens[0].kind, TokenKind::LineComment);
    assert_eq!(all_tokens[1].kind, TokenKind::Whitespace);
    assert_eq!(all_tokens[2].kind, TokenKind::BlockComment);
    assert_eq!(all_tokens[3].kind, TokenKind::Whitespace);
    assert_eq!(all_tokens[4].kind, TokenKind::KwVar);

    let non_trivia = Lexer::tokenize_non_trivia(source);
    let kinds: Vec<TokenKind> = non_trivia.iter().map(|t| t.kind).collect();
    assert_eq!(
        kinds,
        vec![
            TokenKind::KwVar,
            TokenKind::Ident,
            TokenKind::Eq,
            TokenKind::IntLiteral,
            TokenKind::Semi,
        ]
    );
}

#[test]
fn test_token_spans() {
    let source = "component Counter";
    let tokens = Lexer::tokenize_non_trivia(source);

    assert_eq!(tokens[0].span, 0..9);
    assert_eq!(tokens[0].text, "component");

    assert_eq!(tokens[1].span, 10..17);
    assert_eq!(tokens[1].text, "Counter");
}
