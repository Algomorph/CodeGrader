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
         * @param {string} lineLength
         * @param {HTMLTableRowElement} trCodeLine
         */
        constructor(lineLength, trCodeLine) {
            this.keyword = lineLength;
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
        console.log(document.body.style.fontSize)

        for (const codeFile of fileDictionary.values()) {

            $.each(codeFile.trCodeLines, function (codeLineIndex, trCodeLine) {	// iterates each line of code below
                const codeLine = codeFile.codeLines[codeLineIndex];


            });
        }
        $(uiPanel).append("<h3 style='color:#585896'>Line Length</h3>");


    }

}).apply(line_length_moodule);