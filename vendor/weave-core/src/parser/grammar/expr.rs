use crate::parser::grammar::types::parse_type_ref;
use crate::parser::grammar::ui::{is_ui_element_start, parse_ui_element};
use crate::parser::{CompletedMarker, Parser};
use crate::syntax::SyntaxKind;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub(crate) enum Precedence {
    None,
    Assignment, // = += -= *= /=
    LogicalOr,  // ||
    LogicalAnd, // &&
    Equality,   // == !=
    Comparison, // < > <= >=
    Additive,   // + -
    Factor,     // * / %
    Prefix,     // - !
    Postfix,    // () [] .
}

impl Precedence {
    fn for_infix(kind: SyntaxKind) -> Option<(Precedence, bool)> {
        match kind {
            SyntaxKind::Eq
            | SyntaxKind::PlusAssign
            | SyntaxKind::MinusAssign
            | SyntaxKind::MulAssign
            | SyntaxKind::DivAssign => Some((Precedence::Assignment, true)),
            SyntaxKind::PipePipe => Some((Precedence::LogicalOr, false)),
            SyntaxKind::AmpAmp => Some((Precedence::LogicalAnd, false)),
            SyntaxKind::EqEq | SyntaxKind::BangEq => Some((Precedence::Equality, false)),
            SyntaxKind::Lt | SyntaxKind::LtEq | SyntaxKind::Gt | SyntaxKind::GtEq => {
                Some((Precedence::Comparison, false))
            }
            SyntaxKind::Plus | SyntaxKind::Minus => Some((Precedence::Additive, false)),
            SyntaxKind::Star | SyntaxKind::Slash | SyntaxKind::Percent => {
                Some((Precedence::Factor, false))
            }
            SyntaxKind::LParen | SyntaxKind::LBracket | SyntaxKind::Dot => {
                Some((Precedence::Postfix, false))
            }
            _ => None,
        }
    }

    fn from_u8(val: u8) -> Self {
        match val {
            0 => Precedence::None,
            1 => Precedence::Assignment,
            2 => Precedence::LogicalOr,
            3 => Precedence::LogicalAnd,
            4 => Precedence::Equality,
            5 => Precedence::Comparison,
            6 => Precedence::Additive,
            7 => Precedence::Factor,
            8 => Precedence::Prefix,
            _ => Precedence::Postfix,
        }
    }
}

pub fn parse_expr(p: &mut Parser) -> Option<CompletedMarker> {
    parse_expr_bp(p, Precedence::None)
}

pub(crate) fn parse_expr_bp(p: &mut Parser, min_bp: Precedence) -> Option<CompletedMarker> {
    let mut lhs = parse_prefix_expr(p)?;

    loop {
        let curr = p.current();
        let (prec, right_assoc) = match Precedence::for_infix(curr) {
            Some(entry) => entry,
            None => break,
        };

        if prec < min_bp {
            break;
        }

        lhs = match curr {
            SyntaxKind::LParen => parse_call_expr(p, lhs),
            SyntaxKind::LBracket => parse_index_expr(p, lhs),
            SyntaxKind::Dot => parse_field_expr(p, lhs),
            SyntaxKind::PlusAssign
            | SyntaxKind::MinusAssign
            | SyntaxKind::MulAssign
            | SyntaxKind::DivAssign => {
                let m = lhs.precede(p);
                p.bump(); // bump compound assign operator
                let next_min_bp = if right_assoc {
                    prec
                } else {
                    Precedence::from_u8(prec as u8 + 1)
                };
                parse_expr_bp(p, next_min_bp);
                m.complete(p, SyntaxKind::COMPOUND_ASSIGN_EXPR)
            }
            _ => {
                let m = lhs.precede(p);
                p.bump(); // bump operator
                let next_min_bp = if right_assoc {
                    prec
                } else {
                    Precedence::from_u8(prec as u8 + 1)
                };
                parse_expr_bp(p, next_min_bp);
                m.complete(p, SyntaxKind::BINARY_EXPR)
            }
        };
    }

    Some(lhs)
}

fn parse_prefix_expr(p: &mut Parser) -> Option<CompletedMarker> {
    if is_ui_element_start(p) {
        return parse_ui_element(p);
    }

    match p.current() {
        SyntaxKind::IntLiteral
        | SyntaxKind::FloatLiteral
        | SyntaxKind::StringLiteral
        | SyntaxKind::KwTrue
        | SyntaxKind::KwFalse
        | SyntaxKind::KwNull => {
            let m = p.start();
            p.bump();
            Some(m.complete(p, SyntaxKind::LITERAL))
        }
        SyntaxKind::Ident => {
            let m = p.start();
            p.bump();
            Some(m.complete(p, SyntaxKind::NAME_REF))
        }
        SyntaxKind::Minus | SyntaxKind::Bang => {
            let m = p.start();
            p.bump();
            parse_expr_bp(p, Precedence::Prefix);
            Some(m.complete(p, SyntaxKind::PREFIX_EXPR))
        }
        SyntaxKind::LParen => parse_paren_or_lambda(p),
        SyntaxKind::KwFn => parse_fn_lambda(p),
        SyntaxKind::LBrace => Some(parse_block_expr(p)),
        SyntaxKind::KwIf => Some(parse_if_expr(p)),
        SyntaxKind::KwFor => Some(parse_for_expr(p)),
        SyntaxKind::KwWhile => Some(parse_while_expr(p)),
        _ => {
            p.error(format!("unexpected token in expression: {:?}", p.current()));
            None
        }
    }
}

