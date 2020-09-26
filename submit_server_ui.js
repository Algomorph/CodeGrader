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
            var trCodeLinesForFile = getTrCodesForCodeFile(filename);
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

function makeLabelWithClickToScroll(label, targetElement) {
    return $("<span class='label'>" + label + "</span>").click(function () {
        getScrollableSourceFilePane().scrollTop(targetElement.offsetTop + targetElement.parentElement.parentElement.offsetTop - 50);
    });
}

function makeLabelsWithClick(list) {
    return _.map(list, function (d) {
        return $("<span class='label'>" + d.message + "</span>").click(function () {
            getScrollableSourceFilePane().scrollTop($(d.scrollTo).position().top);
        })[0];
    });
}

function addButtonComment(tr, title, msg, color) {
    let codeNumber = $(tr).find("td.line-number");
    $(codeNumber).css("border-left", "3px solid " + color);
    let code = $(tr).find(".gwt-Label");
    $(code).append($("<span class='tip' style='background-color:" + color + "' msg='" + msg + "'>" + title + "</span>"));
}