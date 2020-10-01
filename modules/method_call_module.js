let methodCallModule = {};

(function () {

    const MethodCallType = {
        METHOD:"method",
        CONSTRUCTOR:"constructor",
        SUPER_METHOD:"super method",
        SUPER_CONSTRUCTOR:"super constructor",
    }

    class MethodCall {
        constructor(name, trCodeLine, astNode, type) {
            this.name = name;
            this.trCodeLine = trCodeLine;
            this.astNode = astNode;
            this.type = type;
        }
    }

    const possibleExpressions = new Set(["InfixExpression", "PrefixExpression"]);

    function getMethodCallsFromNode(node, methodCalls, codeFile) {
        let children = [];
        switch (node.node){
            case "TypeDeclaration":
                children = node.bodyDeclarations;
                break;
            case "MethodDeclaration":
                children = node.body.statements;
                break;
            case "Block":
                children = node.statements;
                break;
            case "IfStatement":
                children = [node.expression, node.thenStatement];
                if(node.elseStatement !== null){
                    children.push(node.elseStatement);
                }
                break;
            case "ForStatement":
                children = [...node.updaters];
                children.push(node.expression);
                children.push(...node.initializers);
                children.push(...node.body.statements);
                break;
            case "EnhancedForStatement":
                children = node.body.statements;
                children.push(node.expression);
                break;
            case "SwitchStatement":
                children = node.statements.each(switchCase => switchCase.expression);
                children.push(node.expression);
                break;
            case "ReturnStatement":
            case "ParenthesizedExpression":
            case "ThrowStatement":
            case "ExpressionStatement":
                children = [node.expression];
                break;
            case "TryStatement":
                children = [...node.body.statements];
                if(node.catchClauses !== null){
                    children.push(...node.catchClauses);
                }
                if(node.finally !== null){
                    children.push(...node.finally.statements);
                }
                break;
            case "InstanceOfExpression":
            case "InfixExpression":
                children = [node.leftOperand, node.rightOperand];
                break;
            case "PrefixExpression":
                children = [node.operand];
                break;
            case "Assignment":
                children = [node.leftHandSide, node.rightHandSide];
                break;
            case "SuperMethodInvocation":
                methodCalls.push(new MethodCall("super.", codeFile.trCodeLines[node.location.start.line - 1], node, MethodCallType.SUPER_METHOD));
                children = node.arguments;
                break;
            case "SuperConstructorInvocation":
                methodCalls.push(new MethodCall("super(", codeFile.trCodeLines[node.location.start.line - 1], node, MethodCallType.SUPER_CONSTRUCTOR));
                children = node.arguments;
                break;
            case "ClassInstanceCreation":
                methodCalls.push(new MethodCall(node.type.name.identifier, codeFile.trCodeLines[node.location.start.line - 1], node, MethodCallType.CONSTRUCTOR));
                children = node.arguments;
                break;
            case "MethodInvocation":
                methodCalls.push(new MethodCall(node.name.identifier, codeFile.trCodeLines[node.location.start.line - 1], node, MethodCallType.METHOD));
                children = node.arguments;
                break;
            case "VariableDeclarationStatement":
            case "VariableDeclarationExpression":
            case "FieldDeclaration":
                children = node.fragments;
                break;
            case "VariableDeclarationFragment":
                if(node.initializer !== null){
                    children = [node.initializer];
                }
                break;
            case "CatchClause":
                children = node.body.statements;
                break;
            default:
                break;
        }

        for (const child of children) {
            getMethodCallsFromNode(child, methodCalls, codeFile);
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
                    let methodCallsForType = [];
                    getMethodCallsFromNode(type, methodCallsForType, codeFile);
                    methodCalls.push(...methodCallsForType);
                }
            }
        }

        for (const methodCall of methodCalls) {
            $(uiPanel).append(makeLabelWithClickToScroll(methodCall.name, methodCall.trCodeLine));
            addButtonComment(
                methodCall.trCodeLine, capitalize(methodCall.type) + " call: " + methodCall.name, "", "#b3769f"
            );
        }
    }

}).apply(methodCallModule);