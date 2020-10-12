let keywordModule = {};

(function () {

    class Options {
        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {Array.<string>} keywords specific keywords to scan for.
         */
        constructor(enabled = false, keywords = []) {
            this.enabled = enabled;
            this.keywords = keywords;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel.
     * @param {HTMLDivElement} uiPanel main panel where to add controls
     * @param {Array.<HTMLTableRowElement>} trCodeLines
     * @param {Options} options
     */
    this.initialize = function (uiPanel, trCodeLines, options) {
        if(!options.enabled){
            return;
        }
        $(uiPanel).append("<h3 style='color:#92b9d1'>Prohibited Keywords</h3>");
        let wordsToFind = options.keywords;
        $.each(trCodeLines, function (tri, trCodeLine) {	// iterates each line of code below
            let codeText = getCodeFromTrCodeLine(trCodeLine);
            if (codeText.match(/\/\//i)) return;
            let wordsFoundInCodeText = _.filter(wordsToFind, function (keyword) {
                return codeText.indexOf(keyword) !== -1;
            });
            _.each(wordsFoundInCodeText, function (keyword) {
                $(uiPanel).append(makeLabelWithClickToScroll(keyword, trCodeLine));
                addButtonComment(trCodeLine, "Prohibited keyword: " + keyword, " ", "#92b9d1");
            });
        });
    }

}).apply(keywordModule);