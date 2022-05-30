import {sendPostXHTTPRequest} from "./background_utils.js"
import {usage_statistics} from "./usage_statistics.js"
import {tabTimeTracker} from "./tab_tracking.js"

function logMessage(msg) {
    chrome.scripting.executeScript({code: "console.log('" + msg + "')"});
}

chrome.runtime.onMessage.addListener(
    function (message, sender, callback) {
        if (message.action === "xhttp") {
            sendPostXHTTPRequest(message, callback = null);
        } else if (message.action === "reportGradeButtonClicked") {
            let gradesUrl = "https://grades.cs.umd.edu/classWeb/viewGrades.cgi?courseID=*"
            // uses open class grades page
            chrome.tabs.query(
                {url: gradesUrl}, function (tabs) {
                    if (tabs > 1) {
                        alert("You have multiple tabs of the grades server open. Be careful of submitting grades for the wrong course.")
                    }
                    let gradesServerOverviewTab = tabs[0];
                    sendReportToGradesServer(gradesServerOverviewTab, message.report);
                }
            );
        } else if (message.action === "saveGradeButtonClicked") {
            // wait for 1 seconds before closing tab
            setTimeout(
                function () {
                    chrome.tabs.remove(sender.tab.id);
                },
                1000
            );
        } else if (message.action === "timeTab") {
            tabTimeTracker.startTrackingTabActiveTime(message.sessionUrl, message.studentName, sender.tab);
        } else if (message.action === "logToConsole") {
            console.log(message.message);
        } else if (message.action === "optionsChanged") {
            usage_statistics.updateOptions(message.options);
        }
        if (message.hasOwnProperty("sessionUrl")) {
            usage_statistics.handleSessionInfoMessage(message);
        }
    }
);


function sendReportToGradesServer(gradesServerOverviewTab, report) {
    chrome.tabs.sendMessage(gradesServerOverviewTab.id, {
        "action": "openStudentGradesPage",
        report: report
    }, function (url) {
        chrome.tabs.create({url: url, windowId: gradesServerOverviewTab.windowId}, function (newTab) {
            // Wait for 3 seconds for listener/content script to set up
            setTimeout(
                function () {
                    chrome.tabs.sendMessage(newTab.id, {
                        "action": "insertGradingReport",
                        report: report
                    }, function (url) {
                    })
                },
                3000
            );
        })
    });
}

function loadURL(url) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            // JSON.parse does not evaluate the attacker's scripts.
            let resp = $(xhr.responseText);
            console.log(resp);
        }
    };
    xhr.send();
}