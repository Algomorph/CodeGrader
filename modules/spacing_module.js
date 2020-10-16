let spacing_module = {};

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
                for (const binaryExpression of typeInformation.binaryExpressions) {
                    const textBetweenOperandsStart = code_analysis.getOperandEnd(binaryExpression.leftOperand);
                    const startCodeLine = codeFile.codeLines[textBetweenOperandsStart.line - 1];
                    const startCodeLineBeforeOperator = startCodeLine.substring(0, textBetweenOperandsStart.column - 1);
                    if (startCodeLineBeforeOperator.endsWith(" ")) {
                        const extraSpaces = startCodeLineBeforeOperator.match(/\s+$/)[0];
                        textBetweenOperandsStart.column -= extraSpaces.length;
                        textBetweenOperandsStart.offset -= extraSpaces.length;
                    }
                    const textBetweenOperandsEnd = code_analysis.getOperandStart(binaryExpression.rightOperand);
                    const endCodeLine = codeFile.codeLines[textBetweenOperandsEnd.line - 1];
                    const endCodeLineAfterOperator = endCodeLine.substring(textBetweenOperandsEnd.column - 1);
                    if (endCodeLineAfterOperator.startsWith(" ")){
                        const extraSpaces = endCodeLineAfterOperator.match(/^\s+/)[0];
                        textBetweenOperandsEnd.column += extraSpaces.length;
                        textBetweenOperandsEnd.offset += extraSpaces.length;
                    }

                    const textBetweenOperands = codeFile.sourceCode.substring(textBetweenOperandsStart.offset, textBetweenOperandsEnd.offset);

                    const operator = binaryExpression.operator;
                    const operatorRegexPart = operator.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
                    let checkSpacesBefore = true;
                    let checkSpacesAfter = true;
                    if (textBetweenOperandsStart.line !== textBetweenOperandsEnd.line) {
                        // line break in expression
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
                            // console.log(badSpaceBefore.length, operator, badSpaceAfter.length)
                        } else if (badSpaceBefore) {
                            message = "Operator '" + operator + "' needs a single space before it.";
                            trCodeLine = codeFile.trCodeLines[textBetweenOperandsStart.line - 1];
                        } else {
                            message = "Operator '" + operator + "' needs a single space after it.";
                            trCodeLine = codeFile.trCodeLines[textBetweenOperandsEnd.line - 1];
                        }
                        $(uiPanel).append(makeLabelWithClickToScroll(operator, trCodeLine, "", message));
                        addButtonComment(trCodeLine, "Spacing around '" + operator + "'", message, "#92b9d1");
                    }
                }
            }
        }
    }

}).apply(spacing_module);