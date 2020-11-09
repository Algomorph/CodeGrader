/*
* Copyright 2020 Gregory Kramida
* */

let test_module = {};

(function () {

    class Options {
        methodExpectedToTested;

        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {Array.<string>} methodsExpectedToBeTested an array of string identifiers for methods that expected to
         * be tested with a JUnit test somewhere in the code.
         * Use '$ClassName$.someInstanceMethod' for instance method 'someInstanceMethod' of class 'ClassName'.
         * Use 'ClassName.someStaticMethod' for static method 'someStaticMethod' of class 'ClassName'.
         */
        constructor(enabled = false, methodsExpectedToBeTested = []) {
            this.enabled = enabled;
            this.methodExpectedToTested = methodsExpectedToBeTested;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel, add highlights and
     * buttons in the code.
     *
     * @param {HTMLDivElement} uiPanel main panel where to add controls
     * @param {Map.<string,CodeFile>} codeFileDictionary
     * @param {Options} options
     */
    this.initialize = function (uiPanel, codeFileDictionary, options) {
        $(uiPanel).append("<h3 style='color:#7c9318'>Method Tests</h3>");
        if (!options.enabled || codeFileDictionary.size === 0) {
            return;
        }
        const untestedMethods = new Set(options.methodExpectedToTested);
        let codefileToPlaceLackOfTestLabels = null;
        let parsedCodeFiles = [];
        for (const codeFile of codeFileDictionary.values()) {
            if(codeFile.parseError != null){
                continue;
            }
            parsedCodeFiles.push(codeFile);
            for (const typeInformation of codeFile.types.values()) {
                /** @type {Array.<Scope>} */
                const testScopes = typeInformation.scopes.filter(scope => scope.isTest);
                if (testScopes.length > 0 && codefileToPlaceLackOfTestLabels === null) {
                    codefileToPlaceLackOfTestLabels = codeFile;
                }
                for (const scope of testScopes) {
                    for (const call of scope.methodCalls) {
                        if (untestedMethods.has(call.name)) {
                            const trCodeLine = codeFile.trCodeLines[call.astNode.location.start.line - 1];
                            $(uiPanel).append(makeLabelWithClickToScroll(call.name, trCodeLine, "",
                                "The method '" + call.astNode.name.identifier + "' appears in test code (click to scroll)."));
                            addButtonComment(trCodeLine, "Method call from test: " + call.name,
                                "The method '" + call.astNode.name.identifier + "' is not tested correctly.", "#7c9318");
                            untestedMethods.delete(call.name);
                        }
                    }
                }
            }
        }
        if(parsedCodeFiles.length === 0){
            return;
        }
        for (const untestedMethod of untestedMethods) {
            if (codefileToPlaceLackOfTestLabels === null) {
                codefileToPlaceLackOfTestLabels = parsedCodeFiles[0];
            }
            const trCodeLine = codefileToPlaceLackOfTestLabels.trCodeLines[0];
            let shortName = untestedMethod;
            const parts = untestedMethod.split('.')
            if (parts.length > 1) {
                shortName = parts[1];
            }
            $(uiPanel).append(makeLabelWithClickToScroll(untestedMethod, trCodeLine, "untested-method-problem",
                "The method '" + shortName + "' has not been tested."));
            //TODO: not sure this needs to be done.
            // addButtonComment(trCodeLine, "Method was not tested: " + call.name,
            //     "The method '" + shortName + "' does not appear in tests.", "#7c9318");
        }
    }


}).apply(test_module);