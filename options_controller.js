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


document.addEventListener('DOMContentLoaded', restoreOptionsLocal);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('restoreDefaults').addEventListener('click', restoreDefaults);
document.getElementById('saveToDisk').addEventListener('click', saveToDisk);
document.getElementById('loadFromDisk').addEventListener("change", handleOptionUpload, false);