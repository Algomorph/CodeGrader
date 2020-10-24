let code_analysis = {};

(function () {

    let log_method_ownership_warnings = false;

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
        VARIABLE: 3,
        CONSTANT: 4,
        FIELD: 5,
        CONSTANT_FIELD: 6,
        THIS: 7,
        CAST: 8,
        CONSTRUCTOR: 9
    }


    this.DeclarationType = DeclarationType;

    let DeclarationTypeByNode = {
        "TypeDeclaration": DeclarationType.TYPE,
        "MethodDeclaration": DeclarationType.METHOD,
        "VariableDeclarationStatement": DeclarationType.VARIABLE,
        "VariableDeclarationExpression": DeclarationType.VARIABLE,
        "SingleVariableDeclaration": DeclarationType.VARIABLE,
        "FieldDeclaration": DeclarationType.FIELD,
        "This": DeclarationType.THIS,
        "CastExpression": DeclarationType.CAST
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
        [DeclarationType.CONSTANT_FIELD, NameType.CONSTANT],
        [DeclarationType.THIS, NameType.NONE],
        [DeclarationType.CAST, NameType.NONE],
        [DeclarationType.CONSTRUCTOR, NameType.NONE] // matches the type name, hence constructor name holds no additional information and doesn't need to be inspected
    ]);


    class Declaration {
        constructor(name, typeName, typeArguments, astNode, codeFile) {
            this.name = name;
            this.typeName = typeName; // for methods, the return type
            this.typeArguments = typeArguments;
            this.astNode = astNode;
            this.declarationType = DeclarationTypeByNode[astNode.node];
            if (this.declarationType === DeclarationType.METHOD && astNode.hasOwnProperty("constructor") && astNode.constructor) {
                this.declarationType = DeclarationType.CONSTRUCTOR;
            }
            this.final = false;
            if (astNode.hasOwnProperty("location")) {
                this.trCodeLine = codeFile.trCodeLines[astNode.location.start.line - 1];
            } else {
                this.trCodeLine = null;
            }

            if (this.declarationType === DeclarationType.FIELD || this.declarationType === DeclarationType.VARIABLE) {
                if (astNode.modifiers.map(modifier => modifier.keyword).includes("final")) {
                    this.final = true;
                    switch (this.declarationType) {
                        case DeclarationType.FIELD:
                            this.declarationType = DeclarationType.CONSTANT_FIELD;
                            break;
                        case DeclarationType.VARIABLE:
                            this.declarationType = DeclarationType.CONSTANT;
                            break;
                    }
                }
            }
            this.nameType = NameTypeByDeclarationType.get(this.declarationType);
        }
    }

    /**
     * Represents a single scope (stack) in the code.
     */
    class Scope {
        constructor(astNode, declarations, children, scopeStack) {
            /** @type {{node: string, location : {start: {offset, line, column}, end : {offset, line, column}}}}
             * @description the AST node that encompasses the entire scope (and, possibly, other scopes if it has body
             * and, potentially, multiple scoped clauses, such as an if statement with else-if/else clauses) */
            this.astNode = astNode;
            this.declarations = new Map();
            for (const declaration of declarations) {
                this.declarations.set(declaration.name, declaration);
            }
            /*
             * At the end of entity search, contains a flattened array of all nodes within the current node
             * ("Flattened" meaning, e.g. for an ArrayAccess node, the node within its .array property is also in this
             * array along with the parent.)
             */
            this.childAstNodes = children;
            //used, in some cases, for temporary results during the entity search
            this.unprocessedChildAstNodes = children;
            this.scopeStack = scopeStack;
        }

        setNextBatchOfChildAstNodes(children) {
            this.childAstNodes.push(...children);
            this.unprocessedChildAstNodes = children;
        }
    }

    class Usage {
        /**
         * Define a usage instance
         * @param {{node: string, location : {start: {offset, line, column}, end : {offset, line, column}}}} astNode
         * @param {HTMLTableRowElement} trCodeLine
         * @param {Declaration} declaration
         */
        constructor(astNode, trCodeLine, declaration) {
            this.astNode = astNode;
            this.trCodeline = trCodeLine;
            this.declaration = declaration;
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
     * For a method call, determines the class the method belongs to, and whether it's an instance or static method.
     * @param {{node: string, location : {start: {offset, line, column}, end : {offset, line, column}}, name: {identifier: string}}} methodInvocationNode
     * @param {Array.<Scope>} fullScopeStack
     * @param {CodeFile} codeFile
     * @return {string}
     */
    this.determineMethodCallIdentifier = function (methodInvocationNode, fullScopeStack, codeFile) {
        let name = "";

        if (methodInvocationNode.hasOwnProperty("expression") && methodInvocationNode.expression != null) {
            const declaration = this.findDeclaration(methodInvocationNode.expression, fullScopeStack, codeFile);
            if (declaration == null) {
                if (methodInvocationNode.expression.node === "SimpleName") {
                    name = methodInvocationNode.expression.identifier + "." + methodInvocationNode.name.identifier;
                    //TODO: also check against imported classes
                    if (!javaDotLangPackageClasses.has(methodInvocationNode.expression.identifier) && log_method_ownership_warnings) {
                        console.log("Method-owning class/variable declaration not found for method `"
                            + methodInvocationNode.name.identifier + "` in file '" + codeFile.filename + "' on line "
                            + methodInvocationNode.location.start.line + ". Ast node:", methodInvocationNode);
                    }
                } else {
                    const callSourceCode = codeFile.sourceCode.substring(methodInvocationNode.location.start.offset, methodInvocationNode.location.end.offset);
                    const callExpressionSourceCode = callSourceCode.split(methodInvocationNode.name.identifier)[0];
                    name = callExpressionSourceCode + methodInvocationNode.name.identifier;
                    if (log_method_ownership_warnings) {
                        console.log("Method-owning class/variable declaration not found for method `"
                            + methodInvocationNode.name.identifier + "` in file '" + codeFile.filename + "' on line "
                            + methodInvocationNode.location.start.line + ". Ast node:", methodInvocationNode);
                    }
                }
            } else {
                if (declaration.declarationType === DeclarationType.TYPE) {
                    // static method call
                    name = declaration.typeName + "." + methodInvocationNode.name.identifier;
                } else {
                    name = "$" + declaration.typeName + "$." + methodInvocationNode.name.identifier;
                }
            }
        } else {
            name = "this." + methodInvocationNode.name.identifier;
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
        let fullScopeStack = scope.scopeStack.concat([scope]);

        function continueProcessingCurrentScope() {
            currentScopeFullyProcessed = false;
        }

        // noinspection FallThroughInSwitchStatementJS
        switch (astNode.node) {
            case "TypeDeclaration": {
                const typeScope = new Scope(astNode,
                    [new Declaration("this", astNode.name.identifier, [], {"node": "This"}, codeFile),
                        new Declaration(astNode.name.identifier, "type", [], astNode, codeFile)],
                    astNode.bodyDeclarations, scope.scopeStack.concat([scope]));
                branchScopes.push(typeScope);
                enclosingTypeInformation.typeScope = typeScope;
            }
                break;
            case "MethodDeclaration": {
                const [methodReturnTypeName, methodReturnTypeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.returnType2);
                scope.declarations.set(astNode.name.identifier + "(...)", new Declaration(astNode.name.identifier, methodReturnTypeName, methodReturnTypeArguments, astNode, codeFile));
            }
                for (const parameter of astNode.parameters) {
                    if (parameter.node === "SingleVariableDeclaration") {
                        const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(parameter.type);
                        branchScopeDeclarations.push(new Declaration(parameter.name.identifier, typeName, typeArguments, parameter, codeFile));
                    }
                }
                // body will be null if it's an abstract or interface method.
                if (astNode.body != null) {
                    branchScopes.push(new Scope(astNode, branchScopeDeclarations, astNode.body.statements, scope.scopeStack.concat([scope])));
                }
                break;
            case "Block":
                scope.setNextBatchOfChildAstNodes(astNode.statements);
                continueProcessingCurrentScope();
                break;
            case "IfStatement":
                if (astNode.elseStatement == null) {
                    scope.setNextBatchOfChildAstNodes([astNode.expression]);
                } else {
                    if (astNode.elseStatement.node === "Block") {
                        scope.setNextBatchOfChildAstNodes([astNode.expression]);
                        branchScopes.push(new Scope(astNode.elseStatement, [], [astNode.elseStatement], scope.scopeStack.concat([scope])));
                    } else {
                        scope.setNextBatchOfChildAstNodes([astNode.expression, astNode.elseStatement]);
                    }
                }
                continueProcessingCurrentScope();
                branchScopes.push(new Scope(astNode, [], [astNode.thenStatement], scope.scopeStack.concat([scope])));
                break;
            case "ForStatement":
                for (const initializer of astNode.initializers) {
                    if (initializer.hasOwnProperty("fragments")) {
                        // only add declaration(s) in case assignment(s) to existing variable(s) isn't/aren't used as initializer(s)
                        const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(initializer.type);
                        for (const fragment of initializer.fragments) {
                            branchScopeDeclarations.push(new Declaration(fragment.name.identifier, typeName, typeArguments, initializer, codeFile));
                        }
                    }
                }
                branchScopes.push(
                    new Scope(
                        astNode, branchScopeDeclarations,
                        astNode.updaters.concat([astNode.expression], astNode.initializers, [astNode.body]),
                        scope.scopeStack.concat([scope])
                    )
                );
                break;
            case "EnhancedForStatement": {
                const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.parameter.type);
                branchScopeDeclarations.push(new Declaration(astNode.parameter.name.identifier, typeName, typeArguments, astNode.parameter, codeFile));
            }
                branchScopes.push(new Scope(astNode, branchScopeDeclarations,
                    (astNode.body.node === "Block" ? astNode.body.statements : [astNode.body.expression]).concat([astNode.expression]),
                    scope.scopeStack.concat([scope]))
                );
                break;
            case "WhileStatement":
                branchScopes.push(new Scope(astNode, [],
                    (astNode.body.node === "Block" ? astNode.body.statements : [astNode.body.expression]).concat([astNode.expression]),
                    scope.scopeStack.concat([scope]))
                );
                break;
            case "DoStatement":
                branchScopes.push(new Scope(astNode, [],
                    (astNode.body.node === "Block" ? astNode.body.statements : [astNode.body.expression]).concat([astNode.expression]),
                    scope.scopeStack.concat([scope]))
                );
                break;
            case "SwitchStatement":
                scope.setNextBatchOfChildAstNodes(astNode.statements.concat([astNode.expression]));
                continueProcessingCurrentScope();
                break;
            case "PrefixExpression":
            case "PostfixExpression":
                enclosingTypeInformation.unaryExpressions.push(astNode);
                scope.setNextBatchOfChildAstNodes([astNode.operand]);
                continueProcessingCurrentScope();
                break;
            case "ExpressionStatement":
            case "ParenthesizedExpression":
            case "ReturnStatement":
            case "ThrowStatement":
            case "SwitchCase":
            case "FieldAccess":
                if (astNode.expression != null) {
                    scope.setNextBatchOfChildAstNodes([astNode.expression]);
                    continueProcessingCurrentScope();
                }
                break;
            case "TryStatement":
                branchScopes.push(new Scope(astNode, [], astNode.body.statements, scope.scopeStack.concat([scope])));
                if (astNode.catchClauses !== null) {
                    for (const catchClause of astNode.catchClauses) {
                        const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(catchClause["exception"].type);
                        branchScopes.push(new Scope(catchClause.body,
                            [new Declaration(catchClause["exception"].name.identifier, typeName, typeArguments, catchClause["exception"], codeFile)],
                            [catchClause], scope.scopeStack.concat([scope])));
                    }
                }
                if (astNode.finally !== null) {
                    branchScopes.push(new Scope(astNode.finally, [], [astNode.finally.statements], scope.scopeStack.concat([scope])));
                }
                break;
            case "InstanceOfExpression":
            case "InfixExpression":
                scope.setNextBatchOfChildAstNodes([astNode.leftOperand, astNode.rightOperand]);
                enclosingTypeInformation.binaryExpressions.push(astNode);
                continueProcessingCurrentScope();
                break;
            case "ArrayAccess":
                scope.setNextBatchOfChildAstNodes([astNode.array, astNode.index]);
                continueProcessingCurrentScope();
                break;
            case "Assignment":
                scope.setNextBatchOfChildAstNodes([astNode.leftHandSide, astNode.rightHandSide]);
                enclosingTypeInformation.assignments.push(astNode);
                continueProcessingCurrentScope();
                break;
            case "SuperMethodInvocation":
                enclosingTypeInformation.methodCalls.push(new MethodCall("super.",
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.SUPER_METHOD));
                scope.setNextBatchOfChildAstNodes(astNode.arguments);
                continueProcessingCurrentScope();
                break;
            case "SuperConstructorInvocation":
                enclosingTypeInformation.methodCalls.push(new MethodCall("super(...)",
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.SUPER_CONSTRUCTOR));
                scope.setNextBatchOfChildAstNodes(astNode.arguments);
                continueProcessingCurrentScope();
                break;
            case "ClassInstanceCreation": {
                let [methodReturnTypeName, methodReturnTypeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.type);
                const name = composeUnqualifiedTypeName(methodReturnTypeName, methodReturnTypeArguments) + "()";
                enclosingTypeInformation.methodCalls.push(new MethodCall(name,
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.CONSTRUCTOR));
            }
                scope.setNextBatchOfChildAstNodes(astNode.arguments);
                continueProcessingCurrentScope();
                break;
            case "MethodInvocation": {
                let methodCallIdentifier = this.determineMethodCallIdentifier(astNode, fullScopeStack, codeFile);
                enclosingTypeInformation.methodCalls.push(new MethodCall(methodCallIdentifier,
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.METHOD));
                {
                    const unprocessedChildAstNodes = astNode.arguments;
                    if (astNode.hasOwnProperty("expression") && astNode.expression != null) {
                        unprocessedChildAstNodes.push(astNode.expression);
                    }
                    scope.setNextBatchOfChildAstNodes(unprocessedChildAstNodes);
                }
                continueProcessingCurrentScope();
            }
                break;
            case "VariableDeclarationStatement":
            case "VariableDeclarationExpression":
            case "FieldDeclaration":
                scope.unprocessedChildAstNodes = astNode.fragments;
            {
                const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.type);
                for (const fragment of astNode.fragments) {
                    scope.declarations.set(fragment.name.identifier,
                        new Declaration(fragment.name.identifier, typeName, typeArguments, astNode, codeFile));
                }
            }
                continueProcessingCurrentScope();
                break;
            case "VariableDeclarationFragment":
                if (astNode.initializer !== null) {
                    scope.setNextBatchOfChildAstNodes([astNode.initializer]);
                    continueProcessingCurrentScope();
                }
                break;
            case "CatchClause":
                scope.setNextBatchOfChildAstNodes(astNode.body.statements);
                continueProcessingCurrentScope();
                break;
            default:
                break;
        }

        const possibleDeclarationForUsage = this.findDeclaration(astNode, fullScopeStack, codeFile);
        if (possibleDeclarationForUsage != null) {
            enclosingTypeInformation.usages.push(new Usage(astNode, codeFile.trCodeLines[astNode.location.start.line - 1], possibleDeclarationForUsage));
        }

        if (!currentScopeFullyProcessed) {
            let unprocessedBranchNodes = [...scope.unprocessedChildAstNodes];
            for (const childAstNode of unprocessedBranchNodes) {
                this.findEntitiesInAstNode(childAstNode, scope, codeFile, enclosingTypeInformation);
            }
        }

        for (const branchScope of branchScopes) {
            let unprocessedBranchNodes = [...branchScope.unprocessedChildAstNodes];
            for (const childAstNode of unprocessedBranchNodes) {
                this.findEntitiesInAstNode(childAstNode, branchScope, codeFile, enclosingTypeInformation);
            }
        }
        enclosingTypeInformation.scopes.push(...branchScopes);
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
                const fileScope = new Scope(syntaxTree, [], [], []);
                typeInformation.scopes.push(fileScope);
                this.findEntitiesInAstNode(typeNode, fileScope, codeFile, typeInformation);
                for (const scope of typeInformation.scopes) {
                    typeInformation.declarations.push(...scope.declarations.values());
                }

                //method invocations occur before definitions sometimes, account for those.
                const methodUsageSet = new Set(typeInformation.usages.filter(usage => usage.declaration.declarationType === DeclarationType.METHOD ||
                    usage.declaration.declarationType === DeclarationType.CONSTRUCTOR).map(usage => usage.astNode));
                //TODO: somehow, also account for fields in a similar way
                for (const methodCall of typeInformation.methodCalls) {
                    if (!methodUsageSet.has(methodCall.astNode)) {
                        const possibleDeclarationForUsage = this.findDeclaration(methodCall.astNode, [typeInformation.typeScope], codeFile);
                        if (possibleDeclarationForUsage != null) {
                            typeInformation.usages.push(new Usage(methodCall.astNode, codeFile.trCodeLines[methodCall.astNode.location.start.line - 1], possibleDeclarationForUsage));
                        }
                    }
                }

                codeFile.types.set(typeNode.name.identifier, typeInformation);
            }
        }
    }

    /**
     * Get start location (in code) of the provided AST operand node
     * considering any qualifiers, sub-expressions. that might appear before it.
     * @param {Object} operandAstNode the provided AST operand node
     * @returns {{offset: *, line: *, column: *}}
     */
    this.getOperandStart = function (operandAstNode) {
        switch (operandAstNode.node) {
            case "MethodInvocation":
            case "PrefixExpression":
            case "PostfixExpression":
            case "FieldAccess":
                if (operandAstNode.expression != null) {
                    return this.getOperandStart(operandAstNode.expression);
                } else {
                    return operandAstNode.location.start;
                }
            case "ArrayAccess":
                if (operandAstNode.hasOwnProperty("array")) {
                    return this.getOperandStart(operandAstNode.array);
                }
                break;
            case "InfixExpression":
                return this.getOperandStart(operandAstNode.leftOperand);
            default:
                return operandAstNode.location.start;
        }

    }

    /**
     * Get end location (in code) of the provided AST operand node
     * considering any qualifiers, sub-expressions. that might appear after it.
     *
     * @param operandAstNode
     * @returns {{offset: *, line: *, column: *}}
     */
    this.getOperandEnd = function (operandAstNode) {
        switch (operandAstNode.node) {
            case "InfixExpression":
                return this.getOperandEnd(operandAstNode.rightOperand);
            default:
                return operandAstNode.location.end;
        }
    }

}).apply(code_analysis);