/*
* Copyright 2021 Gregory Kramida
* */
// allow usage in node.js modules; process dependencies
try {

    if (require !== undefined) {
        code_analysis = require("../code_analysis/auxiliary_analytic_routines.js");
        TypeInformation = require("../code_analysis/type_information.js");
        const code_components = require("../code_analysis/code_components.js");
        DeclarationType = code_components.DeclarationType;
        Scope = code_components.Scope;
        Declaration = code_components.Declaration;
        LoopTypeByNode = code_components.LoopTypeByNode;
        Usage = code_components.Usage;
        MethodCall = code_components.MethodCall;

    }
} catch (error) {
    // keep silent
}

(function () {


    /**
     * Recursively traverse Abstract Syntax Tree node in search for relevant components for code-checking modules (DFS),
     * append results to the provided type information object.
     *
     * @param {Object} astNode AST node to search
     * @param {Scope} scope of the current AST node
     * @param {CodeFile} codeFile information about the current code file
     * @param {TypeInformation} enclosingTypeInformation
     * @param {Map.<string, TypeInformation>} globalTypeMap
     */
    this.findCodeComponentsInAstNode = function (astNode, scope, codeFile, enclosingTypeInformation, globalTypeMap) {
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
                        new Declaration(astNode.name.identifier, astNode.name.identifier, [], astNode, codeFile)],
                    astNode.bodyDeclarations, scope.scopeStack.concat([scope]));
                branchScopes.push(typeScope);
                //TODO: account for the possibility of having inner classes declared inside a type scope
                //TODO: account for the possibility of having multiple private classes in addition to the one public class in each file.
                if (enclosingTypeInformation.typeScope === null) {
                    enclosingTypeInformation.typeScope = typeScope;
                }
            }
                break;
            case "MethodDeclaration": {
                let parameterTypeString = "..."; // we don't care for parameters in the general case
                if (astNode.constructor) {
                    const parameterTypes = []
                    for (const parameter of astNode.parameters) {
                        if (parameter.node === "SingleVariableDeclaration") {
                            const [parameterTypeName, parameterTypeArguments] = this.getTypeNameAndArgumentsFromTypeNode(parameter.type);
                            parameterTypes.push(this.composeQualifiedTypeName(parameterTypeName, parameterTypeArguments));
                        }
                    }
                    // for constructors, we now do care about parameters
                    parameterTypeString = parameterTypes.join(', ')
                }
                const [methodReturnTypeName, methodReturnTypeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.returnType2);
                const basicIdentifier = astNode.name.identifier;
                const declaration = new Declaration(basicIdentifier, methodReturnTypeName, methodReturnTypeArguments, astNode, codeFile);
                // TODO: first, look into changing this to the "legacy notation" for method identifiers first,
                //  i.e. $ClassName$.methodName, and see if anything breaks after the unit tests are implemented. One thing
                //  that will have to change is determineMethodCallIdentifierAndCalledType for analyzing method calls.
                // Eventually, legacy method notation will be eliminated in favor of new notation, i.e. the java-standard
                // ClassName::methodName, or ClassName::methodName ([paramType]...) if it requires overload qualification.
                // Whether constructors are better represented by ClassName::new ([paramType]...) or ClassName([paramType]...) is up for debate
                const parameterizedIdentifier = basicIdentifier + "(" + parameterTypeString + ")";
                scope.declarations.set(parameterizedIdentifier, declaration);
                if (astNode.constructor) {
                    enclosingTypeInformation.constructorDeclarationMap.set(parameterizedIdentifier, declaration)
                } else {
                    if (enclosingTypeInformation.methodDeclarationMap.has(basicIdentifier)) {
                        const allOverloads = enclosingTypeInformation.methodDeclarationMap.get(basicIdentifier);
                        allOverloads.push(basicIdentifier);
                    } else {
                        enclosingTypeInformation.methodDeclarationMap.set(astNode.name.identifier, [declaration])
                    }
                }
            }
                for (const parameter of astNode.parameters) {
                    if (parameter.node === "SingleVariableDeclaration") {
                        const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(parameter.type);
                        branchScopeDeclarations.push(new Declaration(parameter.name.identifier, typeName, typeArguments, parameter, codeFile));
                    }
                }
                // body will be null if it's an abstract or interface method.
                if (astNode.body != null) {
                    // this captures whether the method has a "Test" annotation above it
                    const isTest = astNode.hasOwnProperty("modifiers") && astNode.modifiers.reduce(function (isTest, modifier) {
                        return isTest |= modifier.node === "MarkerAnnotation" && modifier.typeName.identifier === "Test"
                    }, false);
                    branchScopes.push(new Scope(astNode, branchScopeDeclarations, astNode.body.statements, scope.scopeStack.concat([scope]), isTest));
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
            {
                let children;
                if (astNode.expression === null) {
                    children = astNode.updaters.concat(astNode.initializers, [astNode.body])
                } else {
                    children = astNode.updaters.concat([astNode.expression], astNode.initializers, [astNode.body])
                }
                branchScopes.push(
                    new Scope(
                        astNode, branchScopeDeclarations, children,
                        scope.scopeStack.concat([scope])
                    )
                );
            }
                break;
            case "EnhancedForStatement": {
                const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.parameter.type);
                branchScopeDeclarations.push(new Declaration(astNode.parameter.name.identifier, typeName, typeArguments, astNode.parameter, codeFile));
                // handle the .iterator implicit method call
                const [methodCallIdentifier, calledType] =
                    this.determineMethodCallIdentifierAndCalledType(astNode, fullScopeStack, codeFile, globalTypeMap);
                const methodCall = new MethodCall(methodCallIdentifier,
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.METHOD, "iterator", calledType);
                enclosingTypeInformation.methodCalls.push(methodCall);
                this.getEnclosingMethodFromScopeStack(fullScopeStack).methodCalls.push(methodCall);
                scope.setNextBatchOfChildAstNodes([astNode.expression]);
            }
                branchScopes.push(new Scope(astNode, branchScopeDeclarations,
                    [astNode.body, astNode.expression],
                    scope.scopeStack.concat([scope]))
                );
                break;
            case "WhileStatement":
                branchScopes.push(new Scope(astNode, [],
                    [astNode.body, astNode.expression],
                    scope.scopeStack.concat([scope]))
                );
                break;
            case "DoStatement":
                branchScopes.push(new Scope(astNode, [],
                    [astNode.body, astNode.expression],
                    scope.scopeStack.concat([scope]))
                );
                break;
            case "SwitchStatement":
                scope.setNextBatchOfChildAstNodes(astNode.statements.concat([astNode.expression]));
                continueProcessingCurrentScope();
                break;
            case "QualifiedName":
                scope.setNextBatchOfChildAstNodes([astNode.qualifier]);
                continueProcessingCurrentScope();
                break;
            case "PrefixExpression":
            case "PostfixExpression":
                enclosingTypeInformation.unaryExpressions.push(astNode);
                scope.setNextBatchOfChildAstNodes([astNode.operand]);
                continueProcessingCurrentScope();
                break;
            case "ReturnStatement":
            case "YieldStatement":
            case "ExpressionStatement":
            case "ParenthesizedExpression":
            case "ThrowStatement":
            case "SwitchCase":
            case "SuperFieldAccess":
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
            case "InstanceofExpression":
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
                this.setVariableValueType(astNode, fullScopeStack, codeFile);
                continueProcessingCurrentScope();
                break;
            case "ArrayCreation":
                scope.setNextBatchOfChildAstNodes(astNode.dimensions);
                continueProcessingCurrentScope();
                break;
            case "ConditionalExpression":
                scope.setNextBatchOfChildAstNodes([astNode.expression, astNode.thenExpression, astNode.elseExpression]);
                continueProcessingCurrentScope();
                break;
            case "LabeledStatement":
                scope.setNextBatchOfChildAstNodes([astNode.body]);
                continueProcessingCurrentScope();
                break;
            case "SuperMethodInvocation": {
                const methodCall = new MethodCall("super." + astNode.name.identifier,
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.SUPER_METHOD, astNode.name.identifier, null);
                this.getEnclosingMethodFromScopeStack(fullScopeStack).methodCalls.push(methodCall);
                enclosingTypeInformation.methodCalls.push(methodCall);
            }
                scope.setNextBatchOfChildAstNodes(astNode.arguments);
                continueProcessingCurrentScope();
                break;
            case "SuperConstructorInvocation": {
                const methodCall = new MethodCall("super(...)",
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.SUPER_CONSTRUCTOR, "super", null);
                this.getEnclosingMethodFromScopeStack(fullScopeStack).methodCalls.push(methodCall);
                enclosingTypeInformation.methodCalls.push(methodCall);
            }
                // I'm not sure if there's an issue with calling the method twice in one scope
                // So I'm playing it safe with concat
                if (astNode.expression != null) {
                    scope.setNextBatchOfChildAstNodes(astNode.arguments.concat(astNode.expression));
                } else {
                    scope.setNextBatchOfChildAstNodes(astNode.arguments);
                }
                continueProcessingCurrentScope();
                break;
            case "ClassInstanceCreation": {
                const [typeName, typeArguments] = this.getTypeNameAndArgumentsFromTypeNode(astNode.type);
                const argumentTypeListString = this.getArgumentTypeListString(astNode, fullScopeStack, codeFile);
                const name = this.composeUnqualifiedTypeName(typeName, typeArguments) + "(" + argumentTypeListString + ")";
                const methodCall = new MethodCall(name,
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.CONSTRUCTOR, typeName, typeName);

                this.getEnclosingMethodFromScopeStack(fullScopeStack).methodCalls.push(methodCall);
                enclosingTypeInformation.methodCalls.push(methodCall);
            }
                scope.setNextBatchOfChildAstNodes(astNode.arguments);
                continueProcessingCurrentScope();
                break;
            case "MethodInvocation": {
                const [methodCallIdentifier, calledType] =
                    this.determineMethodCallIdentifierAndCalledType(astNode, fullScopeStack, codeFile, globalTypeMap);
                const methodCall = new MethodCall(methodCallIdentifier,
                    codeFile.trCodeLines[astNode.location.start.line - 1], astNode, MethodCallType.METHOD, astNode.name.identifier, calledType)
                enclosingTypeInformation.methodCalls.push(methodCall);
                this.getEnclosingMethodFromScopeStack(fullScopeStack).methodCalls.push(methodCall);
                const unprocessedChildAstNodes = astNode.arguments;
                if (astNode.hasOwnProperty("expression") && astNode.expression != null) {
                    unprocessedChildAstNodes.push(astNode.expression);
                }
                scope.setNextBatchOfChildAstNodes(unprocessedChildAstNodes);
                continueProcessingCurrentScope();
            }
                break;
            case "VariableDeclarationStatement":
            case "VariableDeclarationExpression":
            case "FieldDeclaration":
                scope.setNextBatchOfChildAstNodes(astNode.fragments);
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
                    enclosingTypeInformation.assignments.push(astNode);
                    this.setVariableValueType(astNode, fullScopeStack, codeFile);
                    scope.setNextBatchOfChildAstNodes([astNode.initializer]);
                    continueProcessingCurrentScope();
                }
                break;
            case "LambdaExpression":
                scope.setNextBatchOfChildAstNodes([astNode.body]);
                continueProcessingCurrentScope();
                break;
            case "CatchClause":
                scope.setNextBatchOfChildAstNodes(astNode.body.statements);
                continueProcessingCurrentScope();
                break;
            case "AssertStatement":
            case "CastExpression":
                scope.setNextBatchOfChildAstNodes([astNode.expression]);
                continueProcessingCurrentScope();
                break;
            case "ArrayInitializer":
                scope.setNextBatchOfChildAstNodes(astNode.expressions);
                continueProcessingCurrentScope();
                break;
            case "SynchronizedStatement":
                scope.setNextBatchOfChildAstNodes(astNode.body.statements.concat(astNode.expression));
                continueProcessingCurrentScope();
                break;
            case "ConstructorInvocation":
                scope.setNextBatchOfChildAstNodes(astNode.arguments);
                continueProcessingCurrentScope();
                break;
            case "SimpleName":
            case "ThisExpression":
            case "SimpleType":
            case "NumberLiteral":
            case "StringLiteral":
            case "NullLiteral":
            default:
                break;
        }
        // handle loops
        if (LoopTypeByNode.has(astNode.node)) {
            enclosingTypeInformation.loops.push(new Loop(astNode, codeFile.trCodeLines[astNode.location.start.line - 1], this.getEnclosingMethodFromScopeStack(fullScopeStack), enclosingTypeInformation.typeScope.astNode));
        }

        const possibleDeclarationForUsage = this.findDeclaration(astNode, fullScopeStack, codeFile);
        if (possibleDeclarationForUsage != null) {
            enclosingTypeInformation.usages.push(new Usage(astNode, codeFile.trCodeLines[astNode.location.start.line - 1], possibleDeclarationForUsage));
        }

        if (!currentScopeFullyProcessed) {
            let unprocessedBranchNodes = [...scope.unprocessedChildAstNodes];
            for (const childAstNode of unprocessedBranchNodes) {
                this.findCodeComponentsInAstNode(childAstNode, scope, codeFile, enclosingTypeInformation, globalTypeMap);
            }
        }

        for (const branchScope of branchScopes) {
            let unprocessedBranchNodes = [...branchScope.unprocessedChildAstNodes];
            for (const childAstNode of unprocessedBranchNodes) {
                this.findCodeComponentsInAstNode(childAstNode, branchScope, codeFile, enclosingTypeInformation, globalTypeMap);
            }
        }
        enclosingTypeInformation.scopes.push(...branchScopes);
    }
    /**
     * Finds code entities (declarations, method calls, etc.) from the AST of a code file.
     * @param {CodeFile} codeFile Information about a code file
     * @param {Map.<string, TypeInformation>} globalTypeMap Cumulative info about all types discovered so far
     */
    this.findComponentsInCodeFileAst = function (codeFile, globalTypeMap) {
        if (codeFile.abstractSyntaxTree !== null) {
            const syntaxTree = codeFile.abstractSyntaxTree;

            //iterate over classes / enums / etc.
            for (const typeNode of syntaxTree.types) {
                let typeInformation = new TypeInformation();
                const fileScope = new Scope(syntaxTree, [], [], []);
                typeInformation.scopes.push(fileScope);
                this.findCodeComponentsInAstNode(typeNode, fileScope, codeFile, typeInformation, globalTypeMap);
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
                globalTypeMap.set(typeNode.name.identifier, typeInformation);
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
            case "SimpleType":
                return operandAstNode.name.location.start;
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

// allow usage in node.js modules
try {
    if (module !== undefined) {
        module.exports = code_analysis;
    }
} catch (error) {
    // keep silent
}