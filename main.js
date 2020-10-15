/*
 * Checks the URL or other property of the current web page and run allowed function
 */
function main(optionItems) {
    let options = optionItems.options;

    // condition: URL contains 'instructor' keyword
    // add 'review' buttons next to last submission date for directly going to review page
    if (location.href.indexOf('instructor') > -1) {
        let table_submissions = $("table:contains('last submission')");
        let td_list = $(table_submissions).find("tr").find("td:nth-child(6)");
        let projectIndex = location.href.search(/projectPK=(\d+)/);
        $.each(td_list, function (tdi, td) {
            let aTag = $(td).find("a")[0];
            if (!aTag) return;
            let url = aTag.href;
            let directUrlToReview = url.replace("instructor/submission.jsp", "codeReview/index.jsp");
            $(td).prepend("<a href='" + directUrlToReview + "' target='_blank'>REVIEW__</a>");
        });
    }

    const semesterString = options.semesterSeason + options.year.toString();


    // condition: URL contains 'condeReview' and the semester matches the semester selected in options.
    if (location.href.indexOf('codeReview') > -1 && location.href.indexOf(semesterString) > -1) {
        const projectName = options.submitServerProjectName;

        // check if it's the right course & project
        if ($("h1").text().match(projectName)) {
            constructUiPanel(options);
        }
    }
    // assign click event to predefined comment buttons
    $(".tip").click(function () {
        eventFire($(this).parent()[0], 'dblclick');
        let self = this;
        setTimeout(function () {
            $(self).parent().parent().find("input[type='checkbox']").prop("checked", false);
            let textBox = $(self).parent().parent().find("textarea");
            textBox.attr("aria-hidden", "false");
            if ($(self).attr('msg') !== "") {
                $(textBox).val($(self).attr('msg'));
                eventFire($(textBox).parent().find("a:contains('Save')")[0], 'click');
            } else {
                $(textBox).val("");
            }
        }, 500);
    });
} // MAIN ENDS

function constructUiPanel(options) {
    // first, create summary uiPanel
    let uiPanelContainer = document.createElement('div');
    uiPanelContainer.setAttribute('class', 'ui-panel-container');
    let uiPanel = document.createElement('div');
    uiPanel.setAttribute('class', 'ui-panel');
    uiPanelContainer.appendChild(uiPanel);
    document.body.appendChild(uiPanelContainer);

    //TODO: get rid of this global entirely, use getScrollableSourceFilePane() instead
    paneToScroll = $(".GMYHEHOCJK");
    makeCodeFeedArrow();

    const filesToCheck = options.filesToCheck;

    if (filesToCheck.length === 0) {
        $(uiPanel).append(makeWarning("Note: no files to check specified in plugin options, review modules disabled."));
    } else {
        scrollToFirstFile(filesToCheck);
        const [codeFileDictionary, trCodeLines] = getCheckedFileCode(filesToCheck);
        for(const codeFile of codeFileDictionary.values()){
            code_analysis.findEntitiesInCodeFileAst(codeFile);
        }
        for (const [fileName, codeFile] of codeFileDictionary.entries()) {
            if (codeFile.parseError !== null) {
                $(uiPanel).append(makeWarning("Note: parse error in file '" + fileName +
                    "'. Please check developer console for details. Disabling modules that depend on static code analysis for this file."));
                console.log(codeFile.parseError);
            }
        }


        keyword_module.initialize(uiPanel, trCodeLines, options.moduleOptions.keywordModule);
        naming_module.initialize(uiPanel, codeFileDictionary, options.moduleOptions.namingModule);
        method_call_module.initialize(uiPanel, codeFileDictionary, options.moduleOptions.methodCallModule);
        indentation_module.initialize(uiPanel, trCodeLines, options.moduleOptions.indentationModule);
        spacing_module.initialize(uiPanel, trCodeLines, options.moduleOptions.spacingModule);
    }


    grade_server_module.initialize(uiPanel);
}

$(document).ready(function () {
    setTimeout(
        function () {
            restoreOptions(main);
        },
        3000
    );
});