use crate::parser::grammar::expr::{parse_block_expr, parse_expr};
use crate::parser::grammar::stmt::parse_var_def;
use crate::parser::grammar::types::parse_type_ref;
use crate::parser::grammar::ui::{is_ui_element_start, parse_ui_element};
use crate::parser::CompletedMarker;
use crate::parser::Parser;
use crate::syntax::SyntaxKind;

pub fn parse_file(p: &mut Parser) {
    let m = p.start();
    while !p.at_eof() {
        parse_item(p);
    }
    m.complete(p, SyntaxKind::SOURCE_FILE);
}

pub fn parse_item(p: &mut Parser) -> Option<CompletedMarker> {
    match p.current() {
        SyntaxKind::KwComponent => Some(parse_component_def(p)),
        SyntaxKind::KwStore => Some(parse_store_def(p)),
        SyntaxKind::KwServer => Some(parse_server_def(p)),
        SyntaxKind::KwVar => Some(parse_var_def(p)),
        SyntaxKind::KwStyle => Some(parse_style_def(p)),
        SyntaxKind::KwResource => Some(parse_resource_def(p)),
        SyntaxKind::KwTheme => Some(parse_theme_def(p)),
        SyntaxKind::KwFn => Some(parse_fn_def(p)),
        _ if is_ui_element_start(p) => parse_ui_element(p),
        _ => {
            let m = p.start();
            p.error_and_bump(format!(
                "expected top-level item (component, store, server, var, style, resource, theme, fn), found {:?}",
                p.current()
            ));
            m.complete(p, SyntaxKind::ERROR_NODE);
            None
        }
    }
}

pub fn parse_component_def(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwComponent);

    if p.at(SyntaxKind::Ident) || p.current().is_keyword() {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);
    } else {
        p.error("expected component name");
    }

    // Optional parameter list: (prop1: String, ...)
    if p.at(SyntaxKind::LParen) {
        parse_param_list(p);
    }

    // Component body
    if p.at(SyntaxKind::LBrace) {
        parse_block_expr(p);
    } else {
        p.error("expected '{' after component header");
    }

    m.complete(p, SyntaxKind::COMPONENT_DEF)
}

pub fn parse_store_def(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwStore);

    if p.at(SyntaxKind::Ident) || p.current().is_keyword() {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);
    } else {
        p.error("expected store name or identifier");
    }

    if p.at(SyntaxKind::Colon) {
        p.bump();
        parse_type_ref(p);
    }

    if p.at(SyntaxKind::Eq) {
        p.bump();
        parse_expr(p);
        if p.at(SyntaxKind::Semi) {
            p.bump();
        }
    } else if p.at(SyntaxKind::LBrace) {
        parse_block_expr(p);
    } else if p.at(SyntaxKind::Semi) {
        p.bump();
    } else {
        p.error("expected '{' or '=' after store declaration");
    }

    m.complete(p, SyntaxKind::STORE_DEF)
}

pub fn parse_server_def(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwServer);

    if (p.at(SyntaxKind::Ident) || p.current().is_keyword()) && p.current() != SyntaxKind::LBrace {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);
    }

    if p.at(SyntaxKind::LBrace) {
        parse_block_expr(p);
    } else {
        p.error("expected '{' after 'server'");
    }

    m.complete(p, SyntaxKind::SERVER_DEF)
}

pub fn parse_style_def(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwStyle);

    if p.at(SyntaxKind::Ident) || p.current().is_keyword() {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);
    } else {
        p.error("expected style name");
    }

    if p.at(SyntaxKind::LBrace) {
        let body_m = p.start();
        p.bump(); // {

        while !p.at(SyntaxKind::RBrace) && !p.at_eof() {
            parse_style_property(p);
        }

        p.expect(SyntaxKind::RBrace);
        body_m.complete(p, SyntaxKind::BLOCK_EXPR);
    } else {
        p.error("expected '{' after style name");
    }

    m.complete(p, SyntaxKind::STYLE_DEF)
}

