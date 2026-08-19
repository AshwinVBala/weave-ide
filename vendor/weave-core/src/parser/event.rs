use crate::syntax::SyntaxKind;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Event {
    Start {
        kind: SyntaxKind,
        forward_parent: Option<u32>,
    },
    Finish,
    Token {
        kind: SyntaxKind,
        n_raw_tokens: u8,
    },
    Error {
        message: String,
    },
    Placeholder,
}

impl Event {
    pub fn tombstone() -> Self {
        Event::Placeholder
    }
}
