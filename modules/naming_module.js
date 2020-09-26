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


    class CodeName {
        constructor(name, trCodeLine, type, astNode) {
            this.name = name;
            this.trCodeLine = trCodeLine;
            this.type = type;
            this.astNode = astNode;
        }
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
                constantNames.push(new CodeName(name, trCodeLine, NameType.CONSTANT));
            } else {
                methodAndVariableNames.push(new CodeName(name, trCodeLine, NameType.VARIABLE));
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

                        for (const statement of declaration.body.statements) {
                            if (statement.node === "VariableDeclarationStatement") {
                                handleFieldOrVariableDeclaration(statement, constantNames, methodAndVariableNames, codeFile);
                            }
                        }
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

    function processNameArray(uiPanel, codeNames, color) {
        for (const codeName of codeNames) {
            $(uiPanel).append(makeLabelWithClickToScroll(codeName.name, codeName.trCodeLine));

            addButtonComment(
                codeName.trCodeLine, CapitalizedNameType[codeName.type] + " Used: " + codeName.name,
                "Non-descriptive naming : " + codeName.name + " is not descriptive of its purpose.",
                color
            );
        }
    }

    this.initialize = function (uiPanel, fileDictionary, allowedSpecialWords) {

        $(uiPanel).append("<h3 style='color:#ffa500'>Naming</h3>");

        let methodAndVariableNames = [];
        let constantNames = [];
        let typeNames = [];

        for (const [filename, codeFile] of fileDictionary.entries()) {
            if(codeFile.abstractSyntaxTree !== null){
                const syntaxTree = codeFile.abstractSyntaxTree;
                //iterate over classes / enums / etc.
                for (const type of syntaxTree.types) {
                    const [typeMethodsAndVariables, typeConstants, typeTypeNames] = getTypeNames(type, codeFile);

                    methodAndVariableNames.push(...typeMethodsAndVariables);
                    constantNames.push(...typeConstants);
                    typeNames.push(...typeTypeNames);
                }
            }
        }
        methodAndVariableNames = uniqueNames(methodAndVariableNames);
        constantNames = uniqueNames(constantNames);
        typeNames = uniqueNames(typeNames);

        let color = "#4fa16b";
        $(uiPanel).append("<h4 style='color:" + color + "'>Variables &amp; Methods</h4>");
        processNameArray(uiPanel, methodAndVariableNames, color);

        color = "#4f72e3";
        $(uiPanel).append("<h4 style='color:" + color + "'>Constants</h4>");
        processNameArray(uiPanel, constantNames, color);

        color = "orange";
        $(uiPanel).append("<h4 style='color:" + color + "'>Classes &amp; Enums</h4>");
        processNameArray(uiPanel, typeNames, color);

    }

}).apply(namingModule);