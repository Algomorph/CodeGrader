let spacingModule = {};

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

    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel.
     * @param {HTMLDivElement} uiPanel main panel where to add controls
     * @param {Array.<HTMLTableRowElement>} trCodeLines
     * @param {Options} options
     */
    this.initialize = function (uiPanel, trCodeLines, options) {
        if (!options.enabled) {
            return;
        }

        const nonUnaryOperatorRegex = new RegExp(compileNonUnaryOperatorRegex(), 'g');

        $(uiPanel).append("<h3 style='color:#41a854'>Spacing</h3>");
        $.each(trCodeLines, function (lineIndex, trCodeLine) {	// iterates each line of code below
            const code = stripGenericArgumentsFromCode(stripStringsFromCode(stripCommentsFromCode(getCodeFromTrCodeLine(trCodeLine)), true));
            const lineMatches = [...code.matchAll(nonUnaryOperatorRegex)];
            for (const match of lineMatches) {
                const operator = match[2];
                const spaceBefore = match[1];
                const spaceAfter = match[3];
                if (spaceBefore !== " " || spaceAfter !== " ") {
                    let message = null;
                    if (spaceBefore !== " " && spaceAfter !== " ") {
                        message = "Operator '" + operator + "' needs a single space before and after it.";
                        console.log(code);
                        console.log(match);
                    } else if (spaceBefore !== " ") {
                        message = "Operator '" + operator + "' needs a single space before it.";
                        console.log(code);
                        console.log(match);
                    } else {
                        message = "Operator '" + operator + "' needs a single space after it.";
                    }
                    $(uiPanel).append(makeLabelWithClickToScroll(operator, trCodeLine, "", message));
                    addButtonComment(trCodeLine, "Spacing around '" + operator + "'", message, "#92b9d1");
                }
            }
        });
    }

}).apply(spacingModule);