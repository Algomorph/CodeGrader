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
                var xhttp = new XMLHttpRequest(),
                    method = request.method ? request.method.toUpperCase() : 'GET';
                xhttp.onreadystatechange = function () {
                    if (xhttp.readyState === 4) {
                        callback(xhttp.responseText);
                        xhttp.onreadystatechange = xhttp.open = xhttp.send = null;
                        xhttp = null;
                    }
                };
                if (method === 'POST') {
                    xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                    xhttp.setRequestHeader("Content-length", request.data.length);
                }
                xhttp.open(method, request.url, true);
                xhttp.send(request.data);
                // end of cross domain loading
            } else if (request.action === "reportGrades") {
                let gradesUrl = "https://grades.cs.umd.edu/classWeb/viewGrades.cgi?courseID=*"
                let semesterString = request.options.semesterSeason + " " + request.options.year
                // uses open class grades page
                chrome.tabs.query({url: gradesUrl}, function (tabs) {
                    if (tabs > 1) {
                        alert("You have multiple tabs of the grades server open. Be careful of submitting grades for the wrong course.")
                    }
                    let tab = tabs[0];
                    insertGrades(tab, request.options);
                });
            }
        }
    );
}


function insertGrades(tab, options) {
    chrome.tabs.sendMessage(tab.id, {options: options}, function (url) {
        chrome.tabs.create({url:url}, function(newTab){
            options.action = "insertGrades"
            // Wait for 3 seconds for listener/content script to set up
            setTimeout(function(){chrome.tabs.sendMessage(newTab.id, {options: options}, function (url) { })},3000)
        })
    });

    //TODO: (Greg:) you will still need to investigate how to get the response. I'm sure it's possible.
    // but be careful, it might take printing things to the background console like this (2nd answer), I'm not sure:
    // https://stackoverflow.com/questions/12615515/console-log-doesnt-work-from-chrome-tabs-executescript/17915529
}

function loadURL(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            // JSON.parse does not evaluate the attacker's scripts.
            var resp = $(xhr.responseText);
            console.log(resp);
        }
    };
    xhr.send();
}