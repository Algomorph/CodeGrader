let indentationModule = {};

(function () {

    class Options{
        constructor(enabled = false) {
            this.enabled = enabled;
        }
    }

    this.getDefaultOptions = function (){
        return new Options();
    }

    /**
     * Counts indent for a given code line
     * @param {string} codeLine
     * @return {number} indentation character count
     */
    function countIndent(codeLine) {
        return codeLine.length - codeLine.trimStart().length;
    }

    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel.
     * @param {HTMLDivElement} uiPanel
     * @param {Array.<HTMLTableRowElement>} trCodeLines
     * @param {Options} options
     */
    this.initialize = function (uiPanel, trCodeLines, options) {
        if(!options.enabled){
            return;
        }

        $(uiPanel).append("<h3 style='color:#92b9d1'>Indentation</h3>");
        /*
        Criteria for correct indentation:
        1) Consistent style, first non white space character must line up with closing brace
        1a) If, the ugly style, opening must line up with closing brace

        Oops this is the indentation module not braces
        Check for indentation after opening brace
        */
        let badLines = [];


        // find first indent use and use that as standard
        let i = 0
        let expectedIndentation = 0;
        while (getCodeFromTrCodeLine(trCodeLines[i++]).indexOf('{') === -1) {
            expectedIndentation = countIndent(getCodeFromTrCodeLine(trCodeLines[i]));
        }

        let curIndentation = 0; // in white spaces
        $.each(trCodeLines, function (tri, trCodeLine) {	// iterates each line of code below
            let codeText = $($(trCodeLine).find("div.gwt-Label")[0]).text();
            // Handle Comments
            let openBlockCommentIdx = codeText.search(/\/\*/);
            let closeBlockCommentIdx = codeText.search(/\*\//);
            if (openBlockCommentIdx >= 0 && closeBlockCommentIdx >= 0) { // if both exist in the same line, just replace everything in between
                codeText = codeText.substring(0, openBlockCommentIdx) + " ".repeat(closeBlockCommentIdx - openBlockCommentIdx - 2) + codeText.substring(closeBlockCommentIdx + 2);
            } else if (closeBlockCommentIdx >= 0) { // if only closing block comment
                codeText = " ".repeat(closeBlockCommentIdx + 2) + codeText.substring(closeBlockCommentIdx + 2);
            }
            // Skip blank lines, include lines that are just opening code blocks
            if (codeText.search(/\S/i) === -1 || codeText.search(/\S/i) === codeText.indexOf("/*")) return;
            //FIXME
            // if (codeText.match(/\S/i) == "*") return; //Block Comment Line

            // Handle opening and closing braces updating indent size
            if (codeText.indexOf('}') !== -1) { // if closing brace exists, decrease indent
                curIndentation -= expectedIndentation;
            }
            // verify current indent is correct
            if (countIndent(codeText) !== curIndentation) {
                badLines.push(trCodeLine);
                addButtonComment(trCodeLine, "Indent: " + countIndent(codeText) + "Expected Indent: " + curIndentation, " ", "#92b9d1");
            }

            // if opening brace exists, increase idnent
            if (codeText.indexOf('{') !== -1) {
                curIndentation += expectedIndentation;
            }
            /* _.each(badLines, function(keyword) {
                $(uiPanel).push(makeLabelWithClickToScroll(keyword,trCodeLine));
                addButtonComment(trCodeLine,"Bad indented lines: " + keyword," ","#92b9d1");
            }); */
        });
    }

}).apply(indentationModule);