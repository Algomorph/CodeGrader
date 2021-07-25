/*
* Copyright 2021 Gregory Kramida
* */

// Defines different entities that are found in code

MethodCallType = {
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


const DeclarationCategoryCode = {
    NAMING_CONVENTION: 0,
    NON_DICTIONARY_WORD: 1,
    SINGLE_LETTER_WORD: 2,
    COMPOUND_NAMING_PROBLEM: 3
}

class Declaration extends CodeEntity {

    // relevant code entity categories
    static EntityCategories = new Map([
        [DeclarationCategoryCode.NAMING_CONVENTION, new CodeEntity.Category(
            "declaration not following naming convention", -1, true, null, "naming-convention-problem")],
        [DeclarationCategoryCode.NON_DICTIONARY_WORD, new CodeEntity.Category("declaration with a non-dictionary word",
            -1, true, null, "naming-non-dictionary-word-problem", "")],
        [DeclarationCategoryCode.SINGLE_LETTER_WORD, new CodeEntity.Category("single-letter declaration", -1, true, null,
            "naming-single-letter-word-problem")],
        [DeclarationCategoryCode.COMPOUND_NAMING_PROBLEM, new CodeEntity.Category("compound naming problem", -2, true, null,
            "naming-compound-problem")]
    ]);

    static NameType = {
        METHOD: 'method',
        VARIABLE: 'variable',
        TYPE: 'type',
        CONSTANT: 'constant',
        NONE: 'none'
    }

    static #TagColorByType = {
        'method': "#4fa16b",
        'variable': "#4fa16b",
        'type': "orange",
        'constant': "#4f72e3",
        'none': "#555555"
    }

    static #NameTypeConvention = {
        'method': 'camelCase',
        'variable': 'camelCase',
        'type': 'PascalCase',
        'constant': 'ALL_CAPS_SNAKE_CASE',
    }

    #nonDictionaryWordsInName
    #categories
    #category

    constructor(name, typeName, typeArguments, astNode, codeFile, trCodeLine) {
        super(astNode, trCodeLine);
        this.name = name;
        this.typeName = typeName; // for methods, the return type
        this.typeArguments = typeArguments;
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
        // type for inferring what kind of naming convention the name should follow
        this.nameType = 'none';
        this.#nonDictionaryWordsInName = [];
        this.#categories = [];
        this.#category = CodeEntity.NO_DETECTED_PROBLEMS;
    }

    #generateNamingConventionProblemDescription() {
        return "" + capitalize(this.nameType) + " \"" + this.name + "\" doesn&#39;t seem to follow the "
            + Declaration.#NameTypeConvention[this.nameType] + " convention.";
    }

    #generateNonDictionaryWordProblemDescription() {
        if (this.#nonDictionaryWordsInName.length === 0) {
            throw "Need at least one problematic word in non-dictionary word array, got an array of length 0.";
        }
        let description = "";
        if (this.#nonDictionaryWordsInName.length === 1) {
            description = "The declaration includes a non-dictionary word or an abbreviation.";
        } else {
            description = "The declaration includes non-dictionary words and/or abbreviations.";
        }
        description += "The former are not descriptive and the latter are ambiguous.";
        description += capitalize(this.nameType) + " \"" + this.name + "\" has parts \""
            + this.#nonDictionaryWordsInName.join("\", \"") + "\" that appear problematic.";
        return description;
    }

    #generateSingleLetterNameProblemDescription() {
        return capitalize(this.nameType) + " \"" + this.name + "\" is a single letter." +
            "Single-character declarations are not descriptive-enough in most cases." ;
    }

    #generateCompoundProblemDescription(){
        return "Compound naming problem detected." +
            this.#categories.map((category) => category.description).join(", ") + "."
    }

    #ProblemDescriptionByCategory = new Map([
        [DeclarationCategoryCode.NAMING_CONVENTION, this.#generateNamingConventionProblemDescription],
        [DeclarationCategoryCode.NON_DICTIONARY_WORD, this.#generateNonDictionaryWordProblemDescription],
        [DeclarationCategoryCode.SINGLE_LETTER_WORD, this.#generateSingleLetterNameProblemDescription],
        [DeclarationCategoryCode.COMPOUND_NAMING_PROBLEM, this.#generateCompoundProblemDescription]
    ]);

    #generateMessageText = function (){
        return super.defaultMessageText;
    }

    /**
     * @param {[number]} categoryCodes
     * @param {[string]} nonDictionaryWords
     */
    setNameCheckResult(categoryCodes = [], nonDictionaryWords = [] ){
        this.#nonDictionaryWordsInName = nonDictionaryWords;
        if(categoryCodes.length > 1){
            this.#category = this.#categories.COMPOUND_NAMING_PROBLEM;
            this.#categories = categoryCodes.map(code => Declaration.EntityCategories[code]);
            this.#generateMessageText = this.#ProblemDescriptionByCategory[DeclarationCategoryCode.COMPOUND_NAMING_PROBLEM].bind(this);
        } else if (categoryCodes.length === 1) {
            const categoryCode = categoryCodes[0]
            this.#category = Declaration.EntityCategories[categoryCode];
            this.#generateMessageText = this.#ProblemDescriptionByCategory[categoryCode].bind(this);
        }
    }

    get category(){
        return this.#category;
    }

    get defaultMessageText() {
        return this.#generateMessageText();
    }

    get toolTip() {
        if (this.#category === CodeEntity.NO_DETECTED_PROBLEMS){
            return super.toolTip;
        }
        return this.#generateMessageText();
    }

    get tagColor(){
        return Declaration.#TagColorByType[this.nameType];
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
