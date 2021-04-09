/*
* Copyright 2021 Gregory Kramida
* */
let line_length_moodule = {};

(function () {

    class Options {
        enabled;
        lineLengthLimit;
        tabCharacterWidth;
        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {number} lineLengthLimit maximum allowed line length
         * @param {number} tabCharacterWidth expected tab character width
         */
        constructor(enabled = false, lineLengthLimit = 80, tabCharacterWidth= 4) {
            this.enabled = enabled;
            this.lineLengthLimit = lineLengthLimit;
            this.tabCharacterWidth = tabCharacterWidth;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    //TODO: make class below inherit from a CodeEntity class. This class should also be used as
    // prototype for every single thing discovered and stored by code_analysis entity search.
    class LineLengthViolation {
        /**
         * @param {number} lineLength
         * @param {HTMLTableRowElement} trCodeLine
         */
        constructor(lineLength, trCodeLine) {
            this.lineLength = lineLength;
            this.trCodeLine = trCodeLine;
        }
    }

    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel.
     * @param {HTMLDivElement} uiPanel main panel where to add controls
     * @param {Map.<string, CodeFile>} fileDictionary
     * @param {Options} options
     */
    this.initialize = function (uiPanel, fileDictionary, options) {
        if (!options.enabled) {
            return;
        }

        $(uiPanel).append("<h3 style='color:#7c7cd2'>Line Length</h3>");

        const lineLengthViolations = [];

        for (const codeFile of fileDictionary.values()) {
            const characterWidth = getMonospaceCharacterWidth(codeFile.trCodeLines[0]);
            const lineLengthMarginOffsetPixels = (options.lineLengthLimit + 1) * characterWidth;
            drawDottedVerticalLineInCodeArea(lineLengthMarginOffsetPixels, "#7c7cd2", codeFile.trCodeLines[0]);

            $.each(codeFile.trCodeLines, function (codeLineIndex, trCodeLine) {	// iterates each line of code below
                const codeLine = codeFile.codeLines[codeLineIndex];
                const lineLength = getLineCharacterWidth(codeLine);
                if(lineLength > options.lineLengthLimit){
                    lineLengthViolations.push(new LineLengthViolation(lineLength, trCodeLine))
                }
            });
        }



        for(const lineLengthViolation of lineLengthViolations){
            const defaultMessageText = "Line length (" + lineLengthViolation.lineLength + ") exceeds " + options.lineLengthLimit + " characters.";
            $(uiPanel).append(makeLabelWithClickToScroll("Long line", lineLengthViolation.trCodeLine,
                "line-length-exceeded-problem", defaultMessageText ));
            addButtonComment(
                lineLengthViolation.trCodeLine,
                "long line", defaultMessageText, "#7c7cd2"
            );
        }

    }

}).apply(line_length_moodule);