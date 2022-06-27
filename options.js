/*
* Copyright 2020-2021 Gregory Kramida
* Vanilla Javascript that defines the global options for the entire plugin.
* Note: don't put Node stuff, e.g. "require" here.
* */
function getCurrentSemesterSeasonString() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentDayOfMonth = currentDate.getDay();
    let currentSeason;
    if (currentMonth === 0 && currentDayOfMonth < 22) {
        currentSeason = "winter";
    } else if (currentMonth < 4) {
        currentSeason = "spring";
    } else if (currentMonth < 8) {
        currentSeason = "summer";
    } else {
        currentSeason = "fall";
    }
    return currentSeason;
}

class Options {
    /**
     * Make an options object
     * @param semesterSeason
     * @param year
     * @param submitServerAssignmentName
     * @param {Array.<string>} filesToCheck
     * @param {number} lateScoreAdjustment a score adjustment that the student receives for a late submission of the assignment
     */
    constructor(semesterSeason = getCurrentSemesterSeasonString(),
                year = (new Date()).getFullYear().toString(),
                submitServerAssignmentName = "",
                filesToCheck = [],
                lateScoreAdjustment = -12) {
        this.course = "CMSC132";
        this.semesterSeason = semesterSeason;
        this.year = year;
        this.submitServerAssignmentName = submitServerAssignmentName;
        this.filesToCheck = filesToCheck;
        this.lateScoreAdjustment = -12;
        this.firstStudent = "a";
        // To include directory IDs that start with z, use ASCII codepoint directly
        // after z as the default upper bound
        this.lastStudent = "{";
        this.moduleOptions = {
            "brace_style_module": brace_style_module.getDefaultOptions(),
            "grade_server_module": grade_server_module.getDefaultOptions(),
            "indentation_module": indentation_module.getDefaultOptions(),
            "keyword_and_pattern_module": keyword_and_pattern_module.getDefaultOptions(),
            "line_length_module": line_length_module.getDefaultOptions(),
            "loop_module": loop_module.getDefaultOptions(),
            "method_call_module": method_call_module.getDefaultOptions(),
            "naming_module": naming_module.getDefaultOptions(),
            "spacing_module": spacing_module.getDefaultOptions(),
            "test_module": test_module.getDefaultOptions(),
            "unused_code_module": unused_code_module.getDefaultOptions()
        };
        this.usageStatisticsOptions = {
            "enabled": true,
            "anonymizeUser": true
        }
    }
}

// Restores options based on values stored in chrome.storage.
function restoreOptions(callback) {
    let options = new Options();
    let optionSet = { "options" : options, "optionWriter" : null};
    chrome.storage.sync.get(optionSet, function (optionSet) {
        chrome.runtime.sendMessage({
            action: "optionsChanged",
            options: optionSet.options
        });
        callback(optionSet.options, optionSet.optionWriter);
    });
}

try {
    if (module !== undefined) {
        module.exports = {
            restoreOptions: restoreOptions,
            Options: Options
        }
    }
} catch (error) {
    // keep silent
}