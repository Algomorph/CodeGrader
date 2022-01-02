/*
* Copyright 2020 Gregory Kramida
* */
let loop_module = {};

(function () {

    class Options {
        enabled;
        methodList;
        methodListUsage;
        showAll = true;

        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {Array.<string>} methodList list of methods to either include or exclude in the loop analysis (see methodListUsage)
         * Method list should be composed of unique method name identifiers, e.g. "$ClassName$.methodName" for instance methods
         * and "ClassName.methodName" for static methods.
         * @param {string} methodListUsage must be set to "disallowed" or "allowed", dictates how to use the method list.
         * With "allowed", method list is used as a list of methods where loops are allowed, and other loops will be marked as
         * potential errors. With "disallowed", the method list is used as a list of methods where loops are prohibited.
         * @param {boolean} showAll whether to show loops not considered as potential errors as well.
         */
        constructor(enabled = false, methodList = [], methodListUsage = "disallowed", showAll = true) {
            this.enabled = enabled;
            this.methodList = methodList;
            this.methodListUsage = methodListUsage;
            this.showAll = showAll;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    const moduleColor = "#7cc208";


    class LoopEntity extends CodeEntity{
        #loop;
        /**
         * @param {Loop} loop
         */
        constructor( loop) {
            super(loop.trCodeLine);
            this.#loop = loop;
        }

        get _labelName(){
            return this.#loop.methodIdentifier.length > 0 ? legacyNotationToMethodReference(this.#loop.methodIdentifier) : "{loop}";
        }

        get _tagName(){
            return capitalize(LoopDescriptionByType.get(this.#loop.type));
        }

        get _defaultMessageText(){
            return this._toolTip;
        }
    }

    class DisallowedLoop extends LoopEntity{
        get points(){
            return -5;
        }

        get isIssue(){
            return true;
        }

        get _labelStyleClass(){
            return "disallowed-loop-problem";
        }

        get _toolTip(){
            return "Loops were not allowed here.";
        }

        get _tagColor(){
            return moduleColor;
        }
    }

    const noteColor = "#999999";


    class AllowedLoop extends LoopEntity{
        get _tagColor(){
            return "#999999";
        }
    }

    let initialized = false;

    /**
     * Initialize the module
     * @param {{moduleOptions : {loop_module: Options}}} global_options
     */
    this.initialize = function (global_options) {
        this.options = global_options.moduleOptions.loop_module;

        if (!this.options.enabled) {
            return;
        }

        /** @type {Array.<DisallowedLoop>} */
        this.disallowedLoops = [];
        /** @type {Array.<AllowedLoop>} */
        this.allowedLoops = [];

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
        const methodSet = new Set(this.options.methodList);

        this.options.methodListUsage = validateStringListOption(this.options.methodListUsage,
            "moduleOptions.loop_module.methodListUsage", ["allowed", "disallowed"],
            "disallowed");

        for (const codeFile of codeFileDictionary.values()) {
            if (codeFile.parseError != null) {
                continue;
            }

            for (const typeInformation of codeFile.types.values()) {
                const loopsInListedMethods = typeInformation.loops.filter(loop => methodSet.has(loop.methodIdentifier));
                const otherLoops = typeInformation.loops.filter(loop => !methodSet.has(loop.methodIdentifier));
                let disallowedLoops = [];
                let allowedLoops = [];
                switch (this.options.methodListUsage) {
                    case "allowed":
                        disallowedLoops = otherLoops;
                        allowedLoops = loopsInListedMethods;
                        break;
                    case "disallowed":
                        disallowedLoops = loopsInListedMethods;
                        allowedLoops = otherLoops;
                        break;
                    default:
                        break;
                }
                for (const loop of disallowedLoops) {
                    this.disallowedLoops.push(new DisallowedLoop(loop));
                }
                if (this.options.showAll) {
                    for (const loop of allowedLoops) {
                        this.allowedLoops.push(new AllowedLoop(loop));
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
        $(uiPanel).append("<h3 style='color:" + moduleColor + "'>Loops</h3>");
        for (const disallowedLoop of this.disallowedLoops) {
            disallowedLoop.addAsLabelToPanel(uiPanel);
            disallowedLoop.addAsCodeTagWithDefaultComment();
        }
        for (const allowedLoop of this.allowedLoops) {
            allowedLoop.addAsLabelToPanel(uiPanel);
            allowedLoop.addAsCodeTagWithDefaultComment();
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
        // noinspection JSCheckFunctionSignatures
        return this.allowedLoops.concat(this.disallowedLoops);
    }

}).apply(loop_module);