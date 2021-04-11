/*
* Copyright 2020 Gregory Kramida
* */

function hasSubmissionInOverviewTableCell(overviewTableCell) {
    return $(overviewTableCell).find("a")[0] !== undefined;
}

/**
 * Add a single review link to a Submit-Server overview table cell containing a link to the submission view
 * Assumes that if the passed-in cell has a link, it is the link to the project submission.
 * @param {HTMLTableCellElement} overviewTableCell
 */
function addReviewLinkToOverviewTableCell(overviewTableCell) {
    const linkToProjectSubmission = $(overviewTableCell).find("a")[0];
    if (linkToProjectSubmission) {
        let url = linkToProjectSubmission.href;
        let directUrlToReview = url.replace("instructor/submission.jsp", "codeReview/index.jsp");
        $(overviewTableCell).prepend("<a href='" + directUrlToReview + "' target='_blank'>REVIEW</a>&nbsp;&nbsp;");
    }
}

/**
 * Calculate the score from automatic tests run on the submit server based on the information in the provided overview
 * table cell.
 * Assumes that if the passed-in cell has a link, it is the link to the project submission, formatted as
 *  numbers delimited with the "|" (pipe) character, whose sum is the actual automated test score.
 * @param {HTMLTableCellElement} overviewTableCell
 */
function getAutomaticTestsScoreFromOverviewTableCell(overviewTableCell) {
    const linkToProjectSubmission = $(overviewTableCell).find("a")[0];
    let score = 0;
    if (linkToProjectSubmission) {
        const matches = linkToProjectSubmission.textContent.matchAll(/\d+/g);
        for (const match of matches) {
            score += parseInt(match[0]);
        }
    }
    return score;
}

/**
 * Check whether student in acctTableCell is between first & last student bounds
 * @param {HTMLTableCellElement} acctTableCell
 * @param {String} firstStudent
 * @param {String} lastStudent
 * @returns {boolean} whether the student is a member of the student set
 */
function isMemberOfStudentSet(acctTableCell, firstStudent, lastStudent) {
    const acct = $(acctTableCell).find("a")[0].innerText; // hopefully this never fails :)

    // Supposedly, JS string comparison can have "interesting" behavior depending on locale
    // But this might not matter since directory IDs *shouldn't* be anything other than /[a-z][a-z0-9]{,7}/
    return acct >= firstStudent && acct <= lastStudent;
}

/**
 * Navigate to first file in the provided list that is present in the student's submission (review view) on the
 * submit server (if any)
 * @param {Array.<string>} filePaths list of file paths to check.
 */
function scrollToFirstFile(filePaths) {
    let found = false;
    let i_file = 0;
    let links = null;
    while (!found && i_file < filePaths.length) {
        let filePath = filePaths[i_file];
        links = $(".link.link-block:contains('" + filePath + "')");
        found = links.length > 0;
        i_file++;
    }
    if (found) {
        links[0].click();
    }
}

/**
 * Return the list of files present in the current submit server submission that match any of the entries in the provided
 * file path entry list.
 * @param {Array.<string>} filePathEntryList Each entry may be simply a file path. However, more complex functionality
 * is supported.
 * Firstly, each entry may be a set of paths signifying different versions for a file, concatenated by the "|"
 * delimiter. Secondly, Each entry may also include wildcards, e.g. "*", which are  expanded into the set of files that
 * match the path with the wildcard. Finally, if both the "*" and "|" are used, the first variant with any files already
 * present will be used, and only the files matching it will be added to the resulting list.
 * @return {Array.<string>} paths matching to entries in the list that exist in the current submission.
 */
function expandFilePathEntryList(filePathEntryList) {
    const filePaths = [];

    function processWildcardsAndAddPaths(pathPotentiallyWithWildcards) {
        if (pathPotentiallyWithWildcards.includes("*")) {
            const pattern = new RegExp(pathPotentiallyWithWildcards.replace("*", ".*"));
            filePaths.push(...Array.from(document.querySelectorAll(".link.link-block"))
                .filter(element => pattern.exec(element.textContent) != null)
                .map(element => element.textContent));
        } else {
            if ($(".link.link-block:contains('" + pathPotentiallyWithWildcards + "')").length > 0) {
                filePaths.push(pathPotentiallyWithWildcards);
            }
        }
    }

    for (const filePathEntry of filePathEntryList) {
        if (filePathEntry.includes("|")) {
            for (const pathVariant of filePathEntry.split("|")) {
                if ($(".link.link-block:contains('" + pathVariant + "')").length > 0) {
                    processWildcardsAndAddPaths(pathVariant);
                    break;
                }
            }
        } else {
            processWildcardsAndAddPaths(filePathEntry);
        }
    }

    return filePaths;

}

function recolorCheckedFileLinks(filePaths) {
    for (const filePath of filePaths) {
        $(".link.link-block:contains('" + filePath + "')").addClass("checked-file-link")
    }
}


