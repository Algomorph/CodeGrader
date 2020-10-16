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
        FOR_LOOP: "for loop body",
        ENHANCED_FOR_LOOP: "enhanced for loop body",
        WHILE_STATEMENT: "while loop body"
        //TODO: finish
    }

    const BracePairType = {
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
         * @param {string} type the brace pair type (see BracePairType)
         * @param {Array.<string>} incorrectBracesInPair braces (if any) that have a problem
         */
        constructor(astNode, type, incorrectBracesInPair) {
            this.astNode = astNode;
            this.type = type;
            this.incorrectBracesInPair = incorrectBracesInPair;
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

        let bracePairsAllman = [];
        let bracePairs1TBS = [];
        let bracePairsUnknown = [];
        let bracePairsMissing = [];

        for (const codeFile of codeFileDictionary.values()) {
            for (const typeInformation of codeFile.types.values()) {
                for (const scope of typeInformation.scopes) {
                    const astNode = scope.astNode;
                    switch (astNode.node) {
                        case "IfStatement":
                            // console.log(astNode);
                            // logNodeCode(codeFile, astNode);

                            // Check then statement
                            if (codeFile.sourceCode.charAt(astNode.thenStatement.location.start.offset) !== '{') {
                                bracePairsMissing.push(new BracePair(astNode.thenStatement, BracePairType.MISSING,
                                    [IncorrectBraceInPair.OPENING, IncorrectBraceInPair.CLOSING]));
                            } else {
                                if (astNode.location.start.line === astNode.thenStatement.location.start.line) {
                                    // starting brace is on the same line with "if", assume 1TBS
                                    if (astNode.location.start.column !== astNode.thenStatement.location.end.column - 1) {
                                        bracePairsAllman.
                                    }
                                }
                            }


                            const ifExpressionAndThenStatement = codeFile.sourceCode.substring(astNode.location.start.offset, astNode.thenStatement.location.end.offset);


                            break;
                        case "ForLoop":
                        case "EnhancedForStatement":
                        case "WhileStatement":
                        case "DoStatement":
                            break;
                        case "SwitchStatement":
                            break;
                        case "TryStatement":
                            break;
                    }
                }
            }
        }
    }

}).apply(brace_style_module);