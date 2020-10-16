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
     * @param {Map.<string,CodeFile>} codeFileDictionary
     * @param {Options} options
     */
    this.initialize = function (uiPanel, codeFileDictionary, options) {
        if (!options.enabled) {
            return;
        }
        $(uiPanel).append("<h3 style='color:#843a02'>Brace Style</h3>");

        for (const codeFile of codeFileDictionary.values()) {
            console.log(codeFile.filename);
            for (const typeInformation of codeFile.types.values()) {
                for (const scope of typeInformation.scopes){
                    if(scope.astNode.node === "IfStatement"){
                        console.log(scope.astNode);
                        console.log(codeFile.sourceCode.substring(scope.astNode.location.start.offset, scope.astNode.location.end.offset));
                    }
                }
            }
        }
    }

}).apply(brace_style_module);