function highlightAllCheckedCode(filesToCheck) {
    //TODO: code highlighting doesn't play nice with tables, since it actually has a parser of its own and requires
    // the full code.
    let preTags = $("table.code-grid").parent();
    let filesToCheckSet = new Set(filesToCheck);
    for (const preTag of preTags) {
        const filePanelTitle = ($(preTag).parent().find("div.GMYHEHOCNK").text());
        if (filesToCheckSet.has(filePanelTitle)) {
            const codeDivElements = $(preTag).find("tr").find(".gwt-Label");
            for (const codeDiv of codeDivElements) {
                const preTag = document.createElement("pre");
                const codeTag = document.createElement("code");
                codeTag.textContent = $(codeDiv).text();
                $(codeTag).addClass("java");
                $(codeTag).addClass("hljs");
                codeDiv.textContent = ""
                preTag.appendChild(codeTag);
                codeDiv.appendChild(preTag);
            }
        }
    }
}


function getSourceFileContainer(filePath) {
    return $("div.GMYHEHOCNK:contains('" + filePath + "')").parent();
}

function getScrollableSourceFilePane() {
    return $(".GMYHEHOCJK");
}

function getTrCodesForCodeFile(filePathEntry) {
    return $.makeArray(getSourceFileContainer(filePathEntry).find("tr"));
}

function getCodeFromTrCodeLine(trCodeLine) {
    let contentDivTag = $(trCodeLine).find("div.gwt-Label")[0];
    if ($(contentDivTag).find(".code").length) {
        return $($(contentDivTag).find(".code")[0]).text();
    } else {
        return $(contentDivTag).text();
    }
}

function makeWarning(text) {
    return "<h4 style='color:#ffa500'>" + text + "</h4>";
}

function makeCodeFeedArrow() {
    getScrollableSourceFilePane().parent().append(
        $("<span class='code-feed-arrow'>......&#8594;............................................................................................................................................................................................................................................................................................................................................................................................................................................................</span>"));
}

function makeLabels(strList) {
    return _.map(strList, function (s) {
        return "<span class='label'>" + s + "</span>";
    });
}

/**
 * Make a label-button HTML element that, when clicked, scrolls to a specific line in the code section of the submit server review page.
 * @param {string} label text label to put on the label-button
 * @param {HTMLTableRowElement} targetElement an element in the code pane, usually a tr tag associated with a code line, which is the scroll target
 * @param {string|undefined} styleClass (optional) a specific class to use to style the button-label
 * @param {string|undefined} toolTip (optional) the tooltip that will be used when the grader hovers their cursor over the button-label
 * @return {jQuery} the resulting HTML element wrapped in a jQuery object.
 */
function makeLabelWithClickToScroll(label, targetElement, styleClass = undefined, toolTip = undefined) {
    if (typeof styleClass === "undefined") {
        styleClass = "";
    }
    if (typeof toolTip !== "undefined") {
        return $("<div class='label has-tooltip " + styleClass + "'>" + label +
            "<span class='tooltip'>" + toolTip + "</span></div>").click(function () {
            getScrollableSourceFilePane().scrollTop(targetElement.offsetTop + targetElement.parentElement.parentElement.offsetTop - 50);
        });
    } else {
        return $("<span class='label " + styleClass + "'>" + label + "</span>").click(function () {
            getScrollableSourceFilePane().scrollTop(targetElement.offsetTop + targetElement.parentElement.parentElement.offsetTop - 50);
        });
    }

}

function makeLabelsWithClick(list) {
    return _.map(list, function (d) {
        return $("<span class='label'>" + d.message + "</span>").click(function () {
            getScrollableSourceFilePane().scrollTop($(d.scrollTo).position().top);
        })[0];
    });
}


function addButtonComment(trCodeLine, title, defaultMessage, color) {
    let codeNumber = $(trCodeLine).find("td.line-number");
    $(codeNumber).css("border-left", "3px solid " + color);
    let contentDivTag = $(trCodeLine).find(".gwt-Label")[0];
    if ($(contentDivTag).find(".code").length === 0) {
        let codeText = codeTextToHtmlText($(contentDivTag).text());
        $(contentDivTag).empty();
        $(contentDivTag).append($("<span class='code'>" + codeText + "</span>"));
    }
    $(contentDivTag).append($("<span class='tip' style='background-color:" + color + "' msg='" + defaultMessage + "'>" + title + "</span>"));
}


function addCommentOnly(trCodeLine, title, color) {
    let code = $(trCodeLine).find(".gwt-Label");
    $(code).append($("<span class='comment' style='border:1px solid " + color + "; color:" + color + "'>&larr;" + title + "</span>"));
}


function eventFire(element, eventType) {
    if (element.fireEvent) {
        (element.fireEvent('on' + eventType));
    } else {
        let evObj = document.createEvent('Events');
        evObj.initEvent(eventType, true, false);
        element.dispatchEvent(evObj);
    }
}

