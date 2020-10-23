let unused_code_module = {};

(function () {
    class Options {
        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {boolean} markAllUsages whether to mark every single type/method/variable usage in the code, regardless of detected errors.
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
                    ignoredNames= {"global": []}) {
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
        [code_analysis.DeclarationType.METHOD, "method"],
        [code_analysis.DeclarationType.TYPE, "class/enum/interface"],
        [code_analysis.DeclarationType.VARIABLE, "variable"],
        [code_analysis.DeclarationType.CONSTANT, "constant"],
        [code_analysis.DeclarationType.FIELD, "field"],
        [code_analysis.DeclarationType.CONSTANT_FIELD, "constant field"],
        [code_analysis.DeclarationType.THIS, "this class/enum"],
        [code_analysis.DeclarationType.CAST, "cast"],
        [code_analysis.DeclarationType.CONSTRUCTOR, "constructor"],
    ]);

    let ButtonClassByDeclarationType = new Map([
        [code_analysis.DeclarationType.METHOD, "unused-method-problem"],
        [code_analysis.DeclarationType.TYPE, "unused-type-problem"],
        [code_analysis.DeclarationType.VARIABLE, "unused-variable-problem"],
        [code_analysis.DeclarationType.CONSTANT, "unused-variable-problem"],
        [code_analysis.DeclarationType.FIELD, "unused-variable-problem"],
        [code_analysis.DeclarationType.CONSTANT_FIELD, "unused-variable-problem"],
        [code_analysis.DeclarationType.THIS, ""],
        [code_analysis.DeclarationType.CAST, ""],
        [code_analysis.DeclarationType.CONSTRUCTOR, "unused-method-problem"],
    ]);

    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel, add highlights and
     * buttons in the code.
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

        // configure ignored delcaration types
        const declarationTypesToIgnore = new Set([code_analysis.DeclarationType.CAST, code_analysis.DeclarationType.THIS]);
        if(!options.checkTypes){
            declarationTypesToIgnore.add(code_analysis.DeclarationType.TYPE);
        }
        if(!options.checkMethods){
            declarationTypesToIgnore.add(code_analysis.DeclarationType.METHOD);
            declarationTypesToIgnore.add(code_analysis.DeclarationType.CONSTRUCTOR);
        }
        if(!options.checkVariables){
            declarationTypesToIgnore.add(code_analysis.DeclarationType.FIELD);
            declarationTypesToIgnore.add(code_analysis.DeclarationType.CONSTANT_FIELD);
            declarationTypesToIgnore.add(code_analysis.DeclarationType.VARIABLE);
            declarationTypesToIgnore.add(code_analysis.DeclarationType.CONSTANT);
        }

        for (const codeFile of codeFileDictionary.values()) {
            // compile identifier usage set
            for (const [typeName, typeInformation] of codeFile.types) {
                /**@type {Set.<string>}*/
                const usageSet = new Set();

                for (const usage of typeInformation.usages) {
                    if (!declarationTypesToIgnore.has(usage.declaration.declarationType)) {
                        usageSet.add(usage.declaration.name);
                        if (options.markAllUsages) {
                            let usageMarkerText =
                                capitalize(UsageTypeByDeclarationType.get(usage.declaration.declarationType))
                                + " \"" + usage.declaration.name + "\" used.";
                            addButtonComment(codeFile.trCodeLines[usage.astNode.location.start.line - 1], usageMarkerText, "",
                                "#5c1a00");
                        }
                    }
                }
                for (const declaration of typeInformation.declarations) {
                    if (!declarationTypesToIgnore.has(declaration.declarationType) && !usageSet.has(declaration.name)) {
                        const unusedDeclarationMessage =
                            "Unused" + UsageTypeByDeclarationType.get(declaration.declarationType)
                            + ": \"" + declaration.name + "\".";
                        const trCodeLine = codeFile.trCodeLines[declaration.astNode.location.start.line - 1];
                        const buttonClass = ButtonClassByDeclarationType.get(declaration.declarationType);
                        $(uiPanel).append(makeLabelWithClickToScroll(declaration.name, trCodeLine, buttonClass, unusedDeclarationMessage));
                        addButtonComment(trCodeLine,  "\"" + declaration.name + "\" unused.", unusedDeclarationMessage,
                            "#5c1a00");
                    }
                }

            }
        }
    }

}).apply(unused_code_module);