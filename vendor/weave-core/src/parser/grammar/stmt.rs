use crate::parser::grammar::expr::parse_expr;
use crate::parser::grammar::types::parse_type_ref;
use crate::parser::CompletedMarker;
use crate::parser::Parser;
use crate::syntax::SyntaxKind;

pub fn parse_stmt_or_expr(p: &mut Parser) -> Option<CompletedMarker> {
    if crate::parser::grammar::ui::is_ui_element_start(p) {
        return crate::parser::grammar::ui::parse_ui_element(p);
    }
    match p.current() {
        SyntaxKind::KwVar => Some(parse_var_def(p)),
        SyntaxKind::KwStore => {
            use crate::parser::grammar::items::parse_store_def;
            Some(parse_store_def(p))
        }
        SyntaxKind::KwResource => {
            use crate::parser::grammar::items::parse_resource_def;
            Some(parse_resource_def(p))
        }
        SyntaxKind::KwTheme => {
            use crate::parser::grammar::items::parse_theme_def;
            Some(parse_theme_def(p))
        }
        SyntaxKind::KwStyle => {
            use crate::parser::grammar::items::parse_style_def;
            Some(parse_style_def(p))
        }
        SyntaxKind::KwLet => Some(parse_let_stmt(p)),
        SyntaxKind::KwReturn => Some(parse_return_stmt(p)),
        SyntaxKind::KwFn => {
            use crate::parser::grammar::items::parse_fn_def;
            Some(parse_fn_def(p))
        }
        SyntaxKind::Semi | SyntaxKind::Comma => {
            p.bump();
            None
        }
        _ if (p.at(SyntaxKind::Ident) || p.current().is_keyword()) && p.nth(1) == SyntaxKind::Colon => {
            use crate::parser::grammar::items::parse_style_property;
            parse_style_property(p);
            None
        }
        _ => {
            let m = p.start();
            if parse_expr(p).is_some() {
                if p.at(SyntaxKind::Semi) {
                    p.bump();
                }
                Some(m.complete(p, SyntaxKind::EXPR_STMT))
            } else {
                p.error_and_bump("expected statement or expression");
                m.complete(p, SyntaxKind::ERROR_NODE);
                None
            }
        }
    }
}

pub fn parse_var_def(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwVar);

    if p.at(SyntaxKind::KwMut) {
        p.bump();
    }

    if p.at(SyntaxKind::Ident) {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);
    } else {
        p.error("expected variable name");
    }

    if p.at(SyntaxKind::Colon) {
        p.bump();
        parse_type_ref(p);
    }

    if p.at(SyntaxKind::Eq) {
        p.bump();
        parse_expr(p);
    }

    if p.at(SyntaxKind::Semi) {
        p.bump();
    }

    m.complete(p, SyntaxKind::VAR_DEF)
}

pub fn parse_let_stmt(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwLet);

    if p.at(SyntaxKind::KwMut) {
        p.bump();
    }

    if p.at(SyntaxKind::Ident) {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);
    } else {
        p.error("expected variable name after 'let'");
    }

    if p.at(SyntaxKind::Colon) {
        p.bump();
        parse_type_ref(p);
    }

    if p.at(SyntaxKind::Eq) {
        p.bump();
        parse_expr(p);
    }

    if p.at(SyntaxKind::Semi) {
        p.bump();
    }

    m.complete(p, SyntaxKind::LET_STMT)
}

pub fn parse_return_stmt(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwReturn);

    if !p.at(SyntaxKind::Semi) && !p.at(SyntaxKind::RBrace) && !p.at_eof() {
        parse_expr(p);
    }

    if p.at(SyntaxKind::Semi) {
        p.bump();
    }

    m.complete(p, SyntaxKind::RETURN_STMT)
}
