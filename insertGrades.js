console.log("insert grading injected");


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
	console.log("message received");
    console.log(request.options);
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
    });
  }
);