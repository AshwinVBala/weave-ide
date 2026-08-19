use crate::parser::Parser;
use crate::syntax::SyntaxKind;

pub fn parse_type_ref(p: &mut Parser) {
    let m = p.start();
    if p.at(SyntaxKind::Ident) {
        p.bump();
        // Support generic or path types like List<String> or std::Option
        while p.at(SyntaxKind::ColonColon) {
            p.bump();
            if p.at(SyntaxKind::Ident) {
                p.bump();
            } else {
                p.error("expected identifier after '::'");
                break;
            }
        }
        if p.at(SyntaxKind::Lt) {
            p.bump();
            while !p.at(SyntaxKind::Gt) && !p.at_eof() {
                parse_type_ref(p);
                if p.at(SyntaxKind::Comma) {
                    p.bump();
                } else {
                    break;
                }
            }
            p.expect(SyntaxKind::Gt);
        }
        m.complete(p, SyntaxKind::TYPE_REF);
    } else {
        p.error("expected type name");
        m.abandon(p);
    }
}
