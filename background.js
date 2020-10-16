

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
			} else if(request.action =="report") {
				chrome.tabs.query({url:"https://grades.cs.umd.edu/*"},function(tabs) {
					var tab = tabs[0];
					insertGrades(tab,request.options);
				});
			}
		}
	);
}


function insertGrades(tab,option) {
	chrome.tabs.executeScript(tab.id, {file:"jquery.min.js"}, function() {
		chrome.tabs.executeScript(tab.id, {file:"insert_grades.js"}, function() {
			chrome.tabs.sendMessage(tab.id, {options: option}, function() {
				
			});
		});
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

