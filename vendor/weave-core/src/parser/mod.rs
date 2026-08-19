pub mod cursor;
pub mod error;
pub mod event;
pub mod grammar;
pub mod marker;
pub mod sink;

pub use cursor::TokenCursor;
pub use error::ParseError;
pub use event::Event;
pub use marker::{CompletedMarker, Marker};
pub use sink::Sink;

use crate::ast::SourceFile;
use crate::lexer::{Lexer, SpannedToken};
use crate::syntax::{SyntaxKind, SyntaxNode};
use rowan::GreenNode;
use std::cell::Cell;

pub struct Parser<'a> {
    tokens: Vec<SpannedToken<'a>>,
    pos: usize,
    pub(crate) events: Vec<Event>,
    fuel: Cell<u32>,
}

impl<'a> Parser<'a> {
    pub fn new(tokens: Vec<SpannedToken<'a>>) -> Self {
        Self {
            tokens,
            pos: 0,
            events: Vec::new(),
            fuel: Cell::new(256),
        }
    }

    pub fn parse(source: &str) -> ParseResult {
        let raw_tokens = Lexer::tokenize_all(source);
        let tokens = raw_tokens
            .iter()
            .cloned()
            .filter(|t| !t.kind.is_trivia())
            .collect::<Vec<_>>();

        let mut parser = Parser::new(tokens);
        grammar::items::parse_file(&mut parser);

        let sink = Sink::new(&raw_tokens, parser.events, source.len());
        let (green, errors) = sink.finish();

        ParseResult { green, errors }
    }

    pub fn start(&mut self) -> Marker {
        let pos = self.events.len();
        self.events.push(Event::Start {
            kind: SyntaxKind::ERROR_NODE,
            forward_parent: None,
        });
        Marker::new(pos)
    }

    pub fn current(&self) -> SyntaxKind {
        self.nth(0)
    }

    pub fn current_text(&self) -> &str {
        self.nth_text(0)
    }

    pub fn nth(&self, n: usize) -> SyntaxKind {
        if self.fuel.get() == 0 {
            panic!("Parser ran out of fuel: probable infinite loop");
        }
        self.fuel.set(self.fuel.get() - 1);

        if self.pos + n < self.tokens.len() {
            self.tokens[self.pos + n].kind.into()
        } else {
            SyntaxKind::Whitespace
        }
    }

    pub fn nth_text(&self, n: usize) -> &str {
        if self.pos + n < self.tokens.len() {
            self.tokens[self.pos + n].text
        } else {
            ""
        }
    }

    pub fn at(&self, kind: SyntaxKind) -> bool {
        self.current() == kind
    }

    pub fn at_any(&self, kinds: &[SyntaxKind]) -> bool {
        kinds.contains(&self.current())
    }

    pub fn at_eof(&self) -> bool {
        self.pos >= self.tokens.len()
    }

    pub fn bump(&mut self) {
        if !self.at_eof() {
            let kind = self.current();
            self.pos += 1;
            self.fuel.set(256);
            self.events.push(Event::Token {
                kind,
                n_raw_tokens: 1,
            });
        }
    }

    pub fn bump_any(&mut self) {
        self.bump();
    }

    pub fn eat(&mut self, kind: SyntaxKind) -> bool {
        if self.at(kind) {
            self.bump();
            true
        } else {
            false
        }
    }

    pub fn expect(&mut self, kind: SyntaxKind) -> bool {
        if self.eat(kind) {
            true
        } else {
            self.error(format!("expected {:?}", kind));
            false
        }
    }

    pub fn error(&mut self, message: impl Into<String>) {
        self.events.push(Event::Error {
            message: message.into(),
        });
    }

    pub fn error_and_bump(&mut self, message: impl Into<String>) {
        self.error(message);
        self.bump();
    }
}

#[derive(Debug, Clone)]
pub struct ParseResult {
    green: GreenNode,
    errors: Vec<ParseError>,
}

impl ParseResult {
    pub fn syntax(&self) -> SyntaxNode {
        SyntaxNode::new_root(self.green.clone())
    }

    pub fn root(&self) -> SourceFile {
        SourceFile {
            syntax: self.syntax(),
        }
    }

    pub fn errors(&self) -> &[ParseError] {
        &self.errors
    }

    pub fn is_ok(&self) -> bool {
        self.errors.is_empty()
    }

    pub fn debug_tree(&self) -> String {
        format!("{:#?}", self.syntax())
    }
}
