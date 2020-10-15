let brace_style_module = {};

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
        $(uiPanel).append("<h3 style='color:#92b9d1'>Brace Style Module</h3>");
        $.each(trCodeLines, function (lineIndex, trCodeLine) {	// iterates each line of code below
            let codeText = getCodeFromTrCodeLine(trCodeLine);

        });
    }

}).apply(brace_style_module);