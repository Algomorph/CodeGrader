/*
* Copyright 2020 Matthew Simmons
* */
let indentation_module = {};

(function () {

    class Options {
        constructor(enabled = false) {
            this.enabled = enabled;
        }
    }

    const LastLineIndentationStatus = {
        PROPERLY_INDENTED: 0,
        OVERINDENTED: 1,
        UNDERINDENTED: 2
    }

    let moduleColor = "#92b9d1";

    class WhitespaceHighlight {
        #trCodeLine
        #startFromChar

        /**
         * @param {HTMLTableRowElement} trCodeLine
         * @param {int} startFromChar
         */
        constructor(trCodeLine, startFromChar) {
            this.#trCodeLine = trCodeLine;
            this.#startFromChar = startFromChar;
        }

        draw() {
            highlightWhitespaceUntilText(this.#trCodeLine, this.#startFromChar, moduleColor);
        }
    }

    class IndentationIssue extends CodeEntity {
        #defaultMessageText
        #shortDescription
        #hasWhitespaceHighlights
        #highlightStack

        /**
         * @param {HTMLTableRowElement} trCodeLine
         * @param {string} shortDescription
         * @param {string} defaultMessageText
         * @param {boolean} hasWhitespaceHighlights
         * */
        constructor(trCodeLine, shortDescription, defaultMessageText, hasWhitespaceHighlights = true) {
            //TODO: add arguments for: "no indentation in file (bool)", highlight width, etc.
            super(trCodeLine);
            this.#shortDescription = shortDescription;
            this.#defaultMessageText = defaultMessageText;
            this.#hasWhitespaceHighlights = hasWhitespaceHighlights;
            if (hasWhitespaceHighlights) {
                this.#highlightStack = [];
            } else {
                this.#highlightStack = null;
            }
        }

        /**
         * Add highlight information associated with this indentation issue. Note that this doesn't actually draw the
         * highlight. Use the drawHighlights() function to do so.
         * @param {HTMLTableRowElement} trCodeLine
         * @param {int} startFromChar
         */
        addHighlight(trCodeLine, startFromChar) {
            this.#highlightStack.push(new WhitespaceHighlight(trCodeLine, startFromChar));
        }

        drawHighlights() {
            if (this.#hasWhitespaceHighlights) {
                for (const highlight of this.#highlightStack) {
                    highlight.draw();
                }
            }
        }

        get points() {
            return -1;
        }

        get isIssue() {
            return true;
        }

        get _tagName() {
            return this.#shortDescription;
        }

        get _labelName() {
            return this.#shortDescription;
        }

        get _defaultMessageText() {
            return this.#defaultMessageText;
        }

        get _toolTip() {
            return this._defaultMessageText;
        }

        get _tagColor() {
            return moduleColor;
        }
    }


    this.getDefaultOptions = function () {
        return new Options();
    }

    let initialized = false;
    /** @type Array.<IndentationIssue> **/
    this.issues = [];

    /**
     * Initialize the module
     * @param {{moduleOptions : {indentation_module: Options}}} global_options
     */
    this.initialize = function (global_options) {
        this.options = global_options.moduleOptions.indentation_module;
        if (!this.options.enabled) {
            return;
        }
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
            let stack = [0];

            let isPrev = false;
            let isComment = false;
            let isNotAllman = 0;
            let expectedIndent = 0;
            let isFirstSwitch = false, isSwitch = false;
            let switchIndent = 0;

            // find first indent used and use that as standard
            let singleIndentWidth = -1;
            for (let i = 0; i < codeFile.trCodeLines.length;) {
                while (i < codeFile.trCodeLines.length && // yes, an infinite loop is possible here, e.g. CMSC131 SP2021 P5 sjarentz
                (stripCommentsFromCode(stripStringsFromCode(getCodeFromTrCodeLine(codeFile.trCodeLines[i]))).search(/\S/) === -1 ||
                    getIndentationWidth(stripCommentsFromCode(stripStringsFromCode(getCodeFromTrCodeLine(codeFile.trCodeLines[i])))) === 0)) { // Makes sure next isn't an empty line
                    i++;
                }
                if (i === codeFile.trCodeLines.length) {
                    this.issues.push(new IndentationIssue(codeFile.trCodeLines[0], "No indentation",
                        "The whole file is lacking indentation.", false));
                } else {
                    //assumes first line with indentation will have exactly one indent
                    singleIndentWidth = getIndentationWidth(getCodeFromTrCodeLine(codeFile.trCodeLines[i]));
                    break;
                }
            }
            if(singleIndentWidth === -1){
                continue;
            }

            let lastLineStatus = LastLineIndentationStatus.PROPERLY_INDENTED;
            let currentIndentationWidth = 0; // in white spaces
            /** @type {IndentationIssue | null} */
            let lastIssue = null;
            const issuesForFile = [];
            $.each(codeFile.trCodeLines, function (codeLineIndex, trCodeLine) {
                let codeText = stripStringsFromCode(getCodeFromTrCodeLine(trCodeLine));

                // Tabs are 4 characters until this causes issues.
                codeText = codeText.replaceAll(/\t/g, "    ");

                if (codeText.trim().substr(0, 2) === "//") return;

                // If a line ends a previous multiline comment, remove up to the FIRST instance of "*/".
                if (isComment && codeText.indexOf("*/") !== -1) {
                    isComment = false;
                    codeText = codeText.replace(/^((?!\*\/).)*\*\//, " ".repeat(codeText.indexOf("*/") + 2));
                }

                // Remove all complete (/* stuff */) multiline comments BEFORE valid code.
                while (codeText.search(/^\s*\/\*(?:(?!\/\*).)*\*\//) !== -1) {
                    // Purpose: .indexOf() returns FIRST occurrence of characters, so in order to
                    // accurately change the indent lengths, we must go one-by-one.

                    //TODO: Speak to Greg if we replace with space or empty string. Arguments can be made for both.
                    //TODO: Greg read the above and is wondering what those arguments might be. Could you answer him?
                    codeText = codeText.replace(/^\s*\/\*(?:(?!\/\*).)*\*\//, " ".repeat(codeText.indexOf("*/") + 2));
                }

                // Remove all complete multiline comments AFTER valid code
                if (codeText.indexOf("*/") !== -1) {
                    codeText = codeText.replace(/\/\*.*?\*\//, "");
                }

                if (isComment) return;

                if (codeText.indexOf("//") !== -1) {
                    codeText = codeText.substr(0, codeText.indexOf("//"));
                }

                // Moved below return, we don't want to skip lines beginning a chain since they can contain code.
                // If incomplete, comment must continue to next line to be valid code.
                if (codeText.indexOf("/*") !== -1) {
                    isComment = true;
                    codeText = codeText.substring(0, codeText.indexOf("/*"));
                }

                // Skip blank lines
                if (codeText.search(/\S/) === -1) return;


                if (codeText.trim().charAt(0) === "@") return;

                // Handle opening and closing braces updating indent size
                if (codeText.trim().indexOf("}") === 0) {
                    if (isSwitch && currentIndentationWidth - 2 * singleIndentWidth <= switchIndent) {
                        currentIndentationWidth = switchIndent + singleIndentWidth;
                        isSwitch = isFirstSwitch = false;
                    }
                    currentIndentationWidth -= singleIndentWidth;
                    isPrev = false;
                }

                if (isPrev && codeText.trim().charAt(0) === "{") { // Accounts for Allman braces
                    isPrev = false;
                    if (isNotAllman > 0) {
                        isNotAllman--;
                    }
                }

                if (!isFirstSwitch && codeText.search(/(case\s|default\s|default:)/) !== -1) {
                    currentIndentationWidth -= singleIndentWidth;
                }

                if (isNotAllman > 0) {
                    isPrev = false;
                    currentIndentationWidth += singleIndentWidth;
                }

                // verify current indent is correct
                if ((isSwitch && codeText.search(/(case\s|default\s|default:)/) !== -1 && ![0, singleIndentWidth].includes(getIndentationWidth(codeText) - switchIndent))
                    || (isSwitch && codeText.search(/(case\s|default\s|default:)/) === -1 && ![0, singleIndentWidth].includes(currentIndentationWidth - getIndentationWidth(codeText)))
                    || (!isPrev && !isSwitch && getIndentationWidth(codeText) !== currentIndentationWidth) || (isPrev && getIndentationWidth(codeText) < expectedIndent)) {
                    let defaultMessage = "Detected indent: " + getIndentationWidth(codeText) + ", Expected indent: " + currentIndentationWidth;
                    if (currentIndentationWidth < getIndentationWidth(codeText)) {
                        if (lastLineStatus !== LastLineIndentationStatus.OVERINDENTED) {
                            lastIssue = new IndentationIssue(trCodeLine, "Over-indent", defaultMessage, true);
                            issuesForFile.push(lastIssue);
                        }
                        lastIssue.addHighlight(trCodeLine, currentIndentationWidth);
                    } else {
                        if (lastLineStatus !== LastLineIndentationStatus.UNDERINDENTED) {
                            lastIssue = new IndentationIssue(trCodeLine, "Under-indent", defaultMessage, true);
                            issuesForFile.push(lastIssue);
                        }
                        lastIssue.addHighlight(trCodeLine, 0);
                    }
                } else {
                    lastLineStatus = LastLineIndentationStatus.PROPERLY_INDENTED;
                }

                if (isPrev) {
                    expectedIndent = Math.max(expectedIndent, currentIndentationWidth);
                }

                // if opening brace exists, increase indent
                if (codeText.indexOf("{") !== -1) {
                    if (codeText.trim().indexOf("}") === 0) {
                        currentIndentationWidth += (codeText.match(/{/g).length - codeText.match(/}/g).length + 1) * singleIndentWidth;
                    } else if (codeText.indexOf("}") === -1) {
                        currentIndentationWidth += codeText.match(/{/g).length * singleIndentWidth;
                    } else {
                        currentIndentationWidth += (codeText.match(/{/g).length - codeText.match(/}/g).length) * singleIndentWidth;
                    }
                    stack.push(isNotAllman);
                    isNotAllman = 0;
                }

                if (codeText.indexOf("}") !== -1) {
                    if (codeText.indexOf("{") === -1 && codeText.trim().indexOf("}") !== 0) {
                        currentIndentationWidth -= codeText.match(/}/g).length * singleIndentWidth;
                    }
                    isNotAllman = stack.pop(); // Somehow, this fixes nested if's with AND without braces
                }

                if (codeText.search(/(case\s|default\s|default:)/) !== -1) {
                    isFirstSwitch = false;
                    currentIndentationWidth += singleIndentWidth;
                }

                // I don't want to think about nested switch statements. People who do that are maniacal!
                if (codeText.search(/switch(\s|\()/) !== -1) {
                    switchIndent = currentIndentationWidth - singleIndentWidth;
                    isSwitch = isFirstSwitch = true;
                }

                // If it doesn't end in a correct delimiter, it's a continuation of the previous line.
                if (!isPrev && codeText.search(/(for|while|do|else|if)(\s|\()/) !== -1
                    && codeText.trim().charAt(codeText.trim().length - 1) !== "{" && codeText.trim().charAt(codeText.trim().length - 1) !== ";") {
                    if ((codeText.indexOf(")") === codeText.indexOf("(") || (codeText.indexOf(")") !== -1 && codeText.match(/\(/g).length === codeText.match(/\)/g).length))) {
                        if (codeText.indexOf("}") === -1 || codeText.indexOf("{") === -1 || codeText.match(/{/g).length !== codeText.match(/}/g).length) {
                            isPrev = true;
                            isNotAllman++;
                        }
                    } else {
                        isPrev = true;
                        expectedIndent = currentIndentationWidth;
                    }
                } else if (!isPrev && [";", "{", "}", ":"].indexOf(codeText.trim().charAt(codeText.trim().length - 1)) === -1) {
                    if (codeText.trim().search(/^(private|public|protected)/) === -1 || // False negative - package private Allman
                        codeText.trim().charAt(codeText.trim().length - 1) !== ")") { // False positive - multiline fields ending in )

                        isPrev = true;
                        stack.push(isNotAllman);
                        isNotAllman = 0;
                        expectedIndent = currentIndentationWidth;

                    }
                } else if (isPrev && [";", "{", "}", ":"].indexOf(codeText.trim().charAt(codeText.trim().length - 1)) !== -1) {
                    if (isNotAllman === 0) {
                        isPrev = false;
                    }
                    isNotAllman = stack.pop();
                    if (isNotAllman > 0) {
                        currentIndentationWidth -= isNotAllman * singleIndentWidth;
                        isNotAllman = 0;
                    }
                } else if (isNotAllman > 0) {
                    currentIndentationWidth -= isNotAllman * singleIndentWidth;
                    isNotAllman = 0;
                }
            });
            this.issues.push(...issuesForFile);
        }
    }

    /**
     * Add all relevant information detected by this module to the UI panel.
     * @param {HTMLDivElement} uiPanel
     */
    this.addInfoToUiPanel = function (uiPanel){
        if (!this.options.enabled) {
            return;
        }
        for(const issue of this.issues){
            issue.drawHighlights();
            issue.addAsLabelToPanel(uiPanel);
            issue.addAsCodeTagWithDefaultComment();
        }
    }

    /**
     * Get all CodeEntity instances processed from the code so far by this module.
     * @returns {[CodeEntity]}
     */
    this.getCodeEntities = function (){
        if (!this.options.enabled) {
            return [];
        }
        if (!initialized){
            throw ("Module not initialized. Please call the initialize function first.");
        }
        return this.issues;
    }

}).apply(indentation_module);
