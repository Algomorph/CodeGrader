// UTILITY FUNCTIONS & CLASSES

function getCurrentSemesterSeasonString() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    let currentSeason = "winter";
    if (currentMonth > 0 && currentMonth < 4) {
        currentSeason = "spring";
    } else if (currentMonth < 8) {
        currentSeason = "summer";
    } else {
        currentSeason = "fall";
    }
    return currentSeason;
}

class Options {
    /**
     * Make an options object
     * @param semesterSeason
     * @param year
     * @param submitServerProjectName
     * @param {Array.<string>} filesToCheck
     */
    constructor(semesterSeason = getCurrentSemesterSeasonString(),
                year = (new Date()).getFullYear().toString(),
                submitServerProjectName = "",
                filesToCheck = []) {
        this.semesterSeason = semesterSeason;
        this.year = year;
        this.submitServerProjectName = submitServerProjectName;
        this.filesToCheck = filesToCheck;
        this.moduleOptions = {
            "keywordModule": keywordModule.getDefaultOptions(),
            "namingModule": namingModule.getDefaultOptions(),
            "methodCallModule": methodCallModule.getDefaultOptions(),
            "indentationModule": indentationModule.getDefaultOptions()
        };
    }
}

// Restores options based on values stored in chrome.storage.
function restoreOptions(callback) {

    let options = new Options();

    chrome.storage.sync.get({
        options: options
    }, callback);
}


class CodeFile {
    constructor(sourceCode, trCodeLines, abstractSyntaxTree, parseError, fromLineIndex, toLineIndex) {
        this.sourceCode = sourceCode;
        this.trCodeLines = trCodeLines;
        this.abstractSyntaxTree = abstractSyntaxTree;
        this.parseError = parseError;
        this.fromLineIndex = fromLineIndex;
        this.toLineIndex = toLineIndex;
    }
}

function parseJava(fileCode) {
    let abstractSyntaxTree = null;
    let parseError = null;
    try {
        // relies on https://github.com/Algomorph/jsjavaparser
        abstractSyntaxTree = JavaParser.parse(fileCode);
    } catch (err) {
        parseError = err;
    }
    return [abstractSyntaxTree, parseError]
}

function readCodeFilesFromServer(fileDescriptors, callback) {
    const fileCount = fileDescriptors.length;
    let processedCount = 0;
    let codeFiles = new Map();

    for (const descriptor of fileDescriptors) {
        $.get(
            descriptor.url,
            function (data) {
                const currentDescriptor = fileDescriptors[processedCount];
                const [abstractSyntaxTree, parseError] = parseJava(data);
                codeFiles.set(currentDescriptor.name, new CodeFile(data, null, abstractSyntaxTree, parseError, 0, 0));
                processedCount++;
                if (processedCount === fileCount) {
                    callback(codeFiles);
                }
            }
        );
    }
}

/**
 *
 * @param {Array.<string>}filesToCheck
 * @returns {[Map<string, CodeFile>,Array.<Element>]}
 */
function getCheckedFileCode(filesToCheck) {
    let fileDictionary = new Map();
    let trCodeLines = [];
    let iLine = 0;
    $.each(
        filesToCheck,
        function (fileIndex, filename) {
            const trCodeLinesForFile = getTrCodesForCodeFile(filename);
            let fileCodeLines = [];
            const iStartLine = iLine;
            $.each(
                trCodeLinesForFile,
                function (trCodeLineIndex, trCodeLine) {
                    const codeText = $($(trCodeLine).find("div.gwt-Label")[0]).text();
                    fileCodeLines.push(codeText)
                    iLine++;
                }
            );
            const iEndLine = iLine;
            const fileCode = fileCodeLines.join("\n");
            const [abstractSyntaxTree, parseError] = parseJava(fileCode);

            fileDictionary.set(filename, new CodeFile(fileCode, trCodeLinesForFile, abstractSyntaxTree, parseError, iStartLine, iEndLine));
            trCodeLines.push(...trCodeLinesForFile);
        }
    );
    return [fileDictionary, trCodeLines];
}

