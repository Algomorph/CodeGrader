let grade_server_module = {};

(function() {
/* Notes:
Files to keep in mind: insert_grades,submit_server_ui
Should aggregate comments and name them with line and class, and be able to assign and submit grade for respective student
For testing, verify if the tab in the grades server that tracks changes has the update or if the page has the updated info

*/
this.initialize = function(uiPanel){
	// report total score to grade server tab
	$("<button>REPORT TO GRADE SERVER</button>").click(function() {
		console.log("report");
		var studentId = $("h1").text().match(/cs131.../);
		reportScore({
			studentId: studentId[0],
			scores: [
				{ column:'JUnit', score: $("input#score_JUnit").val() },
				{ column:'Style', score: $("input#score_style").val() },
			]
		});
	}).appendTo(uiPanel);
}

}).apply(grade_server_module);