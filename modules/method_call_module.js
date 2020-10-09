let methodCallModule = {};

(function () {

    class Options {
        /**
         * Make options for this module.
         * @param {boolean} enabled whether the module is enabled.
         * @param ignoredMethods (dictionary of lists of) methods whose calls to ignore.
         * The dictionary is keyed by class names inside whose implementations to ignore said calls,
         * globally-ignored methods should be under the key 'global'.
         * Use '$ClassName$.someInstanceMethod' for instance method 'someInstanceMethod' of class 'ClassName'.
         * Use 'ClassName.someStaticMethod' for static method 'someStaticMethod' of class 'ClassName'.
         * @param {boolean} showUniqueOnly whether to show only unique method call occurrences.
         */
        constructor(enabled = false,
                    ignoredMethods = {"global": []},
                    showUniqueOnly = false) {
            this.enabled = enabled;
            this.ignoredMethods = ignoredMethods;
            this.showUniqueOnly = showUniqueOnly;
        }
    }

    this.getDefaultOptions = function (){
        return new Options();
    }

    const MethodCallType = {
        METHOD: "method",
        INSTANCE_METHOD: "static method",
        STATIC_METHOD: "static method",
        CONSTRUCTOR: "constructor",
        SUPER_METHOD: "super method",
        SUPER_CONSTRUCTOR: "super constructor",
    }

    class MethodCall {
        constructor(name, trCodeLine, astNode, callType) {
            this.name = name;
            this.possiblyIgnored = false;
            this.trCodeLine = trCodeLine;
            this.astNode = astNode;
            this.callType = callType;
        }
    }

    let DeclarationType = {
        METHOD: 1,
        TYPE: 2,
        VARIABLE_OR_CONSTANT: 3,
        FIELD: 4
    }

    let DeclarationTypeByNode = {
        "TypeDeclaration": DeclarationType.TYPE,
        "MethodDeclaration": DeclarationType.METHOD,
        "VariableDeclarationStatement": DeclarationType.VARIABLE_OR_CONSTANT,
        "VariableDeclarationExpression": DeclarationType.VARIABLE_OR_CONSTANT,
        "SingleVariableDeclaration": DeclarationType.VARIABLE_OR_CONSTANT,
        "FieldDeclaration": DeclarationType.FIELD,
    }

    class Declaration {
        constructor(name, typeName, typeArguments, astNode) {
            this.name = name;
            this.typeName = typeName;
            this.typeArguments = typeArguments;
            this.astNode = astNode;
            this.declarationType = DeclarationTypeByNode[astNode.node];
        }
    }


    function composeQualifiedGenericName(name, typeArguments) {
        if (typeArguments.length > 0) {
            return name + "<" + typeArguments.map(([subName, subTypeArguments]) => composeQualifiedGenericName(subName, subTypeArguments)).join(", ") + ">";
        } else {
            return name;
        }
    }

    function composeUnqualifiedGenericName(name, typeArguments) {
        if (typeArguments.length > 0) {
            return name + "<>";
        } else {
            return name;
        }
    }

    function getTypeNameAndArgumentsFromTypeNode(typeNode) {
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
                    typeArguments.push(getTypeNameAndArgumentsFromTypeNode(typeArgument));
                }
                return [typeNode.type.name.identifier, typeArguments];
            case "ComponentType":
                return [typeNode.name.identifier + "[]", typeArguments]
            case "ArrayType":
                const [subName, subTypeArguments] = getTypeNameAndArgumentsFromTypeNode(typeNode.componentType);
                return [subName + "[]", subTypeArguments];
        }
        console.log("Warning! Could not parse type. ");
        console.log(typeNode);
        return ["", typeArguments];
    }


    class Scope {
        constructor(astNode, declarations, children, scopeStack) {
            this.astNode = astNode;
            this.declarations = new Map();
            for (const declaration of declarations) {
                this.declarations.set(declaration.name, declaration);
            }
            this.children = children;
            this.scopeStack = scopeStack;
        }
    }

    const javaDotLangPackageClasses = new Set(["Boolean", "Byte", "Character", "Character.Subset",
        "Character.UnicodeBlock", "ClassLoader", "Compiler", "Double", "Float", "Integer", "Long", "Math", "Number",
        "Object", "Package", "Process", "ProcessBuilder", "ProcessBuilder.Redirect", "Runtime", "RuntimePermission",
        "SecurityManager", "Short", "StackTraceElement", "StrictMath", "String", "StringBuffer", "StringBuilder",
        "System", "Thread", "ThreadGroup", "Throwable", "Void"]);

    const commonApiMethodReturnTypes = new Map([
        ["$ArrayList$.get", "<0>"],
        ["$ArrayList$.clone", "=="],

    ]);

    /**
     *
     * @param expressionNode
     * @param fullScopeStack
     * @param {CodeFile} codeFile
     * @return {null | DeclarationType}
     */
    function findMethodCallTypeDeclaration(expressionNode, fullScopeStack, codeFile) {
        let declaration = null;
        switch (expressionNode.node) {
            case "QualifiedName":
                declaration = searchForDeclarationInStack(expressionNode.name.identifier, fullScopeStack);
                break;
            case "SimpleName":
                declaration = searchForDeclarationInStack(expressionNode.identifier, fullScopeStack);
                break;
            case "ThisExpression":
                declaration = searchForDeclarationInStack("this", fullScopeStack);
                break;
            case "FieldAccess":
                declaration = searchForDeclarationInStack(expressionNode.name.identifier, fullScopeStack);
                break;
            case "CastExpression": {
                const [typeName, typeArguments] = getTypeNameAndArgumentsFromTypeNode(expressionNode.type);
                declaration = new Declaration(expressionNode.identifier, typeName, typeArguments, expressionNode);
            }
                break;
            case "ParenthesizedExpression":
                declaration = findMethodCallTypeDeclaration(expressionNode.expression, fullScopeStack, codeFile);
                break;
            case "MethodInvocation":
                //TODO
                // let subDeclaration = findMethodCallTypeDeclaration(expressionNode.expression, fullScopeStack, codeFile);
                // if (subDeclaration != null) {
                //     if (subDeclaration.declarationType === DeclarationType.TYPE) {
                //
                //     }
                //
                // }

                break;
            default:
                break;
        }
        return declaration;
    }

    function determineQualifiedMethodName(methodCallNode, fullScopeStack, codeFile) {
        let name = "";

        if (methodCallNode.hasOwnProperty("expression") && methodCallNode.expression != null) {
            const declaration = findMethodCallTypeDeclaration(methodCallNode.expression, fullScopeStack, codeFile);
            if (declaration == null) {
                if (methodCallNode.expression.node === "SimpleName") {
                    name = methodCallNode.expression.identifier + "." + methodCallNode.name.identifier;
                    //TODO: also check against imported classes
                    if (!javaDotLangPackageClasses.has(methodCallNode.expression.identifier)) {
                        console.log("Declaration not found:");
                        console.log(methodCallNode.expression);
                    }
                } else {
                    console.log("Declaration not found:");
                    console.log(methodCallNode.expression);
                    const callSourceCode = codeFile.sourceCode.substring(methodCallNode.location.start.offset, methodCallNode.location.end.offset);
                    const callExpressionSourceCode = callSourceCode.split(methodCallNode.name.identifier)[0];
                    name = callExpressionSourceCode + methodCallNode.name.identifier;
                }
            } else {
                if (declaration.declarationType === DeclarationType.TYPE) {
                    // static method call
                    name = declaration.typeName + "." + methodCallNode.name.identifier;
                } else {
                    name = "$" + declaration.typeName + "$." + methodCallNode.name.identifier;
                }
            }
        } else {
            name = "this." + methodCallNode.name.identifier;
        }
        return name;
    }

    /**
     * Search backwards through the scope stack for a declaration with matching name.
     * @param {String} name name of the declared element to search for
     * @param {Array.<Scope>} scopeStack
     * @return {Declaration}
     */
    function searchForDeclarationInStack(name, scopeStack) {
        for (let iScope = scopeStack.length - 1; iScope >= 0; iScope--) {
            let scope = scopeStack[iScope];
            if (scope.declarations.has(name)) {
                return scope.declarations.get(name);
            }
        }
        return null;
    }

    /**
     * Recursively traverse Abstract Syntax Tree node in search for method calls, append results to provided
     * methodCalls array.
     * @param {Object} astNode AST node to search
     * @param {Array.<MethodCall>} methodCalls
     * @param {CodeFile} codeFile
     * @param {Scope} scope of the current AST node
     */
    function getMethodCallsFromNode(astNode, scope, methodCalls, codeFile) {
        let branchScopes = [];
        let declarations = [];
        switch (astNode.node) {
            case "TypeDeclaration":
                branchScopes.push(new Scope(astNode,
                    [new Declaration("this", astNode.name.identifier, [], {"node": "VariableDeclarationStatement"})],
                    astNode.bodyDeclarations, scope.scopeStack.concat([scope])));
                break;
            case "MethodDeclaration": {
                const [methodReturnTypeName, methodReturnTypeArguments] = getTypeNameAndArgumentsFromTypeNode(astNode.returnType2);
                scope.declarations.set(astNode.name.identifier, new Declaration(astNode.name.identifier, methodReturnTypeName, methodReturnTypeArguments, astNode));
            }
                for (const parameter of astNode.parameters) {
                    if (parameter.node === "SingleVariableDeclaration") {
                        const [typeName, typeArguments] = getTypeNameAndArgumentsFromTypeNode(parameter.type);
                        declarations.push(new Declaration(parameter.name.identifier, typeName, typeArguments, parameter));
                    }
                }
                // body will be null if it's an abstract or interface method.
                if(astNode.body != null){
                    branchScopes.push(new Scope(astNode, declarations, astNode.body.statements, scope.scopeStack.concat([scope])));
                }
                break;
            case "Block":
                scope.children = astNode.statements;
                branchScopes.push(scope);
                break;
            case "IfStatement":
                scope.children = [astNode.expression];
                branchScopes.push(scope);
                branchScopes.push(new Scope(astNode.thenStatement, [], [astNode.thenStatement], scope.scopeStack.concat([scope])));
                if (astNode.elseStatement !== null) {
                    branchScopes.push(new Scope(astNode.elseStatement, [], [astNode.elseStatement], scope.scopeStack.concat([scope])));
                }
                break;
            case "ForStatement":
                for (const initializer of astNode.initializers) {
                    const [typeName, typeArguments] = getTypeNameAndArgumentsFromTypeNode(initializer.type);
                    for (const fragment of initializer.fragments) {
                        declarations.push(new Declaration(fragment.name.identifier, typeName, typeArguments, initializer));
                    }
                }
                branchScopes.push(
                    new Scope(
                        astNode, declarations,
                        astNode.updaters.concat([astNode.expression], astNode.initializers, astNode.body.statements),
                        scope.scopeStack.concat([scope])
                    )
                );
                break;
            case "EnhancedForStatement": {
                const [typeName, typeArguments] = getTypeNameAndArgumentsFromTypeNode(astNode.parameter.type);
                declarations.push(new Declaration(astNode.parameter.name.identifier, typeName, typeArguments, astNode.parameter));
            }
                branchScopes.push(new Scope(astNode, declarations,
                    astNode.body.statements.concat([astNode.expression]),
                    scope.scopeStack.concat([scope]))
                );
                break;
            case "SwitchStatement":
                scope.children = astNode.statements.map(switchCase => switchCase.expression);
                scope.children.push(astNode.expression);
                branchScopes.push(scope);
                break;
            case "ReturnStatement":
            case "ParenthesizedExpression":
            case "ThrowStatement":
            case "ExpressionStatement":
                scope.children = [astNode.expression];
                branchScopes.push(scope);
                break;
            case "TryStatement":
                branchScopes.push(new Scope(astNode, [], astNode.body.statements, scope.scopeStack.concat([scope])));
                if (astNode.catchClauses !== null) {
                    for (const catchClause of astNode.catchClauses) {
                        branchScopes.push(new Scope(catchClause, [], [catchClause], scope.scopeStack.concat([scope])));
                    }
                }
                if (astNode.finally !== null) {
                    branchScopes.push(new Scope(astNode.finally, [], [astNode.finally.statements], scope.scopeStack.concat([scope])));
                }
                break;
            case "InstanceOfExpression":
            case "InfixExpression":
                scope.children = [astNode.leftOperand, astNode.rightOperand];
                branchScopes.push(scope);
                break;
            case "PrefixExpression":
                scope.children = [astNode.operand];
                branchScopes.push(scope);
                break;
            case "Assignment":
                scope.children = [astNode.leftHandSide, astNode.rightHandSide];
                branchScopes.push(scope);
                break;
            case "SuperMethodInvocation":
                methodCalls.push(new MethodCall("super.", codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.SUPER_METHOD));
                scope.children = astNode.arguments;
                branchScopes.push(scope);
                break;
            case "SuperConstructorInvocation":
                methodCalls.push(new MethodCall("super(", codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.SUPER_CONSTRUCTOR));
                scope.children = astNode.arguments;
                branchScopes.push(scope);
                break;
            case "ClassInstanceCreation": {
                let [methodReturnTypeName, methodReturnTypeArguments] = getTypeNameAndArgumentsFromTypeNode(astNode.type);
                const name = composeUnqualifiedGenericName(methodReturnTypeName, methodReturnTypeArguments) + "()";
                methodCalls.push(new MethodCall(name, codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.CONSTRUCTOR));
            }
                scope.children = astNode.arguments;
                branchScopes.push(scope);
                break;
            case "FieldAccess":
                scope.children = [astNode.expression];
                branchScopes.push(scope);
                break;
            case "MethodInvocation": {
                let fullScopeStack = scope.scopeStack.concat([scope]);
                let name = determineQualifiedMethodName(astNode, fullScopeStack, codeFile);
                methodCalls.push(new MethodCall(name, codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.METHOD));
                scope.children = astNode.arguments;
                if (astNode.hasOwnProperty("expression") && astNode.expression != null) {
                    scope.children.push(astNode.expression);
                }
                branchScopes.push(scope);
            }
                break;
            case "VariableDeclarationStatement":
            case "VariableDeclarationExpression":
            case "FieldDeclaration":
                scope.children = astNode.fragments;
            {
                const [typeName, typeArguments] = getTypeNameAndArgumentsFromTypeNode(astNode.type);
                for (const fragment of astNode.fragments) {
                    scope.declarations.set(fragment.name.identifier, new Declaration(fragment.name.identifier, typeName, typeArguments, astNode));
                }
            }
                branchScopes.push(scope);
                break;
            case "VariableDeclarationFragment":
                if (astNode.initializer !== null) {
                    scope.children = [astNode.initializer];
                    branchScopes.push(scope);
                }
                break;
            case "CatchClause":
                scope.children = astNode.body.statements;
                branchScopes.push(scope);
                break;
            default:
                break;
        }

        for (const branchScope of branchScopes) {
            for (const astNode of branchScope.children) {
                getMethodCallsFromNode(astNode, branchScope, methodCalls, codeFile);
            }
        }
    }

    /**
     * Initialize the module: analyze the parsed code as necessary, add relevant controls to the UI panel.
     * @param {HTMLDivElement} uiPanel the UI panel where to add the controls.
     * @param {Map.<string,CodeFile>} fileDictionary dictionary of CodeFile objects to analyze for calls.
     * @param {Options} options options for the module.
     */
    this.initialize = function (uiPanel, fileDictionary, options) {
        if(!options.enabled){
            return;
        }
        $(uiPanel).append("<h3 style='color:#b3769f'>Method Calls</h3>");
        const globallyIgnoredMethods = options.ignoredMethods.global;

        let methodCalls = [];

        for (const [filename, codeFile] of fileDictionary.entries()) {
            if (codeFile.abstractSyntaxTree !== null) {
                const syntaxTree = codeFile.abstractSyntaxTree;

                //iterate over classes / enums / etc.
                for (const type of syntaxTree.types) {
                    let ignoredMethodsForType = [...globallyIgnoredMethods];
                    if (options.ignoredMethods.hasOwnProperty(type.name.identifier)) {
                        ignoredMethodsForType.push(...options.ignoredMethods[type.name.identifier]);
                    }
                    ignoredMethodsForType = new Set(ignoredMethodsForType);
                    let methodCallsForType = [];
                    getMethodCallsFromNode(type, new Scope(syntaxTree, [], [], []), methodCallsForType, codeFile);
                    methodCallsForType = methodCallsForType.filter((methodCall) => {
                        return !ignoredMethodsForType.has(methodCall.name);
                    })
                    // special "this." case handling
                    if (ignoredMethodsForType.has("this.")) {
                        methodCallsForType = methodCallsForType.filter((methodCall) => {
                            return !methodCall.name.startsWith("this.");
                        })
                    }
                    methodCallsForType.forEach((methodCall) => {
                        if (methodCall.astNode.hasOwnProperty("name") &&
                            ignoredMethodsForType.has(methodCall.astNode.name.identifier)) {
                            methodCall.possiblyIgnored = true;
                        }
                    })
                    methodCalls.push(...methodCallsForType);
                }
            }
        }

        if (options.showUniqueOnly) {
            methodCalls = uniqueNames(methodCalls);
        }


        for (const methodCall of methodCalls) {
            if (methodCall.possiblyIgnored) {
                $(uiPanel).append(makeLabelWithClickToScroll(methodCall.name, methodCall.trCodeLine, "possibly-ignored-method-call"));
            } else {
                $(uiPanel).append(makeLabelWithClickToScroll(methodCall.name, methodCall.trCodeLine));
            }

            addButtonComment(
                methodCall.trCodeLine, capitalize(methodCall.callType) + " call: " + methodCall.name, "", "#b3769f"
            );
        }
    }

}).apply(methodCallModule);