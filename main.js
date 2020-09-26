/*
 * Checks the URL or other property of the current web page and run allowed function
 */
function main(optionItems) {
	// condition: URL contains 'instructor' keyword
	// add 'review' buttons next to last submission date for directly going to review page
	if (location.href.indexOf('instructor')>-1) {
		var table_submissions = $("table:contains('last submission')");
		var td_list = $(table_submissions).find("tr").find("td:nth-child(6)");
		$.each(td_list,function(tdi,td) {
			var atag = $(td).find("a")[0];
			if(!atag) return;
			var url = atag.href;
			var directUrlToReview = url.replace("instructor/submission.jsp","codeReview/index.jsp");
			$(td).prepend("<a href='"+directUrlToReview+"' target='_blank'>REVIEW__</a>");
		});
	}

	const semesterString = optionItems.semesterSeason + optionItems.year.toString();


	// condition: URL contains 'condeReview' and the semester matches the semester selected in options.
	if (location.href.indexOf('codeReview')>-1 && location.href.indexOf(semesterString)>-1) {
		// first, create summary UIPanel
		let uiPanel = document.createElement('div');
		uiPanel.setAttribute('class','UIpanel');
		document.body.appendChild(uiPanel);

		//TODO: make configurable
		const projectName = optionItems.submitServerProjectName;
		
		// check if it's the right course & project
		if($("h1").text().match(projectName)){
			constructReviewPanel(uiPanel, optionItems);
		}
	}
	// assign click event to predefined comment buttons
	$(".tip").click(function() {
		eventFire($(this).parent()[0],'dblclick');
		let self = this;
		setTimeout(function() {
			$(self).parent().parent().find("input[type='checkbox']").prop("checked",false);
			let textBox = $(self).parent().parent().find("textarea[aria-hidden='false']");
			$(textBox).val($(self).attr('msg'));
			//$(self).parent().parent().find("textarea[aria-hidden='false']").focus().select();
			eventFire($(textBox).parent().find("a:contains('Save')")[0],'click');
		},500);
	});
} // MAIN ENDS


function constructReviewPanel(UIpanel, optionItems) {
	paneToScroll = $(".GMYHEHOCJK");

	const filesToCheck = optionItems.filesToCheck;

	const [codeFileDictionary, trCodeLines] = getCheckedFileCode(filesToCheck);

	scrollToFirstFile(filesToCheck[0]);

	keywordModule.initialize(UIpanel, trCodeLines, ["ArrayList", "LinkedList"]);
	namingModule.initialize(UIpanel, codeFileDictionary, trCodeLines, ["min", "max"]);
	gradeServerModule.initialize(UIpanel);
}

$(document).ready(function() {
	setTimeout(
		function(){
			restoreOptions(main);
		},
		3000
	);
});