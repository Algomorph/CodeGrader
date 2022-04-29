/*
* Copyright 2020 William Siew, Gregory Kramida
* */

let grade_server_module = {};

(function () {

    class Options {
        /**
         * Build options for the grade server.
         * @param enabled whether the module is at all enabled.
         * @param gradeServerAssignmentName project/assignment name up on the grade server.
         * Often the first letter & number of the project/quiz/exam on the submit server.
         * @param graderName name of the grader, e.g. Greg K. Don't just use first and last initial, at least provide the full first name.
         * @param minimumScoreAdjustment  - maximum points that the grader is able to deduct (in addition to the late
         * penalty, when applicable). This has to be a negative value or zero. If the value is zero, the control for
         * this will not added drawn on the panel.
         * @param maximumCodeStyleScore
         * Maximum points on code style for the assignment. A value of zero means the control won't get added to the panel.
         * @param maximumStudentTestsScore
         * Maximum points for student tests. A value of zero means the control won't get added to the panel.
         * @param {Array.<Object>} customRubricCategories
         */
        constructor(enabled = true,
                    gradeServerAssignmentName = "",
                    graderName = "",
                    minimumScoreAdjustment = 0,
                    maximumCodeStyleScore = 10,
                    maximumStudentTestsScore = 0,
                    customRubricCategories = []) {
            this.enabled = enabled;
            this.gradeServerAssignmentName = gradeServerAssignmentName;
            this.graderName = graderName;
            this.minimumScoreAdjustment = minimumScoreAdjustment;
            this.maximumCodeStyleScore = maximumCodeStyleScore;
            this.maximumStudentTestsScore = maximumStudentTestsScore;
            this.customRubricCategories = customRubricCategories;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    class RubricCategory{
        /**
         *
         * @param {string} name
         * @param {number} maximumScore
         * @param {number} currentScore
         */
        constructor(name, maximumScore, currentScore) {
            this.name = name;
            this.maximumScore = maximumScore;
            this.currentScore = currentScore;
        }

        get inputId(){
            return this.name.toLowerCase().replaceAll(/[()\[\]<> ]/g, "-") + "-score";
        }

        /**
         * @param {HTMLDivElement} uiPanel
         */
        addToUiPanel(uiPanel){
            $("<p>" + this.name + ": <input id=\"" + this.inputId + "\" type=\"text\" name=\"user\"></p>").appendTo(uiPanel)
            $("input#"+this.inputId).val(this.currentScore.toString());
        }
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
     * @param {number} assignmentLateScoreAdjustment adjustment to the student score if they submit the project late (has to be negative)
     */
    this.initializeAndAddToUI = function (uiPanel, options, semesterSeason, year, assignmentLateScoreAdjustment) {
        if (!options.enabled) {
            return;
        }

        $(uiPanel).append("<h3 style='color:#0d5212'>Grade</h3>");
        const codeStyleScoreEnabled = options.maximumCodeStyleScore !== 0;
        const scoreAdjustmentEnabled = options.minimumScoreAdjustment !== 0;
        const studentTestScoreEnabled = options.maximumStudentTestsScore !== 0;

        if (studentTestScoreEnabled) {
            $("<p>Student Tests: <input id=\"grading-plugin-student-test-score\" type=\"text\" name=\"user\"></p>").appendTo(uiPanel)
        }

        if (codeStyleScoreEnabled) {
            $("<p>Style: <input id=\"grading-plugin-code-style-score\" type=\"text\" name=\"user\"></p>").appendTo(uiPanel)
        }

        if (scoreAdjustmentEnabled) {
            $("<p>Adjustment: <input id=\"grading-plugin-score-adjustment-score\" type=\"text\" name=\"user\"></p>").appendTo(uiPanel)
            $("input#grading-plugin-score-adjustment-score").val("0");
        }

        this.customRubricCategories = []
        if(options.customRubricCategories !== null){
            for (const categoryOptionsDefinition of options.customRubricCategories){
                const category = new RubricCategory(
                    categoryOptionsDefinition.name,
                    categoryOptionsDefinition.maximumScore,
                    categoryOptionsDefinition.defaultScore
                );
                this.customRubricCategories.push(category);
                category.addToUiPanel(uiPanel);
            }
        }
        /** @type{Array.<RubricCategory>}*/
        const customRubricCategories = this.customRubricCategories;

        // report total score to grade server tab
        $("<button>REPORT TO GRADE SERVER</button>").click(function () {
            let fieldValidationSuccessful = true;
            let studentTestScore = 0, codeStyleScore = 0, scoreAdjustment = 0;
            let studentTestScoreValid, codeStyleScoreValid, scoreAdjustmentValid;
            // validate inputs
            if (studentTestScoreEnabled) {
                [studentTestScoreValid, studentTestScore] =
                    validateNumericInput($("input#grading-plugin-student-test-score").val(), 0, options.maximumStudentTestsScore);
                fieldValidationSuccessful &= studentTestScoreValid;
            }
            if (codeStyleScoreEnabled) {
                [codeStyleScoreValid, codeStyleScore] =
                    validateNumericInput($("input#grading-plugin-code-style-score").val(), 0, options.maximumCodeStyleScore);
                fieldValidationSuccessful &= codeStyleScoreValid;
            }
            if (scoreAdjustmentEnabled) {
                [scoreAdjustmentValid, scoreAdjustment] =
                    validateNumericInput($("input#grading-plugin-score-adjustment-score").val(), options.minimumScoreAdjustment, 0);
                fieldValidationSuccessful &= scoreAdjustmentValid;
            }
            const categoryScoreReports = []
            for (const category of customRubricCategories){
                let scoreValid = false; let validatedScore = 0;
                [scoreValid, validatedScore] =
                    validateNumericInput($("input#"+category.inputId).val())
                fieldValidationSuccessful &= scoreValid;
                categoryScoreReports.push({"name": category.name, "score": validatedScore})
            }
            if (options.graderName.length < 4) {
                alert("Please enter the grader's name (graderName) longer than three characters in CodeGrader options (Note: initials may be ambiguous.)");
            } else if (fieldValidationSuccessful) {
                const directoryId = $("h1").text().split(",")[1].split("(")[1].split(")")[0]
                let finalComment = ""
                // add graders name
                const classes = $("div.GMYHEHOCMK:has(tr.modified-code-row div.gwt-HTML.comment-text:visible)");
                
                finalComment += "Grader: " + options.graderName + "\n\n"
                // add REVIEW link
                if (classes.length > 0 ) {finalComment += "See feedback comments in your code online at: " + location.href + "\n\n"}
                // Using CSS selectors for majority of filtering
                
                classes.each(function () {
                    const className = $(this).find("div.GMYHEHOCNK").text().split('/').slice(-1)[0]
                    finalComment += className + "\n";
                    const rowsWithComments = $(this).find("tr.modified-code-row:has(div.gwt-HTML.comment-text:visible)");
                    rowsWithComments.each(function () {
                        //line numbers end with colons, eg 15:
                        const lineNumber = $(this).find("td.line-number").text();
                        const comments = $(this).find(".gwt-HTML.comment-text");
                        //Although unlikely, one row can have multiple comments
                        comments.each(function () {
                            let commentText = this.textContent;
                            finalComment += lineNumber + " " + commentText + "\n";
                        })
                    })
                })
                let report = {
                    directoryId: directoryId,
                    studentTestScoreEnabled : studentTestScoreEnabled,
                    studentTestScore : studentTestScore,
                    codeStyleScoreEnabled: codeStyleScoreEnabled,
                    codeStyleScore: codeStyleScore,
                    scoreAdjustmentEnabled : scoreAdjustmentEnabled,
                    scoreAdjustment: scoreAdjustment,
                    assignmentLateScoreAdjustment: assignmentLateScoreAdjustment,
                    categoryScoreReports: categoryScoreReports,
                    comments: finalComment,
                    semesterSeason: semesterSeason,
                    year: year,
                    gradeServerAssignmentName: options.gradeServerAssignmentName,
                    graderName: options.graderName,
                    sessionUrl: location.href
                }
                chrome.runtime.sendMessage({
                    action: "reportGradeButtonClicked",
                    sessionUrl: location.href, // log for usage statistics
                    report: report,
                }, function (response) {
                    //TODO
                });
            }

        }).appendTo(uiPanel);
    }

}).apply(grade_server_module);