jQuery.fn.textWalk = function (fn) {
    this.contents().each(recursiveTextWalk);

    function recursiveTextWalk() {
        let nodeName = this.nodeName.toLowerCase();
        if (nodeName === '#text') {
            fn.call(this);
        } else if (this.nodeType === 1 && this.childNodes && this.childNodes[0] && nodeName !== 'script' && nodeName !== 'textarea') {
            $(this).contents().each(recursiveTextWalk);
        }
    }

    return this;
};

jQuery.fn.nextCodeLine = function () {
    return $(this).parents("tr").next().find(".gwt-Label");
}

function highlightText(leafDom, s, color) {
    $(leafDom).textWalk(function () {
        this.data = this.data.replace(" " + s, " <span style='background-color:" + color + "'>" + s + "</span>");
    });
}

function highlightLine(tr, msg, color) {
    let codeNumber = $(tr).find("td.line-number");
    $(codeNumber).css("border-left", "3px solid " + color);
    let codeLines = $(tr).find(".gwt-Label");
    $(codeLines).html($(codeLines).html().replace(/$/ig, "<span class='tip' style='background-color:" + color + "'>" + msg + "</span>"));
}

function highlightSection(tr, start, color) {
    let codeNumber = $(tr).find("td.line-number");
    $(codeNumber).css("border-left", "3px solid " + color);
    let codeLine = $(tr).find(".gwt-Label")[0];

    if ($(codeLine).find(".code").length > 0) {
        codeLine = $(codeLine).find(".code")[0];
    }

    let total = 0;
    let first = 0;
    for (; total < start; first++) { // Undoing tabs is hard... returns the first character of the highlighting area
        if ($(codeLine).text().charAt(first) === '\t') {
            total = (Math.abs(total / 4) + 1) * 4;
        } else {
            total++;
        }
    }

    let code = $(codeLine).text();
    let last = code.length - code.trimStart().length; //Last whitespace. Always the endpoint of highlighting for indents.
    $(codeLine).empty();
    //$(codeLine).append("<span class ='code' style='background-color:" + color + "'>" + code + "</span>");
    $(codeLine).append("<span class ='code'>" + codeTextToHtmlText(code.substr(0, first)) +
        "<span style='background-color:" + color + "'>" + codeTextToHtmlText(code.substr(first, last - first)) + "</span>" +
        codeTextToHtmlText(code.substr(last)) + "</span>");
}

function uncheckBoxes() {
    $("label:contains('Request reply?')").parent().find("input").prop('checked', false);
}


/**
 * Scroll contents of a container (if possible).
 * @param {HTMLDivElement} container
 * @param {HTMLElement} element
 */
function scrollTo(container, element) {
    let absoluteOffset = getAbsoluteOffset(element);
    container.scrollTop = absoluteOffset.top;
}

/**
 * Get absolute offset for an element
 * @param element
 * @return {{top: number, left: number}}
 */
function getAbsoluteOffset(element) {
    let xOffset = 0;
    let yOffset = 0;
    while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop)) {
        xOffset += element.offsetLeft - element.scrollLeft;
        yOffset += element.offsetTop - element.scrollTop;
        element = element.parentNode;
    }
    return {top: yOffset, left: xOffset};
}

/**
 * For a table-row representing a code line in the Marmoset submit server,
 * retrieves the total width (width + padding + offset) of the line number
 * table cell that comes before the cell with the actual code.
 * @param {HTMLTableRowElement} trCodeLine code line table row element
 * @returns {number} left offset of the actual cell containing the code
 */
function getCodeCellLeftOffsetPixels(trCodeLine){
    const tdLineNumber = trCodeLine.children[0];
    const tdLineNumberComputedStyle = window.getComputedStyle(tdLineNumber);
    const lineNumberOffsetPixels =
        getFloatAtStartOfString(tdLineNumberComputedStyle.getPropertyValue("width")) +
        getFloatAtStartOfString(tdLineNumberComputedStyle.getPropertyValue("padding-right")) +
        getFloatAtStartOfString(tdLineNumberComputedStyle.getPropertyValue("border-left-width"));
    return lineNumberOffsetPixels;
}

/**
 * In the Marmoset submit server review page,
 * retrieve the height of the entire code area using the table row representing the code line.
 * @param trCodeLine one of the table rows in the code area
 * @returns {number} height of the code area
 */
function getCodeAreaHeightFromTrCodeLine(trCodeLine){
    const table = trCodeLine.parentElement.parentElement;
    return table.clientHeight;
}

/**
 * Draw a vertical line in the given HTML Element at the specified left offset and with the specified height & style
 * class
 * @param {number} leftOffset offset from the left boundary of the element in pixels
 * @param {number} height height of the line in pixels
 * @param {string} styleClass style class to use for the line
 * @param {HTMLElement} element HTML element, to whose children the new line will be appended to
 */
function drawVerticalLineInElement(leftOffset, height, styleClass, element) {
    const lineDiv = document.createElement("div");
    element.appendChild(lineDiv);
    lineDiv.classList.add(styleClass);
    lineDiv.style.left = leftOffset + "px";
    lineDiv.style.height = height + "px";
}

