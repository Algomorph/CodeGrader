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
        ELSE_CLAUSE: "else clause",
        SWITCH_BODY: "switch statement body",
        FOR_LOOP: "for loop body",
        ENHANCED_FOR_LOOP: "enhanced for loop body",
        WHILE_LOOP: "while loop body",
        DO_WHILE_LOOP: "do while loop body",
        TRY_BODY: "try statement body",
        CATCH_CLAUSE: "catch clause",
        FINALLY_CLAUSE: "finally clause",
        METHOD_BODY: "method body",
        CLASS_BODY: "class body"
    }

    const BraceStyle = {
        ALLMAN: "Allman",
        ONE_TBS: "1TBS",
        UNKNOWN: "unknown"
    }

    const BraceType = {
        OPENING: "opening",
        CLOSING: "closing",
        BOTH: "both"
    }

    const BraceStyleErrorType = {
        BRACES_MISSING: 1,
        WRONG_BRACE_INDENTATION: 2,
        WRONG_BRACE_LINE: 3,
        WRONG_CLAUSE_INDENTATION: 4,
        WRONG_CLAUSE_LINE: 5,
    }

    const BraceStyleErrorTypeShortDescription = new Map([
        [BraceStyleErrorType.BRACES_MISSING, "braces missing"],
        [BraceStyleErrorType.WRONG_BRACE_INDENTATION, "Unmatched brace"],
        [BraceStyleErrorType.WRONG_BRACE_LINE, "brace on wrong line"],
        [BraceStyleErrorType.WRONG_CLAUSE_INDENTATION, "clause not aligned"],
        [BraceStyleErrorType.WRONG_CLAUSE_LINE, "clause on wrong line"]
    ]);

    const BraceStyleErrorTypeDescription = new Map([
        [BraceStyleErrorType.BRACES_MISSING, "braces are missing around statement"],
        [BraceStyleErrorType.WRONG_BRACE_INDENTATION, "brace has wrong indentation"],
        [BraceStyleErrorType.WRONG_BRACE_LINE, "brace is on the wrong line"],
        [BraceStyleErrorType.WRONG_CLAUSE_INDENTATION, "clause has wrong indentation relative to the closing brace"],
        [BraceStyleErrorType.WRONG_CLAUSE_LINE, "clause is on the wrong line relative to the closing brace"]
    ]);

    const BraceButtonClassByErrorType = new Map([
        [BraceStyleErrorType.BRACES_MISSING, "missing-brace-style-problem"],
        [BraceStyleErrorType.WRONG_BRACE_INDENTATION, "indentation-brace-style-problem"],
        [BraceStyleErrorType.WRONG_BRACE_LINE, "line-brace-style-problem"],
        [BraceStyleErrorType.WRONG_CLAUSE_INDENTATION, "indentation-brace-style-problem"],
        [BraceStyleErrorType.WRONG_CLAUSE_LINE, "line-brace-style-problem"]
    ]);

    class BraceStyleError {
        /**
         * Generate a brace style error
         * @param {string} braceType opening/closing (see BraceType)
         * @param {string} errorType error type (see BraceStyleErrorType)
         * @param {number} line the line of code where the problematic brace is (or should be, if missing)
         * @param {null|BraceScopeClause} clause
         */
        constructor(braceType, errorType, line, clause = null) {
            this.braceType = braceType;
            this.errorType = errorType;
            this.line = line;
            this.clause = clause;
        }

        get description() {
            return BraceStyleErrorTypeDescription.get(this.errorType);
        }

        get shortDescription() {
            return BraceStyleErrorTypeShortDescription.get(this.errorType);
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
         * @param {Array.<BraceStyleError>} braceStyleErrors the detected brace style errors  (if any)
         * @param {string} locationType brace location type
         */
        constructor(rootAstNode, braceAstNode, matchingStyles, braceStyleErrors, locationType) {
            this.rootAstNode = rootAstNode;
            this.braceAstNode = braceAstNode;
            this.braceStyles = matchingStyles;
            this.braceStyleErrors = braceStyleErrors;
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
         * @param {string} clauseKeyword -e.g. "else", "then"
         */
        constructor(singleClauseName, clauseArrayName, clauseLocation, clauseKeyword) {
            this.singleClauseName = singleClauseName;
            this.clauseArrayName = clauseArrayName;
            this.clauseLocation = clauseLocation;
            this.clauseKeyword = clauseKeyword;
        }
    }

    class BraceScopeClause {
        /**
         *
         * @param {{node: string, location: {start : {offset, line, column}, end: {offset, line, column}}}} astNode
         * @param {string} location
         * @param {string} keyword of the clause, i.e. "else", "catch", "finally", etc.
         */
        constructor(astNode, location, keyword) {
            this.astNode = astNode;
            this.location = location;
            this.keyword = keyword;
        }
    }


    class BraceScopeBehavior {
        /**
         * Define a scope node behavior
         * @param {string|null} expressionProperty
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
            [new BraceScopeClauseProperty("elseStatement", null, BracePairLocationType.ELSE_CLAUSE, "else")])],
        //FIXME
        ["SwitchStatement", null],
        ["ForStatement", new BraceScopeBehavior(null, "body", BracePairLocationType.FOR_LOOP,[])],
        ["EnhancedForStatement", new BraceScopeBehavior(null, "body", BracePairLocationType.ENHANCED_FOR_LOOP,[])],
        ["WhileStatement", new BraceScopeBehavior(null, "body", BracePairLocationType.ENHANCED_FOR_LOOP,[])],
        ["DoStatement", new BraceScopeBehavior(null, "body", BracePairLocationType.DO_WHILE_LOOP,[])],
        ["TryStatement", null],
        ["ClassDeclaration", null],
        ["MethodDeclaration", new BraceScopeBehavior(null, "body", BracePairLocationType.METHOD_BODY,[])]
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

        /**
         * @return {Array.<BraceScopeClause>}
         */
        get clauses() {
            let clauses = [];
            for (const clauseProperty of this.behavior.clauseProperties) {
                if (clauseProperty.singleClauseName != null && this.astNode.hasOwnProperty(clauseProperty.singleClauseName) && this.astNode[clauseProperty.singleClauseName] != null) {
                    clauses.push(new BraceScopeClause(this.astNode[clauseProperty.singleClauseName], clauseProperty.clauseLocation, clauseProperty.clauseKeyword));
                }
                if (clauseProperty.clauseArrayName != null && this.astNode.hasOwnProperty(clauseProperty.clauseArrayName) && this.astNode[clauseProperty.clauseArrayName] != null) {
                    for (const clauseNode of this.astNode[clauseProperty.clauseArrayName]) {
                        clauses.push(new BraceScopeClause(clauseNode, clauseProperty.clauseLocation, clauseProperty.clauseKeyword));
                    }
                }
            }
            return clauses;
        }
    }

    function getBodyOrClauseStartAndEnd(clauseOrBodyNode, codeFile) {
        const startLine = clauseOrBodyNode.location.start.line;
        const startCodeLine = codeFile.codeLines[startLine - 1];
        if (codeFile.sourceCode.charAt(clauseOrBodyNode.location.start.offset) === '{') {
            // Here, we know that the clause/body code starts with an opening brace.
            // However, the body "end" location often includes the whitespace on the next line or several lines, until next code.
            // We want to get the line it ends on.
            let bodyCode = getNodeCode(codeFile, clauseOrBodyNode, false);
            let bodyCodeLines = bodyCode.split("\n");
            let iFinalBodyCodeLine = bodyCodeLines.length - 1;
            let lastBodyLine = bodyCodeLines[iFinalBodyCodeLine];
            while (!lastBodyLine.endsWith('}')) {
                iFinalBodyCodeLine--;
                lastBodyLine = bodyCodeLines[iFinalBodyCodeLine];
            }
            return {
                start: {
                    line: startLine,
                    column: getIndentationWidth(startCodeLine) + removeIndentation(startCodeLine).width - removeIndentation(bodyCodeLines[0]).width,
                    offsetInLine: clauseOrBodyNode.location.start.column - 1
                },
                end: {
                    line: clauseOrBodyNode.location.start.line + iFinalBodyCodeLine,
                    column: getIndentationWidth(lastBodyLine),
                    offsetInLine: lastBodyLine.length - 1
                }
            };
        } else {
            return {
                start: {
                    line: startLine,
                    column: getIndentationWidth(startCodeLine),
                    offsetInLine: clauseOrBodyNode.location.start.column - 1
                },
                end: {
                    line: clauseOrBodyNode.location.end.line,
                    column: clauseOrBodyNode.location.end.column,
                    offsetInLine: clauseOrBodyNode.location.end.column - 1
                }
            };
        }
    }

    /**
     *
     * @param {Object} rootNode
     * @param {Object} bodyOrClauseNode
     * @param {Number} statementStartColumn
     * @param {{start: {line: Number, column: Number}, end: {line: Number, column: Number}}} bracedCodeLocation
     * @param {{line: Number, column: Number}} locationBeforeBrace
     * @param {string} bracePairLocationType
     * @param {CodeFile} codeFile
     * @return {BracePair}
     */
    function getBracePair(rootNode, bodyOrClauseNode, statementStartColumn,
                          bracedCodeLocation,
                          locationBeforeBrace, bracePairLocationType, codeFile) {
        let matchedBraceStyles = [BraceStyle.UNKNOWN];
        let braceErrors = [];
        if (codeFile.sourceCode.charAt(bodyOrClauseNode.location.start.offset) !== '{') {
            braceErrors.push(new BraceStyleError(BraceType.BOTH, BraceStyleErrorType.BRACES_MISSING, bodyOrClauseNode.location.start.line));
        } else {
            if (locationBeforeBrace.line === bodyOrClauseNode.location.start.line) {
                // starting brace is on the same line with "if", assume 1TBS
                matchedBraceStyles = [BraceStyle.ONE_TBS];
                if (statementStartColumn !== bracedCodeLocation.end.column) {
                    braceErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.WRONG_BRACE_INDENTATION, bracedCodeLocation.end.line));
                }
            } else if (locationBeforeBrace.line === bodyOrClauseNode.location.start.line - 1) {
                if (statementStartColumn === bracedCodeLocation.start.column || bracedCodeLocation.start.column === bracedCodeLocation.end.column) {
                    // starting brace and/or ending brace are on the next line from "if" and have no extra indent, assume Allman
                    matchedBraceStyles = [BraceStyle.ALLMAN];
                    if (statementStartColumn !== bracedCodeLocation.start.column) {
                        braceErrors.push(new BraceStyleError(BraceType.OPENING, BraceStyleErrorType.WRONG_BRACE_INDENTATION, bracedCodeLocation.start.line));
                    } else if (bracedCodeLocation.start.column !== bracedCodeLocation.end.column) {
                        braceErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.WRONG_BRACE_INDENTATION, bracedCodeLocation.end.line));
                    }
                } else {
                    // don't assume any style, but check that the braces are matching
                    if (bracedCodeLocation.start.column !== bracedCodeLocation.end.column) {
                        braceErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.WRONG_BRACE_INDENTATION, bracedCodeLocation.end.line));
                    }
                }
            } else {
                braceErrors.push(new BraceStyleError(BraceType.OPENING, BraceStyleErrorType.WRONG_BRACE_LINE, bracedCodeLocation.start.line));
                // starting brace is not after or under the first line but on some other line, check that at least the start brace matches the end brace
                if (bracedCodeLocation.start.column !== bracedCodeLocation.end.column) {
                    braceErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.WRONG_BRACE_INDENTATION, bracedCodeLocation.end.line));
                }
            }
        }
        return new BracePair(rootNode, bodyOrClauseNode, matchedBraceStyles, braceErrors, bracePairLocationType);
    }

    function handleBraceNode(astNode, codeFile, bracePairs) {
        if (BehaviorByNode.has(astNode.node) && BehaviorByNode.get(astNode.node) == null) {
                //TODO: debug other nodes

        }

        const braceScopeNode = new BraceScope(astNode);

        if (braceScopeNode.behaviorDefined) {
            const bodyNode = braceScopeNode.body;
            const expressionNode = braceScopeNode.expression;
            let locationBeforeBrace = expressionNode == null ? astNode.location.start : expressionNode.location.end;

            let codeLineBeforeBrace = codeFile.codeLines[astNode.location.start.line - 1];
            const statementStartColumn = getIndentationWidth(codeLineBeforeBrace);

            let bracedCodeStartAndEnd = getBodyOrClauseStartAndEnd(bodyNode, codeFile);
            let bracePair = getBracePair(astNode, bodyNode, statementStartColumn, bracedCodeStartAndEnd,
                locationBeforeBrace, braceScopeNode.bodyLocation, codeFile);
            bracePairs.push(bracePair);

            const clauses = braceScopeNode.clauses;
            let previousClauseOrBody = bodyNode;


            for (const clause of clauses) {
                locationBeforeBrace = previousClauseOrBody.location.end;
                let previousClosingBraceLocation = bracedCodeStartAndEnd.end;
                bracedCodeStartAndEnd = getBodyOrClauseStartAndEnd(clause.astNode, codeFile);
                let expectedLineOfClauseKeyword = -1;
                let expectedColumnOfClauseKeyword = null;
                if (bracePair.braceStyles.includes(BraceStyle.ONE_TBS)) {
                    expectedLineOfClauseKeyword = previousClosingBraceLocation.line;
                } else if (bracePair.braceStyles.includes(BraceStyle.ALLMAN)) {
                    expectedLineOfClauseKeyword = previousClosingBraceLocation.line + 1;
                    expectedColumnOfClauseKeyword = previousClosingBraceLocation.column;
                }
                if (expectedLineOfClauseKeyword !== -1) {
                    const codeLineWhereKeywordIsExpected = codeFile.codeLines[expectedLineOfClauseKeyword - 1];
                    let startFrom = 0;
                    let endAt = codeLineWhereKeywordIsExpected.length;
                    if (previousClosingBraceLocation.line === expectedLineOfClauseKeyword) {
                        // if closing brace is on the same line as the one where we expect the keyword,
                        // exclude closing brace and everything that precedes it.
                        startFrom = previousClosingBraceLocation.offsetInLine;
                    }
                    if (bracedCodeStartAndEnd.start.line === expectedLineOfClauseKeyword) {
                        // if opening brace is on the same line as the one where we expect the keyword,
                        // exclude opening brace and everything that follows it.
                        endAt = bracedCodeStartAndEnd.start.offsetInLine;
                    }
                    const segmentWhereKeywordIsExpected = codeLineWhereKeywordIsExpected.substring(startFrom, endAt);
                    if (!segmentWhereKeywordIsExpected.includes(clause.keyword)) {
                        bracePair.braceStyleErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.WRONG_CLAUSE_LINE, expectedLineOfClauseKeyword, clause));
                    } else {
                        if (expectedColumnOfClauseKeyword != null) {
                            const columnOfKeyword = getIndentationWidth(codeLineWhereKeywordIsExpected) + segmentWhereKeywordIsExpected.indexOf(clause.keyword);
                            if (columnOfKeyword !== expectedColumnOfClauseKeyword) {
                                bracePair.braceStyleErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.WRONG_CLAUSE_LINE, expectedLineOfClauseKeyword, clause));
                            }
                        }
                    }
                }

                const subBraceScopeNode = new BraceScope(clause.astNode);
                if (!subBraceScopeNode.behaviorDefined) {
                    // some kind of simple scope -- e.g. else or finally clause
                    bracePair = getBracePair(astNode, clause.astNode, statementStartColumn, bracedCodeStartAndEnd,
                        locationBeforeBrace, clause.location, codeFile);
                    bracePairs.push(bracePair);

                }
                previousClauseOrBody = clause;
            }

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
            /** @type {Array.<BracePair>} */
            let bracePairs = [];

            //__DEBUG
            console.log(codeFile.filename);

            for (const typeInformation of codeFile.types.values()) {
                for (const scope of typeInformation.scopes) {
                    const astNode = scope.astNode;

                    //__DEBUG
                    // if(astNode.node === "IfStatement" && astNode.location.start.offset === 2696){
                    //     console.log("HELLO")
                    // }
                    handleBraceNode(astNode, codeFile, bracePairs);
                }
            }
            if (codeFile.filename === "src/model/WebPage.java") {
                // try to obtain dominating brace style

                let braceStyleCounts = new Map();
                braceStyleCounts.set(BraceStyle.ALLMAN, 0);
                braceStyleCounts.set(BraceStyle.ONE_TBS, 0);
                braceStyleCounts.set(BraceStyle.UNKNOWN, 0);
                for (const bracePair of bracePairs) {
                    let braceStyle = bracePair.braceStyles[0];
                    braceStyleCounts.set(braceStyle, braceStyleCounts.get(braceStyle) + 1);
                }
                let dominantBraceStyle = BraceStyle.UNKNOWN;
                let dominantBraceStyleCount = 0;
                for (const [braceStyle, count] of braceStyleCounts.entries()) {
                    if (dominantBraceStyleCount < count) {
                        dominantBraceStyle = braceStyle;
                        dominantBraceStyleCount = count;
                    }
                }

                for (const bracePair of bracePairs) {
                    let bracesMissing = bracePair.braceStyleErrors.filter(error => error.errorType === BraceStyleErrorType.BRACES_MISSING).length > 0;
                    if (!bracesMissing && dominantBraceStyle !== BraceStyle.UNKNOWN) {
                        if (!bracePair.braceStyles.includes(dominantBraceStyle)) {
                            let defaultMessageText = null;
                            if (bracePair.braceStyles[0] !== BraceStyle.UNKNOWN) {
                                defaultMessageText = "Brace pair seems to use the " + bracePair.braceStyles[0] + " brace style, while the dominant brace style is " + dominantBraceStyle;
                            } else {
                                defaultMessageText = "Brace pair doesn't follow any of the allowed styles.";
                            }
                            let trCodeLine = codeFile.trCodeLines[bracePair.braceAstNode.location.start.line - 1];
                            let color = "#0c5460";
                            $(uiPanel).append(makeLabelWithClickToScroll(bracePair.braceLocationType, trCodeLine, "inconsistent-brace-style-problem", defaultMessageText));
                            addButtonComment(
                                trCodeLine,
                                "Inconsistent brace style",
                                defaultMessageText, color
                            );
                        }
                    }

                    for (const braceStyleError of bracePair.braceStyleErrors) {
                        let defaultMessageText = null;
                        let adjective = "";
                        if (braceStyleError.clause == null) {
                            adjective = capitalize(braceStyleError.braceType);
                            defaultMessageText = adjective + " " + braceStyleError.description + "(" + bracePair.braceLocationType + ").";
                        } else {
                            adjective = capitalize(braceStyleError.clause.keyword);
                            defaultMessageText = adjective + " " + braceStyleError.description + ".";
                        }

                        let buttonClass = BraceButtonClassByErrorType.get(braceStyleError.errorType);
                        let trCodeLine = codeFile.trCodeLines[braceStyleError.line - 1];
                        let color = "#0c5460";
                        $(uiPanel).append(makeLabelWithClickToScroll(bracePair.braceLocationType, trCodeLine, buttonClass, defaultMessageText));
                        addButtonComment(
                            trCodeLine,
                            adjective + " " + braceStyleError.shortDescription,
                            defaultMessageText, color
                        );

                    }
                }
            }
        }

    }

}).apply(brace_style_module);