/*
* Copyright 2020 Gregory Kramida
* */

let naming_module = {};

(function () {

    class DeclarationHighlight extends CodeEntity {
        static #TagColorByType = {
            'method': "#4fa16b",
            'variable': "#4fa16b",
            'type': "orange",
            'constant': "#4f72e3",
            'none': "#555555"
        }

        /** @type {Declaration} */
        #declaration = null

        /** @param {Declaration} declaration */
        constructor(declaration) {
            super(declaration.trCodeLine);
            this.#declaration = declaration;
        }

        get _labelName() {
            return this.#declaration.name;
        }

        get _tagName() {
            return capitalize(this.#declaration.nameType) + " " + this.#declaration.name;
        }

        get _tagColor() {
            return DeclarationHighlight.#TagColorByType[this.#declaration.nameType];
        }

        get declaration() {
            return this.#declaration;
        }
    }

    class NamingIssue extends DeclarationHighlight {
        /** @param {Declaration} declaration */
        constructor(declaration) {
            super(declaration);
        }

        get points() {
            return -1;
        }

        get isIssue() {
            return true;
        }

        get _toolTip() {
            return this._defaultMessageText;
        }
    }


    class NamingConventionIssue extends NamingIssue {
        static #NameTypeConvention = {
            'method': 'camelCase',
            'variable': 'camelCase',
            'type': 'PascalCase',
            'constant': 'ALL_CAPS_SNAKE_CASE',
        }

        /** @param {Declaration} declaration */
        constructor(declaration) {
            super(declaration);
        }

        get _labelStyleClass() {
            return "naming-convention-problem";
        }

        get _defaultMessageText() {
            return capitalize(this.declaration.nameType) + " \"" + this.declaration.name +
                "\" doesn&#39;t seem to follow the " + NamingConventionIssue.#NameTypeConvention[this.declaration.nameType]
                + " convention.";
        }

        get _tagColor() {
            return "#cf821f";
        }
    }

    class NonDictionaryWordIssue extends NamingIssue {

        /** @type {[string]}*/
        #nonDictionaryWords
        #isSingleWord;

        /**
         * @param {Declaration} declaration
         * @param {[string]} nonDictionaryWords
         * @param {boolean} isSingleWord
         */
        constructor(declaration, nonDictionaryWords, isSingleWord = false) {
            super(declaration);
            this.#nonDictionaryWords = nonDictionaryWords;
            this.#isSingleWord = isSingleWord;
        }

        get _labelStyleClass() {
            return "naming-non-dictionary-word-problem";
        }

        get _defaultMessageText() {
            if (this.#nonDictionaryWords.length === 0) {
                throw "Need at least one problematic word in non-dictionary word array, got an array of length 0.";
            }
            let description = "";
            if (this.#isSingleWord) {
                description = capitalize(this.declaration.nameType) + " \"" + this.declaration.name +
                    "\" is a non-dictionary word or an abbreviation. The former are not descriptive and the latter are ambiguous.";
            } else {
                let concatenatedNonDictionaryWords;
                let parts = "parts";
                let appear = "appear";
                let abbreviations = "non-dictionary words and/or abbreviations.";
                if (this.#nonDictionaryWords.length > 2) {
                    concatenatedNonDictionaryWords = "\"" + this.#nonDictionaryWords.slice(-1).join("\", \"") +
                        ", and \"" + this.#nonDictionaryWords.slice(-1) + "\"";
                } else if (this.#nonDictionaryWords.length === 2) {
                    concatenatedNonDictionaryWords = "\"" + this.#nonDictionaryWords.join(" and ") + "\"";
                } else {
                    concatenatedNonDictionaryWords = "\"" + this.#nonDictionaryWords[0] + "\"";
                    parts = "part";
                    appear = "appears";
                    abbreviations = "a non-dictionary word or an abbreviation.";
                }
                description = capitalize(this.declaration.nameType) + " \"" + this.declaration.name + "\" has " +
                    parts + " " + concatenatedNonDictionaryWords + " that " + appear + " to be " + abbreviations;
                description += " The former are not descriptive and the latter are ambiguous.";
            }

            return description;
        }

        get _tagColor() {
            return "#9e9711";
        }
    }

    class SingleLetterNameIssue extends NamingIssue {
        /**
         * @param {Declaration} declaration
         */
        constructor(declaration) {
            super(declaration);
        }

        get _labelStyleClass() {
            return "naming-single-letter-word-problem";
        }

        get _defaultMessageText() {
            return capitalize(this.declaration.nameType) + " \"" + this.declaration.name + "\" is a single letter. " +
                "Single-character declarations are not descriptive-enough in most cases.";
        }

        get _tagColor() {
            return "#b29241";
        }
    }

    class NamingCompoundIssue extends NamingIssue {
        #issues

        /**
         * @param {Declaration} declaration
         * @param {[NamingIssue]} issues
         */
        constructor(declaration, issues) {
            super(declaration);
            this.#issues = issues;
        }

        get _labelStyleClass() {
            return "naming-compound-problem";
        }

        get _defaultMessageText() {
            return "Compound naming problem detected in " + this.declaration.nameType + " \"" + this.declaration.name
                + "\". " + this.#issues.map((issue) => issue.description).join(", ") + "."
        }

        get _tagColor() {
            return "#e35d10";
        }
    }


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
         * @param {boolean} sortAlphabetically sort the UI buttons for code names alphabetically instead of by line they
         * were were encountered in
         * @param {boolean} checkVariablesAndFields check variables and non-constant fields in the code
         * @param {boolean} checkMethods check methods in the code
         * @param {boolean} checkConstants check constants and constant fields in the code
         * @param {boolean} checkTypes check types (classes/enums/interfaces) in the code
         * @param {boolean} treatInstanceFinalFieldsAsConstants expect usage of the convention reserved for
         * constants for the instance (non-static) final fields in Java as well
         */
        constructor(enabled = false,
                    allowedSpecialWords = ["min", "max"],
                    ignoredNames = {"global": []},
                    showUniqueOnly = true,
                    numbersAllowedInNames = true,
                    sortAlphabetically = false,
                    checkVariablesAndFields = true,
                    checkMethods = true,
                    checkConstants = true,
                    checkTypes = true,
                    treatInstanceFinalFieldsAsConstants = false) {
            this.enabled = enabled;
            this.allowedSpecialWords = allowedSpecialWords;
            this.ignoredNames = ignoredNames;
            this.showUniqueOnly = showUniqueOnly;
            this.numbersAllowedInNames = numbersAllowedInNames;
            this.sortAlphabetically = sortAlphabetically;
            this.checkVariablesAndFields = checkVariablesAndFields;
            this.checkMethods = checkMethods;
            this.checkConstants = checkConstants;
            this.checkTypes = checkTypes;
            this.treatInstanceFinalFieldsAsConstants = treatInstanceFinalFieldsAsConstants;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    const NameType = {
        METHOD: 'method',
        VARIABLE: 'variable',
        TYPE: 'type',
        CONSTANT: 'constant',
        NONE: 'none'
    }

    this.NameType = NameType

    const NameTypeByDeclarationType = new Map([
        [DeclarationType.TYPE, NameType.TYPE],
        [DeclarationType.METHOD, NameType.METHOD],
        [DeclarationType.CONSTANT, NameType.CONSTANT],
        [DeclarationType.VARIABLE, NameType.VARIABLE],
        [DeclarationType.FIELD, NameType.VARIABLE],
        [DeclarationType.FINAL_INSTANCE_FIELD, NameType.VARIABLE],
        [DeclarationType.THIS, NameType.NONE],
        [DeclarationType.CAST, NameType.NONE],
        [DeclarationType.CONSTRUCTOR, NameType.NONE], // matches the type name, hence constructor name holds no additional information and doesn't need to be inspected
        [DeclarationType.FINAL_STATIC_FIELD, NameType.CONSTANT]
    ]);


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
     * @param {string} name some string identifier in the code
     * @param {number} nameType name type
     * @param {boolean} omitNumbers if true, will omit any numbers
     * @return {*|string[]}
     */
    function splitCodeNameIntoWords(name, nameType, omitNumbers = true) {
        if (omitNumbers) {
            name = name.replace(/\d+/g, "");
        }
        if (nameType === NameType.CONSTANT) {
            return name.split('_').map(word => word.toLowerCase());
        } else {
            return name.split(/(?=[A-Z])/).map(word => word.toLowerCase());
        }
    }

    /**
     * Checks a code name occurrence for potential problems.
     * @param {Declaration} declaration
     * @param {Set.<string>} allowedSpecialWords special non-dictionary words/abbreviations/acronyms that are allowed
     * per the assignment options
     * @param {boolean} numbersAllowedInNames are numbers considered fair game as part of the name
     * @return {DeclarationHighlight}
     */
    function checkName(declaration, allowedSpecialWords, numbersAllowedInNames = true) {
        let potentialIssues = []
        let name = declaration.name.replace(/[\u00A0\u1680​\u180e\u2000-\u2009\u200a​\u200b​\u202f\u205f​\u3000]/g, '');
        if (numbersAllowedInNames) {
            name = name.replace(/\d+/g, "");
        }
        if (!NameTypeConventionCheck[declaration.nameType](name)) {
            potentialIssues.push(new NamingConventionIssue(declaration));
        } else {
            // Note that currently, we cannot detect non-dictionary problem if the variable does not use proper notation,
            // because the splitting relies on the notation.
            let words = splitCodeNameIntoWords(name, declaration.nameType);
            let nonDictionaryWords = [];

            if (words.length > 1 || words[0].length > 1) {
                for (const word of words) {
                    if (!usEnglishWordList.has(word) && !allowedSpecialWords.has(word)) {
                        nonDictionaryWords.push(word);
                    }
                }
                if (nonDictionaryWords.length > 0) {
                    if (words.length === 1) {
                        potentialIssues.push(new NonDictionaryWordIssue(declaration, nonDictionaryWords, true));
                    } else {
                        potentialIssues.push(new NonDictionaryWordIssue(declaration, nonDictionaryWords, false));
                    }
                }
            } else {
                potentialIssues.push(new SingleLetterNameIssue(declaration))
            }
        }
        let namingHighlight;
        if (potentialIssues.length === 0) {
            namingHighlight = new DeclarationHighlight(declaration);
        } else if (potentialIssues.length === 1) {
            namingHighlight = potentialIssues[0];
        } else {
            namingHighlight = new NamingCompoundIssue(declaration, potentialIssues);
        }
        return namingHighlight;
    }

    /**
     * Process an array of code name objects: add a UI button for each code name,
     * as well as an in-code label with a hidden text area.
     * @param uiPanel
     * @param {Array.<Declaration>} declarations
     * @param {string} color
     * @param {string} sectionTitle
     * @param {Set.<string>} allowedSpecialWords
     * @param {boolean} numbersAllowedInNames
     * @param {boolean} uniqueOnly
     * @param {boolean} sortAlphabetically
     */
    function processCodeNameArrayAndAddSection(uiPanel, declarations, color, sectionTitle,
                                               allowedSpecialWords,
                                               numbersAllowedInNames = true,
                                               uniqueOnly = false,
                                               sortAlphabetically = false) {
        $(uiPanel).append("<h4 style='color:" + color + "'>" + sectionTitle + "</h4>");

        if (uniqueOnly) {
            declarations = uniqueNames(declarations);
        }
        if (sortAlphabetically) {
            declarations = declarations.sort(function (declarationA, declarationB) {
                return declarationA.name < declarationB.name ? -1 : declarationA.name > declarationB.name ? 1 : 0;
            });
        }
        for (const declaration of declarations) {
            let declarationHighlight = checkName(declaration, allowedSpecialWords, numbersAllowedInNames);
            declarationHighlight.addAsLabelToPanel(uiPanel);
            declarationHighlight.addAsCodeTagWithDefaultComment();
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

        let variableNames = [];
        let methodNames = [];
        let constantNames = [];
        let typeNames = [];

        const globalIgnoredNames = options.ignoredNames.global;

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
                        declaration.nameType = NameTypeByDeclarationType.get(declaration.declarationType);

                        switch (declaration.nameType) {
                            case NameType.VARIABLE:
                                // in accordance to options, pick whether a final instance field is to be
                                // treated as constant or not
                                if (declaration.declarationType === DeclarationType.FINAL_INSTANCE_FIELD
                                    && options.treatInstanceFinalFieldsAsConstants) {
                                    declaration.nameType = NameType.CONSTANT;
                                }
                                variableNames.push(declaration);
                                break;
                            case NameType.METHOD:
                                methodNames.push(declaration);
                                break;
                            case NameType.CONSTANT:
                                constantNames.push(declaration);
                                break;
                            case NameType.TYPE:
                                typeNames.push(declaration);

                        }
                    }
                }
            }
        }
        const allowedSpecialWordsSet = new Set(options.allowedSpecialWords);
        if (options.checkVariablesAndFields) {
            processCodeNameArrayAndAddSection(uiPanel, variableNames, "#4fa16b", "Variables/Fields",
                allowedSpecialWordsSet, options.numbersAllowedInNames, options.showUniqueOnly, options.sortAlphabetically);
        }
        if (options.checkMethods) {
            processCodeNameArrayAndAddSection(uiPanel, methodNames, "#4fa16b", "Methods",
                allowedSpecialWordsSet, options.numbersAllowedInNames, options.showUniqueOnly, options.sortAlphabetically);
        }
        if (options.checkConstants) {
            processCodeNameArrayAndAddSection(uiPanel, constantNames, "#4f72e3", "Constants",
                allowedSpecialWordsSet, options.numbersAllowedInNames, options.showUniqueOnly, options.sortAlphabetically);
        }
        if (options.checkTypes) {
            processCodeNameArrayAndAddSection(uiPanel, typeNames, "orange", "Classes, Interfaces, &amp; Enums",
                allowedSpecialWordsSet, options.numbersAllowedInNames, options.showUniqueOnly, options.sortAlphabetically);
        }

    }

}).apply(naming_module);