fn parse_fn_lambda(p: &mut Parser) -> Option<CompletedMarker> {
    let m = p.start();
    p.expect(SyntaxKind::KwFn);
    if p.at(SyntaxKind::LParen) {
        use crate::parser::grammar::items::parse_param_list;
        parse_param_list(p);
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
    Some(m.complete(p, SyntaxKind::LAMBDA_EXPR))
}

fn parse_paren_or_lambda(p: &mut Parser) -> Option<CompletedMarker> {
    let m = p.start();
    p.expect(SyntaxKind::LParen);

    if p.at(SyntaxKind::RParen) {
        p.bump(); // )
        if p.at(SyntaxKind::Arrow) || p.at(SyntaxKind::FatArrow) {
            p.bump(); // -> or =>
            if p.at(SyntaxKind::LBrace) {
                parse_block_expr(p);
            } else {
                parse_expr(p);
            }
            return Some(m.complete(p, SyntaxKind::LAMBDA_EXPR));
        } else {
            return Some(m.complete(p, SyntaxKind::LITERAL));
        }
    }

    // Check if first item is `ident : Type` (typed lambda parameter)
    if (p.at(SyntaxKind::Ident) || p.current().is_keyword()) && p.nth(1) == SyntaxKind::Colon {
        let param_list_m = p.start();
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
        param_list_m.complete(p, SyntaxKind::PARAM_LIST);
        p.expect(SyntaxKind::RParen);

        if p.at(SyntaxKind::Arrow) || p.at(SyntaxKind::FatArrow) {
            p.bump();
            if p.at(SyntaxKind::LBrace) {
                parse_block_expr(p);
            } else {
                parse_expr(p);
            }
            return Some(m.complete(p, SyntaxKind::LAMBDA_EXPR));
        } else {
            p.error("expected '->' or '=>' after lambda parameter list");
            return Some(m.complete(p, SyntaxKind::LAMBDA_EXPR));
        }
    }

    // Otherwise parse single expression or untyped param
    let inner_expr = parse_expr(p);
    p.expect(SyntaxKind::RParen);

    if p.at(SyntaxKind::Arrow) || p.at(SyntaxKind::FatArrow) {
        p.bump();
        if p.at(SyntaxKind::LBrace) {
            parse_block_expr(p);
        } else {
            parse_expr(p);
        }
        Some(m.complete(p, SyntaxKind::LAMBDA_EXPR))
    } else {
        // Just parenthesized expression
        m.abandon(p);
        inner_expr
    }
}

pub fn parse_block_expr(p: &mut Parser) -> CompletedMarker {
    use crate::parser::grammar::stmt::parse_stmt_or_expr;

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
    m.complete(p, SyntaxKind::BLOCK_EXPR)
}

fn parse_if_expr(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwIf);
    parse_expr(p);
    parse_block_expr(p);

    if p.at(SyntaxKind::KwElse) {
        let else_m = p.start();
        p.bump();
        if p.at(SyntaxKind::KwIf) {
            parse_if_expr(p);
        } else if p.at(SyntaxKind::LBrace) {
            parse_block_expr(p);
        } else {
            p.error("expected '{' or 'if' after 'else'");
        }
        else_m.complete(p, SyntaxKind::ELSE_BRANCH);
    }

    m.complete(p, SyntaxKind::IF_EXPR)
}

fn parse_for_expr(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwFor);

    if p.at(SyntaxKind::Ident) {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME);
    } else {
        p.error("expected loop variable identifier");
    }

    p.expect(SyntaxKind::KwIn);
    parse_expr(p);
    parse_block_expr(p);

    m.complete(p, SyntaxKind::FOR_EXPR)
}

fn parse_while_expr(p: &mut Parser) -> CompletedMarker {
    let m = p.start();
    p.expect(SyntaxKind::KwWhile);
    parse_expr(p);
    parse_block_expr(p);
    m.complete(p, SyntaxKind::WHILE_EXPR)
}

fn parse_call_expr(p: &mut Parser, lhs: CompletedMarker) -> CompletedMarker {
    let m = lhs.precede(p);
    let arg_list_m = p.start();
    p.expect(SyntaxKind::LParen);

    while !p.at(SyntaxKind::RParen) && !p.at_eof() {
        let arg_m = p.start();
        if (p.at(SyntaxKind::Ident) || p.current().is_keyword()) && p.nth(1) == SyntaxKind::Colon {
            let name_m = p.start();
            p.bump();
            name_m.complete(p, SyntaxKind::NAME);
            p.bump(); // colon
        }
        parse_expr(p);
        arg_m.complete(p, SyntaxKind::ARG);

        if p.at(SyntaxKind::Comma) {
            p.bump();
        } else {
            break;
        }
    }

    p.expect(SyntaxKind::RParen);
    arg_list_m.complete(p, SyntaxKind::ARG_LIST);
    m.complete(p, SyntaxKind::CALL_EXPR)
}

fn parse_index_expr(p: &mut Parser, lhs: CompletedMarker) -> CompletedMarker {
    let m = lhs.precede(p);
    p.expect(SyntaxKind::LBracket);
    parse_expr(p);
    p.expect(SyntaxKind::RBracket);
    m.complete(p, SyntaxKind::INDEX_EXPR)
}

fn parse_field_expr(p: &mut Parser, lhs: CompletedMarker) -> CompletedMarker {
    let m = lhs.precede(p);
    p.expect(SyntaxKind::Dot);
    if p.at(SyntaxKind::Ident) || p.current().is_keyword() {
        let name_m = p.start();
        p.bump();
        name_m.complete(p, SyntaxKind::NAME_REF);
    } else {
        p.error("expected field name after '.'");
    }
    m.complete(p, SyntaxKind::FIELD_EXPR)
}