/**
 * Return the same string with first letter capitalized.
 * @param {string} string
 * @return {string}
 */
function capitalize(string) {
    return string[0].toUpperCase() + string.slice(1);
}

/**
 * Compiles an array containing only the CodeName / MethodCall objects with unique "name" field from the input array
 * @param {Array.<CodeName>|Array.<MethodCall>} namesOrCallsArray
 * @return {Array.<CodeName>|Array.<MethodCall>}
 */
function uniqueNames(namesOrCallsArray) {
    let uniqueNamesMap = new Map();
    namesOrCallsArray.forEach(
        (resultObject) => {
            if (!uniqueNamesMap.has(resultObject.name)) {
                uniqueNamesMap.set(resultObject.name, resultObject);
            }
        }
    );
    return [...uniqueNamesMap.values()];
}

function getHelperMethodsUsedInCodeBlock(trCodeLines, helperMethods) {
    let usedMethods = [];
    for (const trCodeLine of trCodeLines) {
        const codeText = getCodeFromTrCodeLine(trCodeLine);
        _.each(helperMethods, function (m, mi) {
            if (codeText.match(m)) usedMethods.push(m);
        });
    }
    return usedMethods;
}

/**
 * Return a range of trCodeLines starting from line matching start regex (inclusive) and before
 * matching end regex (exclusive).
 * @param {Array.<HTMLTableRowElement>} trCodeLines
 * @param start start regex
 * @param end end regex
 * @return {Array.<HTMLTableRowElement>} resulting range.
 */
function getTrCodeLinesBetweenMarkers(trCodeLines, start, end) {

    let trCodeLinesInRange = [];
    let addToRange = false;

    for (const trCodeLine of trCodeLines) {
        const codeText = getCodeFromTrCodeLine(trCodeLine);
        if (addToRange && codeText.match(end)) {
            addToRange = false;
            return trCodeLinesInRange;
        }
        if (codeText.match(start)){
            addToRange = true;
        }
        if (addToRange) {
            trCodeLinesInRange.push(trCodeLine);
        }
    }
    return trCodeLinesInRange;
}

/**
 * Find the first tr code line matching the given regex.
 * @param {Array.<HTMLTableRowElement>} trCodeLines an array of tr tags with code lines
 * @param {RegExp} regex the regex to use
 * @return {null|HTMLTableRowElement} the first tr code line matching regex, null if no matches are found.
 */
function findTrCodeLineUsingRegex(trCodeLines, regex) {
    for (const trCodeLine of trCodeLines) {
        const codeText = getCodeFromTrCodeLine(trCodeLine);
        if (codeText.match(regex)){
            return trCodeLine;
        }
    }
    return null;
}


function addButton(innerText, clickListener, parent) {
    let button_search = document.createElement("button");
    button_search.innerText = innerText;
    button_search.onclick = clickListener;
    parent.appendChild(button_search);
}

function contains(elementList, regex) {
    let filteredElements = Array.prototype.slice.call(elementList).filter(function (e) {
        return regex.test(e.innerText);
    });
    return Array.prototype.slice.call(filteredElements);
}

function getInnerText(elementList, separator) {
    return elementList.map(function (e) {
        return e.innerText;
    }).join(separator);
}

function loadURL(url, domResponseHandler) {
    chrome.runtime.sendMessage({
        action: "xhttp",
        url: url
    }, function (responseText) {
        domResponseHandler(responseText);
    });
}

function reportScore(options) {
    chrome.runtime.sendMessage({
        action: "report",
        options: options
    }, function (response) {
        //
    });
}

function stringDistance(s, t) {
    if (!s.length) return t.length;
    if (!t.length) return s.length;

    return Math.min(
        stringDistance(s.substr(1), t) + 1,
        stringDistance(t.substr(1), s) + 1,
        stringDistance(s.substr(1), t.substr(1)) + (s[0] !== t[0] ? 1 : 0)
    );
}