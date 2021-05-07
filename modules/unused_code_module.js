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
        [DeclarationType.FINAL_INSTANCE_FIELD, "constant field"],
        [DeclarationType.THIS, "this class/enum"],
        [DeclarationType.CAST, "cast"],
        [DeclarationType.CONSTRUCTOR, "constructor"],
    ]);

    let ButtonClassByDeclarationType = new Map([
        [DeclarationType.METHOD, "unused-method-problem"],
        [DeclarationType.TYPE, "unused-type-problem"],
        [DeclarationType.VARIABLE, "unused-variable-problem"],
        [DeclarationType.CONSTANT, "unused-variable-problem"],
        [DeclarationType.FIELD, "unused-variable-problem"],
        [DeclarationType.FINAL_INSTANCE_FIELD, "unused-variable-problem"],
        [DeclarationType.THIS, ""],
        [DeclarationType.CAST, ""],
        [DeclarationType.CONSTRUCTOR, "unused-method-problem"],
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
        const unusedCodeOccurrenceColor = "#802400";

        $(uiPanel).append("<h3 style='color:" + unusedCodeOccurrenceColor + "'>Unused Code</h3>");

        // configure ignored declaration types
        const declarationTypesToIgnore = new Set([DeclarationType.CAST, DeclarationType.THIS]);
        if (!options.checkTypes) {
            declarationTypesToIgnore.add(DeclarationType.TYPE);
        }
        if (!options.checkMethods) {
            declarationTypesToIgnore.add(DeclarationType.METHOD);
            declarationTypesToIgnore.add(DeclarationType.CONSTRUCTOR);
        }
        if (!options.checkVariables) {
            declarationTypesToIgnore.add(DeclarationType.FIELD);
            declarationTypesToIgnore.add(DeclarationType.FINAL_INSTANCE_FIELD);
            declarationTypesToIgnore.add(DeclarationType.FINAL_STATIC_FIELD);
            declarationTypesToIgnore.add(DeclarationType.VARIABLE);
            declarationTypesToIgnore.add(DeclarationType.CONSTANT);
        }

        const globalIgnoredNames = options.ignoredNames.global;

        for (const codeFile of codeFileDictionary.values()) {
            // compile identifier usage set
            for (const [typeName, typeInformation] of codeFile.types) {
                let ignoredNamesForType = [...globalIgnoredNames];
                if (options.ignoredNames.hasOwnProperty(typeName)) {
                    ignoredNamesForType.push(...options.ignoredNames[typeName]);
                }
                ignoredNamesForType = new Set(ignoredNamesForType);

                /**@type {Set.<string>}*/
                const usageSet = new Set();

                for (const usage of typeInformation.usages) {
                    if (!declarationTypesToIgnore.has(usage.declaration.declarationType) && !ignoredNamesForType.has(usage.declaration.name)) {
                        usageSet.add(usage.declaration.name);
                        if (options.markAllUsages) {
                            let usageMarkerText =
                                capitalize(UsageTypeByDeclarationType.get(usage.declaration.declarationType))
                                + " \"" + usage.declaration.name + "\" used.";
                            addButtonComment(codeFile.trCodeLines[usage.astNode.location.start.line - 1], usageMarkerText, "",
                                unusedCodeOccurrenceColor);
                        }
                    }
                }
                for (const declaration of typeInformation.declarations) {
                    if (!declarationTypesToIgnore.has(declaration.declarationType) && !usageSet.has(declaration.name) && !ignoredNamesForType.has(declaration.name)) {

                        const unusedDeclarationMessage =
                            "Unused " + UsageTypeByDeclarationType.get(declaration.declarationType)
                            + ": \"" + declaration.name + "\".";
                        const trCodeLine = codeFile.trCodeLines[declaration.astNode.location.start.line - 1];
                        const buttonClass = ButtonClassByDeclarationType.get(declaration.declarationType);
                        $(uiPanel).append(makeLabelWithClickToScroll(declaration.name, trCodeLine, buttonClass, unusedDeclarationMessage));
                        addButtonComment(trCodeLine, "\"" + declaration.name + "\" unused.", unusedDeclarationMessage,
                            unusedCodeOccurrenceColor);
                    }
                }

            }
        }
    }

}).apply(unused_code_module);