/*
* Copyright 2021 Gregory Kramida
* */

/**
 * Holds all information gathered for a particular type (object/interface)
 */
class TypeInformation {
    constructor() {
        /** @type {Array.<MethodCall>}*/
        this.methodCalls = [];
        /** @type {Array.<Declaration>}*/
        this.declarations = [];
        this.methodDeclarationMap = new Map();
        this.constructorDeclarationMap = new Map();
        /** @type {Array.<Loop>}*/
        this.loops = [];
        /** @type {Array.<Scope>}*/
        this.scopes = [];
        this.ternaryExpressions = [];
        this.binaryExpressions = [];
        this.unaryExpressions = [];
        this.assignments = [];
        /** @type {Array.<Usage>}*/
        this.usages = [];
        this.typeScope = null;
    }
}

// allow usage in node.js modules
try {
    if (module !== undefined) {
        module.exports = TypeInformation;
    }
} catch (error) {
    // keep silent
}