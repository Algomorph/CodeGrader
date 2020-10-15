let code_analysis = {};

(function () {

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
        FIELD: 3,
        VARIABLE: 4,
        CONSTANT: 5,
        VARIABLE_OR_CONSTANT: 6
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
        constructor(name, typeName, typeArguments, astNode, hasFinalModifier = false) {
            this.name = name;
            this.typeName = typeName;
            this.typeArguments = typeArguments;
            this.astNode = astNode;
            this.declarationType = DeclarationTypeByNode[astNode.node];
            if (this.declarationType === DeclarationType.VARIABLE_OR_CONSTANT) {
                this.declarationType = hasFinalModifier ? DeclarationType.CONSTANT : DeclarationType.VARIABLE;
            }
        }
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


    /**
     * Based on a type name and type arguments,
     * returns the fully-qualified generic name (e.g. "ArrayList<String>") if there are any type arguments,
     * or just the name otherwise
     * @param {string} name
     * @param {Array.<[string,[]|Array.<string>]>} typeArguments
     * @return {string} fully-qualified type name.
     */
    function composeQualifiedTypeName(name, typeArguments) {
        if (typeArguments.length > 0) {
            return name + "<" + typeArguments.map(([subName, subTypeArguments]) =>
                composeQualifiedTypeName(subName, subTypeArguments)).join(", ") + ">";
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
    function composeUnqualifiedTypeName(name, typeArguments) {
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
     * Attempts to determine the type (class, enum, etc.) of the given expression AST node.
     * @param expressionNode the expression sub-node (field of the MethodInvocation node)
     * @param fullScopeStack the stack of scopes leading up to the method invocation within the file.
     * @param {CodeFile} codeFile the code file being examined.
     * @return {null | DeclarationType}
     */
    this.findTypeDeclaration = function (expressionNode, fullScopeStack, codeFile) {
        let declaration = null;
        switch (expressionNode.node) {
            case "QualifiedName":
                declaration = this.searchForDeclarationInStack(expressionNode.name.identifier, fullScopeStack);
                break;
            case "SimpleName":
                declaration = this.searchForDeclarationInStack(expressionNode.identifier, fullScopeStack);
                break;
            case "ThisExpression":
                declaration = this.searchForDeclarationInStack("this", fullScopeStack);
                break;
            case "FieldAccess":
                declaration = this.searchForDeclarationInStack(expressionNode.name.identifier, fullScopeStack);
                break;
            case "CastExpression": {
                const [typeName, typeArguments] = code_analysis.getTypeNameAndArgumentsFromTypeNode(expressionNode.type);
                declaration = new Declaration(expressionNode.identifier, typeName, typeArguments, expressionNode);
            }
                break;
            case "ParenthesizedExpression":
                declaration = this.findTypeDeclaration(expressionNode.expression, fullScopeStack, codeFile);
                break;
            case "MethodInvocation":
                //TODO: we're not yet able to infer the type in chain calls, e.g. for
                // ... something.call().anotherCall() ...
                // , although the type of "call()" could sometimes be inferred from the declaration of the .call method
                // if the declaration is within the code stack. The solution is somewhat complex,
                // as it would involve not only traversing declarations available in the stack, but also adding imported
                // classes, e.g. cross-file analysis and some database of common API.

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


    /**
     * For a method call, determines the class the method belongs to, and whether it's an instance or static method.
     * @param {Object} methodCallNode
     * @param {Array.<Scope>} fullScopeStack
     * @param {CodeFile} codeFile
     * @return {string}
     */
    this.determineMethodOwningClassFromInvocation = function (methodCallNode, fullScopeStack, codeFile) {
        let name = "";

        if (methodCallNode.hasOwnProperty("expression") && methodCallNode.expression != null) {
            const declaration = this.findTypeDeclaration(methodCallNode.expression, fullScopeStack, codeFile);
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
        }
        console.log("Warning! Could not parse type. ");
        console.log(typeNode);
        return ["", typeArguments];
    }


    /**
     * Recursively traverse Abstract Syntax Tree node in search for entities, append results to the
     * provided entity collection.
     *
     * @param {Object} astNode AST node to search
     * @param {Scope} scope of the current AST node
     * @param {CodeFile} codeFile information about the current code file
     * @param {TypeInformation} enclosingTypeInformation
     */
    this.findEntitiesInAstNode = function (astNode, scope, codeFile, enclosingTypeInformation) {
        let branchScopes = [];
        let branchScopeDeclarations = [];
        let currentScopeFullyProcessed = true;

        function continueProcessingCurrentScope() {
            branchScopes.push(scope);
            currentScopeFullyProcessed = false;
        }

        switch (astNode.node) {
            case "TypeDeclaration":
                branchScopes.push(new Scope(astNode,
                    [new Declaration("this", astNode.name.identifier, [], {"node": "VariableDeclarationStatement"})],
                    astNode.bodyDeclarations, scope.scopeStack.concat([scope])));
                break;
            case "MethodDeclaration": {
                const [methodReturnTypeName, methodReturnTypeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.returnType2);
                scope.declarations.set(astNode.name.identifier, new Declaration(astNode.name.identifier, methodReturnTypeName, methodReturnTypeArguments, astNode));
            }
                for (const parameter of astNode.parameters) {
                    if (parameter.node === "SingleVariableDeclaration") {
                        const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(parameter.type);
                        branchScopeDeclarations.push(new Declaration(parameter.name.identifier, typeName, typeArguments, parameter));
                    }
                }
                // body will be null if it's an abstract or interface method.
                if (astNode.body != null) {
                    branchScopes.push(new Scope(astNode, branchScopeDeclarations, astNode.body.statements, scope.scopeStack.concat([scope])));
                }
                break;
            case "Block":
                scope.children = astNode.statements;
                continueProcessingCurrentScope();
                break;
            case "IfStatement":
                scope.children = [astNode.expression];
                continueProcessingCurrentScope();
                branchScopes.push(new Scope(astNode.thenStatement, [], [astNode.thenStatement], scope.scopeStack.concat([scope])));
                if (astNode.elseStatement !== null) {
                    branchScopes.push(new Scope(astNode.elseStatement, [], [astNode.elseStatement], scope.scopeStack.concat([scope])));
                }
                break;
            case "ForStatement":
                for (const initializer of astNode.initializers) {
                    const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(initializer.type);
                    for (const fragment of initializer.fragments) {
                        branchScopeDeclarations.push(new Declaration(fragment.name.identifier, typeName, typeArguments, initializer));
                    }
                }
                branchScopes.push(
                    new Scope(
                        astNode, branchScopeDeclarations,
                        astNode.updaters.concat([astNode.expression], astNode.initializers, astNode.body.statements),
                        scope.scopeStack.concat([scope])
                    )
                );
                break;
            case "EnhancedForStatement": {
                const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.parameter.type);
                branchScopeDeclarations.push(new Declaration(astNode.parameter.name.identifier, typeName, typeArguments, astNode.parameter));
            }
                branchScopes.push(new Scope(astNode, branchScopeDeclarations,
                    astNode.body.statements.concat([astNode.expression]),
                    scope.scopeStack.concat([scope]))
                );
                break;
            case "SwitchStatement":
                scope.children = astNode.statements.map(switchCase => switchCase.expression);
                scope.children.push(astNode.expression);
                continueProcessingCurrentScope();
                break;
            case "ReturnStatement":
            case "ParenthesizedExpression":
            case "ThrowStatement":
            case "ExpressionStatement":
                scope.children = [astNode.expression];
                continueProcessingCurrentScope();
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
                continueProcessingCurrentScope();
                break;
            case "PrefixExpression":
                scope.children = [astNode.operand];
                continueProcessingCurrentScope();
                break;
            case "Assignment":
                scope.children = [astNode.leftHandSide, astNode.rightHandSide];
                continueProcessingCurrentScope();
                break;
            case "SuperMethodInvocation":
                enclosingTypeInformation.methodCalls.push(new MethodCall("super.",
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.SUPER_METHOD));
                scope.children = astNode.arguments;
                continueProcessingCurrentScope();
                break;
            case "SuperConstructorInvocation":
                enclosingTypeInformation.methodCalls.push(new MethodCall("super(",
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.SUPER_CONSTRUCTOR));
                scope.children = astNode.arguments;
                continueProcessingCurrentScope();
                break;
            case "ClassInstanceCreation": {
                let [methodReturnTypeName, methodReturnTypeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.type);
                const name = composeUnqualifiedTypeName(methodReturnTypeName, methodReturnTypeArguments) + "()";
                enclosingTypeInformation.methodCalls.push(new MethodCall(name,
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.CONSTRUCTOR));
            }
                scope.children = astNode.arguments;
                continueProcessingCurrentScope();
                break;
            case "FieldAccess":
                scope.children = [astNode.expression];
                continueProcessingCurrentScope();
                break;
            case "MethodInvocation": {
                let fullScopeStack = scope.scopeStack.concat([scope]);
                let name = this.determineMethodOwningClassFromInvocation(astNode, fullScopeStack, codeFile);
                enclosingTypeInformation.methodCalls.push(new MethodCall(name,
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.METHOD));
                scope.children = astNode.arguments;
                if (astNode.hasOwnProperty("expression") && astNode.expression != null) {
                    scope.children.push(astNode.expression);
                }
                continueProcessingCurrentScope();
            }
                break;
            case "VariableDeclarationStatement":
            case "VariableDeclarationExpression":
            case "FieldDeclaration":
                scope.children = astNode.fragments;
            {
                const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.type);
                for (const fragment of astNode.fragments) {
                    scope.declarations.set(fragment.name.identifier,
                        new Declaration(fragment.name.identifier, typeName, typeArguments, astNode));
                }
            }
                continueProcessingCurrentScope();
                break;
            case "VariableDeclarationFragment":
                if (astNode.initializer !== null) {
                    scope.children = [astNode.initializer];
                    continueProcessingCurrentScope();
                }
                break;
            case "CatchClause":
                scope.children = astNode.body.statements;
                continueProcessingCurrentScope();
                break;
            default:
                break;
        }

        if (currentScopeFullyProcessed) {
            enclosingTypeInformation.declarations.push(...scope.declarations.values());
        }

        for (const branchScope of branchScopes) {
            for (const astNode of branchScope.children) {
                this.findEntitiesInAstNode(astNode, branchScope, codeFile, enclosingTypeInformation);
            }
        }
    }
    /**
     * Finds code entities (declarations, method calls, etc.) from the AST of a code file.
     * @param {CodeFile} codeFile Information about a code file
     */
    this.findEntitiesInCodeFileAst = function (codeFile) {
        if (codeFile.abstractSyntaxTree !== null) {
            const syntaxTree = codeFile.abstractSyntaxTree;

            //iterate over classes / enums / etc.
            for (const typeNode of syntaxTree.types) {
                let typeInformation = new TypeInformation();
                this.findEntitiesInAstNode(typeNode, new Scope(syntaxTree, [], [], []), codeFile, typeInformation);
                codeFile.types.set(typeNode.name.identifier, typeInformation);
            }
        }
    }

}).apply(code_analysis);