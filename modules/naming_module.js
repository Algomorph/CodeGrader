let naming_module = {};

(function () {

    class Options {
        /**
         * Make options for this module.
         * @param {boolean} enabled
         * @param {Array.<string>} allowedSpecialWords
         * @param ignoredNames (dictionary of lists of) code names to ignore.
         * The dictionary is keyed by class names inside whose implementations to ignore said names,
         * globally-ignored names should be under the key 'global'.
         * @param {boolean} showUniqueOnly whether to show only unique code name occurrences.
         * @param {boolean} numbersAllowedInNames whether arbitrary integral numbers are considered fair-game for variable names
         */
        constructor(enabled = false,
                    allowedSpecialWords = ["min", "max"],
                    ignoredNames = {"global": []},
                    showUniqueOnly = true,
                    numbersAllowedInNames = true) {
            this.enabled = enabled;
            this.allowedSpecialWords = allowedSpecialWords;
            this.ignoredNames = ignoredNames;
            this.showUniqueOnly = showUniqueOnly;
            this.numbersAllowedInNames = numbersAllowedInNames;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }


    const NameTypeConvention = {
        'method': 'camelCase',
        'variable': 'camelCase',
        'type': 'PascalCase',
        'constant': 'ALL_CAPS_SNAKE_CASE',
    }


    /**
     * Check if the given name follows proper camelCase convention.
     * @param {string} name some string
     * @return {boolean} return true if name is in camelCase, false otherwise.
     */
    function isCamelCase(name) {
        return /^[a-z]+(?:(?:A)|(?:[A-Z][a-z]+))*[A-Z]?$/.test(name);
    }

    /**
     * Check if the given name follows proper PascalCase convention.
     * @param {string} name some string
     * @return {boolean} return true if name is in PascalCase, false otherwise.
     */
    function isPascalCase(name) {
        return /^(?:(?:A)|(?:[A-Z][a-z]+))*[A-Z]?$/.test(name);
    }

    /**
     * Check if the given name follows proper ALL_CAPS_SNAKE_CASE convention.
     * @param {string} name some string
     * @return {boolean} return true if name is in ALL_CAPS_SNAKE_CASE, false otherwise.
     */
    function isAllCapsSnakeCase(name) {
        return /^[A-Z]+(?:_[A-Z]+)*$/.test(name);
    }

    const NameTypeConventionCheck = {
        'method': isCamelCase,
        'variable': isCamelCase,
        'type': isPascalCase,
        'constant': isAllCapsSnakeCase,
    }

    /**
     * Splits a name into "words" (or attempts to).
     * Assumes camelCase, PascalCase, or ALL_CAPS_SNAKE_CASE.
     * @param {Declaration} declaration some string
     * @param {boolean} omitNumbers if true, will omit any numbers
     * @return {*|string[]}
     */
    function splitCodeNameIntoWords(declaration, omitNumbers = true) {
        let name = declaration.name;
        if(omitNumbers){
            name = name.replace(/\d+/g, "");
        }
        if (declaration.nameType === code_analysis.NameType.CONSTANT) {
            return name.split('_').map(word => word.toLowerCase());
        } else {
            return name.split(/(?=[A-Z])/).map(word => word.toLowerCase());
        }
    }

    const NameCheckProblemType = {
        NAMING_CONVENTION: 1,
        NON_DICTIONARY_WORD: 2
    }

    const NameCheckProblemTypeExplanation = {
        1: "Naming convention problem detected.",
        2: "Non-descriptive variable name detected: the name includes a non-dictionary word, abbreviation, or uncommon acronym."
    }

    const NameCheckProblemStyleClass = {
        1: "naming-convention-problem",
        2: "naming-non-dictionary-word-problem"
    }

    /**
     * Represents a potential problem detected with a name in Java code.
     */
    class NameCheckProblem {
        /**
         * @param {number} type
         * @param {string} description
         */
        constructor(type, description) {
            this.type = type;
            this.description = description;
        }
    }

    /**
     * Checks a code name occurrence for potential problems.
     * @param {Declaration} declaration
     * @param {boolean} numbersAllowedInNames are numbers considered fair game as part of the name
     * @return {Array.<NameCheckProblem>}
     */
    function checkName(declaration, numbersAllowedInNames = true) {
        let potentialProblems = []
        let name = declaration.name;
        if(numbersAllowedInNames){
            name = name.replace(/\d+/g,"");
        }
        if (!NameTypeConventionCheck[declaration.nameType](name)) {
            potentialProblems.push(new NameCheckProblem(NameCheckProblemType.NAMING_CONVENTION,
                NameCheckProblemTypeExplanation[NameCheckProblemType.NAMING_CONVENTION] + " "
                + capitalize(declaration.nameType) + " \"" + declaration.name + "\" doesn&#39;t seem to follow the "
                + NameTypeConvention[declaration.nameType] + " convention."));
        } else {
            // Note that currently, we cannot detect non-dictionary problem if the variable does not use proper notation,
            // because the splitting relies on the notation.
            let words = splitCodeNameIntoWords(declaration);
            let nonDictionaryWords = [];
            for (const word of words) {
                if (!usEnglishWordList.has(word)) {
                    nonDictionaryWords.push(word);
                }
            }
            if (nonDictionaryWords.length > 0) {
                if (nonDictionaryWords.length > 1) {
                    potentialProblems.push(new NameCheckProblem(NameCheckProblemType.NON_DICTIONARY_WORD,
                        NameCheckProblemTypeExplanation[NameCheckProblemType.NON_DICTIONARY_WORD] +
                        " " + capitalize(declaration.nameType) + " \"" + declaration.name + "\" has parts \""
                        + nonDictionaryWords.join("\", \"") + "\" that appear problematic."));
                } else {
                    potentialProblems.push(new NameCheckProblem(NameCheckProblemType.NON_DICTIONARY_WORD,
                        NameCheckProblemTypeExplanation[NameCheckProblemType.NON_DICTIONARY_WORD] +
                        " " + capitalize(declaration.nameType) + " \"" + declaration.name + "\" has part \""
                        + nonDictionaryWords[0] + "\" that appears problematic."));
                }
            }
        }
        return potentialProblems;
    }

    /**
     * Process an array of code name objects: add a UI button for each code name,
     * as well as an in-code label with a hidden text area.
     * @param uiPanel
     * @param {Array.<Declaration>} declarations
     * @param {string} color
     * @param {string} sectionTitle
     * @param {boolean} numbersAllowedInNames
     */
    function processCodeNameArrayAndAddSection(uiPanel, declarations, color, sectionTitle, numbersAllowedInNames = true) {
        $(uiPanel).append("<h4 style='color:" + color + "'>" + sectionTitle + "</h4>");
        for (const declaration of declarations) {
            let potentialProblems = checkName(declaration, numbersAllowedInNames);
            let problemsDescription = null;
            let labelStyleClass = "";
            let defaultMessageText = "";

            if (potentialProblems.length > 0) {
                problemsDescription = potentialProblems.map(problem => problem.description).join(" ");
                if (potentialProblems.length > 1) {
                    labelStyleClass = "naming-compound-problem";
                } else {
                    labelStyleClass = NameCheckProblemStyleClass[potentialProblems[0].type];
                }
                defaultMessageText = problemsDescription;
            } else {
                problemsDescription = "No problems were automatically detected.";
            }
            $(uiPanel).append(makeLabelWithClickToScroll(declaration.name, declaration.trCodeLine, labelStyleClass, problemsDescription));
            addButtonComment(
                declaration.trCodeLine,
                capitalize(declaration.nameType) + " name: " + declaration.name,
                defaultMessageText, color
            );
        }
    }

    /**
     * Initialize the module: perform code analysis, add relevant controls to the uiPanel.
     * @param {HTMLDivElement} uiPanel
     * @param {Map.<string, CodeFile>} fileDictionary
     * @param {Options} options
     */
    this.initialize = function (uiPanel, fileDictionary, options) {
        if (!options.enabled) {
            return;
        }
        $(uiPanel).append("<h3 style='color:#ffa500'>Naming</h3>");

        let methodAndVariableNames = [];
        let constantNames = [];
        let typeNames = [];

        let globalIgnoredNames = options.ignoredNames.global;

        for (const codeFile of fileDictionary.values()) {
            if (codeFile.abstractSyntaxTree !== null) {

                //iterate over classes / enums / etc.
                for (const [typeName, typeInformation] of codeFile.types) {
                    let ignoredNamesForType = [...globalIgnoredNames];
                    if (options.ignoredNames.hasOwnProperty(typeName)) {
                        ignoredNamesForType.push(...options.ignoredNames[typeName]);
                    }
                    ignoredNamesForType = new Set(ignoredNamesForType);
                    let declarationsForType = typeInformation.declarations.filter(declaration => !ignoredNamesForType.has(declaration.name));

                    for (const declaration of declarationsForType) {
                        switch (declaration.nameType) {
                            case code_analysis.NameType.VARIABLE:
                            case code_analysis.NameType.METHOD:
                                methodAndVariableNames.push(declaration);
                                break;
                            case code_analysis.NameType.CONSTANT:
                                constantNames.push(declaration);
                                break;
                            case code_analysis.NameType.TYPE:
                                typeNames.push(declaration);
                        }
                    }
                }
            }
        }

        if (options.showUniqueOnly) {
            methodAndVariableNames = uniqueNames(methodAndVariableNames);
            constantNames = uniqueNames(constantNames);
            typeNames = uniqueNames(typeNames);
        }

        processCodeNameArrayAndAddSection(uiPanel, methodAndVariableNames, "#4fa16b", "Variables &amp; Methods", options.numbersAllowedInNames);
        processCodeNameArrayAndAddSection(uiPanel, constantNames, "#4f72e3", "Constants", options.numbersAllowedInNames);
        processCodeNameArrayAndAddSection(uiPanel, typeNames, "orange", "Classes &amp; Enums", options.numbersAllowedInNames);

    }

}).apply(naming_module);