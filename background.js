

chrome.runtime.onInstalled.addListener(function() {
	console.log("Loaded Code Style Grading Enhancer plug-in.");
	init();
});

window.addEventListener('load', function() {
	init();
});

function init() {
	chrome.runtime.onMessage.addListener(
		function(request, sender, callback) {
			console.log(request.action);
			if(request.action == "xhttp") {
				var xhttp = new XMLHttpRequest(),
						method = request.method ? request.method.toUpperCase() : 'GET';
				xhttp.onreadystatechange = function() {
					if(xhttp.readyState == 4){
						callback(xhttp.responseText);
						xhttp.onreadystatechange = xhttp.open = xhttp.send = null;
						xhttp = null;
					}
				};
				if (method == 'POST') {
					xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
					xhttp.setRequestHeader("Content-length", request.data.length);
				}
				xhttp.open(method, request.url, true);
				xhttp.send(request.data);
				// end of cross domain loading
			} else if(request.action =="reportGrades") {
				// change to GET request approach instead of looking at Chrome tabs opened.
				let gradesUrl = "https://grades.cs.umd.edu/classWeb/viewGrades.cgi?courseID=*"
				let semesterString = request.options.semesterSeason + " " + request.options.year
				// uses open class grades page
				chrome.tabs.query({url:gradesUrl},function(tabs) {
					if(tabs > 1){
						alert("You have multiple tabs of the grades server open. Be careful of submitting grades for the wrong course.")
					}
					let tab = tabs[0];
					console.log(tabs)
					insertGrades(tab,request.options);
				});
			}
		}
	);
}


function insertGrades(tab,options) {
	// not sure if we need this script
	chrome.tabs.executeScript(tab.id, {file:"third_party/jquery-3.5.1.js"}, function() {
		//file:"/insert_grades.js"
		chrome.tabs.executeScript(tab.id, {file:"/insert_grades.js"}, function() {
			// use send message to send content to
			chrome.tabs.sendMessage(tab.id, {options: options}, function(response) {
				console.log(response)
			});
		});
	console.log("got to end of insert grades")
	});

}

function loadURL(url) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			// JSON.parse does not evaluate the attacker's scripts.
			var resp = $(xhr.responseText);
			console.log(resp);
		}
	};
	xhr.send();
}

