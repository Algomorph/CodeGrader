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
        /** @type {Array.<code_analysis.Declaration>}*/
        this.declarations = [];
        /** @type {Array.<code_analysis.Loop>}*/
        this.loops = [];
        /** @type {Array.<code_analysis.Scope>}*/
        this.scopes = [];
        this.ternaryExpressions = [];
        this.binaryExpressions = [];
        this.unaryExpressions = [];
        this.assignments = [];
        /** @type {Array.<code_analysis.Usage>}*/
        this.usages = [];
        this.typeScope = null;
    }
}