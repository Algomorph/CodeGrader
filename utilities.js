// UTILITY FUNCTIONS & CLASSES

class Options {
	constructor(semesterSeason, year, submitServer) {

	}
}

// Restores options based on values stored in chrome.storage.
function restoreOptions(callback) {
	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear().toString();
	let currentSeason = null;

	if(currentMonth > 0 && currentMonth < 4){
		currentSeason = "spring";
	} else if (currentMonth < 8){
		currentSeason = "summer";
	} else {
		currentSeason = "fall";
	}

	const submitServerProjectNameDefault = "";
	const filesToCheckDefault = [];
	const ignoredNamesDefault = [];
	const defaultIgnoredMethods = { "global":[] };

	chrome.storage.sync.get({
		semesterSeason: currentSeason,
		year: currentYear,
		submitServerProjectName: submitServerProjectNameDefault,
		filesToCheck:filesToCheckDefault,
		ignoredNames:ignoredNamesDefault,
		ignoredMethods:defaultIgnoredMethods,
	},callback);
}


class CodeFile {
	constructor(sourceCode, trCodeLines, abstractSyntaxTree, parseError, fromLineIndex, toLineIndex){
		this.sourceCode = sourceCode;
		this.trCodeLines = trCodeLines;
		this.abstractSyntaxTree = abstractSyntaxTree;
		this.parseError = parseError;
		this.fromLineIndex = fromLineIndex;
		this.toLineIndex = toLineIndex;
	}
}

function parseJava(fileCode) {
	let abstractSyntaxTree = null;
	let parseError = null;
	try {
		// relies on https://github.com/Algomorph/jsjavaparser
        abstractSyntaxTree = JavaParser.parse(fileCode);
    } catch (err) {
        parseError = err;
    }
    return [abstractSyntaxTree, parseError]
}

function readCodeFilesFromServer(fileDescriptors, callback){
	const fileCount = fileDescriptors.length;
	let processedCount = 0;
	let codeFiles = new Map();

	for (const descriptor of fileDescriptors) {
        $.get(
        	descriptor.url, 
        	function(data) {
	        	const currentDescriptor = fileDescriptors[processedCount];
	        	const [abstractSyntaxTree, parseError] = parseJava(data);
	        	codeFiles.set(currentDescriptor.name, new CodeFile(data, null, abstractSyntaxTree, parseError, 0, 0));
	        	processedCount ++;
	        	if(processedCount === fileCount){
					callback(codeFiles);
				}
        	}
        );
    }
}

/**
 *
 * @param {Array.<string>}filesToCheck
 * @returns {[Map<string, CodeFile>,Array.<Element>]}
 */
function getCheckedFileCode(filesToCheck) {
	let fileDictionary = new Map();
	let trCodeLines = [];
	let iLine = 0;
	$.each(
		filesToCheck, 
		function(fileIndex, filename){
			const trCodeLinesForFile = getTrCodesForCodeFile(filename);
			let fileCodeLines = [];
			const iStartLine = iLine;
			$.each(
				trCodeLinesForFile,
				function(trCodeLineIndex,trCodeLine){
					const codeText = $($(trCodeLine).find("div.gwt-Label")[0]).text();
					fileCodeLines.push(codeText)
					iLine++;
				}
			);
			const iEndLine = iLine;
			const fileCode = fileCodeLines.join("\n");
			const [abstractSyntaxTree, parseError] = parseJava(fileCode);

			fileDictionary.set(filename, new CodeFile(fileCode, trCodeLinesForFile, abstractSyntaxTree, parseError, iStartLine, iEndLine));
			trCodeLines.push(...trCodeLinesForFile);
		}
	);
	return [fileDictionary, trCodeLines];
}

/**
 * Return the same string with first letter capitalized.
 * @param {string} string
 * @return {string}
 */
function capitalize(string){
	return string[0].toUpperCase() + string.slice(1);
}

/**
 * Compiles an array containing only the CodeName / MethodCall objects with unique "name" field from the input array
 * @param {Array.<CodeName>|Array.<MethodCall>} namesOrCallsArray
 * @return {Array.<CodeName>|Array.<MethodCall>}
 */
