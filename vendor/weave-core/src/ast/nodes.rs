use crate::ast::{child, children, AstNode};
use crate::syntax::{SyntaxKind, SyntaxNode, SyntaxToken};

macro_rules! define_ast_node {
    ($name:ident, $kind:ident) => {
        #[derive(Debug, Clone, PartialEq, Eq, Hash)]
        pub struct $name {
            pub(crate) syntax: SyntaxNode,
        }

        impl AstNode for $name {
            fn can_cast(kind: SyntaxKind) -> bool {
                kind == SyntaxKind::$kind
            }

            fn cast(syntax: SyntaxNode) -> Option<Self> {
                if Self::can_cast(syntax.kind()) {
                    Some(Self { syntax })
                } else {
                    None
                }
            }

            fn syntax(&self) -> &SyntaxNode {
                &self.syntax
            }
        }
    };
}

// -------------------------------------------------------------
// Root & Item Nodes
// -------------------------------------------------------------
define_ast_node!(SourceFile, SOURCE_FILE);
define_ast_node!(ComponentDef, COMPONENT_DEF);
define_ast_node!(StoreDef, STORE_DEF);
define_ast_node!(ServerDef, SERVER_DEF);
define_ast_node!(VarDef, VAR_DEF);
define_ast_node!(StyleDef, STYLE_DEF);
define_ast_node!(StyleProperty, STYLE_PROPERTY);
define_ast_node!(ResourceDef, RESOURCE_DEF);
define_ast_node!(ThemeDef, THEME_DEF);
define_ast_node!(ThemeProperty, THEME_PROPERTY);
define_ast_node!(FnDef, FN_DEF);
define_ast_node!(ParamList, PARAM_LIST);
define_ast_node!(Param, PARAM);
define_ast_node!(TypeRef, TYPE_REF);
define_ast_node!(BlockExpr, BLOCK_EXPR);
define_ast_node!(UiElement, UI_ELEMENT);
define_ast_node!(UiArgList, UI_ARG_LIST);
define_ast_node!(UiProperty, UI_PROPERTY);
define_ast_node!(ExprStmt, EXPR_STMT);
define_ast_node!(LetStmt, LET_STMT);
define_ast_node!(ReturnStmt, RETURN_STMT);
define_ast_node!(IfExpr, IF_EXPR);
define_ast_node!(ElseBranch, ELSE_BRANCH);
define_ast_node!(ForExpr, FOR_EXPR);
define_ast_node!(WhileExpr, WHILE_EXPR);
define_ast_node!(BinaryExpr, BINARY_EXPR);
define_ast_node!(CompoundAssignExpr, COMPOUND_ASSIGN_EXPR);
define_ast_node!(PrefixExpr, PREFIX_EXPR);
define_ast_node!(CallExpr, CALL_EXPR);
define_ast_node!(ArgList, ARG_LIST);
define_ast_node!(Arg, ARG);
define_ast_node!(LambdaExpr, LAMBDA_EXPR);
define_ast_node!(FieldExpr, FIELD_EXPR);
define_ast_node!(IndexExpr, INDEX_EXPR);
define_ast_node!(Literal, LITERAL);
define_ast_node!(Name, NAME);
define_ast_node!(NameRef, NAME_REF);
define_ast_node!(Path, PATH);

// -------------------------------------------------------------
// SourceFile Accessors
// -------------------------------------------------------------
impl SourceFile {
    pub fn items(&self) -> impl Iterator<Item = Item> {
        self.syntax.children().filter_map(Item::cast)
    }

    pub fn components(&self) -> impl Iterator<Item = ComponentDef> {
        children::<ComponentDef>(&self.syntax)
    }

    pub fn stores(&self) -> impl Iterator<Item = StoreDef> {
        children::<StoreDef>(&self.syntax)
    }

    pub fn servers(&self) -> impl Iterator<Item = ServerDef> {
        children::<ServerDef>(&self.syntax)
    }

