let brace_style_module = {};

(function () {

    class Options {
        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         */
        constructor(enabled = false) {
            this.enabled = enabled;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    const BracePairLocationType = {
        IF_BODY: "if statement body",
        ELSE_IF_CLAUSE: "else-if clause",
        ELSE_CLAUSE: "else clause",
        SWITCH_BODY: "switch statement body",
        FOR_LOOP: "for loop body",
        ENHANCED_FOR_LOOP: "enhanced for loop body",
        WHILE_LOOP: "while loop body",
        DO_WHILE_LOOP: "do while loop body",
        TRY_BODY: "try statement body",
        CATCH_CLAUSE: "catch clause",
        FINALLY_CLAUSE: "finally clause"
    }

    const BraceStyle = {
        ALLMAN: "Allman",
        ONE_TBS: "1TBS",
        UNKNOWN: "unknown"
    }

    const BraceType = {
        OPENING: "opening",
        CLOSING: "closing"
    }

    const BraceStyleErrorType = {
        UNMATCHED: "is unmatched with the other brace",
        WRONG_LINE: "is on the wrong line",
        MISSING: "is missing"
    }

    class BraceStyleError {
        /**
         * Generate a brace style error
         * @param {string} braceType opening/closing (see BraceType)
         * @param {string} errorType error type (see BraceStyleErrorType)
         */
        constructor(braceType, errorType) {
            this.bracceType = braceType;
            this.errorType = errorType;
        }
    }

    class BracePair {
        /**
         * Make a brace pair
         * @param {{location : {start : {offset : Number, line : Number, column : Number},
         * end :  {offset : Number, line : Number, column : Number}}}} rootAstNode the AST node of a scope-opening
         * control statement (potentially with clauses), such as 'if', 'try', etc. or declaration (including the signature).
         * * @param {{location : {start : {offset : Number, line : Number, column : Number},
         * end :  {offset : Number, line : Number, column : Number}}}} braceAstNode the AST node of the actual scope the brace opens
         * @param {Array.<string>} matchingStyles the list of styles the brace pair satisfies (see BraceStyle)
         * @param {Array.<BraceStyleError>} braceStyleError brace matchingStyles errors (if any)
         * @param {string} locationType brace location type
         */
        constructor(rootAstNode, braceAstNode, matchingStyles, braceStyleError, locationType) {
            this.rootAstNode = rootAstNode;
            this.braceAstNode = braceAstNode;
            this.braceStyles = matchingStyles;
            this.braceStyleErrors = braceStyleError;
            this.braceLocationType = locationType;
        }
    }

    /**
     * Clause property of an ast node (used to define brace node behavior)
     */
    class BraceScopeClauseProperty {
        /**
         * Build clause property
         * @param {string | null} singleClauseName
         * @param {string | null} clauseArrayName
         * @param {string} clauseLocation
         */
        constructor(singleClauseName, clauseArrayName, clauseLocation) {
            this.singleClauseName = singleClauseName;
            this.clauseArrayName = clauseArrayName;
            this.clauseLocation = clauseLocation;
        }
    }

    class BraceScopeClause {
        /**
         *
         * @param {{node: string, location: {start : {offset, line, column}, end: {offset, line, column}}}} astNode
         * @param {string} location
         */
        constructor(astNode, location) {
            this.astNode = astNode;
            this.location = location;
        }
    }


    class BraceScopeBehavior {
        /**
         * Define a scope node behavior
         * @param {string} expressionProperty
         * @param {string} bodyProperty
         * @param {string} bodyLocation
         * @param {Array.<BraceScopeClauseProperty>} clauseProperties
         */
        constructor(expressionProperty, bodyProperty, bodyLocation, clauseProperties,) {
            this.expressionProperty = expressionProperty;
            this.bodyProperty = bodyProperty;
            this.bodyLocation = bodyLocation;
            this.clauseProperties = clauseProperties;
        }
    }

    //TODO: make static private field of BraceScope when the class fields proposal is fully supported by all major browsers,
    // see https://github.com/tc39/proposal-class-fields
    /** @type {Map.<string, BraceScopeBehavior | null>}*/
    const BehaviorByNode = new Map([
        ["IfStatement", new BraceScopeBehavior("expression", "thenStatement", BracePairLocationType.IF_BODY,
            [new BraceScopeClauseProperty("elseStatement", null, BracePairLocationType.ELSE_CLAUSE)])],
        //FIXME
        ["SwitchStatement", null],
        ["ForStatement", null],
        ["EnhancedForStatement", null],
        ["WhileStatement", null],
        ["DoStatement", null],
        ["TryStatement", null],
    ]);

    /**
     * A wrapper around an AST node making its body and clauses easy to access.
     */
    class BraceScope {
        /**
         * Construct a brace scope node object around the provided ast Node
         * @param {{node: string, location: {start : {offset, line, column}, end: {offset, line, column}}}} astNode the provided node
         */
        constructor(astNode) {
            this.astNode = astNode;
            /** @type {null | BraceScopeBehavior} */
            this.behavior = null;
            if (BehaviorByNode.has(astNode.node)) {
                this.behavior = BehaviorByNode.get(astNode.node);
            }
        }

        get behaviorDefined() {
            return this.behavior != null;
        }

        get body() {
            return this.astNode[this.behavior.bodyProperty];
        }

        get bodyLocation() {
            return this.behavior.bodyLocation;
        }

        get expression() {
            if (this.behavior.expressionProperty != null) {
                return this.astNode[this.behavior.expressionProperty];
            } else {
                return null;
            }
        }

        get clauses() {
            let clauses = [];
            for (const clauseProperty of this.behavior.clauseProperties) {
                if (clauseProperty.singleClauseName != null && this.astNode.hasOwnProperty(clauseProperty.singleClauseName)) {
                    clauses.push(new BraceScopeClause(this.astNode[clauseProperty.singleClauseName], clauseProperty.clauseLocation));
                }
                if (clauseProperty.clauseArrayName != null && this.astNode.hasOwnProperty(clauseProperty.clauseArrayName)) {
                    for (const clauseNode of this.astNode[clauseProperty.clauseArrayName]) {
                        clauses.push(new BraceScopeClause(clauseNode, clauseProperty.clauseLocation));
                    }
                }
            }
            return clauses;
        }
    }

    function handleBraceNode(astNode, codeFile, bracePairs) {
        let locationType = null;
        if (BehaviorByNode.has(astNode.node) && BehaviorByNode.get(astNode.node) != null) {
            //TODO: debug other nodes
        }

        const braceScopeNode = new BraceScope(astNode);

        if (braceScopeNode.behaviorDefined) {
            const bodyNode = braceScopeNode.body;
            const expressionNode = braceScopeNode.expression;
            const locationBeforeBrace = expressionNode == null ? astNode.location.start : expressionNode.location.end;

            // Check body

            // determine brace styles
            let matchedBraceStyles = [BraceStyle.UNKNOWN];
            let braceErrors = [];

            const rootStartLine = codeFile.codeLines[astNode.location.start.line - 1];
            const bodyEndLine = codeFile.codeLines[bodyNode.location.end.line - 1];
            const statementStartColumn = getIndentationWidth(rootStartLine);
            const closingBraceColumn = getIndentationWidth(bodyEndLine);
            const openingBraceColumn = locationBeforeBrace.line === bodyNode.location.start.line ?
                statementStartColumn + (astNode.location.start.offset - bodyNode.location.start.offset) : getIndentationWidth(bodyNode.location.start.line);

            if (codeFile.sourceCode.charAt(bodyNode.location.start.offset) !== '{') {
                braceErrors.push(new BraceStyleError(BraceType.OPENING, BraceStyleErrorType.MISSING));
                braceErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.MISSING));
            } else {
                if (locationBeforeBrace.line === bodyNode.location.start.line) {
                    // starting brace is on the same line with "if", assume 1TBS
                    matchedBraceStyles = [BraceStyle.ONE_TBS];
                    if (statementStartColumn !== closingBraceColumn) {
                        console.log(statementStartColumn, closingBraceColumn, astNode.location.start.line);
                        console.log(rootStartLine);
                        console.log(bodyEndLine);
                        braceErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.UNMATCHED));
                    }
                } else if (locationBeforeBrace.line === bodyNode.location.start.line - 1) {
                    if (statementStartColumn === openingBraceColumn || openingBraceColumn === closingBraceColumn) {
                        // starting brace and/or ending brace are on the next line from "if" and have no extra indent, assume Allman
                        matchedBraceStyles = [BraceStyle.ALLMAN];
                        if (statementStartColumn !== openingBraceColumn) {
                            braceErrors.push(new BraceStyleError(BraceType.OPENING, BraceStyleErrorType.UNMATCHED));
                        }
                        if (openingBraceColumn !== closingBraceColumn) {
                            braceErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.UNMATCHED));
                        }
                    } else {
                        if (openingBraceColumn !== closingBraceColumn) {
                            braceErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.UNMATCHED));
                        }
                    }
                } else {
                    // starting brace is not after or under the first line but on some other line, check that at least the start brace matches the end brace
                    if (openingBraceColumn !== closingBraceColumn) {
                        braceErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.UNMATCHED));
                    }
                }
            }

            bracePairs.push(new BracePair(astNode, bodyNode, matchedBraceStyles, braceErrors, braceScopeNode.bodyLocation));


            const clauses = braceScopeNode.clauses;

        }


    }

    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel.
     * @param {HTMLDivElement} uiPanel main panel where to add controls
     * @param {Map.<string,CodeFile>} codeFileDictionary
     * @param {Options} options
     */
    this.initialize = function (uiPanel, codeFileDictionary, options) {
        if (!options.enabled) {
            return;
        }
        $(uiPanel).append("<h3 style='color:#843a02'>Brace Style</h3>");

        for (const codeFile of codeFileDictionary.values()) {
            let bracePairs = [];
            for (const typeInformation of codeFile.types.values()) {
                for (const scope of typeInformation.scopes) {
                    const astNode = scope.astNode;
                    handleBraceNode(astNode, codeFile, bracePairs);
                }
            }
            if (codeFile.filename === "src/model/WebPage.java") {
                for (const bracePair of bracePairs) {
                    console.log(bracePair, bracePair.rootAstNode.location.start.line);
                    console.log(getNodeCode(codeFile, bracePair.braceAstNode));
                }
            }
        }

    }

}).apply(brace_style_module);