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
    }

    /**
     * Perform code analysis
     * @param {Map.<string, CodeFile>} fileDictionary
     */
    this.processCode = function (fileDictionary) {
        if (!this.options.enabled) {
            return;
        }
    }

    class MarkedMethodCall extends CodeEntity {
        /** @type {MethodCall} */
        #methodCall = null
        #defaultMessageText
        #toolTip

        /** @param {MethodCall} methodCall
         * @param {string} defaultMessageText
         * @param {string} toolTip
         */
        constructor(methodCall) {
            super(methodCall.trCodeLine);
            this.#methodCall = methodCall;
            //TODO: generate these dynamically based on the methodCall, like it's done in initialize2
            this.#defaultMessageText = defaultMessageText;
            this.#toolTip = toolTip;
        }

        get isIssue(){
            return true; //Note: assumes only clicked-on tags will be counted as issues.
        }

        get _labelName() {
            return this.#methodCall.name;
        }

        get _tagName() {
            return capitalize(this.#methodCall.callType) + " call: " + this.#methodCall.name;
        }

        get _defaultMessageText(){
            return this.#defaultMessageText;
        }

        get _tagColor() {
            return TagAndSectionColorByNameType[this.#declaration.nameType];
        }


    }


    /**
     * Initialize the module: analyze the parsed code as necessary, add relevant controls to the UI panel.
     * @param {HTMLDivElement} uiPanel the UI panel where to add the controls.
     * @param {Map.<string,CodeFile>} fileDictionary dictionary of CodeFile objects to analyze for calls.
     * @param {Options} options options for the module.
     */
    this.initialize2 = function (uiPanel, fileDictionary, options) {
        if (!options.enabled) {
            return;
        }
        $(uiPanel).append("<h3 style='color:#b3769f'>Method Calls</h3>");
        const globallyIgnoredMethods = options.ignoredMethods.global;

        let methodCalls = [];

        const ignoredTypes = new Set(options.ignoredTypes);

        for (const codeFile of fileDictionary.values()) {
            if (codeFile.abstractSyntaxTree !== null) {

                //iterate over classes / enums / etc.
                for (const [typeName, typeInformation] of codeFile.types) {
                    if (ignoredTypes.has(typeName)) {
                        continue;
                    }
                    let ignoredMethodsForType = [...globallyIgnoredMethods];
                    if (options.ignoredMethods.hasOwnProperty(typeName)) {
                        ignoredMethodsForType.push(...options.ignoredMethods[typeName]);
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

        if (options.showUniqueOnly) {
            methodCalls = uniqueNames(methodCalls);
        }

        for (const methodCall of methodCalls) {
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
                $(uiPanel).append(makeLabelWithClickToScroll(methodCall.name, methodCall.trCodeLine,
                    "possibly-ignored-method-call", "No problems were automatically detected."));
            } else {
                $(uiPanel).append(makeLabelWithClickToScroll(methodCall.name, methodCall.trCodeLine, "",
                    potentialProblemMessage));
            }

            addCodeTagWithComment(
                methodCall.trCodeLine, capitalize(methodCall.callType) + " call: " + methodCall.name, problemMessage, "#b3769f"
            );
        }
    }

}).apply(method_call_module);