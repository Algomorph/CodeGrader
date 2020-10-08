var indentationModule = {};

(function () {

this.initialize = function (uiPanel, trCodeLines){
	$(uiPanel).append("<h3 style='color:#92b9d1'>Weird Indentation</h3>");
	/* 
	Criteria for correct indentation:
	1) Consistent style, first non white space character must line up with closing brace
	1a) If, the ugly style, opening must line up with closing brace

	Oops this is the indentation module not braces
	Check for indentation after opening brace
	*/
	let badLines= [];

	function countIndent(string){
		return string.length - string.trimLeft().length
	}
	function getText(tr){
		return $($(tr).find("div.gwt-Label")[0]).text();
	}

	// find first indent use and use that as standard
	i=0
	while(getText(trCodeLines[i++]).indexOf('{')==-1);
	indent = countIndent(getText(trCodeLines[i]))

	curIndentation = 0; // in white spaces
	$.each(trCodeLines,function(tri,tr) {	// iterates each line of code below
		let codeText = $($(tr).find("div.gwt-Label")[0]).text();
		// Handle Comments
		openBlockCommentIdx = codeText.search(/\/\*/)
		closeBlockCommentIdx = codeText.search(/\*\//)
		if(openBlockCommentIdx >= 0 && closeBlockCommentIdx >= 0){ // if both exist in the same line, just replace everything in between
			codeText = codeText.substring(0,openBlockCommentIdx)+ " ".repeat(closeBlockCommentIdx - openBlockCommentIdx - 2) + codeText.substring(closeBlockCommentIdx+2)
		} else if(closeBlockCommentIdx >= 0){ // if only closing block comment
			codeText = " ".repeat(closeBlockCommentIdx+2)+ codeText.substring(closeBlockCommentIdx+2)
		}
		//Skip blank lines, include lines that are just opening code blocks
		if(codeText.search(/\S/i) == -1 || codeText.search(/\S/i) == codeText.indexOf("/*")) return;
		if(codeText.match(/\S/i)=="*") return; //Block Comment Line

		// Handle opening and closing braces updating indent size
		if(codeText.indexOf('}')!=-1){ // if closing brace exists, decrease indent
			curIndentation -= indent
		}
		// verify cur indent is correct
		if (countIndent(codeText) != curIndentation){
			badLines.push(tr)
			addButtonComment(tr,"Indent: " + countIndent(codeText) + "Expected Indent: "+curIndentation," ","#92b9d1");
		}

		// if opening brace exists, increase idnent
		if(codeText.indexOf('{')!=-1){
			curIndentation += indent
		}
		/* _.each(badLines, function(keyword) {
			$(uiPanel).push(makeLabelWithClickToScroll(keyword,tr));
			addButtonComment(tr,"Bad indented lines: " + keyword," ","#92b9d1");
		}); */
	});
}

}).apply(indentationModule);