pub fn parse_style_property(p: &mut Parser) {
    let m = p.start();

    if p.at(SyntaxKind::Ident) || p.current().is_keyword() {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);

        p.expect(SyntaxKind::Colon);
        parse_expr(p);

        if p.at(SyntaxKind::Semi) || p.at(SyntaxKind::Comma) {
            p.bump();
        }

        m.complete(p, SyntaxKind::STYLE_PROPERTY);
    } else {
        p.error_and_bump("expected style property name");
        m.complete(p, SyntaxKind::ERROR_NODE);
    }
}

pub fn parse_resource_def(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwResource);

    if p.at(SyntaxKind::Ident) || p.current().is_keyword() {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);
    } else {
        p.error("expected resource name");
    }

    if p.at(SyntaxKind::Colon) {
        p.bump();
        parse_type_ref(p);
    }

    if p.at(SyntaxKind::Eq) {
        p.bump();
        parse_expr(p);
    } else {
        p.error("expected '=' after resource identifier");
    }

    if p.at(SyntaxKind::Semi) {
        p.bump();
    }

    m.complete(p, SyntaxKind::RESOURCE_DEF)
}

pub fn parse_theme_def(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwTheme);

    if p.at(SyntaxKind::Ident) || p.current().is_keyword() {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);
    } else {
        p.error("expected theme name");
    }

    if p.at(SyntaxKind::LBrace) {
        let body_m = p.start();
        p.bump(); // {

        while !p.at(SyntaxKind::RBrace) && !p.at_eof() {
            parse_theme_property(p);
        }

        p.expect(SyntaxKind::RBrace);
        body_m.complete(p, SyntaxKind::BLOCK_EXPR);
    } else {
        p.error("expected '{' after theme name");
    }

    m.complete(p, SyntaxKind::THEME_DEF)
}

fn parse_theme_property(p: &mut Parser) {
    let m = p.start();

    if p.at(SyntaxKind::Ident) || p.current().is_keyword() {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);

        p.expect(SyntaxKind::Colon);

        if p.at(SyntaxKind::LBrace) {
            let obj_m = p.start();
            p.bump(); // {
            while !p.at(SyntaxKind::RBrace) && !p.at_eof() {
                parse_theme_property(p);
            }
            p.expect(SyntaxKind::RBrace);
            obj_m.complete(p, SyntaxKind::BLOCK_EXPR);
        } else {
            parse_expr(p);
        }

        if p.at(SyntaxKind::Semi) || p.at(SyntaxKind::Comma) {
            p.bump();
        }

        m.complete(p, SyntaxKind::THEME_PROPERTY);
    } else {
        p.error_and_bump("expected theme property name");
        m.complete(p, SyntaxKind::ERROR_NODE);
    }
}

pub fn parse_fn_def(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwFn);

    if p.at(SyntaxKind::Ident) || p.current().is_keyword() {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);
    } else {
        p.error("expected function name after 'fn'");
    }

    if p.at(SyntaxKind::LParen) {
        parse_param_list(p);
    } else {
        p.error("expected parameter list '(' after function name");
    }

    if p.at(SyntaxKind::Arrow) || p.at(SyntaxKind::Colon) {
        p.bump();
        parse_type_ref(p);
    }

    if p.at(SyntaxKind::LBrace) {
        parse_block_expr(p);
    } else {
        p.error("expected '{' for function body");
    }

    m.complete(p, SyntaxKind::FN_DEF)
}

pub fn parse_param_list(p: &mut Parser) {
    let m = p.start();
    p.expect(SyntaxKind::LParen);

    while !p.at(SyntaxKind::RParen) && !p.at_eof() {
        let param_m = p.start();
        if p.at(SyntaxKind::Ident) || p.current().is_keyword() {
            let name_m = p.start();
            p.bump();
            name_m.complete(p, SyntaxKind::NAME);

            if p.at(SyntaxKind::Colon) {
                p.bump();
                parse_type_ref(p);
            }

            param_m.complete(p, SyntaxKind::PARAM);
        } else {
            p.error("expected parameter name");
            param_m.abandon(p);
            break;
        }

        if p.at(SyntaxKind::Comma) {
            p.bump();
        } else {
            break;
        }
    }

    p.expect(SyntaxKind::RParen);
    m.complete(p, SyntaxKind::PARAM_LIST);
}
