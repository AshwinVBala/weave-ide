use crate::parser::event::Event;
use crate::parser::Parser;
use crate::syntax::SyntaxKind;

pub struct Marker {
    pos: usize,
    completed: bool,
}

impl Marker {
    pub fn new(pos: usize) -> Self {
        Self {
            pos,
            completed: false,
        }
    }

    pub fn complete(mut self, p: &mut Parser, kind: SyntaxKind) -> CompletedMarker {
        self.completed = true;
        match &mut p.events[self.pos] {
            Event::Start { kind: slot, .. } => {
                *slot = kind;
            }
            _ => unreachable!(),
        }
        p.events.push(Event::Finish);
        CompletedMarker { pos: self.pos }
    }

    pub fn abandon(mut self, p: &mut Parser) {
        self.completed = true;
        if self.pos == p.events.len() - 1 {
            p.events.pop();
        } else {
            p.events[self.pos] = Event::Placeholder;
        }
    }
}

impl Drop for Marker {
    fn drop(&mut self) {
        if !self.completed && !std::thread::panicking() {
            panic!("A Marker must be completed or abandoned!");
        }
    }
}

pub struct CompletedMarker {
    pos: usize,
}

impl CompletedMarker {
    pub fn precede(self, p: &mut Parser) -> Marker {
        let new_m = p.start();
        match &mut p.events[self.pos] {
            Event::Start { forward_parent, .. } => {
                *forward_parent = Some(new_m.pos as u32);
            }
            _ => unreachable!(),
        }
        new_m
    }
}
