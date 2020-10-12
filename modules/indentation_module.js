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
        let numChars = codeLine.length - codeLine.trimStart().length;
        if(codeLine.indexOf("*/") !== -1) {
            numChars = codeLine.length - codeLine.substr(codeLine.indexOf("*/") + 2).trimStart().length;
        }
        let i = 0;
        let total = 0;
        for(; i < numChars; i++) {
            if (codeLine.charAt(i) === '\t') {
                total = (Math.floor(total / 4) + 1) * 4;
            } else {
                total++;
            }
        }
        return total;
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
        let stack = [0];

        let isPrev = false;
        let isComment = false;
        let isNotAllman = 0;

        // find first indent used and use that as standard
        let i;
        let singleIndentationString = 0;
        for (i = 0; i < trCodeLines.length;) {
            if (getCodeFromTrCodeLine(trCodeLines[i++]).includes('{')) {
                while(getCodeFromTrCodeLine(trCodeLines[i]).trim().length === 0) { // Makes sure next isn't an empty line
                    i++;
                }
                singleIndentationString = countIndent(getCodeFromTrCodeLine(trCodeLines[i]));
                break;
            }
        }

        let currentIndentation = 0; // in white spaces
        $.each(trCodeLines, function (tri, trCodeLine) {	// iterates each line of code below
            let codeText = getCodeFromTrCodeLine(trCodeLine);



            // Handle opening and closing braces updating indent size
            if (codeText.trim().indexOf("}") === 0) {
                currentIndentation -= singleIndentationString;
            }

            if (isPrev && codeText.trim().charAt(0) === "{") { // Accounts for Allman braces
                isPrev = false;
                currentIndentation -= 2 * singleIndentationString;
                if(isNotAllman > 0) {
                    isNotAllman--;
                    currentIndentation += 2 * singleIndentationString;
                }
            }

            if(isNotAllman > 0) {
                isPrev = false;
                currentIndentation += singleIndentationString;
            }

            if (codeText.indexOf("/*") !== -1) {
                isComment = true;
            }

            if (isComment && codeText.indexOf("*/") !== -1) {
                isComment = false;
                if(codeText.trim().indexOf("*/") === codeText.trim().length - 2) {
                    return;
                }
            }

            // Skip blank lines
            if (codeText.search(/\S/i) === -1) return;

            if (isComment) {
                return;
            }

            if (codeText.trim().charAt(0) === "@") return;

            if (codeText.trim().substr(0, 2) === "//") return;

            if(codeText.indexOf("//") !== -1) codeText = codeText.substr(0, codeText.indexOf("//"));

            // verify current indent is correct
            if (countIndent(codeText) !== currentIndentation) {
                badLines.push(trCodeLine);
                let defaultMessage = "Detected indent: " + countIndent(codeText) + ", Expected indent: " + currentIndentation;
                if (currentIndentation < countIndent(codeText)) {
                    highlightSection(trCodeLine, currentIndentation, "#92b9d1");
                    $(uiPanel).append(makeLabelWithClickToScroll("Overindent", trCodeLine, "", defaultMessage));
                } else {
                    highlightSection(trCodeLine, 0, "#92b9d1");
                    $(uiPanel).append(makeLabelWithClickToScroll("Underindent", trCodeLine, "", defaultMessage));
                }

                addButtonComment(trCodeLine, "Poor indentation", defaultMessage, "#92b9d1");
            }

            // if opening brace exists, increase indent
            if (codeText.indexOf("{") !== -1) {
                if(codeText.trim().indexOf("}") === 0) {
                    currentIndentation += (codeText.match(/{/g).length - codeText.match(/}/g).length + 1) * singleIndentationString;
                } else if (codeText.indexOf("}") === -1) {
                    currentIndentation += codeText.match(/{/g).length * singleIndentationString;
                } else {
                    currentIndentation += (codeText.match(/{/g).length - codeText.match(/}/g).length) * singleIndentationString;
                }
                stack.push(isNotAllman);
                isNotAllman = 0;
            }

            if(codeText.indexOf("}") !== -1) {
                isNotAllman = stack.pop(); // Somehow, this fixes nested if's with AND without braces
            }

            // If it doesn't end in a correct delimiter, it's a continuation of the previous line. Eclipse says to add two indents.
            if (!isPrev && codeText.trim().search(/(for|while|do\s|else|if)/) !== -1
                    && codeText.trim().charAt(codeText.trim().length - 1) !== "{") {
                if (codeText.indexOf(")") === codeText.indexOf("(") || (codeText.indexOf(")") !== -1 && codeText.match(/\(/g).length === codeText.match(/\)/g).length)) {
                    if(codeText.indexOf("}") === -1 || codeText.match(/{/g).length !== codeText.match(/}/g).length) {
                        isPrev = true;
                        isNotAllman++;
                    }
                } else {
                    isPrev = true;
                    currentIndentation += 2 * singleIndentationString;
                }
            } else if (!isPrev && [";","{","}"].indexOf(codeText.trim().charAt(codeText.trim().length - 1)) === -1) {
                if (codeText.trim().search(/^(private|public|protected)/) === -1 || // False negative - package private Allman
                    codeText.trim().charAt(codeText.trim().length - 1) !== ")") { // False positive - multiline fields ending in )

                    isPrev = true;
                    stack.push(isNotAllman);
                    isNotAllman = 0;
                    currentIndentation += 2 * singleIndentationString;
                }
            } else if(isPrev && [";","{","}"].indexOf(codeText.trim().charAt(codeText.trim().length - 1)) !== -1) {
                if(isNotAllman === 0) { //Aman Sheth's P2 has REALLY GOOD edge cases for this stuff...
                    isPrev = false;

                    currentIndentation -= 2 * singleIndentationString;
                }
                isNotAllman = stack.pop();
                if(isNotAllman > 0) {
                    currentIndentation -= isNotAllman * singleIndentationString;
                    isNotAllman = 0;
                }
            } else if(isNotAllman > 0) {
                currentIndentation -= isNotAllman * singleIndentationString;
                isNotAllman = 0;
            }

            /*_.each(badLines, function(keyword) {
                $(uiPanel).push(makeLabelWithClickToScroll(keyword,trCodeLine));
                addButtonComment(trCodeLine,"Bad indented lines: " + keyword," ","#92b9d1");
            });*/
        });
    }

}).apply(indentationModule);