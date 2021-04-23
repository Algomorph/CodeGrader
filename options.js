/*
* Copyright 2020 Gregory Kramida
* */

function getCurrentSemesterSeasonString() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    let currentSeason = "winter";
    if (currentMonth > 0 && currentMonth < 4) {
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
    chrome.storage.sync.get(options, function (options) {
        chrome.runtime.sendMessage({
            action: "optionsChanged",
            options: options
        });
        callback(options);
    });
}

// Saves options to chrome.storage
function saveOptions() {
    try {
        const optionsStr = document.getElementById("optionsTextArea").value;
        let options = JSON5.parse(optionsStr);
        if (options.lateScoreAdjustment > 0) {
            alert("Late score adjustment has to be negative. Defaulting the value to 0.");
            options.lateScoreAdjustment = 0;
        }

        // If firstStudent isn't a valid field, trim will produce undefined (falsey)
        // so the field will default to "a". Conveniently, this also means firstStudent
        // can't be the empty string since that's also falsey.
        options.firstStudent = options.firstStudent?.trim() || "a";
        // To include directory IDs that start with z, use ASCII codepoint directly
        // after z as the default upper bound
        options.lastStudent = options.lastStudent?.trim() || "{";
        if (options.firstStudent > options.lastStudent) {
            const tmp = options.firstStudent;
            options.firstStudent = options.lastStudent;
            options.lastStudent = tmp;
        }

        chrome.storage.sync.set(
            options,
            function () {
                // Update status to let user know options were saved.
                let status = document.getElementById('status');
                status.textContent = 'Options saved.';
                setTimeout(function () {
                    status.textContent = '';
                }, 750);
            });
        
    } catch (error) {
        if (error instanceof SyntaxError) {
            let status = document.getElementById('status');
            status.textContent = 'JSON5 Syntax Error(check console)';
            setTimeout(function () {
                status.textContent = '';
            }, 3000);
            console.log(error.message);
        } else {
            let status = document.getElementById('status');
            status.textContent = 'Unknown error (check console)';
            setTimeout(function () {
                status.textContent = '';
            }, 3000);
            throw error;
        }
    }
}

// Restores options based on values stored in chrome.storage.
function restoreOptionsLocal() {
    restoreOptions(
        function (options) {
            document.getElementById('optionsTextArea').value = JSON5.stringify(options, null, 4);
        }
    );
}

function restoreDefaults() {
    let options = new Options();
    document.getElementById('optionsTextArea').value = JSON5.stringify(options, null, 4);
    saveOptions();
}

function saveToDisk() {
    let dataString = "data:text/json;charset=utf-8," + encodeURIComponent(document.getElementById("optionsTextArea").value);
    let downloadAnchorElement = document.getElementById("downloadAnchorElement");
    downloadAnchorElement.setAttribute("href", dataString);
    downloadAnchorElement.setAttribute("download", "umd_code_style_grading_aid_options.json");
    downloadAnchorElement.click();
}

function handleOptionUpload() {
    let optionsFile = this.files[0];
    const reader = new FileReader();
    reader.onload = event => {
        document.getElementById('optionsTextArea').value = event.target.result;
        saveOptions();
    }
    reader.onerror = error => reject(error);
    reader.readAsText(optionsFile);
}