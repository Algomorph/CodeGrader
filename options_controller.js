/*
* Copyright 2020-2021 Gregory Kramida
* */
const beautify = require("js-beautify").js;
const options = require("./options.js");


// Save options to chrome.storage
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
        document.getElementById('optionsTextArea').value = beautify(optionsStr, {
            indent_size: 4,
            space_in_empty_paren: true
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

// Restore options based on values stored in chrome.storage and show them in local text panel.
function restoreOptionsLocal() {
    options.restoreOptions(
        function (options) {
            document.getElementById('optionsTextArea').value = JSON5.stringify(options, null, 4);
        }
    );
}

function onOptionPageLoaded() {
    const optionsTextArea = document.getElementById('optionsTextArea');
    optionsTextArea.addEventListener('keydown', function (event) {
        if (event.key === 'Tab') {
            event.preventDefault();
            const tabWidth = 4;
            const tabString = " ".repeat(tabWidth);
            const start = this.selectionStart;
            const end = this.selectionEnd;
            if (event.shiftKey === true ) {
                const beforeCaret = this.value.substring(0, start);
                const precedingTabStart = start-tabWidth;
                if(beforeCaret.length > tabWidth && beforeCaret.substring(precedingTabStart) === tabString){
                    this.value = beforeCaret.substring(0, precedingTabStart) + this.value.substring(end);
                    this.selectionStart = this.selectionEnd = precedingTabStart;
                }
            } else {
                // set textarea value to: text before caret + tab + text after caret
                this.value = this.value.substring(0, start) + tabString + this.value.substring(end);
                // put caret at correct position again
                this.selectionStart = this.selectionEnd = start + tabWidth;
            }
        } else if (event.key === 's' && event.ctrlKey === true) {
            event.preventDefault();
            saveOptions();
        }
        return false;
    });
    restoreOptionsLocal();

}

function restoreDefaults() {
    const optionsInstance = new options.Options();
    document.getElementById('optionsTextArea').value = JSON5.stringify(optionsInstance, null, 4);
    saveOptions();
}

function saveToDisk() {
    let dataString = "data:text/json;charset=utf-8," + encodeURIComponent(document.getElementById("optionsTextArea").value);
    let downloadAnchorElement = document.getElementById("downloadAnchorElement");
    downloadAnchorElement.setAttribute("href", dataString);
    downloadAnchorElement.setAttribute("download", "code_grader_options.json5");
    downloadAnchorElement.click();
}

function loadFromDisk() {
    let optionsFile = this.files[0];
    const reader = new FileReader();
    reader.onload = event => {
        document.getElementById('optionsTextArea').value = event.target.result;
        saveOptions();
    }
    reader.onerror = error => reject(error);
    reader.readAsText(optionsFile);
}

document.addEventListener('DOMContentLoaded', onOptionPageLoaded);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('restoreDefaults').addEventListener('click', restoreDefaults);
document.getElementById('saveToDisk').addEventListener('click', saveToDisk);
document.getElementById('loadFromDisk').addEventListener("change", loadFromDisk, false);