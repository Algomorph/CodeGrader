/*
* Copyright 2020 William Siew, Gregory Kramida
* */

let usage_statistics = {};

const TabType = {
    UNKNOWN: 0,
    SUBMIT_SERVER_TAB: 1,
    GRADE_SERVER_TAB: 2
};

(function () {

    const UNKNOWN_STRING = "UNKNOWN";

    class TabStatus {
        constructor(isOpen = false) {
            this.open = isOpen;
            this.activeDuration = 0;
        }
    }

    class SessionInfo {
        /**
         *
         * @param {string} graderName
         */
        constructor(graderName, studentName) {
            this.graderName = graderName;
            this.saveGradeButtonClicked = false;
            this.reportGradeButtonClicked = false;
            this.submitServerTabStatus = new TabStatus(true);
            this.gradeServerTabStatus = new TabStatus(false);
            this.studentName = studentName;
        }
    }

    this.sessionInfoByUrl = new Map();
    this.options = null;
    this.graderName = "Anonymous";
    this.course = UNKNOWN_STRING;
    this.assignmentName = UNKNOWN_STRING;
    this.semester = UNKNOWN_STRING;
    this.year = UNKNOWN_STRING;

    let self = this;

    /**
     * Update local options
     * @param {Options} options
     */
    this.updateOptions = function (options) {
        this.options = options.usageStatisticsOptions;
        this.graderName = options.moduleOptions.grade_server_module.graderName;
        this.course = options.course;
        this.assignmentName = options.submitServerAssignmentName;
        this.semester = options.semesterSeason;
        this.year = options.year;
    }

    this._uploadSessionInfoToDatabase = function (sessionUrl, sessionInfo) {

        const request = {
            method: "POST",
            url: "http://codegrader.net/insertdb.php",
            data: new URLSearchParams({
                student_name: sessionInfo.studentName,
                course_name: this.course,
                semester: this.semester,
                year: this.year,
                assignment_name: this.assignmentName,
                duration_ms: sessionInfo.gradeServerTabStatus.activeDuration + sessionInfo.submitServerTabStatus.activeDuration,
                report_clicked: sessionInfo.reportGradeButtonClicked ? 1 : 0,
                save_clicked: sessionInfo.saveGradeButtonClicked ? 1 : 0,
                graders_name: sessionInfo.graderName,
                anonymize_grader: this.options.anonymizeUser
            }).toString()
        }

        sendPostXHTTPRequest(request);
        this.sessionInfoByUrl.delete(sessionUrl);
    }

    this.handleSessionInfoMessage = function (message) {
        if (!this.options.enabled) {
            return;
        }
        if (this.sessionInfoByUrl.has(message.sessionUrl)) {
            const sessionInfo = this.sessionInfoByUrl.get(message.sessionUrl);
            if (message.action === "saveGradeButtonClicked") {
                sessionInfo.saveGradeButtonClicked = true;
            } else if (message.action === "reportGradeButtonClicked") {
                sessionInfo.reportGradeButtonClicked = true;
            }
        }
    }

    this.handleTabOpen = function (tabType, sessionUrl, studentName){
        if (!this.options.enabled) {
            return;
        }
        let sessionInfo = null;

        switch (tabType){
            case TabType.GRADE_SERVER_TAB:
                if (this.sessionInfoByUrl.has(sessionUrl)){
                    sessionInfo = this.sessionInfoByUrl.get(sessionUrl);
                    sessionInfo.gradeServerTabStatus.open = true;
                }
                break;
            case TabType.SUBMIT_SERVER_TAB:
                sessionInfo = new SessionInfo(this.graderName, studentName);
                this.sessionInfoByUrl.set(sessionUrl, sessionInfo);
                break;
            default:
                return;
        }


    }

    /**
     * Handle a tab close event. If both tabs for a student session (grading of a single student's submission) are
     * closed, will trigger a routine that uploads the session data to the server.
     *
     * @param {TabType} tabType type of the tab (submit server tab or grade server tab)
     * @param {string} sessionUrl url of the student session
     * @param {number} tabActiveDuration the total duration the tab that was closed has been active
     */
    this.handleTabClose = function (tabType, sessionUrl, tabActiveDuration) {
        if (!this.options.enabled) {
            return;
        }

        if (this.sessionInfoByUrl.has(sessionUrl)) {
            const sessionInfo = this.sessionInfoByUrl.get(sessionUrl);
            let otherTabIsClosed = true;
            let tabStatus = null;
            switch (tabType){
                case TabType.GRADE_SERVER_TAB:
                    otherTabIsClosed = !sessionInfo.submitServerTabStatus.open;
                    tabStatus = sessionInfo.gradeServerTabStatus;
                    break;
                case TabType.SUBMIT_SERVER_TAB:
                    otherTabIsClosed = !sessionInfo.gradeServerTabStatus.open;
                    tabStatus = sessionInfo.submitServerTabStatus;
                    break;
                default:
                    return;
            }
            tabStatus.activeDuration = tabActiveDuration;
            tabStatus.open = false;
            if (otherTabIsClosed) {
                this._uploadSessionInfoToDatabase(sessionUrl, sessionInfo);
            }
        }
    }


}).apply(usage_statistics);