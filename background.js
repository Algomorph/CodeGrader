function logMessage(msg) {
    chrome.tabs.executeScript({code: "console.log('" + msg + "')"});
}

chrome.runtime.onInstalled.addListener(function () {
    init();
});

window.addEventListener('load', function () {
    init();
});

function init() {
    chrome.runtime.onMessage.addListener(
        function (request, sender, callback) {
            console.log(request.action);
            if (request.action === "xhttp") {
                let xhttpRequest = new XMLHttpRequest(),
                    method = request.method ? request.method.toUpperCase() : 'GET';
                xhttpRequest.onreadystatechange = function () {
                    if (xhttpRequest.readyState === 4) {
                        callback(xhttpRequest.responseText);
                        xhttpRequest.onreadystatechange = xhttpRequest.open = xhttpRequest.send = null;
                        xhttpRequest = null;
                    }
                };
                if (method === 'POST') {
                    xhttpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    xhttpRequest.setRequestHeader("Content-length", request.data.length);
                }
                xhttpRequest.open(method, request.url, true);
                xhttpRequest.send(request.data);
                // end of cross domain loading
            } else if (request.action === "reportGradingResult") {
                let gradesUrl = "https://grades.cs.umd.edu/classWeb/viewGrades.cgi?courseID=*"
                // uses open class grades page
                chrome.tabs.query(
                    {url: gradesUrl}, function (tabs) {
                        if (tabs > 1) {
                            alert("You have multiple tabs of the grades server open. Be careful of submitting grades for the wrong course.")
                        }
                        let tab = tabs[0];
                        insertReport(tab, request.report);
                    }
                );
            }
        }
    );
}


function insertReport(tab, report) {
    // chrome.tabs.sendMessage(tab.id, {payload: report}, function (url) {
    chrome.tabs.create({url: url}, function (newTab) {
        report.action = "insertReport"
        // Wait for 3 seconds for listener/content script to set up
        setTimeout(
            function () {
                chrome.tabs.sendMessage(newTab.id, {payload: report}, function (url) {
                })
            },
            3000
        );
    })
    // });
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