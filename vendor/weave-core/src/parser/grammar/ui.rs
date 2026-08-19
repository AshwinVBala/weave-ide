use crate::parser::grammar::expr::parse_expr;
use crate::parser::grammar::stmt::parse_stmt_or_expr;
use crate::parser::CompletedMarker;
use crate::parser::Parser;
use crate::syntax::SyntaxKind;

pub fn is_ui_element_start(p: &Parser) -> bool {
    p.current().is_ui_keyword()
        || (p.at(SyntaxKind::Ident)
            && (p.nth(1) == SyntaxKind::LParen || p.nth(1) == SyntaxKind::LBrace)
            && (p.current_text().chars().next().map_or(false, |c| c.is_uppercase())
                || matches!(p.current_text(), "ui" | "div" | "span" | "button" | "input" | "h1" | "h2" | "h3" | "h4" | "p" | "label" | "form" | "section" | "main" | "header" | "footer")))
}

pub fn parse_ui_element(p: &mut Parser) -> Option<CompletedMarker> {
    let m = p.start();

    if p.current().is_ui_keyword() || p.at(SyntaxKind::Ident) {
        p.bump();
    } else {
        p.error("expected UI element name (e.g. VStack, HStack, Button, Text, TextField)");
        m.abandon(p);
        return None;
    }

    // Optional argument list: (key: val, ...) or ("label", onClick: ...)
    if p.at(SyntaxKind::LParen) {
        parse_ui_arg_list(p);
    }

    // Optional body block containing children UI elements or statements: { ... }
    if p.at(SyntaxKind::LBrace) {
        parse_ui_body(p);
    }

    Some(m.complete(p, SyntaxKind::UI_ELEMENT))
}

fn parse_ui_arg_list(p: &mut Parser) {
    let m = p.start();
    p.expect(SyntaxKind::LParen);

    while !p.at(SyntaxKind::RParen) && !p.at_eof() {
        parse_ui_property(p);
        if p.at(SyntaxKind::Comma) {
            p.bump();
        } else {
            break;
        }
    }

    p.expect(SyntaxKind::RParen);
    m.complete(p, SyntaxKind::UI_ARG_LIST);
}

fn parse_ui_property(p: &mut Parser) {
    let m = p.start();

    // Check for named argument: "key: value" (support keywords like `style` or `type` as argument names)
    if (p.at(SyntaxKind::Ident) || p.current().is_keyword()) && p.nth(1) == SyntaxKind::Colon {
        let name_m = p.start();
        p.bump(); // ident or keyword
        name_m.complete(p, SyntaxKind::NAME);
        p.bump(); // colon
        parse_expr(p);
    } else {
        // Positional expression
        parse_expr(p);
    }

    m.complete(p, SyntaxKind::UI_PROPERTY);
}

fn parse_ui_body(p: &mut Parser) {
    let m = p.start();
    p.expect(SyntaxKind::LBrace);

    while !p.at(SyntaxKind::RBrace) && !p.at_eof() {
        if is_ui_element_start(p) {
            parse_ui_element(p);
        } else {
            parse_stmt_or_expr(p);
        }
    }

    p.expect(SyntaxKind::RBrace);
    m.complete(p, SyntaxKind::BLOCK_EXPR);
}
