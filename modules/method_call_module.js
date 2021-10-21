/*
* Copyright 2020 Gregory Kramida
* */

let method_call_module = {};

(function () {

    class Options {
        /**
         * Make options for this module.
         * @param {boolean} enabled whether the module is enabled.
         * @param ignoredMethods (dictionary of lists of) methods whose calls to ignore.
         * The dictionary is keyed by class names inside whose implementations to ignore said calls,
         * globally-ignored methods should be under the key 'global'.
         * Use '$ClassName$.someInstanceMethod' for instance method 'someInstanceMethod' of class 'ClassName'.
         * Use 'ClassName.someStaticMethod' for static method 'someStaticMethod' of class 'ClassName'.
         * @param {boolean} showUniqueOnly whether to show only unique method call occurrences.
         * @param {Array.<string>} ignoredTypes list of types (classes/enums) that will be completely ignored by the module.
         */
        constructor(enabled = false,
                    ignoredMethods = {"global": []},
                    showUniqueOnly = false,
                    ignoredTypes = []) {
            this.enabled = enabled;
            this.ignoredMethods = ignoredMethods;
            this.showUniqueOnly = showUniqueOnly;
            this.ignoredTypes = ignoredTypes;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    const moduleColor = "#b3769f";

    class MarkedMethodCall extends CodeEntity {
        /** @type {MethodCall} */
        #methodCall = null
        #defaultMessageText
        #toolTip
        #isIssue = false
        #labelStyleClass = ""

        /**
         * @param {MethodCall} methodCall
         */
        constructor(methodCall) {
            super(methodCall.trCodeLine);
            this.#methodCall = methodCall;
            let problemMessageBase = "This call ";

            switch (methodCall.callType) {
                case MethodCallType.METHOD:
                    problemMessageBase = "Call to " + methodCall.callType + " \"" + methodCall.methodName + "\""
                        + (methodCall.nameOfCalledType != null ? " of class \"" + methodCall.nameOfCalledType + "\"" : "")
                    break;
                case MethodCallType.SUPER_METHOD:
                    problemMessageBase = "Call to " + methodCall.callType + " \"" + methodCall.methodName + "\""
                    break;
                case MethodCallType.SUPER_CONSTRUCTOR:
                    problemMessageBase = "Call to this " + methodCall.callType;
                    break;
                case MethodCallType.CONSTRUCTOR:
                    problemMessageBase = "Call to this " + methodCall.callType + " of class \"" +
                        methodCall.nameOfCalledType + "\"";
                    break;
            }
            const potentialProblemMessage = problemMessageBase + " was potentially not allowed here.";
            const problemMessage = problemMessageBase + " was not allowed here.";

            if (methodCall.possiblyIgnored) {
                this.#toolTip = "No problems were automatically detected.";
                this.#labelStyleClass = "possibly-ignored-method-call";
                this.#isIssue = false;
            } else {
                this.#toolTip = potentialProblemMessage;
                this.#isIssue = true;
            }
            this.#defaultMessageText = problemMessage;
        }


        get _labelStyleClass() {
            return "";
        }

        get _labelName() {
            return this.#methodCall.name;
        }


        get _toolTip(){
            return this.#toolTip;
        }

        get _tagName() {
            return capitalize(this.#methodCall.callType) + " call: " + this.#methodCall.name;
        }

        get _defaultMessageText() {
            return this.#defaultMessageText;
        }

        get _tagColor() {
            return moduleColor;
        }

        get isIssue() {
            return this.#isIssue;
        }

        /** @return {number} */
        get points() {
            return -3;
        }

    }

    let initialized = false;

    /**
     * Initialize the module
     * @param {{moduleOptions : {method_call_module: Options}}} global_options
     */
    this.initialize = function (global_options) {
        this.options = global_options.moduleOptions.method_call_module;

        if (!this.options.enabled) {
            return;
        }
        initialized = true;
        /** @type {Array.<MarkedMethodCall>}>}*/
        this.markedMethodCalls = [];
    }

    /**
     * Perform code analysis
     * @param {Map.<string, CodeFile>} fileDictionary
     */
    this.processCode = function (fileDictionary) {
        if (!this.options.enabled) {
            return;
        }

        const globallyIgnoredMethods = this.options.ignoredMethods.global;

        let methodCalls = [];

        const ignoredTypes = new Set(this.options.ignoredTypes);

        for (const codeFile of fileDictionary.values()) {
            if (codeFile.abstractSyntaxTree !== null) {

                //iterate over classes / enums / etc.
                for (const [typeName, typeInformation] of codeFile.types) {
                    if (ignoredTypes.has(typeName)) {
                        continue;
                    }
                    let ignoredMethodsForType = [...globallyIgnoredMethods];
                    if (this.options.ignoredMethods.hasOwnProperty(typeName)) {
                        ignoredMethodsForType.push(...this.options.ignoredMethods[typeName]);
                    }
                    ignoredMethodsForType = new Set(ignoredMethodsForType);
                    let methodCallsForType = [...typeInformation.methodCalls].filter(methodCall =>
                        !ignoredMethodsForType.has(methodCall.name)
                    )
                    // special "this." case handling
                    if (ignoredMethodsForType.has("this.")) {
                        methodCallsForType = methodCallsForType.filter(methodCall =>
                            !methodCall.name.startsWith("this.")
                        )
                    }
                    methodCallsForType.forEach((methodCall) => {
                        if (methodCall.astNode.hasOwnProperty("name") &&
                            ignoredMethodsForType.has(methodCall.astNode.name.identifier)) {
                            methodCall.possiblyIgnored = true;
                        }
                    })
                    methodCalls.push(...methodCallsForType);
                }
            }
        }

        if (this.options.showUniqueOnly) {
            methodCalls = uniqueNames(methodCalls);
        }

        for (const methodCall of methodCalls) {
            this.markedMethodCalls.push(new MarkedMethodCall(methodCall));
        }
    }

    /**
     * Add each section of naming information to the UI panel.
     * @param {HTMLDivElement} uiPanel
     */
    this.addInfoToUiPanel = function (uiPanel) {
        if (!this.options.enabled) {
            return;
        }
        $(uiPanel).append("<h3 style='color:" + moduleColor + "'>Method Calls</h3>");
        for (const markedMethodCall of this.markedMethodCalls) {
            markedMethodCall.addAsLabelToPanel(uiPanel);
            markedMethodCall.addAsCodeTagWithDefaultComment();
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
        return this.markedMethodCalls;
    }


}).apply(method_call_module);