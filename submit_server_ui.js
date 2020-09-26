function scrollToFirstFile(firstFileToCheck){
	// TODO: This demonstrates how to control (scroll) the main container with all the files in the future if necessary.
	// This also requires rewiring all the link functionality on the side panel, so defer this for now and use the existing event 
	// listener on the link instead.
	// mainContainer = $(".GMYHEHOCKK.dragdrop-dropTarget").parent().parent();
	// firstSourceFileContainer = getSourceFileContainer(firstFileToCheck);
	// mainContainer.css({top: -firstSourceFileContainer.position().top});
	$(".link.link-block:contains('" + firstFileToCheck + "')")[0].click();
}

function getSourceFileContainer(filename){
	return $("div.GMYHEHOCNK:contains('" + filename + "')").parent();
}

function getTrCodesForCodeFile(filename){
	return $.makeArray(getSourceFileContainer(filename).find("tr"));
}

function getCodeFromTrCodeLine(trCodeLine){
	return $($(trCodeLine).find("div.gwt-Label")[0]).text();
}

function getAllCheckedTrCodeLines(filesToCheck) {
	// flatten to get <tr> for each line of code
	var trCodeLines = _.reduce(
		filesToCheck, 
		function( memo, filename){
			var trCodeLinesForFile = getTrCodesForCodeFile(filename);
			return _.union( memo, trCodeLinesForFile );
		},
		[]
	);
	return trCodeLines;	
}

function makeLabels(strList) {
	return _.map(strList, function(s) { return "<span class='label'>"+ s +"</span>"; });
}
function makeLableWithClickToScroll(label, targetElement, position) {
	
	var labelEl = $("<span class='label'>"+label+"</span>").click(function() {
		paneToScroll.scrollTop(position - 50);
	});
	return labelEl;
}
function makeLabelsWithClick(list) {
	return _.map(list, function(d) {
		var label = $("<span class='label'>"+d.message+"</span>").click(function() {
			paneToScroll.scrollTop($(d.scrollTo).position().top);
		});
		return label[0];
	});
}