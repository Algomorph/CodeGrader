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
 * Navigate to first file in the provided lists that's present in the student's submission (review view) on the submit server (if any)
 * @param {Array.<string>} filesPathsToCheck list of file paths to check
 */
function scrollToFirstFile(filesPathsToCheck) {
    let found = false;
    let i_file = 0;
    let links = null;
    while (!found && i_file < filesPathsToCheck.length) {
        links = $(".link.link-block:contains('" + filesPathsToCheck[i_file] + "')");
        found = links.length > 0;
        i_file++;
    }
    if (found) {
        links[0].click();
    }
}

function recolorCheckedFileLinks(filesToCheck) {
    for (const filePath of filesToCheck) {
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
    if (filePath.includes("|")) {
        const paths = filePath.split("|");
        for(const path of paths){
            const container = $("div.GMYHEHOCNK:contains('" + path + "')");
            if(container.length){
                return container.parent();
            }
        }
        return $("div.GMYHEHOCNK:contains('" + paths[0] + "')").parent();
    } else {
        return $("div.GMYHEHOCNK:contains('" + filePath + "')").parent();
    }

}

function getScrollableSourceFilePane() {
    return $(".GMYHEHOCJK");
}

function getTrCodesForCodeFile(filePath) {
    return $.makeArray(getSourceFileContainer(filePath).find("tr"));
}

function getCodeFromTrCodeLine(trCodeLine) {
    let contentDivTag = $(trCodeLine).find("div.gwt-Label")[0];
    if ($(contentDivTag).find(".code").length) {
        return $($(contentDivTag).find(".code")[0]).text();
    } else {
        return $(contentDivTag).text();
    }
}


function getAllCheckedTrCodeLines(filesToCheck) {
    // flatten to get <tr> for each line of code
    return _.reduce(
        filesToCheck,
        function (memo, filename) {
            let trCodeLinesForFile = getTrCodesForCodeFile(filename);
            return _.union(memo, trCodeLinesForFile);
        },
        []
    );
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

function makeLabelWithClickToScroll(label, targetElement, styleClass, toolTip) {
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