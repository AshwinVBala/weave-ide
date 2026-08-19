use crate::lexer::SpannedToken;
use crate::syntax::SyntaxKind;

#[derive(Debug, Clone)]
pub struct TokenCursor<'a> {
    tokens: &'a [SpannedToken<'a>],
    pos: usize,
}

impl<'a> TokenCursor<'a> {
    pub fn new(tokens: &'a [SpannedToken<'a>]) -> Self {
        Self { tokens, pos: 0 }
    }

    pub fn current(&self) -> Option<&SpannedToken<'a>> {
        self.tokens.get(self.pos)
    }

    pub fn current_kind(&self) -> Option<SyntaxKind> {
        self.current().map(|t| t.kind.into())
    }

    pub fn bump(&mut self) -> Option<&SpannedToken<'a>> {
        if self.pos < self.tokens.len() {
            let tok = &self.tokens[self.pos];
            self.pos += 1;
            Some(tok)
        } else {
            None
        }
    }

    pub fn is_at_end(&self) -> bool {
        self.pos >= self.tokens.len()
    }
}
