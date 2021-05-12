/*
* Copyright 2020 Gregory Kramida
* */

let test_module = {};

(function () {

    class Options {
        enabled;
        methodsExpectedToBeTested;

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
            this.methodsExpectedToBeTested = methodsExpectedToBeTested;
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
        if (!options.enabled || codeFileDictionary.size === 0) {
            return;
        }
        $(uiPanel).append("<h3 style='color:#7c9318'>Method Tests</h3>");
        let methodsExpectedToBeTestedSet = new Set(options.methodsExpectedToBeTested);
        let codeFileToPlaceLackOfTestLabels = null;
        let parsedCodeFiles = [];
        for (const codeFile of codeFileDictionary.values()) {
            if (codeFile.parseError != null) {
                continue;
            }
            parsedCodeFiles.push(codeFile);
            for (const typeInformation of codeFile.types.values()) {
                /** @type {Array.<Scope>} */
                const testScopes = typeInformation.scopes.filter(scope => scope.isTest);
                if (testScopes.length > 0 && codeFileToPlaceLackOfTestLabels === null) {
                    codeFileToPlaceLackOfTestLabels = codeFile;
                }
                const testedMethods = searchScopes(methodsExpectedToBeTestedSet, testScopes, typeInformation);

                for(const call of testedMethods) {
                    const trCodeLine = codeFile.trCodeLines[call.astNode.location.start.line - 1];

                    if (call.callType === MethodCallType.CONSTRUCTOR) {
                        $(uiPanel).append(makeLabelWithClickToScroll(call.name, trCodeLine, "", "The constructor '" + call.name + "' appears in test code (click to scroll)."));
                        addButtonComment(trCodeLine, "Constructor call from test: " + call.name,
                            "The constructor '" + call.name + "' is not tested correctly.", "#7c9318");
                    } else {
                        $(uiPanel).append(makeLabelWithClickToScroll(call.name, trCodeLine, "", "The method '" + call.astNode.name.identifier + "' appears in test code (click to scroll)."));
                        addButtonComment(trCodeLine, "Method call from test: " + call.name,
                            "The method '" + call.astNode.name.identifier + "' is not tested correctly.", "#7c9318");
                    }
                }
            }
        }


        if (parsedCodeFiles.length === 0) {
            return;
        }
        for (const untestedMethod of methodsExpectedToBeTestedSet) {
            if (codeFileToPlaceLackOfTestLabels === null) {
                codeFileToPlaceLackOfTestLabels = parsedCodeFiles[0];
            }
            const trCodeLine = codeFileToPlaceLackOfTestLabels.trCodeLines[0];
            let shortName = untestedMethod;
            const parts = untestedMethod.split('.')
            if (parts.length > 1) {
                shortName = parts[1];
            }
            $(uiPanel).append(makeLabelWithClickToScroll(untestedMethod, trCodeLine, "untested-method-problem", "The method '" + shortName + "' has not been tested."));
            //TODO: not sure this needs to be done.
            // addButtonComment(trCodeLine, "Method was not tested: " + call.name,
            //     "The method '" + shortName + "' does not appear in tests.", "#7c9318");
        }
    }

    /**
     * Searches all scopes for the methods expected to be tested, returning the newly tested with the
     * currently untested ones.
     *
     * @param {Set.<string>} untestedMethods
     * @param {Array.<Scope>} testScopes
     * @param {TypeInformation} typeInformation
     * @returns {Set.<MethodCall>} Array of both set of tested and untested methods
     */
    function searchScopes(untestedMethods, testScopes, typeInformation) {
        let testedMethods = new Set();
        for (const scope of testScopes) {
            for (const call of scope.methodCalls) {
                // If the method is from the tests class, check its calls
                if(call.name.substring(0, 5) === "this.") {
                    let testedMethodValues = searchScopes(untestedMethods, typeInformation.scopes.filter(scope1 => scope1.astNode.hasOwnProperty("name") && scope1.astNode.name.identifier === call.methodName), typeInformation);
                    testedMethodValues.forEach(call => testedMethods.add(call));
                }

                if(untestedMethods.has(call.name)) {
                    testedMethods.add(call);
                    untestedMethods.delete(call.name);
                }
                // If a static method is called from a non-static reference, it appears as
                // $ClassName$.methodName when we look for ClassName.methodName.
                // However, the $'s stay if it is tested, so this is not a perfect solution.
                else if (untestedMethods.has(call.name.replaceAll("$", ""))) {
                        testedMethods.add(call);
                        untestedMethods.delete(call.name.replaceAll("$", ""));
                }
            }
        }
        return testedMethods;
    }


}).apply(test_module);
