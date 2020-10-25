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

		let directoryId = $("h1").text().split("(")[1].split(")")[0]
		console.log(directoryId)
		let finalComment = ""
		// Using CSS selectors for majority of filtering
		let classes = $("div.GMYHEHOCMK:has(tr.modified-code-row div.gwt-HTML.comment-text:visible)")
		classes.each(function(){
			let className = $(this).find("div.GMYHEHOCNK").text().split('/').slice(-1)[0]
			console.log("className: "+ className)
			finalComment += className + "\n"
			let rowsWithComments = $(this).find("tr.modified-code-row:has(div.gwt-HTML.comment-text:visible)")
			rowsWithComments.each(function(){
				let lineNumber = $(this).find("td.line-number").text() //line numbers end with colons, eg 15:
				let comments = $(this).find(".gwt-HTML.comment-text")
				//Although unlikely, one row can have multiple comments
				comments.each(function(){
					let commentText = this.textContent
					finalComment += lineNumber + commentText+"\n"
				})
			})
		})
		console.log(finalComment)
		scores = 
		/*reportScore({
			studentId: studentId[0],
			scores: [
				{ column:'JUnit', score: $("input#score_JUnit").val() },
				{ column:'Style', score: $("input#score_style").val() },
			]
		});*/

	}).appendTo(uiPanel);
}

}).apply(grade_server_module);