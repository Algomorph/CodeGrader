let brace_style_module = {};

(function () {

    class Options {
        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {boolean} markAllBraces whether to mark all braces in the code, regardless whether an error was detected for each case
         */
        constructor(enabled = false, markAllBraces = false) {
            this.enabled = enabled;
            this.markAllBraces = markAllBraces;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }


    /**
     * Represents location of a specific character in the code
     */
    class CharacterLocation {
        /**
         * Instantiate a character location descriptor
         * @param {Number} line (1-based) line number where the character occurs
         * @param {Number} column (0-based) visual column/indentation of the character
         * (treats tab characters & comments inside indentation before code specially,
         * see getIndentationWidth() in utilities)
         * @param {Number} offsetInLine (0-based) index of character in code line
         * @param {Number} offset (0-based) index of character in code
         */
        constructor(line, column, offsetInLine, offset) {
            this.line = line;
            this.column = column;
            this.offsetInLine = offsetInLine;
            this.offset = offset;
        }
    }

    /**
     * Represents location of a set of characters in the code
     */
    class CodeSegmentLocation {
        /**
         *
         * @param {CharacterLocation} start
         * @param {CharacterLocation} end
         */
        constructor(start, end) {
            this.start = start;
            this.end = end;
        }
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
        TYPE_BODY: "class/enum/interface body"
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
        [BraceStyleErrorType.WRONG_BRACE_INDENTATION, "brace not matching indent"],
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
         * @param {CodeSegmentLocation} bracedCodeLocation exacted location of the braced code (including braces themselves)
         * @param {Array.<string>} matchingStyles the list of styles the brace pair satisfies (see BraceStyle)
         * @param {Array.<BraceStyleError>} braceStyleErrors the detected brace style errors  (if any)
         * @param {string} locationType brace location type
         */
        constructor(rootAstNode, braceAstNode, bracedCodeLocation, matchingStyles, braceStyleErrors, locationType) {
            this.rootAstNode = rootAstNode;
            this.braceAstNode = braceAstNode;
            this.bracedCodeLocation = bracedCodeLocation;
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
         * @param {null|string} bodyProperty
         * @param {string} bodyLocation
         * @param {Array.<BraceScopeClauseProperty>} clauseProperties
         */
        constructor(bodyProperty, bodyLocation, clauseProperties,) {
            this.bodyProperty = bodyProperty;
            this.bodyLocation = bodyLocation;
            this.clauseProperties = clauseProperties;
        }
    }

    //TODO: make static private field of BraceScope when the class fields proposal is fully supported by all major browsers,
    // see https://github.com/tc39/proposal-class-fields
    /** @type {Map.<string, BraceScopeBehavior | null>}*/
    const BehaviorByNode = new Map([
        ["IfStatement", new BraceScopeBehavior("thenStatement", BracePairLocationType.IF_BODY,
            [new BraceScopeClauseProperty("elseStatement", null, BracePairLocationType.ELSE_CLAUSE, "else")])],
        ["SwitchStatement", new BraceScopeBehavior(null, BracePairLocationType.SWITCH_BODY, [])],
        ["ForStatement", new BraceScopeBehavior("body", BracePairLocationType.FOR_LOOP, [])],
        ["EnhancedForStatement", new BraceScopeBehavior("body", BracePairLocationType.ENHANCED_FOR_LOOP, [])],
        ["WhileStatement", new BraceScopeBehavior("body", BracePairLocationType.WHILE_LOOP, [])],
        ["DoStatement", new BraceScopeBehavior("body", BracePairLocationType.DO_WHILE_LOOP, [])],
        ["TryStatement", new BraceScopeBehavior("body", BracePairLocationType.TRY_BODY, [])],
        ["TypeDeclaration", new BraceScopeBehavior(null, BracePairLocationType.TYPE_BODY, [])],
        ["MethodDeclaration", new BraceScopeBehavior("body", BracePairLocationType.METHOD_BODY, [])]
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


    /**
     * For a given code segment, find the line that ends in a closing brace (and, potentially, whitespace).
     * Assumes the line exists in the code.
     * @param {Array.<string>} codeLines
     * @return {(number)[]}
     */
    function findLastLineWithClosingBrace(codeLines) {
        let iLineWithClosingBrace = codeLines.length - 1;
        let lineWithClosingBrace = trimRightWhitespaceAndComments(codeLines[iLineWithClosingBrace]);
        while (!lineWithClosingBrace.endsWith('}')) {
            iLineWithClosingBrace--;
            lineWithClosingBrace = trimRightWhitespaceAndComments(codeLines[iLineWithClosingBrace]);
        }
        return [lineWithClosingBrace, iLineWithClosingBrace];
    }

    /**
     * Finds the exact code segment location of braced body for a node involving braces that doesn't have its body
     * explicitly defined by the parser, e.g. a switch statement or a class body.
     * Also finds the location of the last non-whitespace character before the opening brace.
     * Note: this cannot be used on complex nodes that might include multiple clauses, such as if statements and
     * try statements.
     *
     * @param {{location : {start: {offset, line, column}, end : {offset, line, column}}}} rootBraceNode
     * @param {CodeFile} codeFile
     * @return {[CodeSegmentLocation, {offset: Number, line: Number}]}
     */
    function getNonNodeBody(rootBraceNode, codeFile) {
        const nodeCode = getNodeCode(rootBraceNode, codeFile, false);
        const openingMatches = nodeCode.match(/(^[^{]*)([a-z)>^{])(\s*)({)/m);
        const x = /[^bcd]art\s*\W.*a{3,7} /
        const y = "Hello"
        // codeBeforeBrace = <code before the last non-whitespace character before opening brace> +
        //                      <last non-whitespace character before opening brace> +
        //                      <any whitespace between last non-whitespace character and opening brace>
        const codeBeforeBrace = openingMatches[1] + openingMatches[2] + openingMatches[3];
        const codeBeforeBraceLines = codeBeforeBrace.split("\n");
        const openingBraceLineNumber = rootBraceNode.location.start.line + codeBeforeBraceLines.length - 1;
        const nodeCodeLines = nodeCode.split("\n");
        let [lastBodyLine, iFinalBodyCodeLine] = findLastLineWithClosingBrace(nodeCodeLines);
        const closingBraceOffsetInLine = lastBodyLine.trim().length - 1;
        const closingBraceLineNumber = openingBraceLineNumber + iFinalBodyCodeLine;
        const openingBraceColumn = getIndentationWidth(codeFile.codeLines[openingBraceLineNumber - 1]) + removeIndentation(codeBeforeBraceLines[codeBeforeBraceLines.length - 1]).length;
        let nonNodeBodyLocation = new CodeSegmentLocation(
            new CharacterLocation(
                openingBraceLineNumber,
                openingBraceColumn,
                codeBeforeBraceLines[codeBeforeBraceLines.length - 1].length,
                rootBraceNode.location.start.offset + openingMatches[1].length + 1 + openingMatches[3].length
            ),
            new CharacterLocation(
                closingBraceLineNumber,
                getIndentationWidth(lastBodyLine) + removeIndentation(lastBodyLine.trim()).length - 1,
                closingBraceOffsetInLine,
                codeFile.lineStartOffsets[closingBraceLineNumber - 1] + closingBraceOffsetInLine
            )
        );
        let lastNonSpaceBeforeBody = {
            offset: rootBraceNode.location.start.offset + openingMatches[1].length,
            line: rootBraceNode.location.start.line + openingMatches[1].split("\n").length - 1
        }
        return [nonNodeBodyLocation, lastNonSpaceBeforeBody];
    }

    /**
     * For a method/statement with a braced OR unbraced body, finds the
     * location of the previous non-whitespace character before the body
     * @param {{location : {start: {offset, line, column}, end : {offset, line, column}}}} astNode
     * @param {{location : {start: {offset, line, column}, end : {offset, line, column}}}} bodyNode
     * @param {CodeFile} codeFile
     */
    function findNonSpaceBeforeBody(astNode, bodyNode, codeFile) {
        const wholeStatementStart = astNode.location.start;
        const bodyNodeStart = bodyNode.location.start;
        const codeBeforeBodyWithFirstCharacter = codeFile.sourceCode.substring(wholeStatementStart.offset, bodyNodeStart.offset + 1);
        const firstBodyCharacter = codeBeforeBodyWithFirstCharacter.charAt(codeBeforeBodyWithFirstCharacter.length - 1)
        const regex = new RegExp("\\S(?=\\s*[" + firstBodyCharacter + "]$)", 'm');
        const lastNonSpaceIndex = codeBeforeBodyWithFirstCharacter.match(regex).index;
        const lineCountNonSpaceToFirstBodyCharacter = codeBeforeBodyWithFirstCharacter.substring(lastNonSpaceIndex + 1).split('\n').length - 1;

        return {
            offset: wholeStatementStart.offset + lastNonSpaceIndex,
            line: bodyNodeStart.line - lineCountNonSpaceToFirstBodyCharacter
        }

    }

    /**
     * Find the exact code segment location of a braced statement body or clause, such as an if statement,
     * for statement, etc., or just the code if the body is unbraced (applicable to if, while, for statement bodies
     * consisting of a single statement/expression).
     * @param {{location : {start: {offset, line, column}, end : {offset, line, column}}}} clauseOrBodyNode
     * @param {CodeFile} codeFile the code file where the clauseOrBodyNode came from
     * @return {CodeSegmentLocation} location of the entire body/clause cause, including braces if present
     */
    function getBodyOrClauseStartAndEnd(clauseOrBodyNode, codeFile) {
        const bodyStartLineNumber = clauseOrBodyNode.location.start.line;
        const bodyStartLine = codeFile.codeLines[bodyStartLineNumber - 1];
        if (codeFile.sourceCode.charAt(clauseOrBodyNode.location.start.offset) === '{') {
            // Here, we know that the clause/body code starts with an opening brace.
            // However, the body "end" location often includes the whitespace on the next line or several lines, until next code.
            // We want to get the line it ends on.
            const bodyCode = getNodeCode(clauseOrBodyNode, codeFile, false);
            const bodyCodeLines = bodyCode.split('\n');
            let [lastBodyLine, iFinalBodyCodeLine] = findLastLineWithClosingBrace(bodyCodeLines);
            const openingBraceColumn = getIndentationWidth(bodyStartLine) + removeIndentation(bodyStartLine).length - removeIndentation(bodyCodeLines[0]).length;
            return new CodeSegmentLocation(
                new CharacterLocation(
                    bodyStartLineNumber,
                    openingBraceColumn,
                    clauseOrBodyNode.location.start.column - 1,
                    clauseOrBodyNode.location.start.offset
                ),
                new CharacterLocation(
                    clauseOrBodyNode.location.start.line + iFinalBodyCodeLine,
                    getIndentationWidth(lastBodyLine) + removeIndentation(lastBodyLine.trim()).length - 1,
                    lastBodyLine.trim().length - 1,
                    codeFile.lineStartOffsets[clauseOrBodyNode.location.start.line + iFinalBodyCodeLine - 1] + lastBodyLine.length - 1
                )
            );
        } else {
            // No braces around body/clause, so just return first & last character locations.
            return new CodeSegmentLocation(
                new CharacterLocation(
                    bodyStartLineNumber,
                    getIndentationWidth(bodyStartLine),
                    clauseOrBodyNode.location.start.column - 1,
                    clauseOrBodyNode.location.start.offset
                ),
                new CharacterLocation(
                    clauseOrBodyNode.location.end.line,
                    clauseOrBodyNode.location.end.column,
                    clauseOrBodyNode.location.end.column - 1,
                    clauseOrBodyNode.location.end.offset
                )
            );
        }
    }

    /**
     *
     * @param {Object} rootNode
     * @param {Object} bodyOrClauseNode
     * @param {Number} statementStartColumn
     * @param {CodeSegmentLocation} bracedCodeLocation
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
                if (statementStartColumn === bracedCodeLocation.start.column || statementStartColumn === bracedCodeLocation.end.column) {
                    // starting brace and/or ending brace are on the next line from "if" and have no extra indent, assume Allman
                    matchedBraceStyles = [BraceStyle.ALLMAN];
                    if (statementStartColumn !== bracedCodeLocation.start.column) {
                        braceErrors.push(new BraceStyleError(BraceType.OPENING, BraceStyleErrorType.WRONG_BRACE_INDENTATION, bracedCodeLocation.start.line));
                    } else if (statementStartColumn !== bracedCodeLocation.end.column) {
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
        return new BracePair(rootNode, bodyOrClauseNode, bracedCodeLocation, matchedBraceStyles, braceErrors, bracePairLocationType);
    }

    /**
     * For a node involving braces, finds brace pairs in the body and simple clauses
     * and detects potential errors for each brace set.
     * Note that, if a clause is itself a node involving braces and some preliminary statement more complex than a simple
     * keyword, such as the "if(...){...}" part of an else-if clause, this node should be processed separately.
     *
     * @param {{node: string, location : {start: {offset, line, column}, end : {offset, line, column}}}} astNode
     * @param {CodeFile} codeFile
     * @param {Array.<BracePair>} bracePairs
     */
    function handleBraceNode(astNode, codeFile, bracePairs) {
        const braceScopeNode = new BraceScope(astNode);

        if (braceScopeNode.behaviorDefined) {
            let bodyNode = braceScopeNode.body;

            let locationBeforeBrace, bracedCodeStartAndEnd;

            if (bodyNode) {
                locationBeforeBrace = findNonSpaceBeforeBody(astNode, bodyNode, codeFile);
                bracedCodeStartAndEnd = getBodyOrClauseStartAndEnd(bodyNode, codeFile);
            } else {
                [bracedCodeStartAndEnd, locationBeforeBrace] = getNonNodeBody(astNode, codeFile);
                bodyNode = {location: bracedCodeStartAndEnd}
            }

            let statementStartCodeLine = codeFile.codeLines[astNode.location.start.line - 1];
            const statementStartVisualColumn = getIndentationWidth(statementStartCodeLine);

            let bracePair = getBracePair(astNode, bodyNode, statementStartVisualColumn, bracedCodeStartAndEnd,
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
                            const columnOfKeyword = getIndentationWidth(codeLineWhereKeywordIsExpected) + removeIndentation(segmentWhereKeywordIsExpected).indexOf(clause.keyword);
                            if (columnOfKeyword !== expectedColumnOfClauseKeyword) {
                                bracePair.braceStyleErrors.push(new BraceStyleError(BraceType.CLOSING, BraceStyleErrorType.WRONG_CLAUSE_INDENTATION, expectedLineOfClauseKeyword, clause));
                            }
                        }
                    }
                }

                const subBraceScopeNode = new BraceScope(clause.astNode);
                if (!subBraceScopeNode.behaviorDefined) {
                    // some kind of simple scope -- e.g. else or finally clause
                    bracePair = getBracePair(astNode, clause.astNode, statementStartVisualColumn, bracedCodeStartAndEnd,
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
        const inconsistentBraceStyleColor = "#0e616f";

        $(uiPanel).append("<h3 style='color:"+inconsistentBraceStyleColor+"'>Brace Style</h3>");

        for (const codeFile of codeFileDictionary.values()) {
            /** @type {Array.<BracePair>} */
            let bracePairs = [];

            for (const typeInformation of codeFile.types.values()) {
                for (const scope of typeInformation.scopes) {
                    const astNode = scope.astNode;
                    handleBraceNode(astNode, codeFile, bracePairs);
                }
            }

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
                        $(uiPanel).append(makeLabelWithClickToScroll(bracePair.braceLocationType, trCodeLine, "inconsistent-brace-style-problem", defaultMessageText));
                        addButtonComment(
                            trCodeLine,
                            "Inconsistent brace style",
                            defaultMessageText, inconsistentBraceStyleColor
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
                    $(uiPanel).append(makeLabelWithClickToScroll(bracePair.braceLocationType, trCodeLine, buttonClass, defaultMessageText));
                    addButtonComment(
                        trCodeLine,
                        adjective + " " + braceStyleError.shortDescription,
                        defaultMessageText, inconsistentBraceStyleColor
                    );

                }
                if (options.markAllBraces) {
                    addButtonComment(codeFile.trCodeLines[bracePair.bracedCodeLocation.start.line - 1], "{", "",
                        inconsistentBraceStyleColor);
                    addButtonComment(codeFile.trCodeLines[bracePair.bracedCodeLocation.end.line - 1], "}", "",
                        inconsistentBraceStyleColor);
                }
            }

        }

    }

}).apply(brace_style_module);