    pub fn resources(&self) -> impl Iterator<Item = ResourceDef> {
        children::<ResourceDef>(&self.syntax)
    }

    pub fn themes(&self) -> impl Iterator<Item = ThemeDef> {
        children::<ThemeDef>(&self.syntax)
    }

    pub fn vars(&self) -> impl Iterator<Item = VarDef> {
        children::<VarDef>(&self.syntax)
    }

    pub fn styles(&self) -> impl Iterator<Item = StyleDef> {
        children::<StyleDef>(&self.syntax)
    }

    pub fn functions(&self) -> impl Iterator<Item = FnDef> {
        children::<FnDef>(&self.syntax)
    }
}

// -------------------------------------------------------------
// Enum AST Item
// -------------------------------------------------------------
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Item {
    Component(ComponentDef),
    Store(StoreDef),
    Server(ServerDef),
    Resource(ResourceDef),
    Theme(ThemeDef),
    Var(VarDef),
    Style(StyleDef),
    Function(FnDef),
    Statement(Stmt),
    Ui(UiElement),
}

impl AstNode for Item {
    fn can_cast(kind: SyntaxKind) -> bool {
        matches!(
            kind,
            SyntaxKind::COMPONENT_DEF
                | SyntaxKind::STORE_DEF
                | SyntaxKind::SERVER_DEF
                | SyntaxKind::RESOURCE_DEF
                | SyntaxKind::THEME_DEF
                | SyntaxKind::VAR_DEF
                | SyntaxKind::STYLE_DEF
                | SyntaxKind::FN_DEF
                | SyntaxKind::LET_STMT
                | SyntaxKind::EXPR_STMT
                | SyntaxKind::RETURN_STMT
                | SyntaxKind::UI_ELEMENT
        )
    }

    fn cast(syntax: SyntaxNode) -> Option<Self> {
        match syntax.kind() {
            SyntaxKind::COMPONENT_DEF => ComponentDef::cast(syntax).map(Item::Component),
            SyntaxKind::STORE_DEF => StoreDef::cast(syntax).map(Item::Store),
            SyntaxKind::SERVER_DEF => ServerDef::cast(syntax).map(Item::Server),
            SyntaxKind::RESOURCE_DEF => ResourceDef::cast(syntax).map(Item::Resource),
            SyntaxKind::THEME_DEF => ThemeDef::cast(syntax).map(Item::Theme),
            SyntaxKind::VAR_DEF => VarDef::cast(syntax).map(Item::Var),
            SyntaxKind::STYLE_DEF => StyleDef::cast(syntax).map(Item::Style),
            SyntaxKind::FN_DEF => FnDef::cast(syntax).map(Item::Function),
            SyntaxKind::LET_STMT | SyntaxKind::EXPR_STMT | SyntaxKind::RETURN_STMT => {
                Stmt::cast(syntax).map(Item::Statement)
            }
            SyntaxKind::UI_ELEMENT => UiElement::cast(syntax).map(Item::Ui),
            _ => None,
        }
    }

    fn syntax(&self) -> &SyntaxNode {
        match self {
            Item::Component(it) => it.syntax(),
            Item::Store(it) => it.syntax(),
            Item::Server(it) => it.syntax(),
            Item::Resource(it) => it.syntax(),
            Item::Theme(it) => it.syntax(),
            Item::Var(it) => it.syntax(),
            Item::Style(it) => it.syntax(),
            Item::Function(it) => it.syntax(),
            Item::Statement(it) => it.syntax(),
            Item::Ui(it) => it.syntax(),
        }
    }
}

// -------------------------------------------------------------
// ComponentDef Accessors
// -------------------------------------------------------------
impl ComponentDef {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn param_list(&self) -> Option<ParamList> {
        child(&self.syntax)
    }

    pub fn body(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }
}

// -------------------------------------------------------------
// StoreDef Accessors
// -------------------------------------------------------------
impl StoreDef {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn type_ref(&self) -> Option<TypeRef> {
        child(&self.syntax)
    }

