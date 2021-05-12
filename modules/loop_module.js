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
        const problemColor = "#7cc208";
        const noteColor = "#999999";
        $(uiPanel).append("<h3 style='color:" + problemColor + "'>Loops</h3>");

        const methodSet = new Set(options.methodList);

        options.methodListUsage = validateStringListOption(options.methodListUsage,
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
                switch (options.methodListUsage) {
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
                    const problemDescription = "Loops were not allowed here."
                    $(uiPanel).append(makeLabelWithClickToScroll(
                        loop.methodIdentifier.length > 0 ? loop.methodIdentifier : "{loop}",
                        loop.trCodeLine, "disallowed-loop-problem", problemDescription)
                    );
                    addButtonComment(
                        loop.trCodeLine,
                        capitalize(LoopDescriptionByType.get(loop.type)),
                        problemDescription, problemColor
                    );
                }
                if (options.showAll) {
                    for (const loop of allowedLoops) {
                        $(uiPanel).append(makeLabelWithClickToScroll(
                            loop.methodIdentifier.length > 0 ? loop.methodIdentifier : "{loop}",
                            loop.trCodeLine, "", "No problems were automatically detected.")
                        );
                        addButtonComment(
                            loop.trCodeLine,
                            capitalize(LoopDescriptionByType.get(loop.type)),
                            "", noteColor
                        );
                    }
                }
            }
        }
    }
}).apply(loop_module);