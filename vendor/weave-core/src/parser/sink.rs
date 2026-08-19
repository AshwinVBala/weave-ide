use crate::lexer::SpannedToken;
use crate::parser::error::ParseError;
use crate::parser::event::Event;
use crate::syntax::SyntaxKind;
use rowan::{GreenNode, GreenNodeBuilder};
use std::ops::Range;

pub struct Sink<'a> {
    builder: GreenNodeBuilder<'static>,
    tokens: &'a [SpannedToken<'a>],
    cursor: usize,
    events: Vec<Event>,
    errors: Vec<ParseError>,
    source_len: usize,
}

impl<'a> Sink<'a> {
    pub fn new(tokens: &'a [SpannedToken<'a>], events: Vec<Event>, source_len: usize) -> Self {
        Self {
            builder: GreenNodeBuilder::new(),
            tokens,
            cursor: 0,
            events,
            errors: Vec::new(),
            source_len,
        }
    }

    pub fn finish(mut self) -> (GreenNode, Vec<ParseError>) {
        let mut forward_parents = Vec::new();
        let mut open_nodes = 0;

        for i in 0..self.events.len() {
            match std::mem::replace(&mut self.events[i], Event::Placeholder) {
                Event::Start {
                    kind,
                    forward_parent,
                } => {
                    forward_parents.push(kind);
                    let mut fp = forward_parent;
                    while let Some(parent_idx) = fp {
                        match std::mem::replace(
                            &mut self.events[parent_idx as usize],
                            Event::Placeholder,
                        ) {
                            Event::Start {
                                kind: p_kind,
                                forward_parent: next_fp,
                            } => {
                                forward_parents.push(p_kind);
                                fp = next_fp;
                            }
                            _ => unreachable!(),
                        }
                    }

                    for parent_kind in forward_parents.drain(..).rev() {
                        if open_nodes > 0 {
                            self.eat_trivia();
                        }
                        self.builder.start_node(parent_kind.into());
                        open_nodes += 1;
                    }
                }
                Event::Finish => {
                    if open_nodes == 1 {
                        self.eat_trivia();
                    }
                    self.builder.finish_node();
                    if open_nodes > 0 {
                        open_nodes -= 1;
                    }
                }
                Event::Token { kind, n_raw_tokens } => {
                    self.eat_trivia();
                    for _ in 0..n_raw_tokens {
                        if self.cursor < self.tokens.len() {
                            let tok = &self.tokens[self.cursor];
                            self.builder.token(kind.into(), tok.text);
                            self.cursor += 1;
                        }
                    }
                }
                Event::Error { message } => {
                    let span = self.current_span();
                    self.errors.push(ParseError::new(message, span));
                }
                Event::Placeholder => {}
            }
        }

        (self.builder.finish(), self.errors)
    }

    fn eat_trivia(&mut self) {
        while self.cursor < self.tokens.len() && self.tokens[self.cursor].kind.is_trivia() {
            let tok = &self.tokens[self.cursor];
            let kind: SyntaxKind = tok.kind.into();
            self.builder.token(kind.into(), tok.text);
            self.cursor += 1;
        }
    }

    fn current_span(&self) -> Range<usize> {
        if self.cursor < self.tokens.len() {
            self.tokens[self.cursor].span.clone()
        } else {
            self.source_len..self.source_len
        }
    }
}
