/*
 * Checks the URL or other property of the current web page and run allowed function
 */

function main(optionItems) {
    let options = optionItems.options;

    // condition: URL contains 'instructor' keyword
    // add 'review' buttons next to last submission date for directly going to review page
    if (location.href.indexOf('instructor') > -1) {
        let tableSubmissions = $("table:contains('last submission')");
        let onTimeColumn = $(tableSubmissions).find("tr").find("td:nth-child(8)");
        let lateColumn = $(tableSubmissions).find("tr").find("td:nth-child(9)");
        let projectIndex = location.href.search(/projectPK=(\d+)/);
        for (let iStudent = 0; iStudent < onTimeColumn.length; iStudent++) {
            let onTimeTableCell = onTimeColumn[iStudent];
            let onTimeAnchorTag = $(onTimeTableCell).find("a")[0];
            let lateTableCell = lateColumn[iStudent];
            let lateAnchorTag = $(lateTableCell).find("a")[0];
            let anchorTagToUse = undefined;
            let tableCellToUse = undefined;
            if (onTimeAnchorTag) {
                anchorTagToUse = onTimeAnchorTag;
                tableCellToUse = onTimeTableCell;
            } else {
                anchorTagToUse = lateAnchorTag;
                tableCellToUse = lateTableCell;
            }
            if (anchorTagToUse) {
                let url = anchorTagToUse.href;
                let directUrlToReview = url.replace("instructor/submission.jsp", "codeReview/index.jsp");
                $(tableCellToUse).prepend("<a href='" + directUrlToReview + "' target='_blank'>REVIEW</a>&nbsp;&nbsp;");
            }
        }

    }

    const semesterString = options.semesterSeason + options.year.toString();


    // condition: URL contains 'condeReview' and the semester matches the semester selected in options.
    if (location.href.indexOf('codeReview') > -1 && location.href.indexOf(semesterString) > -1) {
        const projectName = options.submitServerProjectName;

        // check if it's the right course & project
        if ($("h1").text().match(projectName)) {
            //FIXME
            // highlightAllCheckedCode(options.filesToCheck);
            // hljs.initHighlightingOnLoad();
            recolorCheckedFileLinks(options.filesToCheck);
            scrollToFirstFile(options.filesToCheck);
            constructUiPanel(options);
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
    }

    if(location.href.includes("viewGrades.cgi")){
        setupGradesServer();
        //__DEBUG
        console.log("Hi, I am Grades server");
    }

} // MAIN ENDS

function constructUiPanel(options) {
    // first, create summary uiPanel
    let uiPanelContainer = document.createElement('div');
    uiPanelContainer.setAttribute('class', 'ui-panel-container');
    let uiPanel = document.createElement('div');
    uiPanel.setAttribute('class', 'ui-panel');
    uiPanelContainer.appendChild(uiPanel);
    document.body.appendChild(uiPanelContainer);

    makeCodeFeedArrow();

    if (options.filesToCheck.length === 0) {
        $(uiPanel).append(makeWarning("Note: no files to check specified in plugin options, review modules disabled."));
    } else {

        const [codeFileDictionary, trCodeLines] = getCheckedFileCode(options.filesToCheck);
        for (const codeFile of codeFileDictionary.values()) {
            code_analysis.findEntitiesInCodeFileAst(codeFile);
        }
        for (const [fileName, codeFile] of codeFileDictionary.entries()) {
            if (codeFile.parseError !== null) {
                $(uiPanel).append(makeWarning("Note: parse error in file '" + fileName +
                    "'. Please check developer console for details. Disabling modules that depend on static code analysis for this file."));
                console.log(codeFile.parseError);
            }
        }

        keyword_module.initialize(uiPanel, trCodeLines, options.moduleOptions.keyword_module);
        naming_module.initialize(uiPanel, codeFileDictionary, options.moduleOptions.naming_module);
        method_call_module.initialize(uiPanel, codeFileDictionary, options.moduleOptions.method_call_module);
        spacing_module.initialize(uiPanel, codeFileDictionary, options.moduleOptions.spacing_module);
        brace_style_module.initialize(uiPanel, codeFileDictionary, options.moduleOptions.brace_style_module);
        unused_code_module.initialize(uiPanel, codeFileDictionary, options.moduleOptions.unused_code_module);
        indentation_module.initialize(uiPanel, trCodeLines, options.moduleOptions.indentation_module);
    }

    let gradeServerOptions = {
        semesterSeason: options.semesterSeason, 
        year: options.year.toString(),
        projName: options.submitServerProjectName,
    }
    grade_server_module.initialize(uiPanel, gradeServerOptions);    
}

$(document).ready(function () {
    setTimeout(
        function () {
            restoreOptions(main);
        },
        3000
    );
});