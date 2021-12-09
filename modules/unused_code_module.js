/*
* Copyright 2020 Gregory Kramida
* */

let unused_code_module = {};

(function () {
    class Options {
        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {boolean} markAllUsages whether to mark every single type/method/variable usage in the code, regardless
         * of detected errors, except for those in ignoredNames.
         * @param {boolean} checkVariables check usage of constants, fields, parameters, and local variables
         * @param {boolean} checkMethods check usage of methods and constructors
         * @param {boolean} checkTypes check usage of classes/enums/interfaces
         * @param ignoredNames (dictionary of arrays of) names/identifiers of variables, methods, and types to ignore.
         * The dictionary is a regular javascript Object, keyed by class names inside whose implementations to ignore
         * said names (represented as string arrays), globally-ignored names should be under the key 'global'.
         */
        constructor(enabled = false,
                    markAllUsages = false,
                    checkVariables = true,
                    checkMethods = false,
                    checkTypes = false,
                    ignoredNames = {"global": []}) {
            this.enabled = enabled;
            this.markAllUsages = markAllUsages;
            this.checkVariables = checkVariables;
            this.checkMethods = checkMethods;
            this.checkTypes = checkTypes;
            this.ignoredNames = ignoredNames;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    let UsageTypeByDeclarationType = new Map([
        [DeclarationType.METHOD, "method"],
        [DeclarationType.TYPE, "class/enum/interface"],
        [DeclarationType.VARIABLE, "variable"],
        [DeclarationType.CONSTANT, "constant"],
        [DeclarationType.FIELD, "field"],
        [DeclarationType.FINAL_INSTANCE_FIELD, "final instance field"],
        [DeclarationType.THIS, "this class/enum"],
        [DeclarationType.CAST, "cast"],
        [DeclarationType.CONSTRUCTOR, "constructor"],
        [DeclarationType.FINAL_STATIC_FIELD, "constant (final static) field"],
    ]);

    let LabelClassByDeclarationType = new Map([
        [DeclarationType.METHOD, "unused-method-problem"],
        [DeclarationType.TYPE, "unused-type-problem"],
        [DeclarationType.VARIABLE, "unused-variable-problem"],
        [DeclarationType.CONSTANT, "unused-variable-problem"],
        [DeclarationType.FIELD, "unused-variable-problem"],
        [DeclarationType.FINAL_INSTANCE_FIELD, "unused-variable-problem"],
        [DeclarationType.THIS, ""],
        [DeclarationType.CAST, ""],
        [DeclarationType.CONSTRUCTOR, "unused-method-problem"],
        [DeclarationType.FINAL_STATIC_FIELD, "unused-variable-problem"],
    ]);

    const moduleColor = "#802400";

    class UsageCodeEntity extends CodeEntity {
        /** {Declaration} */
        #usage;

        /**
         *
         * @param {HTMLTableRowElement} trCodeLine
         * @param {Usage} usage
         */
        constructor(trCodeLine, usage) {
            super(trCodeLine);
            this.#usage = usage;
        }

        get _labelName() {
            return this.#usage.declaration.name + " usage";
        }

        get _tagName() {
            return capitalize(UsageTypeByDeclarationType.get(usage.declaration.declarationType))
                + " \"" + this.#usage.declaration.name + "\" used.";
        }

        get _tagColor() {
            return moduleColor;
        }
    }

    class UnusedCode extends CodeEntity {
        #declaration
        #message

        /**
         *
         * @param {HTMLTableRowElement} trCodeLine
         * @param {Declaration} declaration
         */
        constructor(trCodeLine, declaration) {
            super(trCodeLine);
            this.#declaration = declaration;
            //__DEBUG
            console.log(declaration.declarationType, UsageTypeByDeclarationType.get(declaration.declarationType))
            this.#message = "Unused " + UsageTypeByDeclarationType.get(declaration.declarationType)
                + ": \"" + declaration.name + "\".";
        }

        get points(){
            return -1;
        }

        get isIssue(){
            return true;
        }

        get _labelStyleClass(){
            return LabelClassByDeclarationType.get(this.#declaration.declarationType);
        }

        get _labelName(){
            return this.#declaration.name;
        }

        get _tagName(){
            return "\"" + this.#declaration.name + "\" unused."
        }

        get _defaultMessageText(){
            return this.#message;
        }

        get _toolTip(){
            return this.#message;
        }

        get _tagColor(){
            return moduleColor;
        }

    }

    let initialized = false;


    /**
     * Initialize the module
     * @param {{moduleOptions : {unused_code_module: Options}}} global_options
     */
    this.initialize = function (global_options) {
        this.options = global_options.moduleOptions.unused_code_module;

        if (!this.options.enabled) {
            return;
        }

        this.unusedCodeEntities = [];
        this.usages = [];
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
        // configure ignored declaration types
        const declarationTypesToIgnore = new Set([DeclarationType.CAST, DeclarationType.THIS]);
        if (!this.options.checkTypes) {
            declarationTypesToIgnore.add(DeclarationType.TYPE);
        }
        if (!this.options.checkMethods) {
            declarationTypesToIgnore.add(DeclarationType.METHOD);
            declarationTypesToIgnore.add(DeclarationType.CONSTRUCTOR);
        }
        if (!this.options.checkVariables) {
            declarationTypesToIgnore.add(DeclarationType.FIELD);
            declarationTypesToIgnore.add(DeclarationType.FINAL_INSTANCE_FIELD);
            declarationTypesToIgnore.add(DeclarationType.FINAL_STATIC_FIELD);
            declarationTypesToIgnore.add(DeclarationType.VARIABLE);
            declarationTypesToIgnore.add(DeclarationType.CONSTANT);
        }

        const globalIgnoredNames = this.options.ignoredNames.global;

        for (const codeFile of fileDictionary.values()) {
            // compile identifier usage set
            for (const [typeName, typeInformation] of codeFile.types) {
                let ignoredNamesForType = [...globalIgnoredNames];
                if (this.options.ignoredNames.hasOwnProperty(typeName)) {
                    ignoredNamesForType.push(...this.options.ignoredNames[typeName]);
                }
                ignoredNamesForType = new Set(ignoredNamesForType);

                /**@type {Set.<string>}*/
                const usageSet = new Set();

                for (const usage of typeInformation.usages) {
                    if (!declarationTypesToIgnore.has(usage.declaration.declarationType) && !ignoredNamesForType.has(usage.declaration.name)) {
                        usageSet.add(usage.declaration.name);
                        this.usages.push(new UsageCodeEntity(codeFile.trCodeLines[usage.astNode.location.start.line - 1], usage))
                    }
                }
                for (const declaration of typeInformation.declarations) {
                    if (!declarationTypesToIgnore.has(declaration.declarationType) && !usageSet.has(declaration.name) && !ignoredNamesForType.has(declaration.name)) {
                        const trCodeLine = codeFile.trCodeLines[declaration.astNode.location.start.line - 1];
                        this.unusedCodeEntities.push(new UnusedCode(trCodeLine, declaration));
                    }
                }
            }
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
        $(uiPanel).append("<h3 style='color:" + moduleColor + "'>Unused Code</h3>");
        for (const unusedCodeEntity of this.unusedCodeEntities) {
            unusedCodeEntity.addAsLabelToPanel(uiPanel);
            unusedCodeEntity.addAsCodeTagWithDefaultComment();
        }
        if (this.options.markAllUsages) {
            for (const usage of this.usages) {
                usage.addAsCodeTagWithDefaultComment();
            }
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
        return this.unusedCodeEntities.concat(this.usages);
    }

}).apply(unused_code_module);