    pub fn value(&self) -> Option<Expr> {
        child(&self.syntax)
    }

    pub fn body(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }

    pub fn vars(&self) -> impl Iterator<Item = VarDef> {
        self.body()
            .into_iter()
            .flat_map(|b| children::<VarDef>(b.syntax()))
    }

    pub fn functions(&self) -> impl Iterator<Item = FnDef> {
        self.body()
            .into_iter()
            .flat_map(|b| children::<FnDef>(b.syntax()))
    }
}

// -------------------------------------------------------------
// ServerDef Accessors
// -------------------------------------------------------------
impl ServerDef {
    pub fn body(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }

    pub fn functions(&self) -> impl Iterator<Item = FnDef> {
        self.body()
            .into_iter()
            .flat_map(|b| children::<FnDef>(b.syntax()))
    }
}

// -------------------------------------------------------------
// VarDef Accessors
// -------------------------------------------------------------
impl VarDef {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn type_ref(&self) -> Option<TypeRef> {
        child(&self.syntax)
    }

    pub fn value(&self) -> Option<Expr> {
        child(&self.syntax)
    }
}

// -------------------------------------------------------------
// StyleDef Accessors
// -------------------------------------------------------------
impl StyleDef {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn body(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }

    pub fn properties(&self) -> Box<dyn Iterator<Item = StyleProperty>> {
        if let Some(body) = self.body() {
            Box::new(children::<StyleProperty>(body.syntax()))
        } else {
            Box::new(children::<StyleProperty>(&self.syntax))
        }
    }
}

impl StyleProperty {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn value(&self) -> Option<Expr> {
        child(&self.syntax)
    }
}

// -------------------------------------------------------------
// ResourceDef Accessors
// -------------------------------------------------------------
impl ResourceDef {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn type_ref(&self) -> Option<TypeRef> {
        child(&self.syntax)
    }

    pub fn value(&self) -> Option<Expr> {
        child(&self.syntax)
    }
}

// -------------------------------------------------------------
// ThemeDef Accessors
// -------------------------------------------------------------
impl ThemeDef {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn body(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }

    pub fn properties(&self) -> Box<dyn Iterator<Item = ThemeProperty>> {
        if let Some(body) = self.body() {
            Box::new(children::<ThemeProperty>(body.syntax()))
        } else {
            Box::new(children::<ThemeProperty>(&self.syntax))
        }
    }
}

impl ThemeProperty {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn value(&self) -> Option<Expr> {
        child(&self.syntax)
    }

    pub fn body(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }

    pub fn sub_properties(&self) -> Box<dyn Iterator<Item = ThemeProperty>> {
        if let Some(body) = self.body() {
            Box::new(children::<ThemeProperty>(body.syntax()))
        } else {
            Box::new(std::iter::empty())
        }
    }
}

// -------------------------------------------------------------
// FnDef Accessors
// -------------------------------------------------------------
impl FnDef {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn param_list(&self) -> Option<ParamList> {
        child(&self.syntax)
    }

    pub fn return_type(&self) -> Option<TypeRef> {
        child(&self.syntax)
    }

    pub fn body(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }
}

// -------------------------------------------------------------
// ParamList & Param
// -------------------------------------------------------------
impl ParamList {
    pub fn params(&self) -> impl Iterator<Item = Param> {
        children::<Param>(&self.syntax)
    }
}

impl Param {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn type_ref(&self) -> Option<TypeRef> {
        child(&self.syntax)
    }
}

// -------------------------------------------------------------
// TypeRef
// -------------------------------------------------------------
impl TypeRef {
    pub fn text(&self) -> String {
        self.syntax.text().to_string().trim().to_string()
    }
}

// -------------------------------------------------------------
// BlockExpr
// -------------------------------------------------------------
impl BlockExpr {
    pub fn statements(&self) -> impl Iterator<Item = Stmt> {
        children::<Stmt>(&self.syntax)
    }

