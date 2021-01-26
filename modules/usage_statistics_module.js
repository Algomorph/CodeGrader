/*
* Copyright 2020 William Siew, Gregory Kramida
* */

let usage_statistics_module = {};

(function () {

    this._gradersName = "Anonymous";
    this._active = false;

    this.gradeServerTabDuration = 0;
    //TODO: fill this in from grade_server_module somehow
    this.gradeSaveButtonClicked = false;

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

    let self=this;

    /**
     * Initialize the module.
     * @param {Options} usageStatisticsModuleOptions options for statistics gathering
     * @param {Object} gradeServerModuleOptions grade server module options
     */
    this.initialize = function (usageStatisticsModuleOptions, gradeServerModuleOptions) {
        if (!usageStatisticsModuleOptions.enabled) {
            this._active = false;
            return;
        }
        this._active = true;
        if (!usageStatisticsModuleOptions.anonymizeUser && gradeServerModuleOptions.gradersName.length > 0) {
            this._gradersName = gradeServerModuleOptions.gradersName;
        }

        let submitServerSessionUrl = location.href;

        chrome.runtime.sendMessage({
            action: "timeActiveTab",
            callbackOnTabRemoved: function(submitServerTabDuration){
                //TODO save session details (including self.gradeServerTabDuration and other stuff)
                // using a POST query somehow, perhaps redirect via background.js first to initiate the POST request
            }
        });
    }

    this.active = function (){
        return this._active;
    }

}).apply(usage_statistics_module);