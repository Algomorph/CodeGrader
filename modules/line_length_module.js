/*
* Copyright 2021 Gregory Kramida
* */
let line_length_module = {};

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
        constructor(enabled = false, lineLengthLimit = 80, tabCharacterWidth = 4) {
            this.enabled = enabled;
            this.lineLengthLimit = lineLengthLimit;
            this.tabCharacterWidth = tabCharacterWidth;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    const moduleColor = "#7c7cd2";

    class LineLengthViolation extends CodeEntity {
        static options;
        #lineLength;

        /**
         * @param {number} lineLength
         * @param {HTMLTableRowElement} trCodeLine
         */
        constructor(trCodeLine, lineLength) {
            super(trCodeLine);
            this.#lineLength = lineLength;
        }

        get points() {
            return -1;
        }

        get isIssue() {
            return true;
        }

        get _labelStyleClass() {
            return "line-length-exceeded-problem";
        }

        get _labelName() {
            return this._tagName;
        }

        get _toolTip() {
            return this._defaultMessageText;
        }

        get _tagName() {
            return "long line";
        }

        get _defaultMessageText() {
            return "Line length (" + this.#lineLength + ") exceeds " + LineLengthViolation.options.lineLengthLimit + " characters.";
        }

        get _tagColor() {
            return moduleColor;
        }
    }

    let initialized = false;

    /**
     * Initialize the module
     * @param {{moduleOptions : {line_length_module: Options}}} global_options
     */
    this.initialize = function (global_options) {
        this.options = global_options.moduleOptions.line_length_module;

        if (!this.options.enabled) {
            return;
        }
        LineLengthViolation.options = this.options;
        /** @type {Array.<LineLengthViolation>} */
        this.lineLengthViolations = [];
        initialized = true;
    }

    /**
     * Perform code analysis & discover code entities of interest
     * @param {Map.<string, CodeFile>} codeFileDictionary
     */
    this.processCode = function (codeFileDictionary) {
        if (!this.options.enabled) {
            return;
        }

        for (const codeFile of codeFileDictionary.values()) {
            const startTrCodeLine = codeFile.trCodeLines[0];
            const characterWidth = getMonospaceCharacterWidth(startTrCodeLine);
            const allowedPixelWidthOfCode = (this.options.lineLengthLimit + 1) * characterWidth;
            const codeCellLeftOffset = getCodeCellLeftOffsetPixels(startTrCodeLine);
            const cutoffLineLeftOffset = allowedPixelWidthOfCode + codeCellLeftOffset;
            const cutoffLineHeight = getCodeAreaHeightFromTrCodeLine(startTrCodeLine);
            const lineLengthLimit = this.options.lineLengthLimit;
            const lineLengthViolations = [];

            drawVerticalLineInElement(cutoffLineLeftOffset, cutoffLineHeight, "line-length-margin", startTrCodeLine);

            $.each(codeFile.trCodeLines, function (codeLineIndex, trCodeLine) {	// iterates each line of code below
                const codeLine = codeFile.codeLines[codeLineIndex];
                const lineLength = getLineCharacterWidth(codeLine);

                if (lineLength > lineLengthLimit) {
                    lineLengthViolations.push(new LineLengthViolation(trCodeLine, lineLength));
                }
            });

            this.lineLengthViolations.push(...lineLengthViolations);
        }
    }
    /**
     * Add all information collected so far by the module to the UI panel.
     * @param {HTMLDivElement} uiPanel
     */
    this.addInfoToUiPanel = function (uiPanel) {
        if (!this.options.enabled) {
            return;
        }
        $(uiPanel).append("<h3 style='color:" + moduleColor + "'>Line Length</h3>");
        for (const lineLengthViolation of this.lineLengthViolations) {
            lineLengthViolation.addAsLabelToPanel(uiPanel);
            lineLengthViolation.addAsCodeTagWithDefaultComment();
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
        return this.lineLengthViolations;
    }

}).apply(line_length_module);