function logMessage(msg) {
    chrome.tabs.executeScript({code: "console.log('" + msg + "')"});
}

chrome.runtime.onInstalled.addListener(function () {
    console.log("Loaded Code Style Grading Aid plug-in.");
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
                console.log(gradesUrl)
                chrome.tabs.query({url: gradesUrl}, function (tabs) {
                    if (tabs > 1) {
                        alert("You have multiple tabs of the grades server open. Be careful of submitting grades for the wrong course.")
                    }
                    let tab = tabs[0];
                    console.log(tabs)
                    insertGrades(tab, request.options);
                });
            }
        }
    );
}


function insertGrades(tab, options) {
    chrome.tabs.sendMessage(tab.id, {options: options}, function (response) {
        console.log(response)
    });
    console.log("got to end of insert grades (Greg's take)")

    // not sure if we need this script
    // FIXME (Greg:) no, we don't need this script, remove dead code please
    // chrome.tabs.executeScript(tab.id, {file:"third_party/jquery-3.5.1.js"}, function() {
    // 	//file:"/insert_grades.js"
    // 	chrome.tabs.executeScript(tab.id, {file:"/insert_grades.js"}, function() {
    // 		// use send message to send content to
    // 		chrome.tabs.sendMessage(tab.id, {options: options}, function(response) {
    // 			console.log(response)
    // 		});
    // 	});
    // console.log("got to end of insert grades")
    // });

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