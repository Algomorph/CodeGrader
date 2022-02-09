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
        #methodReference;

        /**
         *
         * @param {HTMLTableRowElement} trCodeLine
         * @param {MethodCall} call
         * @param {boolean} inAnnotatedTest
         */
        constructor(trCodeLine, call, inAnnotatedTest) {
            super(trCodeLine);
            this.#call = call;
            const methodReference = legacyNotationToMethodReference(call.name);
            this.#message = "The " + call.callType + " `" + methodReference + "` is not tested correctly.";
            let locationDescription;
            let testAdjective;
            if (inAnnotatedTest) {
                locationDescription = "test code (click to scroll).";
                testAdjective = "";
                this.#color = moduleColor;
            } else {
                locationDescription = "code without @Test annotation (click to scroll)";
                testAdjective = " unannotated";
                this.#color = badTestColor;
            }
            this.#toolTip = "The " + call.callType + " `" + methodReference + "` appears in " + locationDescription;
            this.#tagName = capitalize(call.callType) + " call from" + testAdjective + " test: " + methodReference;
            this.#methodReference = methodReference;
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
            return this.#methodReference;
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

    class UntestedMethod extends CodeEntity {
        #shortMethodName;
        #methodReference;
        static #testScopeStartTrCodeLine;
        static #methodNames = [];

        /**
         * @param {HTMLTableRowElement} trCodeLine
         * @param {string} methodName
         */
        constructor(trCodeLine, methodName) {
            super(trCodeLine);

            UntestedMethod.#testScopeStartTrCodeLine = trCodeLine;
            let methodReference;
            if(false /*TODO: check whether methodName is actually a constructor signature*/){
                methodName = ""; //TODO: convert to constructor reference w/ arg types
            }else{
                methodName = legacyNotationToMethodReference(methodName);
            }

            let shortName = methodName;
            const parts = methodName.split('.');
            if (parts.length > 1) {
                shortName = parts[1];
            }
            UntestedMethod.#methodNames.push(methodReference);
            this.#shortMethodName = shortName;
            this.#methodReference = methodReference;
        }

        get points() {
            return -1;
        }

        /** @return {boolean} */
        get isIssue() {
            return true;
        }

        get _labelName() {
            return this.#methodReference;
        }

        get _labelStyleClass() {
            return "untested-method-problem";
        }

        get _toolTip() {
            return "The method/constructor '" + this.#shortMethodName + "' has not been tested.";
        }

        /**
         * @override
         */
        addAsCodeTagWithDefaultComment() {
            throw ("Untested methods can't have individual tags. Use the `addTagForAllUnusedTests` static method instead.");
        }

        static addTagForAllUnusedTests() {
            let message = "Constructors/methods `" + UntestedMethod.#methodNames.join("`, `") + "` do not appear to be tested.";

            addCodeTagWithComment(
                UntestedMethod.#testScopeStartTrCodeLine,
                "Generate untested code summary",
                message,
                badTestColor
            );
        }
    }

    let initialized = false;

    /**
     * Initialize the module
     * @param {{moduleOptions : {test_module: Options}}} global_options
     */
    this.initialize = function (global_options) {
        this.options = global_options.moduleOptions.test_module;

        if (!this.options.enabled) {
            return;
        }
        /** @type {Array.<TestMethodUsage>} */
        this.testCodeOccurences = [];
        /** @type {Array.<TestMethodUsage>} */
        this.unannotatedTestCodeOccurences = [];
        /** @type {Array.<UntestedMethod>} */
        this.untestedMethods = [];
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
        let methodsExpectedToBeTestedSet = new Set(this.options.methodsExpectedToBeTested);
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
                    this.testCodeOccurences.push(new TestMethodUsage(trCodeLine, call, true));
                }
            }
        }

        if (codeFileToPlaceLackOfTestLabels != null) {
            // Check all other methods in the test file. If the other methods test something not yet tested, it is most
            // likely an issue of missing "@Test". Note helper methods won't be hit by this, as they are tested already.
            for (const typeInformation of codeFileToPlaceLackOfTestLabels.types.values()) {
                /** @type {Array.<Scope>} */
                const unannotatedTestScopes = typeInformation.scopes.filter(scope => !scope.isTest);

                const unannotatedTestedMethods = searchScopes(methodsExpectedToBeTestedSet, unannotatedTestScopes, typeInformation);

                for (const call of unannotatedTestedMethods) {
                    const trCodeLine = codeFileToPlaceLackOfTestLabels.trCodeLines[call.astNode.location.start.line - 1];
                    this.testCodeOccurences.push(new TestMethodUsage(trCodeLine, call, false));
                }
            }
        }

        if (parsedCodeFiles.length === 0) {
            return;
        }

        for (const untestedMethodQualifiedName of methodsExpectedToBeTestedSet) {
            if (codeFileToPlaceLackOfTestLabels === null) {
                codeFileToPlaceLackOfTestLabels = parsedCodeFiles[0];
            }
            const trCodeLine = codeFileToPlaceLackOfTestLabels.trCodeLines[0];
            this.untestedMethods.push(new UntestedMethod(trCodeLine, untestedMethodQualifiedName));
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
        $(uiPanel).append("<h3 style='color:" + moduleColor + "'>Student Tests</h3>");
        for (const testedMethodCall of this.testCodeOccurences) {
            testedMethodCall.addAsLabelToPanel(uiPanel);
            testedMethodCall.addAsCodeTagWithDefaultComment();
        }
        for (const testedMethodCall of this.unannotatedTestCodeOccurences) {
            testedMethodCall.addAsLabelToPanel(uiPanel);
            testedMethodCall.addAsCodeTagWithDefaultComment();
        }
        for (const untestedMethod of this.untestedMethods) {
            untestedMethod.addAsLabelToPanel(uiPanel);
        }
        UntestedMethod.addTagForAllUnusedTests();
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
        return this.testCodeOccurences.concat(this.unannotatedTestCodeOccurences).concat(this.untestedMethods);
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
                let name = call.name.replace(/[\u00A0\u1680​\u180e\u2000-\u2009\u200a​\u200b​\u202f\u205f​\u3000]/g, '');
                // If the method is from the tests class, check its calls
                if (name.substring(0, 5) === "this.") {
                    let testedMethodValues = searchScopes(untestedMethods, typeInformation.scopes.filter(scope1 => scope1.astNode.hasOwnProperty("name") && scope1.astNode.name.identifier === call.methodName), typeInformation);
                    testedMethodValues.forEach(call => testedMethods.add(call));
                }

                if (untestedMethods.has(name)) {
                    testedMethods.add(call);
                    untestedMethods.delete(name);
                }
                    // If a static method is called from a non-static reference, it appears as
                    // $ClassName$.methodName when we look for ClassName.methodName.
                // However, the $'s stay if it is tested, so this is not a perfect solution.
                else if (untestedMethods.has(name.replaceAll("$", ""))) {
                    testedMethods.add(call);
                    untestedMethods.delete(name.replaceAll("$", ""));
                }
            }
        }
        return testedMethods;
    }


}).apply(test_module);
