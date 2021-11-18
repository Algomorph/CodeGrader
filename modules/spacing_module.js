/*
* Copyright 2020 Gregory Kramida
* */

let spacing_module = {};

(function () {

    class Options {
        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {boolean} checkSpacingAroundBinaryOperators
         * @param {boolean} checkSpacingAroundAssignmentOperators
         */
        constructor(enabled = false, checkSpacingAroundBinaryOperators = true, checkSpacingAroundAssignmentOperators = true) {
            this.enabled = enabled;
            this.checkSpacingAroundBinaryOperators = checkSpacingAroundBinaryOperators;
            this.checkSpacingAroundAssignmentOperators = checkSpacingAroundAssignmentOperators;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    const moduleColor = "#41a854";

    const SpacingIssueLocality = {
        BEFORE_OPERATOR: 0b01,
        AFTER_OPERATOR: 0b10,
        BEFORE_AND_AFTER_OPERATOR: 0b11
    }

    const MessageEndBySpacingIssueLocality = new Map([
        [SpacingIssueLocality.BEFORE_OPERATOR, "' needs a single space before it."],
        [SpacingIssueLocality.AFTER_OPERATOR, "' needs a single space after it."],
        [SpacingIssueLocality.BEFORE_AND_AFTER_OPERATOR, "' needs a single space before and after it."]
    ])


    class SpacingIssue extends CodeEntity {
        #defaultMessageAndTooltip
        #tagName
        #operator

        /**
         *
         * @param {HTMLTableRowElement} trCodeLine
         * @param {number} locality
         * @param {string} operator
         */
        constructor(trCodeLine, locality, operator) {
            super(trCodeLine);
            this.#defaultMessageAndTooltip = "Operator '" + operator + MessageEndBySpacingIssueLocality.get(locality);
            this.#tagName = "Spacing around '" + operator + "'";
            this.#operator = operator;
        }

        get isIssue() {
            return true;
        }

        get points() {
            return -1;
        }

        get _labelStyleClass() {
            return "";
        }

        get _tagColor() {
            return "";
        }

        get _labelName(){
            return this.#operator;
        }

        get _tagName(){
            return this.#tagName;
        }

        get _defaultMessageText(){
            return this.#defaultMessageAndTooltip;
        }

        get _toolTip(){
            return this.#defaultMessageAndTooltip;
        }
    }

    let initialized = false;

    /**
     * Initialize the module using global options
     * @param {{moduleOptions : {spacing_module: Options}}} global_options
     */
    this.initialize = function (global_options) {
        this.options = global_options.moduleOptions.spacing_module;

        if (!this.options.enabled) {
            return;
        }
        /** @type {Array.<CodeEntity>} */
        this.spacingIssues = [];

        initialized = true;
    }

    /**
     * Perform code analysis
     * @param {Map.<string, CodeFile>} fileDictionary
     */
    this.processCode = function (fileDictionary) {
        if (!this.options.enabled) {
            return;
        }
        for (const codeFile of fileDictionary.values()) {
            for (const typeInformation of codeFile.types.values()) {
                let expressionsToIterateOver = [];
                if (this.options.checkSpacingAroundBinaryOperators) {
                    expressionsToIterateOver.push(...typeInformation.binaryExpressions);
                }
                if (this.options.checkSpacingAroundAssignmentOperators) {
                    expressionsToIterateOver.push(...typeInformation.assignments);
                }
                for (const expression of expressionsToIterateOver) {
                    let leftHandSide;
                    let rightHandSide;
                    let operator;
                    switch (expression.node) {
                        case "InstanceofExpression":
                            leftHandSide = expression.leftOperand;
                            rightHandSide = expression.rightOperand;
                            operator = "instanceof";
                            break;
                        case "InfixExpression":
                            leftHandSide = expression.leftOperand;
                            rightHandSide = expression.rightOperand;
                            operator = expression.operator;
                            break;
                        case "Assignment":
                            leftHandSide = expression.leftHandSide;
                            rightHandSide = expression.rightHandSide;
                            operator = expression.operator;
                            break;
                        case "VariableDeclarationFragment":
                            leftHandSide = expression.name;
                            rightHandSide = expression.initializer;
                            operator = "=";
                            break;
                    }

                    const textBetweenOperandsStart = code_analysis.getOperandEnd(leftHandSide);
                    //TODO: from code design perspective, these corrections should also be inside the getOperandEnd/getOperandStart functions, not here
                    const startCodeLine = codeFile.codeLines[textBetweenOperandsStart.line - 1];
                    let startCodeLineBeforeOperator = startCodeLine.substring(0, textBetweenOperandsStart.column - 1);
                    if (startCodeLineBeforeOperator.endsWith(" ")) {
                        const extraSpaces = startCodeLineBeforeOperator.match(/\s+$/)[0];
                        textBetweenOperandsStart.column -= extraSpaces.length;
                        textBetweenOperandsStart.offset -= extraSpaces.length;
                        startCodeLineBeforeOperator = startCodeLine.substring(0, textBetweenOperandsStart.column - 1);
                    }
                    const textBetweenOperandsEnd = code_analysis.getOperandStart(rightHandSide);
                    //TODO: from code design perspective, these corrections should also be inside the getOperandEnd/getOperandStart functions, not here
                    const endCodeLine = codeFile.codeLines[textBetweenOperandsEnd.line - 1];
                    let endCodeLineAfterOperator = endCodeLine.substring(textBetweenOperandsEnd.column - 1);

                    if (endCodeLineAfterOperator.startsWith(" ")) {
                        const extraSpaces = endCodeLineAfterOperator.match(/^\s+/)[0];
                        textBetweenOperandsEnd.column += extraSpaces.length;
                        textBetweenOperandsEnd.offset += extraSpaces.length;
                        endCodeLineAfterOperator = endCodeLine.substring(textBetweenOperandsEnd.column - 1);
                    }
                    //TODO: from code design perspective, these corrections should also be inside the getOperandEnd/getOperandStart functions, not here
                    let textBetweenOperands = codeFile.sourceCode.substring(textBetweenOperandsStart.offset, textBetweenOperandsEnd.offset);
                    const keywordMatchEnd = textBetweenOperands.match(/.*(new\s*|super\s*)$/);
                    if (keywordMatchEnd) {
                        textBetweenOperands = textBetweenOperands.replace(keywordMatchEnd[1], "");
                        textBetweenOperandsEnd.column -= keywordMatchEnd[1].length;
                        textBetweenOperandsEnd.offset -= keywordMatchEnd[1].length;
                        endCodeLineAfterOperator = endCodeLine.substring(textBetweenOperandsEnd.column - 1);
                    }
                    const keywordMatchStart = textBetweenOperands.match(/^(\s*(?:\[\])+).*/);
                    if (keywordMatchStart) {
                        textBetweenOperands = textBetweenOperands.replace(keywordMatchStart[1], "");
                        textBetweenOperandsStart.column += keywordMatchStart[1].length;
                        textBetweenOperandsStart.offset += keywordMatchStart[1].length;
                        startCodeLineBeforeOperator = startCodeLine.substring(0, textBetweenOperandsStart.column - 1);
                    }

                    const operatorRegexPart = operator.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
                    let checkSpacesBefore = true;
                    let checkSpacesAfter = true;

                    // ]not guaranteed to work on broken lines w/ end of left expression on a line above the operator
                    if (startCodeLineBeforeOperator.match(/^\s*$/)) {
                        // line break in expression before operator => only blank space before the operator
                        checkSpacesBefore = false;
                    }

                    // ]not guaranteed to work on broken lines w/ start of right expression on a line below the operator
                    if (endCodeLineAfterOperator.match(/^\s*$/)) {
                        // line break in expression after operator => only blank space after the operator
                        checkSpacesAfter = false;
                    }

                    if (textBetweenOperandsStart.line !== textBetweenOperandsEnd.line) {
                        // line break in expression (not guaranteed to work on all multi-line expressions,
                        // the above two checks are also necessary)
                        const startingWithOperatorPattern = new RegExp("^\\s*" + operatorRegexPart + ".*");
                        const endingWithOperatorPattern = new RegExp(".*" + operatorRegexPart + "\\s*$");
                        if (endCodeLine.match(startingWithOperatorPattern)) {
                            checkSpacesBefore = false;
                        } else if (startCodeLine.match(endingWithOperatorPattern)) {
                            checkSpacesAfter = false;
                        } else {
                            checkSpacesBefore = checkSpacesAfter = false;
                        }
                    }

                    const whitespace = textBetweenOperands.split(operator);
                    const whitespaceBefore = whitespace[0];
                    const whitespaceAfter = whitespace[1];
                    let localityBitMask = 0b00;
                    let trCodeLine;
                    if(checkSpacesBefore && whitespaceBefore !== " "){
                        localityBitMask |= SpacingIssueLocality.BEFORE_OPERATOR;
                        trCodeLine = codeFile.trCodeLines[textBetweenOperandsStart.line - 1];
                    }
                    if(checkSpacesAfter && whitespaceAfter !== " "){
                        localityBitMask |= SpacingIssueLocality.AFTER_OPERATOR;
                        trCodeLine = codeFile.trCodeLines[textBetweenOperandsEnd.line - 1];
                    }
                    if(localityBitMask > 0){
                        this.spacingIssues.push(new SpacingIssue(trCodeLine, localityBitMask, operator));
                    }
                }
            }
        }
    }

    /**
     * Add all information collected so far by the module to the provided UI panel.
     * @param {HTMLDivElement} uiPanel
     */
    this.addInfoToUiPanel = function (uiPanel) {
        if (!this.options.enabled) {
            return;
        }
        $(uiPanel).append("<h3 style='color:" + moduleColor + "'>Spacing</h3>");
        for (const spacingIssue of this.spacingIssues) {
            spacingIssue.addAsLabelToPanel(uiPanel);
            spacingIssue.addAsCodeTagWithDefaultComment();
        }
    }

    /**
     * Return all CodeEntities thus far extracted from the code.
     * @returns {Array.<CodeEntity>}
     */
    this.getCodeEntities = function () {
        if (!this.options.enabled) {
            return [];
        }
        if (!initialized) {
            throw ("Module not initialized. Please call the initialize function first.");
        }
        return [...this.spacingIssues];
    }


}).apply(spacing_module);