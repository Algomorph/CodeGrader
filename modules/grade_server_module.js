var gradeServerModule = {};

(function() {

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

}).apply(gradeServerModule);