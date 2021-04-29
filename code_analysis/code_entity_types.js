/*
* Copyright 2021 Gregory Kramida
* */

// Defines different entities that are found in code

this.MethodCallType = {
    METHOD: "method",
    INSTANCE_METHOD: "instance method",
    STATIC_METHOD: "static method",
    CONSTRUCTOR: "constructor",
    SUPER_METHOD: "super method",
    SUPER_CONSTRUCTOR: "super constructor",
};

class MethodCall {
    constructor(name, trCodeLine, astNode, callType, methodName, nameOfCalledType) {
        this.name = name;
        this.possiblyIgnored = false;
        this.trCodeLine = trCodeLine;
        this.astNode = astNode;
        this.callType = callType;
        this.methodName = methodName;
        this.nameOfCalledType = nameOfCalledType;
    }
}

let DeclarationType = {
    METHOD: 1,
    TYPE: 2,
    VARIABLE: 3,
    CONSTANT: 4,
    FIELD: 5,
    FINAL_INSTANCE_FIELD: 6,
    THIS: 7,
    CAST: 8,
    CONSTRUCTOR: 9,
    FINAL_STATIC_FIELD: 10
}

let DeclarationTypeByNode = {
    "TypeDeclaration": DeclarationType.TYPE,
    "MethodDeclaration": DeclarationType.METHOD,
    "VariableDeclarationStatement": DeclarationType.VARIABLE,
    "VariableDeclarationExpression": DeclarationType.VARIABLE,
    "SingleVariableDeclaration": DeclarationType.VARIABLE,
    "FieldDeclaration": DeclarationType.FIELD,
    "This": DeclarationType.THIS,
    "CastExpression": DeclarationType.CAST
}


class Declaration {
    constructor(name, typeName, typeArguments, astNode, codeFile) {
        this.name = name;
        this.typeName = typeName; // for methods, the return type
        this.typeArguments = typeArguments;
        this.astNode = astNode;
        this.declarationType = DeclarationTypeByNode[astNode.node];
        if (this.declarationType === DeclarationType.METHOD && astNode.hasOwnProperty("constructor") && astNode.constructor) {
            this.declarationType = DeclarationType.CONSTRUCTOR;
        }
        this.final = false;
        if (astNode.hasOwnProperty("location")) {
            this.trCodeLine = codeFile.trCodeLines[astNode.location.start.line - 1];
        } else {
            this.trCodeLine = null;
        }

        if (this.declarationType === DeclarationType.FIELD || this.declarationType === DeclarationType.VARIABLE) {
            const modifierKeywords = astNode.modifiers.map(modifier => modifier.keyword)
            if (modifierKeywords.includes("final")) {
                this.final = true;
                switch (this.declarationType) {
                    case DeclarationType.FIELD:
                        if (modifierKeywords.includes("static")) {
                            this.declarationType = DeclarationType.FINAL_STATIC_FIELD;
                        } else {
                            this.declarationType = DeclarationType.FINAL_INSTANCE_FIELD;
                        }
                        break;
                    case DeclarationType.VARIABLE:
                        this.declarationType = DeclarationType.CONSTANT;
                        break;
                }
            }
        }
        this.nameType = null;
    }
}

/**
 * Represents a single scope (stack) in the code.
 */
class Scope {
    constructor(astNode, declarations, children, scopeStack, isTest = false) {
        /** @type {{node: string, location : {start: {offset, line, column}, end : {offset, line, column}}}}
         * @description the AST node that encompasses the entire scope (and, possibly, other scopes if it has body
         * and, potentially, multiple scoped clauses, such as an if statement with else-if/else clauses) */
        this.astNode = astNode;

        this.declarations = new Map();
        for (const declaration of declarations) {
            this.declarations.set(declaration.name, declaration);
        }
        /*
         * At the end of entity search, contains a flattened array of all nodes within the current node
         * ("Flattened" meaning, e.g. for an ArrayAccess node, the node within its .array property is also in this
         * array along with the parent.)
         */
        this.childAstNodes = children;
        //used, in some cases, for temporary results during the entity search
        this.unprocessedChildAstNodes = children;
        this.scopeStack = scopeStack;
        this.isTest = isTest;
        /** @type{Array.<MethodCall>}*/
        this.methodCalls = [];
    }

    setNextBatchOfChildAstNodes(children) {
        this.childAstNodes.push(...children);
        this.unprocessedChildAstNodes = children;
    }
}

/**
 * Signifies a single usage of a previously-declared element in the code, i.e. of a method, a field, a class/enum,
 * or a variable.
 */
class Usage {
    /**
     * Define a usage instance
     * @param {{node: string, location : {start: {offset, line, column}, end : {offset, line, column}}}} astNode
     * @param {HTMLTableRowElement} trCodeLine
     * @param {Declaration} declaration
     */
    constructor(astNode, trCodeLine, declaration) {
        this.astNode = astNode;
        this.trCodeline = trCodeLine;
        this.declaration = declaration;
    }
}

const LoopType = {
    FOR_LOOP: 0,
    ENHANCED_FOR_LOOP: 1,
    WHILE_LOOP: 2,
    DO_WHILE_LOOP: 3
};

const LoopDescriptionByType = new Map([
    [LoopType.FOR_LOOP, "for loop"],
    [LoopType.ENHANCED_FOR_LOOP, "enhanced-for loop"],
    [LoopType.WHILE_LOOP, "while loop"],
    [LoopType.DO_WHILE_LOOP, "do-while loop"]
]);

const LoopTypeByNode = new Map([
    ["ForStatement", LoopType.FOR_LOOP],
    ["EnhancedForStatement", LoopType.ENHANCED_FOR_LOOP],
    ["WhileStatement", LoopType.WHILE_LOOP],
    ["DoStatement", LoopType.DO_WHILE_LOOP]
]);

/**
 * Signifies a loop statement in the code.
 */
class Loop {
    /**
     * @param {Object} astNode
     * @param {HTMLTableRowElement} trCodeLine
     * @param {Scope} enclosingMethodScope
     * @param {TypeInformation} enclosingTypeNode
     */
    constructor(astNode, trCodeLine, enclosingMethodScope, enclosingTypeNode) {
        this.astNode = astNode;
        this.trCodeLine = trCodeLine;
        this.enclosingMethodScope = enclosingMethodScope;
        this.type = LoopTypeByNode.get(astNode.node);
        this.methodIdentifier = "";
        if (enclosingMethodScope.astNode.node === "MethodDeclaration") {
            const enclosingMethodIsStatic = code_analysis.methodIsStatic(enclosingMethodScope.astNode);
            //TODO: support handling of anonymous classes
            const typeName = enclosingTypeNode.hasOwnProperty("name") ? enclosingTypeNode.name.identifier : "";
            this.methodIdentifier = code_analysis.generateMethodStringIdentifier(typeName, enclosingMethodScope.astNode.name.identifier, enclosingMethodIsStatic);
        }
    }
}
