/*
* Copyright 2020 Gregory Kramida
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

    this.getDefaultOptions = function () {
        return new Options();
    }

    //TODO: make both of the classes below inherit from a single CodeEntity class. This class should also be used as
    // prototype for every single thing discovered and stored by code_entity_search entity search.
    class KeywordOccurrence {
        /**
         * @param {string} keyword
         * @param {HTMLTableRowElement} trCodeLine
         */
        constructor(keyword, trCodeLine) {
            this.keyword = keyword;
            this.trCodeLine = trCodeLine;
        }
    }

    class PatternOccurrence {
        /**
         * @param {RegExp} pattern
         * @param {HTMLTableRowElement} trCodeLine
         */
        constructor(pattern, trCodeLine) {
            this.pattern = pattern;
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

        const keywordsToFind = options.keywords;
        /** @type {Array.<RegExp>}*/
        const patternsToFind = options.patterns.map(stringPattern => new RegExp(stringPattern, 'g') );

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
                    keywordOccurrencesFound.push(new KeywordOccurrence(keyword, trCodeLine))
                });
                const patternsFound = _.filter(patternsToFind, pattern => pattern.exec(codeLine) !== null)
                _.each(patternsFound, function (pattern) {
                    patternOccurrencesFound.push(new PatternOccurrence(pattern, trCodeLine))
                });

            });
        }
        $(uiPanel).append("<h3 style='color:#92b9d1'>Keywords</h3>");
        for (const keywordOccurrence of keywordOccurrencesFound) {
            //TODO: highlight keyword in line's text (store the start & end first)
            $(uiPanel).append(makeLabelWithClickToScroll(keywordOccurrence.keyword, keywordOccurrence.trCodeLine));
            addButtonComment(keywordOccurrence.trCodeLine, "Keyword: " + keywordOccurrence.keyword, "",
                "#92b9d1");
        }
        $(uiPanel).append("<h3 style='color:#92b9d1'>Patterns</h3>");
        for (const patternOccurrence of patternOccurrencesFound) {
            //TODO: highlight pattern in line's text (store the start & end first)
            $(uiPanel).append(makeLabelWithClickToScroll(patternOccurrence.pattern.source, patternOccurrence.trCodeLine));
            addButtonComment(patternOccurrence.trCodeLine, "Pattern: " + patternOccurrence.pattern.source, "",
                "#92b9d1");
        }

    }

}).apply(keyword_and_pattern_module);