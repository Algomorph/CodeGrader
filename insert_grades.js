/*
* Copyright 2020 Gregory Kramida, William Siew
* */
function setupInsertGrades() {
    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) { 
            // this is meant for a page of this type: https://grades.cs.umd.edu/classWeb/viewGrades.cgi?subPartOf=166356&courseID=1322&stuID=30000
            // this if block fills in the style points and the comment section
            if (message.payload.action == "insertGrades"){
                let report = message.payload.report
                let styleRow = "form table tr:has(td:contains(Style)) td>input"
                let commentBox = "textarea[name='block_comment']"
                $(commentBox).val(report.comments)
                // first input box is score
                let inputColumns = $(styleRow)
                let styleScoreInput = inputColumns[0]
                $(styleScoreInput).val(report.score)
            }
        }
    );

    
}