function uniqueNames(namesOrCallsArray) {
	let uniqueNamesMap = new Map();
	namesOrCallsArray.forEach(
		(resultObject) => {
			if (!uniqueNamesMap.has(resultObject.name)) {
				uniqueNamesMap.set(resultObject.name, resultObject);
			}
		}
	);
	return [...uniqueNamesMap.values()];
}

function getHelperMethodsUsedInCodeBlock(trCodeLines,helperMethods) {
	var usedMethods = [];
	for (i in trCodeLines) {
		var tr = trCodeLines[i];
		var codeText = $(tr).find("div.gwt-Label")[0].innerText;
		_.each(helperMethods, function(m,mi) {
			if(codeText.match(m)) usedMethods.push(m);
		});
	}
	return usedMethods;
}
function rangeSelectCodeBlock(trCodeLines,start,end) {
	//return a range of trCodeLines starting from line matching start regex and before matching end regex
	var result_tr=[]; var flag=false;
	
	for (i in $.makeArray(trCodeLines)) {
		var tr = trCodeLines[i];
		var code = $(tr).find("div.gwt-Label")[0];
		var codeText = code.innerText;
		if(flag && codeText.match(end)) {
			flag=false; return result_tr;
		}
		if(codeText.match(start))
			flag=true;
		if(flag) {
			result_tr.push(tr);
		}
	}
	return result_tr;
}

function findTrUsingRegex(trCodeLines,reg) {
	for (i in trCodeLines) {
		var tr = trCodeLines[i];
		var codeText = $(tr).find("div.gwt-Label")[0].innerText;
		if(codeText.match(reg)) return tr;
	}
	return null;
}
function uncheckBoxes(){
	$("label:contains('Request reply?')").parent().find("input").prop('checked',false);
}

function addCommentOnly(tr,title,color) {
	var code = $(tr).find(".gwt-Label");
	$(code).append($("<span class='comment' style='border:1px solid "+color+"; color:"+color+"'>&larr;"+title+"</span>"));
}

function highlightLine(tr,msg,color) {
	var codeNumber = $(tr).find("td.line-number");
	$(codeNumber).css("border-left","3px solid "+color);
	var code = $(tr).find(".gwt-Label");
	$(code).html($(code).html().replace(/$/ig,"<span class='tip' style='background-color:"+color+"'>"+msg+"</span>"));
}
function highlightText(leafDom,s,color) {
	$(leafDom).textWalk(function() {
		this.data = this.data.replace(" "+s," <span style='background-color:"+color+"'>"+s+"</span>");
	});
	//$(leafDom).html($(leafDom)[0].innerHTML.replace(" "+s," <span style='background-color:"+color+"'>"+s+"</span>"));
}

