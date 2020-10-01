function scrollToFirstFile(firstFileToCheck) {
    $(".link.link-block:contains('" + firstFileToCheck + "')")[0].click();
}

function getSourceFileContainer(filename) {
    return $("div.GMYHEHOCNK:contains('" + filename + "')").parent();
}

function getScrollableSourceFilePane(){
    return $(".GMYHEHOCJK");
}

function getTrCodesForCodeFile(filename) {
    return $.makeArray(getSourceFileContainer(filename).find("tr"));
}

function getCodeFromTrCodeLine(trCodeLine) {
    return $($(trCodeLine).find("div.gwt-Label")[0]).text();
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

function makeWarning(text){
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
    if(typeof styleClass === "undefined"){
        styleClass = "";
    }
    if(typeof toolTip !== "undefined"){
        return $("<div class='label has-tooltip " + styleClass + "'>" + label +
            "<span class='tooltip'>" + toolTip +"</span></div>").click(function () {
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

function addButtonComment(trElement, title, defaultMessage, color) {
    let codeNumber = $(trElement).find("td.line-number");
    $(codeNumber).css("border-left", "3px solid " + color);
    let code = $(trElement).find(".gwt-Label");
    $(code).append($("<span class='tip' style='background-color:" + color + "' msg='" + defaultMessage + "'>" + title + "</span>"));
}

function eventFire(el, etype){
    if (el.fireEvent) {
        (el.fireEvent('on' + etype));
    } else {
        let evObj = document.createEvent('Events');
        evObj.initEvent(etype, true, false);
        el.dispatchEvent(evObj);
    }
}