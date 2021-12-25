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

    const moduleColor = "#7c9318";
    const badTestColor = "#7c3518";

    class TestMethodUsage extends CodeEntity {
        #call;
        #message;
        #toolTip;
        #tagName;
        #color;

        /**
         *
         * @param {HTMLTableRowElement} trCodeLine
         * @param {MethodCall} call
         * @param {boolean} inAnnotatedTest
         */
        constructor(trCodeLine, call, inAnnotatedTest) {
            super(trCodeLine);
            this.#call = call;

            this.#message = "The " + call.callType + " '" + call.name + "' is not tested correctly.";
            let locationDescription;
            let testAdjective;
            if(inAnnotatedTest){
                locationDescription = "test code (click to scroll).";
                testAdjective = "";
                this.#color = moduleColor;
            }else{
                locationDescription = "code without @Test annotation (click to scroll)";
                testAdjective = " unannotated";
                this.#color = badTestColor;
            }
            this.#toolTip = "The " + call.callType + " '" + call.name + "' appears in " + locationDescription;
            this.#tagName = capitalize(call.callType) + " call from" + testAdjective + " test: " + call.name;

        }

        get points() {
            return -1;
        }

        get isIssue() {
            return true;
        }

        get _labelStyleClass() {
            return "";
        }

        get _labelName() {
            return this.#call.name;
        }

        get _tagName() {
            return this.#tagName;
        }

        get _defaultMessageText() {
            return this.#message;
        }

        get _toolTip() {
            return this.#toolTip
        }

        get _tagColor() {
            return this.#color;
        }
    }

    class UntestedMethod extends CodeEntity{
        #shortMethodName;
        static #testScopeStartTrCodeLine;
        static #methodNames = [];
        /**
         * @param {HTMLTableRowElement} trCodeLine
         * @param {string} methodName
         */
        constructor( trCodeLine, methodName) {
            super(trCodeLine);

            UntestedMethod.#testScopeStartTrCodeLine = trCodeLine;
            let shortName = methodName;
            const parts = methodName.split('.')
            if (parts.length > 1) {
                shortName = parts[1];
            }
            UntestedMethod.#methodNames.push(shortName);
            this.#shortMethodName = shortName;
        }

        get points(){
            return -1;
        }

        /** @return {boolean} */
        get isIssue(){
            return true;
        }

        get _labelName(){
            throw ("labelName property getter for any subclass of " + CodeEntity.constructor.name + " should be overridden.");
        }

        get _labelStyleClass(){
            return "untested-method-problem";
        }

        get _toolTip(){
            return "The method/constructor '" + this.#shortMethodName + "' has not been tested.";
        }

        /**
         * @override
         */
        addAsCodeTagWithDefaultComment(){
            throw ("Untested methods can't have individual tags. Use the `addTagForAllUnusedTests` static method instead.");
        }

        static addTagForAllUnusedTests(){
            let message = "Constructors/methods " + UntestedMethod.#methodNames.join(", ") + " do not appear to be tested.";

            addCodeTagWithComment(
                UntestedMethod.#testScopeStartTrCodeLine,
                "Generate untested code summary",
                message,
                badTestColor
            );
        }
    }

    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel, add highlights and
     * buttons in the code.
     *
     * @param {HTMLDivElement} uiPanel main panel where to add controls
     * @param {Map.<string,CodeFile>} codeFileDictionary
     * @param {Options} options
     */
    this.initialize2 = function (uiPanel, codeFileDictionary, options) {
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
            if (codeFile.filename.includes('StudentTests.java')) {
                codeFileToPlaceLackOfTestLabels = codeFile;
            }
            for (const typeInformation of codeFile.types.values()) {
                /** @type {Array.<Scope>} */
                const testScopes = typeInformation.scopes.filter(scope => scope.isTest);
                if (testScopes.length > 0 && codeFileToPlaceLackOfTestLabels === null) {
                    codeFileToPlaceLackOfTestLabels = codeFile;
                }
                const testedMethods = searchScopes(methodsExpectedToBeTestedSet, testScopes, typeInformation);

                for (const call of testedMethods) {
                    const trCodeLine = codeFile.trCodeLines[call.astNode.location.start.line - 1];

                    if (call.callType === MethodCallType.CONSTRUCTOR) {
                        $(uiPanel).append(makeLabelWithClickToScroll(call.name, trCodeLine, "", "The constructor '" + call.name + "' appears in test code (click to scroll)."));
                        addCodeTagWithComment(trCodeLine, "Constructor call from test: " + call.name,
                            "The constructor '" + call.name + "' is not tested correctly.", "#7c9318");
                    } else {
                        $(uiPanel).append(makeLabelWithClickToScroll(call.name, trCodeLine, "", "The method '" + call.astNode.name.identifier + "' appears in test code (click to scroll)."));
                        addCodeTagWithComment(trCodeLine, "Method call from test: " + call.name,
                            "The method '" + call.astNode.name.identifier + "' is not tested correctly.", "#7c9318");
                    }
                }
            }
        }

        if (codeFileToPlaceLackOfTestLabels != null) {
            // Check all other methods in the test file. If the other methods test something not yet tested, it is most
            // likely an issue of missing "@Test". Note helper methods won't be hit by this, as they are tested already.
            for (const typeInformation of codeFileToPlaceLackOfTestLabels.types.values()) {
                /** @type {Array.<Scope>} */
                const semiTestScopes = typeInformation.scopes.filter(scope => !scope.isTest);

                const semiTestedMethods = searchScopes(methodsExpectedToBeTestedSet, semiTestScopes, typeInformation);

                for (const call of semiTestedMethods) {
                    const trCodeLine = codeFileToPlaceLackOfTestLabels.trCodeLines[call.astNode.location.start.line - 1];

                    if (call.callType === MethodCallType.CONSTRUCTOR) {
                        $(uiPanel).append(makeLabelWithClickToScroll(call.name, trCodeLine, "", "The constructor '" + call.name + "' appears in code without @Test (click to scroll)."));
                        addCodeTagWithComment(trCodeLine, "Constructor call from method without annotation: " + call.name,
                            "The constructor '" + call.name + "' is not tested correctly.", "#7c3518");
                    } else {
                        $(uiPanel).append(makeLabelWithClickToScroll(call.name, trCodeLine, "", "The method '" + call.astNode.name.identifier + "' appears in code without @Test (click to scroll)."));
                        addCodeTagWithComment(trCodeLine, "Method call from method without annotation: " + call.name,
                            "The method '" + call.astNode.name.identifier + "' is not tested correctly.", "#7c3518");
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

            $(uiPanel).append(makeLabelWithClickToScroll(untestedMethod, trCodeLine, "untested-method-problem", "The method/constructor '" + shortName + "' has not been tested."));
            //TODO: not sure this needs to be done.
            // addCodeTagWithComment(trCodeLine, "Method was not tested: " + call.name,
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
                if (call.name.substring(0, 5) === "this.") {
                    let testedMethodValues = searchScopes(untestedMethods, typeInformation.scopes.filter(scope1 => scope1.astNode.hasOwnProperty("name") && scope1.astNode.name.identifier === call.methodName), typeInformation);
                    testedMethodValues.forEach(call => testedMethods.add(call));
                }

                if (untestedMethods.has(call.name)) {
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
