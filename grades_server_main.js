/*
* Copyright 2020 William Siew, Gregory Kramida
* */
function addListenerForGradingResult() {
    const isLate = $("form table tr:has(td:contains('Adjustment')) td:nth-child(4) input").val().includes("Late");
    const currentScore = parseInt($("form table tr:has(td:contains('Total')) td:nth-child(2)")[0].innerText);

    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {
            // this is meant for a page of this type: https://grades.cs.umd.edu/classWeb/viewGrades.cgi?subPartOf=166356&courseID=1322&stuID=30000
            // this if block fills in the style points and the comment section
            if (message.action === "insertGradingReport") {

                const report = message.report;
                chrome.runtime.sendMessage({
                    action: "timeTab",
                    sessionUrl: report.sessionUrl,
                    studentName: null
                });

                $("textarea[name='block_comment']").val(report.comments);

                let automatedTestScore = currentScore;
                if(isLate){
                    automatedTestScore -= report.assignmentLateScoreAdjustment;
                }

                if (report.studentTestScoreEnabled) {
                    const studentTestScoreInput = $("form table tr:has(td:contains('Student Tests')) td>input")[0];
                    $(studentTestScoreInput).val(report.studentTestScore.toString());
                }

                if (report.codeStyleScoreEnabled) {
                    const codeStyleScoreInput = $("form table tr:has(td:contains('Style')) td>input")[0];
                    $(codeStyleScoreInput).val(report.codeStyleScore.toString());
                }

                if (report.scoreAdjustmentEnabled) {
                    const scoreAdjustmentInput = $("form table tr:has(td:contains('Adjustment')) td>input")[0];
                    let adjustmentValue = report.scoreAdjustment;
                    if(isLate){
                        adjustmentValue += report.assignmentLateScoreAdjustment
                    }
                    // make sure assignment results in a non-negative score
                    if(automatedTestScore + report.studentTestScore + report.codeStyleScore + adjustmentValue < 0){
                        adjustmentValue = - (automatedTestScore + report.studentTestScore + report.codeStyleScore);
                    }

                    $(scoreAdjustmentInput).val(adjustmentValue.toString());
                }
                const saveChangesButton = "form input[value=\"Save Changes\"]";

                // closes current tab
                $(saveChangesButton).on("click", function () {
                    // need to send a message back to background script to close this tab
                    chrome.runtime.sendMessage({
                        action: "saveGradeButtonClicked",
                        sessionUrl: report.sessionUrl //log for usage statistics
                    }, function (response) {})
                })
               
            }
        }
    );
}

function addListenerForOpeningStudentGradePage() {
    chrome.runtime.onMessage.addListener(
        /**
         * Open page with a student's grades (for submission) in a new tab
         * @param {{action:string, report}} message, action field must hold "openStudentGradesPage"
         * @param sender
         * @param sendResponse
         */
        function (message, sender, sendResponse) {
            // this is meant for a page of this type: https://grades.cs.umd.edu/classWeb/viewGrades.cgi?courseID=1322
            // this if block only returns the link of the page where you insert grades
            if (message.action === "openStudentGradesPage") {
                let report = message.report;
                let studentTableRow = $("form[action=\"enterGrades.cgi\"]>table>tbody>tr:has(td:contains('" + report.directoryId + "'))");
                let headersTableCell = $("form[action=\"enterGrades.cgi\"]>table>tbody>tr:first td");

                if (studentTableRow.length === 0) {
                    alert("Error: No student with that directory ID found (student may have dropped or withdrawn from the course)");
                    return;
                }
                if (studentTableRow.length !== 1) {
                    alert("Error: More than one student with that directory ID found");
                    return;
                }

                // gradeServerAssignmentName is of format "P2"
                let assignmentName = report.gradeServerAssignmentName;
                // find index of assignment in headers
                let index = 0;
                let assignmentNameFound = false;
                headersTableCell.each(function () {
                    if ($(this).text() === assignmentName) {
                        assignmentNameFound = true;
                        return false;
                    } else {
                        index += 1
                    }
                })
                if (!assignmentNameFound) {
                    alert("Error: Assignment " + assignmentName + " not found");
                    return;
                }
                let assignmentLink = $(studentTableRow).find("td").eq(index).find("a").prop("href");
                sendResponse(assignmentLink);

                // this is meant for a page of this type: https://grades.cs.umd.edu/classWeb/viewGrades.cgi?subPartOf=166356&courseID=1322&stuID=30000
                // this if block fills in the style points and the comment section
            }
        }
    );
}

function main() {
    if (location.href.includes("stuID=")) {
        // we're on a specific student's submission page in the Grades Server
        addListenerForGradingResult();
    } else {
        // we're on the grades server overview page (most likely)
        addListenerForOpeningStudentGradePage();
    }
}

$(document).ready(main);
