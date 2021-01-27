/*
* Copyright 2020 William Siew, Gregory Kramida
* */

let usage_statistics_module = {};

(function () {

    this._gradersName = "Anonymous";
    this._active = false;

    this._submitServerTabDuration = 0;
    this._gradeServerTabDuration = 0;
    this._saveGradeButtonClicked = false;
    this._reportGradeButtonClicked = false;

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

    /**
     * Initialize the module.
     * @param {Options} usageStatisticsModuleOptions options for statistics gathering
     * @param {string} gradersName grade server module options
     */
    this.initialize = function (usageStatisticsModuleOptions, gradersName = "") {
        if (!usageStatisticsModuleOptions.enabled) {
            this._active = false;
            return;
        }
        this._active = true;
        if (!usageStatisticsModuleOptions.anonymizeUser && gradersName.length > 0) {
            this._gradersName = gradersName;
        }

        let submitServerSessionUrl = location.href;

        //__DEBUG
        chrome.runtime.sendMessage({
            action: "logToConsole",
            message: "I am usage_statistics_module, about to activate tab tracking."
        });

        let session_url = location.href;

        chrome.runtime.sendMessage({
            action: "timeActiveTab",
            session_url: session_url
        });


        chrome.runtime.onMessage.addListener(
            function (message, sender, sendResponse) {
                if(message.session_url !== undefined && message.session_url != null && message.session_url === session_url){
                    if (message.action === "gradeServerTabClosed") {
                        self._gradeServerTabDuration = message.tabActiveDuration;
                    } else if (message.action === "saveGradeButtonClicked"){
                        self._saveGradeButtonClicked = true;
                    } else if (message.action === "reportGradeButtonClicked"){
                        self._reportGradeButtonClicked = true;
                    } else if (message.action === "submitServerTabClosed"){
                        self._submitServerTabDuration = message.tabActiveDuration
                        //TODO save session details (including self.gradeServerTabDuration, self._gradersName, submitServerTabDuration, and other stuff).
                        // Do this using a POST query somehow, perhaps redirect via background.js first to initiate the POST request.
                        //__DEBUG
                        chrome.runtime.sendMessage({
                            action: "logToConsole",
                            message: "I am usage_statistics_module, ready to save session information."
                        });
                    }
                }
            }
        );
    }

    this.active = function () {
        return this._active;
    }

}).apply(usage_statistics_module);