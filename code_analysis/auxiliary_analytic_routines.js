/*
* Copyright 2020 Gregory Kramida
* */

// Defines auxiliary routines used in entity search

try {
    if (require !== undefined) {
        code_analysis = require("../code_analysis/module.js");
        TypeInformation = require("../code_analysis/type_information.js");
        const code_components = require("../code_analysis/code_components.js");
        Scope = code_components.Scope;
    }
} catch (error) {
    // keep silent
}


(function () {

    /**
     * Generate a unique string identifier for a method.
     * @param {string} typeName
     * @param {string} methodName
     * @param {boolean} isStatic
     */
    this.generateMethodStringIdentifier = function (typeName, methodName, isStatic) {
        if (isStatic) {
            // static method call
            return typeName + "." + methodName;
        } else {
            // instance method call
            return "$" + typeName + "$." + methodName;
        }
    }


    /**
     * Based on a type name and type arguments,
     * returns the fully-qualified generic name (e.g. "ArrayList<String>") if there are any type arguments,
     * or just the name otherwise
     * @param {string} name
     * @param {Array.<[string,[]|Array.<string>]>} typeArguments
     * @return {string} fully-qualified type name.
     */
    this.composeQualifiedTypeName = function (name, typeArguments) {
        if (typeArguments.length > 0) {
            return name + "<" + typeArguments.map(([subName, subTypeArguments]) =>
                this.composeQualifiedTypeName(subName, subTypeArguments)).join(", ") + ">";
        } else {
            return name;
        }
    }

    /**
     * Based on a type name and type arguments,
     * returns the unqualified generic name (e.g. "ArrayList<>") if there are any type arguments,
     * or just the name otherwise
     * @param {string} name
     * @param {Array.<[string,[]|Array.<string>]>} typeArguments
     * @return {string} fully-qualified type name.
     */
    this.composeUnqualifiedTypeName = function (name, typeArguments) {
        if (typeArguments.length > 0) {
            return name + "<>";
        } else {
            return name;
        }
    }

    const javaDotLangPackageClasses = new Set(["Boolean", "Byte", "Character", "Character.Subset",
        "Character.UnicodeBlock", "ClassLoader", "Compiler", "Double", "Float", "Integer", "Long", "Math", "Number",
        "Object", "Package", "Process", "ProcessBuilder", "ProcessBuilder.Redirect", "Runtime", "RuntimePermission",
        "SecurityManager", "Short", "StackTraceElement", "StrictMath", "String", "StringBuffer", "StringBuilder",
        "System", "Thread", "ThreadGroup", "Throwable", "Void"]);


//TODO: we're not able to access the full Java standard library API, so determine out what the type is are for some
// common methods. A collection like this or similar might be handy...
    const commonApiMethodReturnTypes = new Map([
        ["$ArrayList$.get", "<0>"],
        ["$ArrayList$.clone", "=="], //...
    ]);

    this.methodIsStatic = function (astNode) {
        if (astNode.node !== "MethodDeclaration") {
            throw TypeError("astNode.node needs to be MethodDeclaration and the astNode needs to follow the JavaParser PEG.js convention for that node type.");
        }
        for (const modifier of astNode.modifiers) {
            if (modifier.keyword === "static") {
                return true;
            }
        }
        return false;
    }


    /**
     * Search backwards through the scope stack for a declaration with matching name.
     * @param {String} name name of the declared element to search for
     * @param {Array.<Scope>} scopeStack
     * @return {Declaration}
     */
    this.searchForDeclarationInStack = function (name, scopeStack) {
        for (let iScope = scopeStack.length - 1; iScope >= 0; iScope--) {
            let scope = scopeStack[iScope];
            if (scope.declarations.has(name)) {
                return scope.declarations.get(name);
            }
        }
        return null;
    }

    /**
     * Attempts to find the declaration of the given method/type/variable/field usage (represented by the provided AST node).
     * @param {Object} usageAstNode
     * @param {Array.<Scope>} fullScopeStack the stack of scopes leading up to the method invocation within the file.
     * @param {CodeFile} codeFile the code file being examined.
     * @return {null | Declaration}
     */
    this.findDeclaration = function (usageAstNode, fullScopeStack, codeFile) {
        let declaration = null;
        switch (usageAstNode.node) {
            case "QualifiedName":
                declaration = this.searchForDeclarationInStack(usageAstNode.name.identifier, fullScopeStack);
                break;
            case "SimpleName":
                declaration = this.searchForDeclarationInStack(usageAstNode.identifier, fullScopeStack);
                break;
            case "ThisExpression":
                //TODO: probably, shouldn't be handling "this" as a special keyword, since this results in ambiguity between
                // methods of a nested type and its parent
                declaration = this.searchForDeclarationInStack("this", fullScopeStack);
                break;
            case "FieldAccess":
                declaration = this.searchForDeclarationInStack(usageAstNode.name.identifier, fullScopeStack);
                break;
            case "CastExpression": {
                const [typeName, typeArguments] = code_analysis.getTypeNameAndArgumentsFromTypeNode(usageAstNode.type);
                declaration = new Declaration(usageAstNode.identifier, typeName, typeArguments, usageAstNode, codeFile);
            }
                break;
            case "ParenthesizedExpression":
                declaration = this.findDeclaration(usageAstNode.expression, fullScopeStack, codeFile);
                break;
            case "MethodInvocation":
                declaration = this.searchForDeclarationInStack(usageAstNode.name.identifier + "(...)", fullScopeStack);
                //TODO: we're not yet able to infer the type in chain calls, e.g. for
                // ... something.call().anotherCall() ...
                // , although the type of "call()" could sometimes be inferred from the declaration of the .call method
                // if the declaration is within the code stack. The solution is somewhat complex,
                // as it would involve not only traversing declarations available in the stack, but also adding imported
                // classes, e.g. cross-file analysis and some database of common API.
                // Also, if the method invoked is a constructor, there is special syntax of the name to search for in the declaration stack, i.e. ClassName(...);

                break;
            default:
                break;
        }
        return declaration;
    }


    /**
     * Attempts to determine the type of the expression
     * @param {Object} expressionNode the given expression node
     * @param {Array.<Scope>} fullScopeStack the stack of scopes leading up to the method invocation within the file.
     * @param {CodeFile} codeFile the code file being examined.
     * @return {string} a string signifying the type (qualified, if generics are used)
     */
    this.getExpressionTypeName = function (expressionNode, fullScopeStack, codeFile) {
        switch (expressionNode.node) {
            case "StringLiteral":
                return "String";
            case "CharacterLiteral":
                return "char";
            case "BooleanLiteral":
                return "bool";
            case "NullLiteral":
                //TODO: resolve type post-factum in this case
                return "Object";
            case "NumberLiteral":
                //TODO: resolve type post-factum in this case
                if (Number.isInteger(Number(expressionNode.token))) {
                    return "int";
                } else {
                    return "double";
                }
            case "MethodInvocation":
                //TODO: resolve type post-factum in this case
                return "[unknown]";
            case "ClassInstanceCreation":
                const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(expressionNode.type);
                return this.composeQualifiedTypeName(typeName, typeArguments);
            case "SimpleName":
                const declaration = this.findDeclaration(expressionNode, fullScopeStack, codeFile);
                if (declaration !== null) {
                    return declaration.typeName;
                }
                break;
            case "QualifiedName":
                if (expressionNode.qualifier.node === "SimpleName") {
                    return expressionNode.qualifier.identifier;
                }
                break;
        }
        return "[unknown]";
    }

    /**
     * Try to determine the value type being assigned to the declaration.
     * @param {Object} astNode
     * @param {Array.<Scope>} fullScopeStack
     * @param {CodeFile} codeFile
     */
    this.setVariableValueType = function (astNode, fullScopeStack, codeFile) {
        let declaration;
        let initializer;

        switch (astNode.node) {
            case "VariableDeclarationFragment":
                declaration = this.findDeclaration(astNode.name, fullScopeStack, codeFile);
                initializer = astNode.initializer;
                break;
            case "Assignment":
                declaration = this.findDeclaration(astNode.leftHandSide, fullScopeStack, codeFile);
                initializer = astNode.rightHandSide;
                break;
        }

        if (declaration !== null && initializer !== null) {
            const valueTypeName = this.getExpressionTypeName(initializer, fullScopeStack, codeFile);
            if (valueTypeName !== "[unknown]") {
                declaration.valueTypeName = valueTypeName;
            }
        }
    }

    /**
     * For a method call, determines the class the method belongs to, and whether it's an instance or static method.
     * @param {{node: string, location : {start: {offset, line, column}, end : {offset, line, column}}, name: {identifier: string}}} methodInvocationNode
     * @param {Array.<Scope>} fullScopeStack
     * @param {CodeFile} codeFile
     * @param {Map.<string, TypeInformation>} globalTypeMap
     * @return {[string, null|string, null|string, null|string]}
     */
    this.determineMethodCallIdentifierAndCalledType = function (methodInvocationNode, fullScopeStack, codeFile,
                                                                globalTypeMap) {
        let callIdentifier = "";
        let calledType = null;

        let methodName;
        if (methodInvocationNode.node === "EnhancedForStatement") {
            methodName = "iterator";
        } else {
            // assume "MethodInvocation" node
            methodName = methodInvocationNode.name.identifier;
        }

        if (methodInvocationNode.hasOwnProperty("expression") && methodInvocationNode.expression != null) {
            const calledDeclaration = this.findDeclaration(methodInvocationNode.expression, fullScopeStack, codeFile);

            if (calledDeclaration == null) {
                if (methodInvocationNode.expression.node === "SimpleName") {
                    callIdentifier = methodInvocationNode.expression.identifier + "." + methodName;
                    //TODO: also check against imported types
                    if (!javaDotLangPackageClasses.has(methodInvocationNode.expression.identifier) && this.logMethodOwnershipWarnings) {
                        console.log("Method-owning class/variable declaration not found for method `"
                            + methodName + "` in file '" + codeFile.filename + "' on line "
                            + methodInvocationNode.location.start.line + ". Ast node:", methodInvocationNode);
                    }
                } else {
                    const callSourceCode = codeFile.sourceCode.substring(methodInvocationNode.location.start.offset, methodInvocationNode.location.end.offset);
                    const callExpressionSourceCode = callSourceCode.split(methodName)[0];
                    callIdentifier = callExpressionSourceCode + methodName;
                    if (this.logMethodOwnershipWarnings) {
                        console.log("Method-owning class/variable declaration not found for method `"
                            + methodName + "` in file '" + codeFile.filename + "' on line "
                            + methodInvocationNode.location.start.line + ". Ast node:", methodInvocationNode);
                    }
                }
            } else {
                let currentType;
                // latest-in-code value type hasn't been accurately determined => try using the variable type
                if (calledDeclaration.valueTypeName === null) {
                    currentType = calledDeclaration.typeName;
                } else {
                    currentType = calledDeclaration.valueTypeName;
                }
                calledType = currentType;
                let inspectNextLevel = true;
                // Look through the class hierarchy to uncover base method call
                do {
                    if (globalTypeMap.has(currentType)) {
                        const typeInformation = globalTypeMap.get(currentType);
                        const typeDeclarationAstNode = typeInformation.typeScope.astNode;
                        // need to check whether the type actually has that method defined
                        if (typeInformation.methodDeclarationMap.has(methodName)) {
                            //TODO: also check that overload corresponds (call arguments match declared parameters)
                            inspectNextLevel = false;
                            calledType = currentType;
                        } else if (typeDeclarationAstNode.superclassType !== undefined && typeDeclarationAstNode.superclassType !== null) {
                            if (typeDeclarationAstNode.superclassType.node === "ParameterizedType") {
                                currentType = typeDeclarationAstNode.superclassType.type.name.identifier;
                            } else {
                                currentType = typeDeclarationAstNode.superclassType.name.identifier;
                            }
                        } else {
                            inspectNextLevel = false;
                        }
                    } else {
                        inspectNextLevel = false;
                    }
                } while (inspectNextLevel);
                callIdentifier = this.generateMethodStringIdentifier(calledType,
                    methodName,calledDeclaration.declarationType === DeclarationType.TYPE);
            }
        } else {
            callIdentifier = "this." + methodName;
        }
        return [callIdentifier, calledType];
    }


    /**
     * Analyze an AST type node and return the type name and a list of generic type arguments (if any)
     * @param {Object} typeNode AST type node
     * @return {[string, Array.<string>]}
     */
    this.getTypeNameAndArgumentsFromTypeNode = function (typeNode) {
        let typeArguments = [];
        if (typeNode == null) {
            return ["", typeArguments];
        }
        switch (typeNode.node) {
            case "SimpleType":
                return [typeNode.name.identifier, typeArguments];
            case "PrimitiveType":
                return [typeNode.primitiveTypeCode, typeArguments];
            case "ParameterizedType":
                for (const typeArgument of typeNode.typeArguments) {
                    typeArguments.push(this.getTypeNameAndArgumentsFromTypeNode(typeArgument));
                }
                return [typeNode.type.name.identifier, typeArguments];
            case "ComponentType":
                return [typeNode.name.identifier + "[]", typeArguments]
            case "ArrayType":
                const [subName, subTypeArguments] = this.getTypeNameAndArgumentsFromTypeNode(typeNode.componentType);
                return [subName + "[]", subTypeArguments];
            case "UnionType":
                //FIXME provide some more adequate handling for UnionTypes
                return [typeNode.types[0].name.identifier, typeArguments];
            case "WildcardType":
                return this.getTypeNameAndArgumentsFromTypeNode(typeNode.bound);
        }
        console.log("Warning! Could not parse type. ", typeNode);
        return ["", typeArguments];
    }


    /**
     * From attempts to construct a full argument type list from a MethodInvocationNode or a ClassInstanceCreationNode
     * @param invocationOrCreationNode
     * @param {Array.<Scope>} fullScopeStack the stack of scopes leading up to the method invocation within the file.
     * @param {CodeFile} codeFile the code file being examined.
     */
    this.getArgumentTypeListString = function (invocationOrCreationNode, fullScopeStack, codeFile) {
        const typeList = [];
        for (const argument of invocationOrCreationNode.arguments) {
            typeList.push(this.getExpressionTypeName(argument, fullScopeStack, codeFile));
        }
        return typeList.join(", ");
    }

    /**
     * If the scope stack contains a scope with a MethodDeclaration astNode.node, return the most inner (last) scope
     * with a MethodDeclaration astNode.node, otherwise, return the last scope
     * @param {Array.<Scope>} scopeStack
     * @return {Scope}
     */
    this.getEnclosingMethodFromScopeStack = function (scopeStack) {
        let iScope;
        for (iScope = scopeStack.length - 1; iScope >= 0; iScope--) {
            if (scopeStack[iScope].astNode.node === "MethodDeclaration") {
                return scopeStack[iScope];
            }
        }
        return scopeStack[scopeStack.length - 1];
    }

}).apply(code_analysis);

// allow usage in node.js modules
try {
    if (module !== undefined) {
        module.exports = code_analysis;
    }
} catch (error) {
    // keep silent
}