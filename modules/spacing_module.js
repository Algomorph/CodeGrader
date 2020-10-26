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

    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel.
     * @param {HTMLDivElement} uiPanel main panel where to add controls
     * @param {Map.<string, CodeFile>} codeFileDictionary
     * @param {Options} options
     */
    this.initialize = function (uiPanel, codeFileDictionary, options) {
        if (!options.enabled) {
            return;
        }

        $(uiPanel).append("<h3 style='color:#41a854'>Spacing</h3>");
        for (const codeFile of codeFileDictionary.values()) {

            for (const typeInformation of codeFile.types.values()) {
                let expressionsToIterateOver = [];
                if (options.checkSpacingAroundBinaryOperators) {
                    expressionsToIterateOver.push(...typeInformation.binaryExpressions);
                }
                if (options.checkSpacingAroundAssignmentOperators) {
                    expressionsToIterateOver.push(...typeInformation.assignments);
                }
                for (const expression of expressionsToIterateOver) {
                    let leftHandSide;
                    let rightHandSide;
                    let operator;
                    switch (expression.node) {
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
                    const startCodeLine = codeFile.codeLines[textBetweenOperandsStart.line - 1];
                    let startCodeLineBeforeOperator = startCodeLine.substring(0, textBetweenOperandsStart.column - 1);
                    if (startCodeLineBeforeOperator.endsWith(" ")) {
                        const extraSpaces = startCodeLineBeforeOperator.match(/\s+$/)[0];
                        textBetweenOperandsStart.column -= extraSpaces.length;
                        textBetweenOperandsStart.offset -= extraSpaces.length;
                        startCodeLineBeforeOperator = startCodeLine.substring(0, textBetweenOperandsStart.column - 1);
                    }
                    const textBetweenOperandsEnd = code_analysis.getOperandStart(rightHandSide);
                    const endCodeLine = codeFile.codeLines[textBetweenOperandsEnd.line - 1];
                    let endCodeLineAfterOperator = endCodeLine.substring(textBetweenOperandsEnd.column - 1);

                    if (endCodeLineAfterOperator.startsWith(" ")) {
                        const extraSpaces = endCodeLineAfterOperator.match(/^\s+/)[0];
                        textBetweenOperandsEnd.column += extraSpaces.length;
                        textBetweenOperandsEnd.offset += extraSpaces.length;
                        endCodeLineAfterOperator = endCodeLine.substring(textBetweenOperandsEnd.column - 1);
                    }

                    let textBetweenOperands = codeFile.sourceCode.substring(textBetweenOperandsStart.offset, textBetweenOperandsEnd.offset);
                    const keywordMatch = textBetweenOperands.match(/.*(new\s*|super\s*)$/);
                    if (keywordMatch) {
                        textBetweenOperands = textBetweenOperands.replace(keywordMatch[1], "");
                        textBetweenOperandsEnd.column -= keywordMatch[1];
                        textBetweenOperandsEnd.offset -= keywordMatch[1];
                        endCodeLineAfterOperator = endCodeLine.substring(textBetweenOperandsEnd.column - 1);
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
                    if(endCodeLineAfterOperator.match(/^\s*$/)){
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
                    let badSpaceBefore = checkSpacesBefore && whitespaceBefore !== " ";
                    let badSpaceAfter = checkSpacesAfter && whitespaceAfter !== " ";
                    if (badSpaceBefore || badSpaceAfter) {
                        let message = null;
                        let trCodeLine = null;
                        if (badSpaceBefore && badSpaceAfter) {
                            message = "Operator '" + operator + "' needs a single space before and after it.";
                            trCodeLine = codeFile.trCodeLines[textBetweenOperandsStart.line - 1];
                        } else if (badSpaceBefore) {
                            message = "Operator '" + operator + "' needs a single space before it.";
                            trCodeLine = codeFile.trCodeLines[textBetweenOperandsStart.line - 1];
                        } else {
                            message = "Operator '" + operator + "' needs a single space after it.";
                            trCodeLine = codeFile.trCodeLines[textBetweenOperandsEnd.line - 1];

                        }
                        message = codeTextToHtmlText(message);
                        $(uiPanel).append(makeLabelWithClickToScroll(operator, trCodeLine, "", message));
                        addButtonComment(trCodeLine, "Spacing around '" + operator + "'", message, "#92b9d1");
                    }
                }
            }
        }
    }

}).apply(spacing_module);