    pub fn ui_elements(&self) -> impl Iterator<Item = UiElement> {
        children::<UiElement>(&self.syntax)
    }

    pub fn items(&self) -> impl Iterator<Item = Item> {
        self.syntax.children().filter_map(Item::cast)
    }
}

// -------------------------------------------------------------
// UiElement Accessors
// -------------------------------------------------------------
impl UiElement {
    pub fn tag_token(&self) -> Option<SyntaxToken> {
        self.syntax.first_token()
    }

    pub fn tag_name(&self) -> Option<String> {
        self.tag_token().map(|t| t.text().to_string())
    }

    pub fn arg_list(&self) -> Option<UiArgList> {
        child(&self.syntax)
    }

    pub fn body(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }

    pub fn children_elements(&self) -> impl Iterator<Item = UiElement> {
        self.body()
            .into_iter()
            .flat_map(|b| children::<UiElement>(b.syntax()))
    }
}

impl UiArgList {
    pub fn properties(&self) -> impl Iterator<Item = UiProperty> {
        children::<UiProperty>(&self.syntax)
    }

    pub fn positional_exprs(&self) -> impl Iterator<Item = Expr> {
        self.properties().filter_map(|p| {
            if p.name().is_none() {
                p.value()
            } else {
                None
            }
        })
    }
}

impl UiProperty {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn value(&self) -> Option<Expr> {
        child(&self.syntax)
    }
}

// -------------------------------------------------------------
// Statements
// -------------------------------------------------------------
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Stmt {
    Let(LetStmt),
    Var(VarDef),
    Store(StoreDef),
    Resource(ResourceDef),
    Expr(ExprStmt),
    Return(ReturnStmt),
}

impl AstNode for Stmt {
    fn can_cast(kind: SyntaxKind) -> bool {
        matches!(
            kind,
            SyntaxKind::LET_STMT
                | SyntaxKind::VAR_DEF
                | SyntaxKind::STORE_DEF
                | SyntaxKind::RESOURCE_DEF
                | SyntaxKind::EXPR_STMT
                | SyntaxKind::RETURN_STMT
        )
    }

    fn cast(syntax: SyntaxNode) -> Option<Self> {
        match syntax.kind() {
            SyntaxKind::LET_STMT => LetStmt::cast(syntax).map(Stmt::Let),
            SyntaxKind::VAR_DEF => VarDef::cast(syntax).map(Stmt::Var),
            SyntaxKind::STORE_DEF => StoreDef::cast(syntax).map(Stmt::Store),
            SyntaxKind::RESOURCE_DEF => ResourceDef::cast(syntax).map(Stmt::Resource),
            SyntaxKind::EXPR_STMT => ExprStmt::cast(syntax).map(Stmt::Expr),
            SyntaxKind::RETURN_STMT => ReturnStmt::cast(syntax).map(Stmt::Return),
            _ => None,
        }
    }

    fn syntax(&self) -> &SyntaxNode {
        match self {
            Stmt::Let(it) => it.syntax(),
            Stmt::Var(it) => it.syntax(),
            Stmt::Store(it) => it.syntax(),
            Stmt::Resource(it) => it.syntax(),
            Stmt::Expr(it) => it.syntax(),
            Stmt::Return(it) => it.syntax(),
        }
    }
}

impl ExprStmt {
    pub fn expr(&self) -> Option<Expr> {
        child(&self.syntax)
    }
}

impl LetStmt {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn type_ref(&self) -> Option<TypeRef> {
        child(&self.syntax)
    }

    pub fn value(&self) -> Option<Expr> {
        child(&self.syntax)
    }
}

impl ReturnStmt {
    pub fn expr(&self) -> Option<Expr> {
        child(&self.syntax)
    }
}

