let methodCallModule = {};

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

    class Declaration {
        constructor(name, typeName, typeArguments, astNode) {
            this.name = name;
            this.typeName = typeName;
            this.typeArguments = typeArguments;
            this.astNode = astNode;
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
                return [typeNode.name.identifier + "[]",]
        }
        console.log("Warning! Could not parse type. ");
        console.log(typeNode);
        return ["", typeArguments];
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

    class Scope {
        constructor(astNode, declarations, children, scopeStack) {
            this.astNode = astNode;
            this.declarations = declarations;
            this.children = children;
            this.scopeStack = scopeStack;
        }
    }

    const javaDotLangPackageClasses = new Set(["Boolean", "Byte", "Character", "Character.Subset",
        "Character.UnicodeBlock", "ClassLoader", "Compiler", "Double", "Float", "Integer", "Long", "Math", "Number",
        "Object", "Package", "Process", "ProcessBuilder", "ProcessBuilder.Redirect", "Runtime", "RuntimePermission",
        "SecurityManager", "Short", "StackTraceElement", "StrictMath", "String", "StringBuffer", "StringBuilder",
        "System", "Thread", "ThreadGroup", "Throwable", "Void"]);

    //TODO
    function determineMethodCallExpressionType(astTree, methodCall) {
        if (methodCall.expression.node === "SimpleName") {
            if (javaDotLangPackageClasses.has(methodCall.expression.identifier)) {
                return methodCall.expression.identifier;
            } else {

            }
        }
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
                console.log(astNode);
                branchScopes.push(new Scope(astNode, [], astNode.bodyDeclarations, scope.scopeStack.concat([scope])));
                break;
            case "MethodDeclaration":
            {
                const [methodReturnTypeName, methodReturnTypeArguments] = getTypeNameAndArgumentsFromTypeNode(astNode.returnType2);
                scope.declarations.push(new Declaration(astNode.name.identifier, methodReturnTypeName, methodReturnTypeArguments, astNode));
            }
                for (const parameter of astNode.parameters) {
                    if (parameter.node === "SingleVariableDeclaration") {
                        const [typeName, typeArguments] = getTypeNameAndArgumentsFromTypeNode(parameter.type);
                        declarations.push(new Declaration(parameter.name.identifier, typeName, typeArguments, parameter));
                    }
                }
                branchScopes.push(new Scope(astNode, declarations, astNode.body.statements, scope.scopeStack.concat([scope])))
                break;
            case "Block":
                scope.children = astNode.statements;
                branchScopes.push(scope)
                break;
            case "IfStatement":
                children = [astNode.expression, astNode.thenStatement];
                if (astNode.elseStatement !== null) {
                    children.push(astNode.elseStatement);
                }
                scopeStack = [...scopeStack];
                scopeStack.push(new Scope(astNode, declarations));
                break;
            case "ForStatement":
                children = [...astNode.updaters];
                children.push(astNode.expression);
                children.push(...astNode.initializers);
                children.push(...astNode.body.statements);

                scopeStack = [...scopeStack];
                for (const initializer of astNode.initializers) {
                    const [typeName, typeArguments] = getTypeNameAndArgumentsFromTypeNode(initializer.type);
                    for (const fragment of initializer.fragments) {
                        declarations.push(new Declaration(fragment.name.identifier, typeName, typeArguments, initializer));
                    }
                }
                scopeStack.push(new Scope(astNode, declarations));
                break;
            case "EnhancedForStatement":
                children = astNode.body.statements;
                children.push(astNode.expression);
                scopeStack = [...scopeStack];
                const [typeName, typeArguments] = getTypeNameAndArgumentsFromTypeNode(astNode.parameter.type);
                declarations.push(new Declaration(astNode.parameter.name.identifier, typeName, typeArguments, astNode.parameter));
                scopeStack.push(new Scope(astNode, declarations));
                break;
            case "SwitchStatement":
                children = astNode.statements.each(switchCase => switchCase.expression);
                children.push(astNode.expression);
                break;
            case "ReturnStatement":
            case "ParenthesizedExpression":
            case "ThrowStatement":
            case "ExpressionStatement":
                children = [astNode.expression];
                break;
            case "TryStatement":
                console.log(astNode);
                children = [...astNode.body.statements];
                if (astNode.catchClauses !== null) {
                    children.push(...astNode.catchClauses);
                }
                if (astNode.finally !== null) {
                    children.push(...astNode.finally.statements);
                }
                break;
            case "InstanceOfExpression":
            case "InfixExpression":
                children = [astNode.leftOperand, astNode.rightOperand];
                break;
            case "PrefixExpression":
                children = [astNode.operand];
                break;
            case "Assignment":
                children = [astNode.leftHandSide, astNode.rightHandSide];
                break;
            case "SuperMethodInvocation":
                methodCalls.push(new MethodCall("super.", codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.SUPER_METHOD));
                children = astNode.arguments;
                break;
            case "SuperConstructorInvocation":
                methodCalls.push(new MethodCall("super(", codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.SUPER_CONSTRUCTOR));
                children = astNode.arguments;
                break;
            case "ClassInstanceCreation": {
                let [methodReturnTypeName, methodReturnTypeArguments] = getTypeNameAndArgumentsFromTypeNode(astNode.type);
                const name = composeUnqualifiedGenericName(methodReturnTypeName, methodReturnTypeArguments) + "()";
                methodCalls.push(new MethodCall(name, codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.CONSTRUCTOR));
            }
                children = astNode.arguments;
                break;
            case "MethodInvocation":
                let name = astNode.name.identifier;
                if (astNode.hasOwnProperty("expression") && astNode.expression != null) {
                    if (astNode.expression.node === "SimpleName") {
                        name = astNode.expression.identifier + "." + astNode.name.identifier;
                    } else if (astNode.expression.node === "ThisExpression") {
                        name = "this." + astNode.name.identifier;
                    } else if (astNode.expression.node === "FieldAccess") {
                        name = "this." + astNode.expression.name.identifier + "." + astNode.name.identifier;
                    } else {
                        const callSourceCode = codeFile.sourceCode.substring(astNode.location.start.offset, astNode.location.end.offset);
                        const callExpressionSourceCode = callSourceCode.split(astNode.name.identifier)[0];
                        name = callExpressionSourceCode + astNode.name.identifier;
                    }
                } else {
                    name = "this." + astNode.name.identifier;
                }
                methodCalls.push(new MethodCall(name, codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.METHOD));
                children = astNode.arguments;
                break;
            case "VariableDeclarationStatement":
            case "VariableDeclarationExpression":
            case "FieldDeclaration":
                children = astNode.fragments;
                break;
            case "VariableDeclarationFragment":
                if (astNode.initializer !== null) {
                    children = [astNode.initializer];
                }
                break;
            case "CatchClause":
                children = astNode.body.statements;
                break;
            default:
                break;
        }

        for (const branchScope of branchScopes) {
            for(const astNode of branchScope.children){
                getMethodCallsFromNode(astNode, branchScope, methodCalls, codeFile);
            }
        }
    }

    this.initialize = function (uiPanel, fileDictionary, ignoredMethods, uniqueCallsOnly) {
        $(uiPanel).append("<h3 style='color:#b3769f'>Method Calls</h3>");
        const globallyIgnoredMethods = ignoredMethods.global;

        let methodCalls = [];

        for (const [filename, codeFile] of fileDictionary.entries()) {
            if (codeFile.abstractSyntaxTree !== null) {
                const syntaxTree = codeFile.abstractSyntaxTree;

                //iterate over classes / enums / etc.
                for (const type of syntaxTree.types) {
                    let ignoredMethodsForType = [...globallyIgnoredMethods];
                    if (ignoredMethods.hasOwnProperty(type.name.identifier)) {
                        ignoredMethodsForType.push(...ignoredMethods[type.name.identifier]);
                    }
                    ignoredMethodsForType = new Set(ignoredMethodsForType);
                    let methodCallsForType = [];
                    getMethodCallsFromNode(type, new Scope(syntaxTree, [], []), methodCallsForType, codeFile);
                    methodCallsForType = methodCallsForType.filter((methodCall) => {
                        return !ignoredMethodsForType.has(methodCall.name);
                    })
                    // special this. case handling
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

        if (uniqueCallsOnly) {
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