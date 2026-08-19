pub mod token;

pub use token::TokenKind;
use logos::Logos;
use std::ops::Range;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpannedToken<'a> {
    pub kind: TokenKind,
    pub text: &'a str,
    pub span: Range<usize>,
}

pub struct Lexer<'a> {
    inner: logos::Lexer<'a, TokenKind>,
    source: &'a str,
}

impl<'a> Lexer<'a> {
    pub fn new(source: &'a str) -> Self {
        Self {
            inner: TokenKind::lexer(source),
            source,
        }
    }

    pub fn tokenize_all(source: &'a str) -> Vec<SpannedToken<'a>> {
        let mut lexer = Self::new(source);
        let mut tokens = Vec::new();
        while let Some(tok) = lexer.next() {
            tokens.push(tok);
        }
        tokens
    }

    pub fn tokenize_non_trivia(source: &'a str) -> Vec<SpannedToken<'a>> {
        Self::tokenize_all(source)
            .into_iter()
            .filter(|t| !t.kind.is_trivia())
            .collect()
    }
}

impl<'a> Iterator for Lexer<'a> {
    type Item = SpannedToken<'a>;

    fn next(&mut self) -> Option<Self::Item> {
        let kind = match self.inner.next()? {
            Ok(k) => k,
            Err(_) => TokenKind::Error,
        };
        let span = self.inner.span();
        let text = &self.source[span.clone()];
        Some(SpannedToken { kind, text, span })
    }
}
