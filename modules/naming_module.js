let namingModule = {};

(function () {

    const NameType = {
        METHOD: 'method',
        VARIABLE: 'variable',
        TYPE: 'type',
        CONSTANT: 'constant',
    }

    const CapitalizedNameType = {
        'method': 'Method',
        'variable': 'Variable',
        'type': 'Type',
        'constant': 'Constant',
    }


    /**
     * Check if the given name follows proper camelCase notation.
     * @param {string} name some string
     * @return {boolean} return true if name is in camelCase, false otherwise.
     */
    function isCamelCase(name) {
        return /^[a-z]+(?:(?:A)|(?:[A-Z][a-z]+))*[A-Z]?$/.test(name);
    }

    /**
     * Check if the given name follows proper PascalCase notation.
     * @param {string} name some string
     * @return {boolean} return true if name is in PascalCase, false otherwise.
     */
    function isPascalCase(name) {
        return /^(?:(?:A)|(?:[A-Z][a-z]+))*[A-Z]?$/.test(name);
    }

    /**
     * Check if the given name follows proper ALL_CAPS_SNAKE_CASE notation.
     * @param {string} name some string
     * @return {boolean} return true if name is in ALL_CAPS_SNAKE_CASE, false otherwise.
     */
    function isAllCapsSnakeCase(name) {
        return /^[A-Z]+(?:_[A-Z]+)*$/.test(name);
    }

    const CheckNameType = {
        'method': isCamelCase,
        'variable': isCamelCase,
        'type': isPascalCase,
        'constant': isAllCapsSnakeCase,
    }


    class CodeName {
        constructor(name, trCodeLine, type, astNode) {
            this.name = name;
            this.trCodeLine = trCodeLine;
            this.type = type;
            this.astNode = astNode;
        }
    }


    /**
     * Splits a name into "words" (or attempts to).
     * Assumes camelCase, PascalCase, or ALL_CAPS_SNAKE_CASE.
     * @param {string} name some string
     * @return {*|string[]}
     */
    function splitCodeNameIntoWords(name) {
        return name.split(/(?=[A-Z])|_/);
    }


    /**
     * Parses provided declaration as a constant, method, or variable name and stores the generated CodeName object
     * in the corresponding array.
     * @param {Object} declaration AST of a declaration
     * @param {Array.<CodeName>} constantNames array with constant names
     * @param {Array.<CodeName>} methodAndVariableNames array with method and/or variable names
     * @param {CodeFile} codeFile code file descriptor (used to associate the result with an html element)
     */
    function handleFieldOrVariableDeclaration(declaration, constantNames, methodAndVariableNames, codeFile) {
        let is_constant = false;
        const trCodeLine = codeFile.trCodeLines[declaration.location.start.line - 1];
        for (const modifier of declaration.modifiers) {
            if (modifier.keyword === "final") {
                is_constant = true;
            }
        }
        for (const fragment of declaration.fragments) {
            const name = fragment.name.identifier;
            if (is_constant) {
                constantNames.push(new CodeName(name, trCodeLine, NameType.CONSTANT, fragment));
            } else {
                methodAndVariableNames.push(new CodeName(name, trCodeLine, NameType.VARIABLE, fragment));
            }
        }
    }

    function uniqueNames(namesArray) {
        let uniqueNamesMap = new Map();
        namesArray.forEach(
            (codeName) => {
                if (!uniqueNamesMap.has(codeName.name)) {
                    uniqueNamesMap.set(codeName.name, codeName);
                }
            }
        );
        return [...uniqueNamesMap.values()];
    }

    function handleBlockOfStatements(statements, constantNames, methodAndVariableNames, codeFile) {
        for (const statement of statements) {
            if (statement.node === "VariableDeclarationStatement" || statement.node === "VariableDeclarationExpression") {
                handleFieldOrVariableDeclaration(statement, constantNames, methodAndVariableNames, codeFile);
            } else if (statement.node === "ForStatement") {
                handleBlockOfStatements(statement.initializers, constantNames, methodAndVariableNames, codeFile);
                handleBlockOfStatements(statement.body.statements, constantNames, methodAndVariableNames, codeFile);
            } else if (statement.node === "EnhancedForStatement") {
                methodAndVariableNames.push(new CodeName(statement.parameter.name.identifier,
                    codeFile.trCodeLines[statement.parameter.location.start.line - 1], NameType.VARIABLE, statement.parameter));
            }
        }
    }

    /**
     * Get all code names for the provided AST of some Java type.
     * @param {Object} type the AST
     * @param {CodeFile} codeFile a code file descriptor with the AST containing html tr tags for code lines.
     * @returns {Array.<Array.<CodeName>>}
     */
    function getTypeNames(type, codeFile) {
        let methodAndVariableNames = [];
        let constantNames = [];
        let typeNames = [];

        const name = type.name.identifier;
        typeNames.push(new CodeName(name, codeFile.trCodeLines[type.location.start.line - 1], NameType.TYPE, type));

        for (const declaration of type.bodyDeclarations) {
            switch (declaration.node) {
                case "FieldDeclaration":
                    handleFieldOrVariableDeclaration(declaration, constantNames, methodAndVariableNames, codeFile);
                    break;
                case "MethodDeclaration":
                    if (!declaration.constructor) {
                        const name = declaration.name.identifier;
                        methodAndVariableNames.push(new CodeName(name, codeFile.trCodeLines[declaration.location.start.line - 1], NameType.METHOD, declaration));

                        for (const parameter of declaration.parameters) {
                            const name = parameter.name.identifier;
                            methodAndVariableNames.push(new CodeName(name, codeFile.trCodeLines[declaration.location.start.line - 1], NameType.VARIABLE));
                        }
                        handleBlockOfStatements(declaration.body.statements, constantNames, methodAndVariableNames, codeFile);
                    }
                    break;
                case "TypeDeclaration": // inner class
                    const [innerTypeMethodsAndVariables, innerTypeConstants, innerTypeTypeNames] = getTypeNames(declaration, codeFile);
                    methodAndVariableNames.push(...innerTypeMethodsAndVariables);
                    constantNames.push(...innerTypeConstants);
                    typeNames.push(...innerTypeTypeNames);
                    break;
                default:
                    break;
            }
        }
        return [methodAndVariableNames, constantNames, typeNames];
    }

    function processNameArray(uiPanel, codeNames, color, sectionTitle) {
        $(uiPanel).append("<h4 style='color:" + color + "'>" + sectionTitle + "</h4>");
        for (const codeName of codeNames) {
            $(uiPanel).append(makeLabelWithClickToScroll(codeName.name, codeName.trCodeLine));

            addButtonComment(
                codeName.trCodeLine, CapitalizedNameType[codeName.type] + " Used: " + codeName.name,
                "Non-descriptive naming : " + codeName.name + " is not descriptive of its purpose.",
                color
            );
        }
    }

    this.initialize = function (uiPanel, fileDictionary, allowedSpecialWords, ignoredNames, uniqueNamesOnly) {

        $(uiPanel).append("<h3 style='color:#ffa500'>Naming</h3>");

        let methodAndVariableNames = [];
        let constantNames = [];
        let typeNames = [];

        for (const [filename, codeFile] of fileDictionary.entries()) {
            if (codeFile.abstractSyntaxTree !== null) {
                const syntaxTree = codeFile.abstractSyntaxTree;
                //__DEBUG
                console.log(syntaxTree);
                //iterate over classes / enums / etc.
                for (const type of syntaxTree.types) {
                    const [typeMethodsAndVariables, typeConstants, typeTypeNames] = getTypeNames(type, codeFile);

                    methodAndVariableNames.push(...typeMethodsAndVariables);
                    constantNames.push(...typeConstants);
                    typeNames.push(...typeTypeNames);
                }
            }
        }

        if (uniqueNamesOnly) {
            methodAndVariableNames = uniqueNames(methodAndVariableNames);
            constantNames = uniqueNames(constantNames);
            typeNames = uniqueNames(typeNames);
        }

        processNameArray(uiPanel, methodAndVariableNames, "#4fa16b", "Variables &amp; Methods");
        processNameArray(uiPanel, constantNames, "#4f72e3", "Constants");
        processNameArray(uiPanel, typeNames, "orange", "Classes &amp; Enums");

    }

}).apply(namingModule);