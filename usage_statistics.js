/*
* Copyright 2020 William Siew, Gregory Kramida
* */

let usage_statistics = {};

(function () {
    const DEFAULT_GRADERS_NAME = "Anonymous";

    class SessionInfo {
        /**
         *
         * @param {string} gradersName
         */
        constructor(gradersName) {
            this.gradersName = gradersName;
            this.gradeServerTabDuration = 0;
            this.saveGradeButtonClicked = false;
            this.reportGradeButtonClicked = false;
            this.submitServerTabDuration = 0;
        }
    }


    this.sessionInfoByUrl = new Map();
    this.options = null;
    this.gradersName = DEFAULT_GRADERS_NAME;

    class Options {
        /**
         * Build options for the usage statistics module.
         * @param enabled whether the module is at all enabled.
         * @param anonymizeUser flag to anonymize user name. Name is taken from grade_server_module options
         */
        constructor(enabled = true,
                    anonymizeUser = true) {
            this.enabled = enabled;
            this.anonymizeUser = anonymizeUser;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }

    let self = this;

    this.updateOptions = function (options) {
        self.options = options.usageStatisticsOptions;
        if (self.options.anonymizeUser) {
            self.gradersName = DEFAULT_GRADERS_NAME;
        } else {
            self.gradersName = options.moduleOptions.grade_server_module.gradersName;
        }
    }

    this.handleSessionInfo = function (message) {
        if (!self.options.enabled) {
            return;
        }

        let sessionInfo = null;
        if (this.sessionInfoByUrl.has(message.sessionUrl)) {
            sessionInfo = this.sessionInfoByUrl.get(message.sessionUrl);
        } else {
            sessionInfo = new SessionInfo(self.gradersName);
            this.sessionInfoByUrl.set(message.sessionUrl, sessionInfo);
        }

        if (message.action === "gradeServerTabClosed") {
            sessionInfo.gradeServerTabDuration = message.tabActiveDuration;
        } else if (message.action === "saveGradeButtonClicked") {
            sessionInfo.saveGradeButtonClicked = true;
        } else if (message.action === "reportGradeButtonClicked") {
            sessionInfo.reportGradeButtonClicked = true;
        } else if (message.action === "submitServerTabClosed") {
            sessionInfo.submitServerTabDuration = message.tabActiveDuration
            //TODO save session details (including self.gradeServerTabDuration, self._gradersName, submitServerTabDuration, and other stuff).
            // Do this using a POST query somehow, perhaps redirect via background.js first to initiate the POST request.
            console.log("Received submit server tab closing event. Ready to save session information.");
        }
    }

}).apply(usage_statistics);