function addButton(innertext,clickListener,parent) {
	var button_search = document.createElement("button");
	button_search.innerText = innertext;
	button_search.onclick = clickListener;
	parent.appendChild(button_search);
}
function contains(elementList,regex) {
	var filteredElements =  Array.prototype.slice.call(elementList).filter(function(e) {  return regex.test(e.innerText); });
	return Array.prototype.slice.call(filteredElements);
}
function selectWithRegex(elementList, startRegex, endRegex) {
	var result = [];
	var started = false; var end= false;
	for(var i in elementList) {
		var e = elementList[i];
		if(startRegex.test(e.innerText))  started = true;
		if(started) result.push(e);
		if(started && endRegex.test(e.innerText)) end = true;
		if(end) break;
	}
	return result;
}
function getInnerText(elementList,separator) {
	return elementList.map(function(e) { return e.innerText; }).join();
}
function search() {
	var Model = contains(document.querySelectorAll("div.GMYHEHOCNK"),/Model/)[0].parentNode;
	var codeLines = Model.querySelectorAll("div.gwt-Label");
	var variablesUsed = {};
	var booleanUsed = [];
	var directionIntegerUsed = [];
	var methodsWithoutCommentBlock = [];
	for(i in codeLines) {
		var text = codeLines[i].textContent;
		if(text==null || text==undefined) continue;
		text = text.replace(/\t/,"");
		if(text.match(/int\s+\w+\s+/)) {
			var matches = text.match(/int\s+\w+\s+/gi);
			for(i in matches) {
				var varName = matches[i].replace(/\int\s+/,"").replace(/\s+/,"");
				console.log(varName + " at " + text);
				if(variablesUsed[varName]==undefined) variablesUsed[varName]=0;
				variablesUsed[varName]=variablesUsed[varName]+1;
			}
		}
		// check named constants
		if(text.match(/(true|false)/)  && !text.match(/static/) && !text.match(/\/\//) && !text.match(/\*/))  booleanUsed.push(text.replace(/\s*/,""));
		if(text.match(/(10|11|12|13)/)  && !text.match(/static/)   && !text.match(/Random/))  directionIntegerUsed.push(text);
		// check block comments before method definitions
		if(text.match(/^(public|private)\s(void|boolean|int|Fish|Plant)/)) {
			//check the previous lines whether it contains any comment block symbols
			if(codeLines[i-1]!=undefined) {
				var prevLine = codeLines[i-1].textContent;
				if(!prevLine.match(/(\*\/|\/\/)/)) {
					methodsWithoutCommentBlock.push(text);
				}
			}
		}
	}
	console.log(JSON.stringify(variablesUsed));
	console.log("boolean used");
	console.log(JSON.stringify(booleanUsed));
	console.log("direction integers used");
	console.log(JSON.stringify(directionIntegerUsed));
	console.log("methods without comment block");
	console.log(JSON.stringify(methodsWithoutCommentBlock));
		/*
		if (/instanceof/.test(text)) {
			console.log("instanceof")
			console.log(codeLines[i]);
		}
		if (/ArrayList/.test(text)) {
			console.log("ArrayList")
			console.log(codeLines[i]);
		}
		if (/Arrays\.sort/.test(text)) {
			console.log("Arrays.sort")
			console.log(codeLines[i]);
		}
	}*/
	//var PetStore = contains(targetDIV.querySelectorAll("div.GMYHEHOCNK"),/PetStore/)[0].parentNode;
	//console.log(getInnerText(contains(PetStore.querySelectorAll("div.gwt-Label"),/for/)));
	//console.log("check add(SortedListOfImmutables listToAdd)");
	//var codeLinesOfSortedList = SortedList.querySelectorAll("div.gwt-Label");
	//var lines = selectWithRegex(codeLinesOfSortedList,/add\(SortedListOfImmutables listToAdd\)/,/\*\*/);
	//console.log(getInnerText(contains(lines,/add/)));
	//console.log(getInnerText(lines));
}
jQuery.fn.textWalk = function( fn ) {
    this.contents().each( jwalk );
    function jwalk() {
        var nn = this.nodeName.toLowerCase();
        if( nn === '#text' ) {
            fn.call( this );
        } else if( this.nodeType === 1 && this.childNodes && this.childNodes[0] && nn !== 'script' && nn !== 'textarea' ) {
            $(this).contents().each( jwalk );
        }
    }
    return this;
};
jQuery.fn.nextCodeLine = function() {
	return $(this).parents("tr").next().find(".gwt-Label");
}
function scrollTo(container,element) {
	var offset = getOffset(element);
	container.scrollTop = offset.top;
}
function getOffset( el ) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.parentNode;
    }
    return { top: _y, left: _x };
}


function loadURL(url,domResponseHandler) {
	chrome.runtime.sendMessage({
		action: "xhttp",
		url: url
	}, function(responseText) {
		// var dom= html2dom(responseText).get(0);
		// dom.url = url;
		domResponseHandler(responseText);
		// console.log(responseText);
		/*Callback function to deal with the response*/
	});
}
function reportScore(options) {
	chrome.runtime.sendMessage({
		action: "report",
		options: options
	}, function(response) {
		//
	});
		// {
		// 	studentId: id,
		// 	scores: [
		// 		{ column:'JUnit', score: $("input#score_JUnit").val() },
		// 		{ column:'Style', score: $("input#score_style").val() },
		// 	]
		// }
}

function stringDistance (s, t) {
        if (!s.length) return t.length;
        if (!t.length) return s.length;
 
        return Math.min(
                stringDistance(s.substr(1), t) + 1,
                stringDistance(t.substr(1), s) + 1,
                stringDistance(s.substr(1), t.substr(1)) + (s[0] !== t[0] ? 1 : 0)
        );
}

//var list = $("a:contains('sandwich')");
//console.log(list);
//for(i in list) {
//	console.log($(list[i]));
//}
//$.each(list, function(el) {  console.log($(el).text());});