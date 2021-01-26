/*
* Copyright 2020 William Siew, Gregory Kramida
* */

let usage_statistics_module = {};

(function () {

    this._trackReportButton = false;
    this._trackSaveButton = false;
    this._gradersName = "Anonymous";

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

    /**
     * Initialize the module.
     * @param {Options} usageStatisticsModuleOptions options for statistics gathering
     * @param {Object} gradeServerModuleOptions grade server module options
     */
    this.initialize = function (usageStatisticsModuleOptions, gradeServerModuleOptions) {
        if (!usageStatisticsModuleOptions.enabled) {
            return;
        }
        if (!gradeServerModuleOptions.enabled) {
            this._trackReportButton = false;
            this._trackSaveButton = false;
        } else {
            this._trackReportButton = true;
            this._trackSaveButton = true;
            if (!usageStatisticsModuleOptions.anonymizeUser) {
                this._gradersName = gradeServerModuleOptions.gradersName;
            }
        }
        chrome.runtime.sendMessage({
            action: "timeActiveTab",
            url: location.href
        }, function (response) {
            //TODO
        });
    }

}).apply(usage_statistics_module);