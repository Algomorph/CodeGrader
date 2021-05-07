/*
* Copyright 2021 Gregory Kramida
* */

/**
 * Represents a file containing code.
 */
class CodeFile {
    constructor(filename, sourceCode, trCodeLines, abstractSyntaxTree, parseError, fromLineIndex, toLineIndex) {
        this.filename = filename;
        this.sourceCode = sourceCode;
        this.codeLines = sourceCode.split("\n");
        this.codeLineLengths = this.codeLines.map(codeLine => codeLine.length);
        let offset = 0;
        /** @type {Array.<Number>}*/
        this.lineStartOffsets = [];
        /** @type {Array.<Number>}*/
        this.lineEndOffsets = [];
        $.each(this.codeLineLengths, (iLine, length) => {
            this.lineStartOffsets.push(offset);
            offset += length;
            this.lineEndOffsets.push(offset);
        });
        this.trCodeLines = trCodeLines;
        this.abstractSyntaxTree = abstractSyntaxTree;
        this.parseError = parseError;
        this.fromLineIndex = fromLineIndex;
        this.toLineIndex = toLineIndex;

        /**@type {Map.<string, TypeInformation>}*/
        this.types = new Map();
    }
}