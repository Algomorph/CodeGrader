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
        UNKNOWN: "unknown",
        MISSING: "missing",
    }

    const IncorrectBraceInPair = {
        OPENING: "opening",
        CLOSING: "closing"
    }

    class BracePair {
        /**
         * Make a brace pair
         * @param {{location : {start : {offset : {Number}, line : {Number}, column : {Number}}, end :  {offset : {Number}, line : {Number}, column : {Number}}}}} astNode the AST node with location
         * @param {string} style the brace pair style (see BraceStyle)
         * @param {Array.<string>} incorrectBracesInPair braces (if any) that have a problem
         * @param {string} locationType brace location type
         */
        constructor(astNode, style, incorrectBracesInPair, locationType) {
            this.astNode = astNode;
            this.type = style;
            this.incorrectBracesInPair = incorrectBracesInPair;
            this.braceLocationType = locationType;
        }
    }

    /**
     * Clause property of an ast node (used to define brace node behavior)
     */
    class BraceScopeNodeClauseProperty {
        /**
         * Build clause property
         * @param {string | null} singleClauseName
         * @param {string | null} clauseArrayName
         */
        constructor(singleClauseName, clauseArrayName) {
            this.singleClauseName = singleClauseName;
            this.clauseArrayName = clauseArrayName;
        }
    }


    class BraceScopeNodeBehavior {
        /**
         * Define a scope node behavior
         * @param {string} bodyProperty
         * @param {Array.<BraceScopeNodeClauseProperty>} clauseProperties
         */
        constructor(bodyProperty, clauseProperties) {
            this.bodyProperty = bodyProperty;
            this.clauseProperties = clauseProperties;
        }
    }

    //TODO: make static private field of BraceScopeNode when the class fields proposal is fully supported by all major browsers,
    // see https://github.com/tc39/proposal-class-fields
    /** @type {Map.<string, BraceScopeNodeBehavior | null>}*/
    const BehaviorByNode = new Map([
        ["IfStatement", new BraceScopeNodeBehavior("thenStatement",
            [new BraceScopeNodeClauseProperty("elseStatement", null)])],
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
    class BraceScopeNode {
        constructor(astNode) {
            this.astNode = astNode;
            /** @type {null | BraceScopeNodeBehavior} */
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

        get clauses() {
            let clauses = [];
            for (const clauseProperty of this.behavior.clauseProperties) {
                if (clauseProperty.singleClauseName != null && this.astNode.hasOwnProperty(clauseProperty.singleClauseName)) {
                    clauses.push(this.astNode[clauseProperty.singleClauseName]);
                }
                if (clauseProperty.clauseArrayName != null && this.astNode.hasOwnProperty(clauseProperty.clauseArrayName)) {
                    clauses.push(...this.astNode[clauseProperty.clauseArrayName]);
                }
            }
        }
    }

    function handleBraceNode(astNode, codeFile, bracePairs) {
        let locationType = null;




        locationType = BracePairLocationType.IF_BODY;
        // Check then statement
        if (codeFile.sourceCode.charAt(astNode.thenStatement.location.start.offset) !== '{') {
            bracePairs.push(new BracePair(astNode.thenStatement, BraceStyle.MISSING,
                [IncorrectBraceInPair.OPENING, IncorrectBraceInPair.CLOSING],
                locationType));
        } else {
            if (astNode.location.start.line === astNode.thenStatement.location.start.line) {
                // starting brace is on the same line with "if", assume 1TBS
                let problematicBraces = [];
                if (astNode.location.start.column !== astNode.thenStatement.location.end.column - 1) {
                    problematicBraces.push(IncorrectBraceInPair.CLOSING);
                }
                bracePairs.push(new BracePair(astNode.thenStatement, BraceStyle.ONE_TBS, problematicBraces, locationType))
            } else if (astNode.location.start.line === astNode.thenStatement.location.start.line - 1) {
                // starting brace is on the next line from "if", assume Allman
                let problematicBraces = [];
                if (astNode.thenStatement.location.start.column !== astNode.thenStatement.location.end.column) {
                    problematicBraces.push(IncorrectBraceInPair.CLOSING);
                }
                bracePairs.push(new BracePair(astNode.thenStatement, BraceStyle.ONE_TBS, problematicBraces, locationType))
            } else {
                // starting brace is of unknown style, check that at least it matches the end brace
                let problematicBraces = [];

            }

        }
        // Check else statement
        if (astNode.hasOwnProperty("elseStatement") && astNode.elseStatement != null) {

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

        let bracePairs = [];

        for (const codeFile of codeFileDictionary.values()) {
            for (const typeInformation of codeFile.types.values()) {
                for (const scope of typeInformation.scopes) {
                    const astNode = scope.astNode;
                    handleBraceNode(astNode, codeFile, bracePairs)
                }
            }
        }
    }

}).apply(brace_style_module);