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
     * @param submitServerProjectName
     * @param {Array.<string>} filesToCheck
     */
    constructor(semesterSeason = getCurrentSemesterSeasonString(),
                year = (new Date()).getFullYear().toString(),
                submitServerProjectName = "",
                filesToCheck = []) {
        this.semesterSeason = semesterSeason;
        this.year = year;
        this.submitServerProjectName = submitServerProjectName;
        this.filesToCheck = filesToCheck;
        this.moduleOptions = {
            "keyword_module": keyword_module.getDefaultOptions(),
            "naming_module": naming_module.getDefaultOptions(),
            "method_call_module": method_call_module.getDefaultOptions(),
            "indentation_module": indentation_module.getDefaultOptions(),
            "spacing_module": spacing_module.getDefaultOptions(),
            "brace_style_module": brace_style_module.getDefaultOptions()
        };
    }
}

// Restores options based on values stored in chrome.storage.
function restoreOptions(callback) {

    let options = new Options();

    chrome.storage.sync.get({
        options: options
    }, callback);
}

// Saves options to chrome.storage
function saveOptions() {
    try {
        let options = JSON.parse(document.getElementById("optionsTextArea").value);

        chrome.storage.sync.set({
            options: options
        }, function () {
            // Update status to let user know options were saved.
            let status = document.getElementById('status');
            status.textContent = 'Options saved.';
            setTimeout(function () {
                status.textContent = '';
            }, 750);
        });
    } catch (error) {
        if (error instanceof SyntaxError){
            let status = document.getElementById('status');
            status.textContent = 'JSON Syntax Error(check console)';
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
        function (items) {
            document.getElementById('optionsTextArea').value = JSON.stringify(items.options, null, 4);
        }
    );
}

function restoreDefaults() {
    let options = new Options();
    document.getElementById('optionsTextArea').value = JSON.stringify(options, null, 4);
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