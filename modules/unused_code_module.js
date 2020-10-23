let unused_code_module = {};

(function (){
    class Options {
        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {boolean} markAllUsages whether to mark every single type/method/variable usage in the code, regardless of detected errors.
         */
        constructor(enabled = false, markAllUsages = false) {
            this.enabled = enabled;
            this.markAllUsages = markAllUsages;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }
    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel, add highlights and
     * button-labels in the code.
     *
     * @param {HTMLDivElement} uiPanel main panel where to add controls
     * @param {Map.<string,CodeFile>} codeFileDictionary
     * @param {Options} options
     */
    this.initialize = function (uiPanel, codeFileDictionary, options) {
        if (!options.enabled) {
            return;
        }
        $(uiPanel).append("<h3 style='color:#5c1a00'>Unused Code</h3>");

        for (const codeFile of codeFileDictionary.values()) {
            for (const typeInformation of codeFile.types.values()) {
                for (const usage of typeInformation.usages) {

                }
            }
        }
    }

}).apply(unused_code_module);