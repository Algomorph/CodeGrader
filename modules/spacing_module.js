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

    let nonUnaryOperatorList = [
        "\\*", "\\%", "\\+", "\\-", "\\<\\<", "\\>\\>", "\\>\\>\\>", "\\<", "\\>", "\\<\\=", "\\>\\=",
        "instanceof", "\\=\\=", "\\!\\=", "\\&", "\\^", "\\|", "\\&\\&",
        "\\|\\|", "\\?", "\\:", "\\=", "\\+\\=", "\\-\\=", "\\*\\=", "\\*\\=", "\\/\\=", "\\%\\=", "\\&\\=", "\\|\\=",
        "\\<\\<\\=", "\\>\\>\\=", "\\>\\>\\=",
        "\\&lt;", "\\&lt;\\&lt;", "\\&lt;=", "\\&gt;", "\\&gt;\\&gt;", "\\&gt;\\&gt;\\&gt;", "\\&gt;=", "\\&amp;",
        "\\&amp;\\&amp;", "\\&lt;\\&lt;=", "\\&gt;\\&gt;=", "\\&gt;\\&gt;\\&gt;="
    ];

    function makeNonCaptureGroup(operator) {
        return "(?:" + operator + ")";
    }

    function makeNonUnaryOperatorRegex(groups) {
        return "(?<=\\w|[)]|\\d|\"|'|[.])(\\s*)(" + groups + ")(\\s*)(?=\\w|[(]|\\d|\"|'|[.])";
    }

    function compileNonUnaryOperatorRegex() {
        let groupList = nonUnaryOperatorList.map(operator => makeNonCaptureGroup(operator));
        return makeNonUnaryOperatorRegex(groupList.join("|"));
    }

    function getOperandStart(operandAstNode) {
        switch (operandAstNode.node) {
            case "MethodInvocation":
            case "PrefixExpression":
            case "PostfixExpression":
            case "FieldAccess":
                if (operandAstNode.expression != null) {
                    return getOperandStart(operandAstNode.expression);
                } else {
                    return operandAstNode.location.start;
                }
            case "ArrayAccess":
                if (operandAstNode.hasOwnProperty("array")) {
                    return getOperandStart(operandAstNode.array);
                }
                break;
            case "InfixExpression":
                return getOperandStart(operandAstNode.leftOperand);
            default:
                return operandAstNode.location.start;
        }

    }

    function getOperandEnd(operandAstNode) {
        switch (operandAstNode.node) {
            case "InfixExpression":
                return getOperandEnd(operandAstNode.rightOperand);
            default:
                return operandAstNode.location.end;
        }
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

        const nonUnaryOperatorRegex = new RegExp(compileNonUnaryOperatorRegex(), 'g');

        $(uiPanel).append("<h3 style='color:#41a854'>Spacing</h3>");

        for (const codeFile of codeFileDictionary.values()) {

            for (const typeInformation of codeFile.types.values()) {
                for (const binaryExpression of typeInformation.binaryExpressions) {
                    const start = getOperandEnd(binaryExpression.leftOperand);
                    const end = getOperandStart(binaryExpression.rightOperand);
                    const textBetweenOperands = codeFile.sourceCode.substring(start.offset, end.offset);
                    const operator = binaryExpression.operator;
                    const operatorRegexPart = operator.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
                    if(start.line !== end.line ){
                        // line break in expression
                        const startCodeLine = codeFile.codeLines[start.line - 1];
                        const endCodeLine = codeFile.codeLines[end.line - 1];
                        const startingWithOperatorPattern = new RegExp("^\\s*" + operatorRegexPart + ".*");
                        if(endCodeLine.match(startingWithOperatorPattern)){
                            console.log("HOLA!");
                        }
                    }

                }
            }
        }

        // $.each(trCodeLines, function (lineIndex, trCodeLine) {	// iterates each line of code below
        //     const code = stripGenericArgumentsFromCode(stripStringsFromCode(stripCommentsFromCode(getCodeFromTrCodeLine(trCodeLine)), true));
        //     const lineMatches = [...code.matchAll(nonUnaryOperatorRegex)];
        //     for (const match of lineMatches) {
        //         const operator = match[2];
        //         const spaceBefore = match[1];
        //         const spaceAfter = match[3];
        //         if (spaceBefore !== " " || spaceAfter !== " ") {
        //             let message = null;
        //             if (spaceBefore !== " " && spaceAfter !== " ") {
        //                 message = "Operator '" + operator + "' needs a single space before and after it.";
        //                 //FIXME remove commented code after most debugging is done
        //                 // console.log(code);
        //                 // console.log(match);
        //             } else if (spaceBefore !== " ") {
        //                 message = "Operator '" + operator + "' needs a single space before it.";
        //                 // console.log(code);
        //                 // console.log(match);
        //             } else {
        //                 message = "Operator '" + operator + "' needs a single space after it.";
        //                 // console.log(code);
        //                 // console.log(match);
        //             }
        //             $(uiPanel).append(makeLabelWithClickToScroll(operator, trCodeLine, "", message));
        //             addButtonComment(trCodeLine, "Spacing around '" + operator + "'", message, "#92b9d1");
        //         }
        //     }
        // });
    }

}).apply(spacing_module);