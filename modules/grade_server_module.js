/*
* Copyright 2020 William Siew, Gregory Kramida
* */

let grade_server_module = {};

(function () {

    class Options {
        /**
         * Build default options
         *
         */
        constructor(enabled = true,
                    gradeServerAssignmentName = "",
                    gradersName = "") {
            this.enabled = enabled;

            this.gradeServerAssignmentName = gradeServerAssignmentName;
            this.gradersName = gradersName;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    /* Notes:
    Files to keep in mind: insert_grades,submit_server_ui. n
    Should aggregate comments and name them with line and class, and be able to assign and submit grade for respective student
    For testing, verify if the tab in the grades server that tracks changes has the update or if the page has the updated info
    */
    /**
     * Initialize the grade server module.
     * @param uiPanel
     * @param {Options} options options for this specific module
     * @param {string} semesterSeason the current semester's season (e.g. Fall, Spring, or Summer)
     * @param {number} year the current semester year
     */
    this.initialize = function (uiPanel, options, semesterSeason, year) {
        if(!options.enabled){
            return;
        }
        // score box
        $("<p>Score: <input id=\"grading-plugin-score\" type=\"text\" name=\"user\"></p>").appendTo(uiPanel)
        // report total score to grade server tab
        $("<button>REPORT TO GRADE SERVER</button>").click(function () {
            let score = $("input#grading-plugin-score").val()
            if (score.length === 0) {
                alert("You need to enter a score.");
            } else if (isNaN(score)) {
                alert("You must enter a number.");
            } else if (parseInt(score, 10) < 0) {
                alert("You must enter a non-negative number.");
            } else if (options.gradersName.length < 4) {
                alert("You must enter a graders name longer than 3 characters in options(Don't use initials)");
            } else {
                let directoryId = $("h1").text().split("(")[1].split(")")[0]
                let finalComment = ""
                // add graders name
                finalComment += "Grader: " + options.gradersName + "\n"
                // Using CSS selectors for majority of filtering
                let classes = $("div.GMYHEHOCMK:has(tr.modified-code-row div.gwt-HTML.comment-text:visible)");
                classes.each(function () {
                    let className = $(this).find("div.GMYHEHOCNK").text().split('/').slice(-1)[0]
                    finalComment += className + "\n";
                    let rowsWithComments = $(this).find("tr.modified-code-row:has(div.gwt-HTML.comment-text:visible)");
                    rowsWithComments.each(function () {
                        //line numbers end with colons, eg 15:
                        let lineNumber = $(this).find("td.line-number").text();
                        let comments = $(this).find(".gwt-HTML.comment-text");
                        //Although unlikely, one row can have multiple comments
                        comments.each(function () {
                            let commentText = this.textContent;
                            finalComment += lineNumber + commentText + "\n";
                        })
                    })
                })
                let report = {
                    directoryId: directoryId,
                    score: score,
                    comments: finalComment,
                    semesterSeason: semesterSeason,
                    year: year,
                    gradeServerAssignmentName: options.gradeServerAssignmentName,
                    gradersName: options.gradersName
                }
                reportToGradeServer({
                    action: "reportGrades",
                    options: report
                });
            }

        }).appendTo(uiPanel);
    }

}).apply(grade_server_module);