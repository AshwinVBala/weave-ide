use crate::syntax::kind::SyntaxKind;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum WeaveLanguage {}

impl rowan::Language for WeaveLanguage {
    type Kind = SyntaxKind;

    fn kind_from_raw(raw: rowan::SyntaxKind) -> Self::Kind {
        SyntaxKind::from_raw(raw)
    }

    fn kind_to_raw(kind: Self::Kind) -> rowan::SyntaxKind {
        kind.into()
    }
}

pub type SyntaxNode = rowan::SyntaxNode<WeaveLanguage>;
pub type SyntaxToken = rowan::SyntaxToken<WeaveLanguage>;
pub type SyntaxElement = rowan::SyntaxElement<WeaveLanguage>;
pub type SyntaxNodeChildren = rowan::SyntaxNodeChildren<WeaveLanguage>;
pub type SyntaxElementChildren = rowan::SyntaxElementChildren<WeaveLanguage>;
