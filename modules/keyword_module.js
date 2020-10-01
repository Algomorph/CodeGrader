var keywordModule = {};

(function () {

this.initialize = function (uiPanel, trCodeLines, keywords){
	$(uiPanel).append("<h3 style='color:#92b9d1'>Prohibided Keywords</h3>");
	//TODO: make configurable from options
	//let wordsToFind = ["ArrayList","LinkedList"];
	let wordsToFind = [];
	let wordsFound = [];
	$.each(trCodeLines,function(tri,tr) {	// iterates each line of code below
		let codeText = $($(tr).find("div.gwt-Label")[0]).text();
		if(codeText.match(/\/\//i)) return;
		let wordsFoundInCodeText = _.filter(wordsToFind, function(keyword) { return codeText.indexOf(keyword)!=-1; });
		_.each(wordsFoundInCodeText, function(keyword) {
			$(uiPanel).append(makeLabelWithClickToScroll(keyword,tr));
			addButtonComment(tr,"Prohibited keyword: " + keyword," ","#92b9d1");
		});
	});
}

}).apply(keywordModule);