/*
* Copyright 2020 Gregory Kramida
* */

let code_analysis = {};

(function () {
    this.logMethodOwnershipWarnings = false;
}).apply(code_analysis)

// allow usage in node.js modules
try {
    if (module !== undefined) {
        module.exports = code_analysis;
    }
} catch (error) {
    // keep silent
}