// -------------------------------------------------------------
// Expressions
// -------------------------------------------------------------
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Expr {
    Literal(Literal),
    NameRef(NameRef),
    Binary(BinaryExpr),
    CompoundAssign(CompoundAssignExpr),
    Prefix(PrefixExpr),
    Call(CallExpr),
    Ui(UiElement),
    Block(BlockExpr),
    If(IfExpr),
    For(ForExpr),
    While(WhileExpr),
    Lambda(LambdaExpr),
    Field(FieldExpr),
    Index(IndexExpr),
}

impl AstNode for Expr {
    fn can_cast(kind: SyntaxKind) -> bool {
        matches!(
            kind,
            SyntaxKind::LITERAL
                | SyntaxKind::NAME_REF
                | SyntaxKind::BINARY_EXPR
                | SyntaxKind::COMPOUND_ASSIGN_EXPR
                | SyntaxKind::PREFIX_EXPR
                | SyntaxKind::CALL_EXPR
                | SyntaxKind::UI_ELEMENT
                | SyntaxKind::BLOCK_EXPR
                | SyntaxKind::IF_EXPR
                | SyntaxKind::FOR_EXPR
                | SyntaxKind::WHILE_EXPR
                | SyntaxKind::LAMBDA_EXPR
                | SyntaxKind::FIELD_EXPR
                | SyntaxKind::INDEX_EXPR
        )
    }

    fn cast(syntax: SyntaxNode) -> Option<Self> {
        match syntax.kind() {
            SyntaxKind::LITERAL => Literal::cast(syntax).map(Expr::Literal),
            SyntaxKind::NAME_REF => NameRef::cast(syntax).map(Expr::NameRef),
            SyntaxKind::BINARY_EXPR => BinaryExpr::cast(syntax).map(Expr::Binary),
            SyntaxKind::COMPOUND_ASSIGN_EXPR => {
                CompoundAssignExpr::cast(syntax).map(Expr::CompoundAssign)
            }
            SyntaxKind::PREFIX_EXPR => PrefixExpr::cast(syntax).map(Expr::Prefix),
            SyntaxKind::CALL_EXPR => CallExpr::cast(syntax).map(Expr::Call),
            SyntaxKind::UI_ELEMENT => UiElement::cast(syntax).map(Expr::Ui),
            SyntaxKind::BLOCK_EXPR => BlockExpr::cast(syntax).map(Expr::Block),
            SyntaxKind::IF_EXPR => IfExpr::cast(syntax).map(Expr::If),
            SyntaxKind::FOR_EXPR => ForExpr::cast(syntax).map(Expr::For),
            SyntaxKind::WHILE_EXPR => WhileExpr::cast(syntax).map(Expr::While),
            SyntaxKind::LAMBDA_EXPR => LambdaExpr::cast(syntax).map(Expr::Lambda),
            SyntaxKind::FIELD_EXPR => FieldExpr::cast(syntax).map(Expr::Field),
            SyntaxKind::INDEX_EXPR => IndexExpr::cast(syntax).map(Expr::Index),
            _ => None,
        }
    }

    fn syntax(&self) -> &SyntaxNode {
        match self {
            Expr::Literal(it) => it.syntax(),
            Expr::NameRef(it) => it.syntax(),
            Expr::Binary(it) => it.syntax(),
            Expr::CompoundAssign(it) => it.syntax(),
            Expr::Prefix(it) => it.syntax(),
            Expr::Call(it) => it.syntax(),
            Expr::Ui(it) => it.syntax(),
            Expr::Block(it) => it.syntax(),
            Expr::If(it) => it.syntax(),
            Expr::For(it) => it.syntax(),
            Expr::While(it) => it.syntax(),
            Expr::Lambda(it) => it.syntax(),
            Expr::Field(it) => it.syntax(),
            Expr::Index(it) => it.syntax(),
        }
    }
}

// -------------------------------------------------------------
// Other Expressions Accessors
// -------------------------------------------------------------
impl BinaryExpr {
    pub fn lhs(&self) -> Option<Expr> {
        self.syntax.children().filter_map(Expr::cast).next()
    }

