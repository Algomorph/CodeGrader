var keywordModule = {};

(function () {

this.initialize = function (UIpanel, trCodeLines, keywords){
	$(UIpanel).append("<h3 style='color:#92b9d1'>Prohibided Keywords</h3>");
	var wordsToFind = ["ArrayList","LinkedList"];
	var wordsFound = [];
	$.each(trCodeLines,function(tri,tr) {	// iterates each line of code below
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		if(codeText.match(/\/\//i)) return;
		var wordsFoundInCodeText = _.filter(wordsToFind, function(w) { return codeText.indexOf(w)!=-1; });
		_.each(wordsFoundInCodeText, function(w) {
			$(UIpanel).append(makeLabelWithClickToScroll(w,tr));
			addButtonComment(tr,"ArrayList&LinkedList"," ","#92b9d1");
		});
	});
}

}).apply(keywordModule);