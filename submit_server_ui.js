function scrollToFirstFile(firstFileToCheck) {
    $(".link.link-block:contains('" + firstFileToCheck + "')")[0].click();
}

function getSourceFileContainer(filename) {
    return $("div.GMYHEHOCNK:contains('" + filename + "')").parent();
}

function getScrollableSourceFilePane() {
    return $(".GMYHEHOCJK");
}

function getTrCodesForCodeFile(filename) {
    return $.makeArray(getSourceFileContainer(filename).find("tr"));
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
        let codeText = $(contentDivTag).text();
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

    if($(codeLine).find(".code").length > 0){
        codeLine = $(codeLine).find(".code")[0];
    }

    let total = 0;
    let i = 0;
    for (; total < start; i++) { // Undoing tabs is hard...
        if ($(codeLine).html().charAt(i) === '\t') {
            total = (Math.abs(total / 4) + 1) * 4;
        } else {
            total++;
        }
    }
    $(codeLine).html().replace($(codeLine).html(), $(codeLine).html().substr(0, i) +
        "<span style='background-color:" + color + "'>" + $(codeLine).html().substr(i, -i + $(codeLine).html().length - $(codeLine).html().trimStart().length) + "</span>" +
        $(codeLine).html().substr($(codeLine).html().length - $(codeLine).html().trimStart().length));
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