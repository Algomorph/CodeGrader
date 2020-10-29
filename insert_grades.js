console.log("insert grading injected")
chrome.runtime.onMessage.addListener(
	function(message, sender, sendResponse) {
	console.log(message.options)
	console.log("inser_grades why u no work")
	sendResponse("this is the insert grades callback")
	/*
	studentTD = $("td:contains('"+request.options.studentId+"')").filter(function() {
			return $(this).text() === request.options.studentId;
	});
	studentTR = $($(studentTD).get(0)).parent();
	console.log(studentTR);
	scoreTD = [];
	$.each(request.options.scores, function(i,score) {
		console.log(score);
		var columnTD = $("td:contains('"+score.column+"')").filter(function() {
			return $(this).text() == score.column;
		}).get(0);
		console.log(columnTD);
		var columnIndex = $($(columnTD).parent().children()).index(columnTD)+1;
		console.log(columnIndex);
		console.log($("td:nth-child("+columnIndex+")",studentTR));
		$("td:nth-child("+columnIndex+")",studentTR).find("input").val(score.score);
	});*/
	}
);