/*
* Copyright 2020-2021 Gregory Kramida
* */
let keyword_and_pattern_module = {};

(function () {

    class Options {
        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {Array.<string>} keywords specific keywords to scan for.
         * @param {Array.<string>} patterns
         */
        constructor(enabled = false, keywords = [], patterns = []) {
            this.enabled = enabled;
            this.keywords = keywords;
            this.patterns = patterns;
        }
    }

    const moduleColor = "#92b9d1";

    class KeywordOccurrence extends CodeEntity {

        /** @type {string} */
        #keyword;

        /**
         * @param {string} keyword
         * @param {HTMLTableRowElement} trCodeLine
         * */
        constructor(keyword, trCodeLine) {
            super(trCodeLine);
            this.#keyword = keyword;
        }

        get _labelName() {
            return this.#keyword;
        }

        get _tagName() {
            return "Keyword: " + this.#keyword;
        }

        get _tagColor() {
            return moduleColor;
        }
    }


    class PatternOccurrence extends CodeEntity {

        /** @type {RegExp} */
        #pattern;
        /** @type {string} */
        #match;

        /**
         * @param {RegExp} pattern
         * @param {HTMLTableRowElement} trCodeLine
         * @param {string} match
         * */
        constructor(pattern, trCodeLine, match) {
            super(trCodeLine);
            this.#pattern = pattern;
            this.#match = match;
        }

        get _labelName() {
            return this.#match;
        }

        get _tagName() {
            return "Pattern match: " + this.#match;
        }

        get _tagColor() {
            return moduleColor;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    let initialized = false;

    /**
     * Initialize the module
     * @param {{moduleOptions : {keyword_and_pattern_module: Options}}} global_options
     */
    this.initialize = function (global_options) {
        this.options = global_options.moduleOptions.keyword_and_pattern_module;

        if (!this.options.enabled) {
            return;
        }

        this.keywordOccurencesFound = [];
        this.patternOccurencesFound = [];

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
        const keywordsToFind = this.options.keywords;
        /** @type {Array.<RegExp>}*/
        const patternsToFind = this.options.patterns.map(stringPattern => new RegExp(stringPattern, 'g') );

        /** @type {Array.<KeywordOccurrence>}*/
        const keywordOccurrencesFound = [];
        /** @type {Array.<PatternOccurrence>}*/
        const patternOccurrencesFound = [];

        for (const codeFile of fileDictionary.values()) {

            $.each(codeFile.trCodeLines, function (codeLineIndex, trCodeLine) {	// iterates each line of code below
                const codeLine = stripCommentsFromCode(codeFile.codeLines[codeLineIndex]);

                //TODO: get start & end column of each occurrence, store these in KeywordOccurrence & PatternOccurrence class for any discovered occurrence
                const keywordsFound = _.filter(keywordsToFind, keyword => codeLine.includes(keyword));
                _.each(keywordsFound, function (keyword) {
                    keywordOccurrencesFound.push(new KeywordOccurrence(keyword, trCodeLine));
                });
                const patternsFound = _.filter(patternsToFind, pattern => pattern.exec(codeLine) !== null)
                _.each(patternsFound, function (pattern) {
                    // reset regex state, otherwise will get null out of 'exec'
                    pattern.lastIndex = 0;
                    patternOccurrencesFound.push(new PatternOccurrence(pattern, trCodeLine, pattern.exec(codeLine)[0]));
                });

            });
        }
        /** @type {Array.<KeywordOccurrence>}*/
        this.keywordOccurencesFound.push(...keywordOccurrencesFound);
        /** @type {Array.<PatternOccurrence>}*/
        this.patternOccurencesFound.push(...patternOccurrencesFound);
    }

    /**
     * Add all information collected so far by the module to the UI panel.
     * @param {HTMLDivElement} uiPanel
     */
    this.addInfoToUiPanel = function (uiPanel) {
        if (!this.options.enabled) {
            return;
        }
        $(uiPanel).append("<h3 style='color:" + moduleColor + "'>Keywords</h3>");
        for (const keywordOccurrence of this.keywordOccurencesFound) {
            keywordOccurrence.addAsLabelToPanel(uiPanel);
            keywordOccurrence.addAsCodeTagWithDefaultComment();
        }
        $(uiPanel).append("<h3 style='color:" + moduleColor + "'>Pattern Matches</h3>");
        for (const patternOccurrence of this.patternOccurencesFound) {
            patternOccurrence.addAsLabelToPanel(uiPanel);
            patternOccurrence.addAsCodeTagWithDefaultComment();
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
        return this.keywordOccurencesFound.concat(this.patternOccurencesFound)
    }


}).apply(keyword_and_pattern_module);