/*
* Copyright 2021 Gregory Kramida
* */

/**
 * Represents a file containing code.
 */
class CodeFile {
    /**
     *
     * @param {string} filename name of the file, without full path
     * @param {string} sourceCode source code within the file, as a single string
     * @param {[HTMLTableRowElement]} trCodeLines
     * @param {Object} abstractSyntaxTree
     * @param {Object} parseError
     */
    constructor(filename, sourceCode, trCodeLines, abstractSyntaxTree, parseError) {
        this.filename = filename;
        this.sourceCode = sourceCode;
        this.codeLines = sourceCode.split("\n");
        this.codeLineLengths = this.codeLines.map(codeLine => codeLine.length);
        let offset = 0;
        /** @type {Array.<Number>}*/
        this.lineStartOffsets = [];
        /** @type {Array.<Number>}*/
        this.lineEndOffsets = [];
        this.codeLineLengths.forEach(length => {
            this.lineStartOffsets.push(offset);
            offset += length;
            this.lineEndOffsets.push(offset);
        });
        this.trCodeLines = trCodeLines;
        this.abstractSyntaxTree = abstractSyntaxTree;
        this.parseError = parseError;

        /**@type {Map.<string, TypeInformation>}*/
        this.types = new Map();
    }
}

// allow usage in node.js modules
try {
    if (module !== undefined) {
        module.exports = CodeFile;
    }
} catch (error) {
    // keep silent
}