    pub fn rhs(&self) -> Option<Expr> {
        self.syntax.children().filter_map(Expr::cast).nth(1)
    }

    pub fn op_token(&self) -> Option<SyntaxToken> {
        self.syntax
            .children_with_tokens()
            .filter_map(|it| it.into_token())
            .find(|t| {
                matches!(
                    t.kind(),
                    SyntaxKind::Plus
                        | SyntaxKind::Minus
                        | SyntaxKind::Star
                        | SyntaxKind::Slash
                        | SyntaxKind::Percent
                        | SyntaxKind::EqEq
                        | SyntaxKind::BangEq
                        | SyntaxKind::LtEq
                        | SyntaxKind::GtEq
                        | SyntaxKind::Lt
                        | SyntaxKind::Gt
                        | SyntaxKind::AmpAmp
                        | SyntaxKind::PipePipe
                        | SyntaxKind::Eq
                )
            })
    }
}

impl CompoundAssignExpr {
    pub fn lhs(&self) -> Option<Expr> {
        self.syntax.children().filter_map(Expr::cast).next()
    }

    pub fn rhs(&self) -> Option<Expr> {
        self.syntax.children().filter_map(Expr::cast).nth(1)
    }

    pub fn op_token(&self) -> Option<SyntaxToken> {
        self.syntax
            .children_with_tokens()
            .filter_map(|it| it.into_token())
            .find(|t| {
                matches!(
                    t.kind(),
                    SyntaxKind::PlusAssign
                        | SyntaxKind::MinusAssign
                        | SyntaxKind::MulAssign
                        | SyntaxKind::DivAssign
                )
            })
    }
}

impl PrefixExpr {
    pub fn expr(&self) -> Option<Expr> {
        child(&self.syntax)
    }

    pub fn op_token(&self) -> Option<SyntaxToken> {
        self.syntax
            .children_with_tokens()
            .filter_map(|it| it.into_token())
            .find(|t| matches!(t.kind(), SyntaxKind::Minus | SyntaxKind::Bang))
    }
}

impl CallExpr {
    pub fn callee(&self) -> Option<Expr> {
        child(&self.syntax)
    }

    pub fn arg_list(&self) -> Option<ArgList> {
        child(&self.syntax)
    }
}

impl Arg {
    pub fn name(&self) -> Option<Name> {
        child(&self.syntax)
    }

    pub fn expr(&self) -> Option<Expr> {
        child(&self.syntax)
    }
}

impl ArgList {
    pub fn args(&self) -> impl Iterator<Item = Expr> {
        children::<Arg>(&self.syntax)
            .filter_map(|a| a.expr())
            .chain(children::<Expr>(&self.syntax))
    }

    pub fn arg_nodes(&self) -> impl Iterator<Item = Arg> {
        children::<Arg>(&self.syntax)
    }
}

impl IfExpr {
    pub fn condition(&self) -> Option<Expr> {
        child(&self.syntax)
    }

    pub fn then_branch(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }

    pub fn else_branch(&self) -> Option<ElseBranch> {
        child(&self.syntax)
    }
}

impl ElseBranch {
    pub fn block(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }

    pub fn if_expr(&self) -> Option<IfExpr> {
        child(&self.syntax)
    }
}

impl LambdaExpr {
    pub fn param_list(&self) -> Option<ParamList> {
        child(&self.syntax)
    }

    pub fn body(&self) -> Option<BlockExpr> {
        child(&self.syntax)
    }
}

impl Literal {
    pub fn token(&self) -> Option<SyntaxToken> {
        self.syntax.first_token()
    }

    pub fn text(&self) -> String {
        self.syntax.text().to_string()
    }
}

impl Name {
    pub fn text(&self) -> String {
        self.syntax.text().to_string().trim().to_string()
    }
}

impl NameRef {
    pub fn text(&self) -> String {
        self.syntax.text().to_string().trim().to_string()
    }
}
