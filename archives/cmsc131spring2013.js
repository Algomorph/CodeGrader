function cs131project7(UIpanel) {
	paneToScroll = $(".GMYHEHOCJK");
	var studentCreatedFiles = [	"fishPond/Fish.java",
								"fishPond/Model.java",
								"fishPond/Plant.java"];
	// getAllCheckedTrCodeLines will return a list of TR elements
	var trCodeLines = getAllCheckedTrCodeLines(studentCreatedFiles);
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 1. Variable names  (3pts)
	// (3 points) variable names
	//        - deduct 1 if they use p and f in many places
	//        - deduct 1 if there are bad names like "curr1" and "curr2" where
	//          the name doesn't really say what the difference is
	//        - deduct 1 for other really bad examples of variable name choice
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:orange'>Variables</h3>");
	var generalVars = [];
	var regex_declaration = /\s*((int)|(String)|(boolean)|(Fish)|(ArrayList<Fish>)|(Plant)|(ArrayList<Plant>))\s[A-Za-z0-9]+\s*(=|;)/g;
	$.each(trCodeLines,function(tri,tr) {
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		if(!codeText) return;
		var statements = codeText.split(";");
		$.each(statements, function(ddi,st) { // per statements in one line
			var dl = st.match(regex_declaration);
			if(dl===null) return;
			$.each(dl, function(di,d) {
				var varNames = d.replace(/^\s*((int)|(String)|(boolean)|(Fish)|(ArrayList<Fish>)|(Plant)|(ArrayList<Plant>))\s/g,"");
				var namesList = varNames.split(",");
				$.each(namesList, function(ni,name) {
					var varName = $.trim(name.replace(/=.*$/ig,""));
					$(UIpanel).append(makeLableWithClickToScroll(varName,tr));
					addButtonComment(tr,"Variable Used: "+varName,"Non-descriptive Variable Names : "+varName +" is not descriptive of its purpose","orange");
					if (generalVars.indexOf(varName)===-1) {
						generalVars.push(varName);
					}
				}); // end of namesList
			}); // end of each dec
		});  // end of each decList
	});	// end of tr_code loop
  	$(UIpanel).append("<p>- deduct 1 if they use p and f in many places</p>");
  	$(UIpanel).append("<p>- deduct 1 if there are bad names like 'curr1' and 'curr2' where the name doesn't really say what the difference is</p>");
	$(UIpanel).append("<p>-deduct 1 for other really bad examples of variable name choice</p>");
	$(UIpanel).append("<p>Score<input class='partialScore' kind='style' value='3'/></p>");

	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 2. Named Constant ROCK(28),WATER(27),LEFT(36),RIGHT(37),UP(38),DOWN(39)
	//	(3 points) not using our named constants (ROCK, UP, etc)
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:lightgreen'>Named Constant</h3>");
	var regexToFind = /==\s*((27)|(28)|(36)|(37)|(38)|(39))/ig;
	$.each(trCodeLines,function(tri,tr) {	// iterates each line of code below
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		if(codeText.match(/\/\//i)) return;
		var wordsFoundInCodeText = codeText.match(regexToFind);
		if(wordsFoundInCodeText) {
			addButtonComment(tr,"Named Constant","You have to use Named constants instead of integers.","lightgreen");
			$(UIpanel).append(makeLableWithClickToScroll(codeText.replace(/\s/ig,""),tr));
		}
	});
	$(UIpanel).append("<p>-2 for ROCK and WATER.  -1 for DIRECTIONS</p>");
	$(UIpanel).append("<p>Score<input class='partialScore' kind='style' value='3'/></p>");

	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 3. Needless 'elseif' test
	//	(1 point) for needless "elseif" tests where a regular else would work
	//  usual suspect:  public void fight(Fish other), public static void fishEatPlant(Fish f, Plant p)
	//  or, check stringDistance betweeen if and else if conditionals
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:lightblue'>Needless elseif</h3>");
	var targetMethods = [/public void fight\(Fish other\)/, /public static void fishEatPlant\(/ ];  //
	_.each(targetMethods, function(startRegex) {
		var tr_targetMethod = rangeSelectCodeBlock(trCodeLines,startRegex, /\/\*\*/);
		$.each(tr_targetMethod,function(tri,tr) {	// iterates each line of code below
			var codeText = $($(tr).find("div.gwt-Label")[0]).text();
			if(codeText.match(/else if/)) {
				addButtonComment(tr,"Needless else if","[else if] is unnecessary. Regular else would work.","lightblue");
				$(UIpanel).append(makeLableWithClickToScroll(codeText.replace(/\s/ig,""),tr));
			}
		});
	});
	// regular if, else if cases ()
	// var ifCond = "";  var elseifCond = "";
	// var regIf=/^\s*if\s*\((.*)\)/i;
	// var regElseIf=/^\s*else\s+if\s*\((.*)\)/i;
	// $.each(trCodeLines,function(tri,tr) {	// iterates each line of code below
	// 	var codeText = $($(tr).find("div.gwt-Label")[0]).text();
	// 	if(codeText.match(regIf))	ifCond = codeText.match(regIf)[1];
	// 	if(codeText.match(regElseIf))	elseifCond = codeText.match(regElseIf)[1];
	// 	if(ifCond.length>0 && elseifCond.length>0 && stringDistance(ifCond,elseifCond)<2) {
	// 		addButtonComment(tr,"Needless else if","'else if' is unnecessary. Regular 'else' would work.","yellow");
	// 		$(UIpanel).append(makeLableWithClickToScroll(codeText.replace(/\s/ig,""),tr));
	// 		ifCond=""; elseifCond="";
	// 	}
	// });
	$(UIpanel).append("<p>Score<input class='partialScore' kind='style' value='1'/></p>");


	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 4. for blatent lack of attempt to avoid redundant code (1pts)
	//	checks total line of code in each target class
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:yellow'>Redundant Code</h3>");
	$(UIpanel).append("<p>Score<input class='partialScore' kind='style' value='1'/></p>");


	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 5. Comment
	//	(2 point) comments
    // - deduct 1 if many helper methods have no comment block above them
    // - deduct 1 if none of the longer methods have some comments within
    //   them where there's complex code
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// find helper methods, check block comment above them
	// count the number of "//" or "*/" and "/*" within each method, add button if a method does not have any.
	$(UIpanel).append("<h3 style='color:pink'>Comments</h3>");
	// Finding helper methods
	var givenMethods = ["Fish","eat","isAlive","shrink","toString","fight","move","setRandomDirection","getSize","getRow","getCol","getDirection",
			"Model","plantExplosions","fishExplosions","isSpaceAvailable","fishEatPlant","getRows","getCols","shrinkFish","growPlants","removeDeadFish","removeDeadPlants","fishIsSurroundedByRocks","turnFish","moveFish","addPlant","addFish","getFish","getPlants","getShape",
			"Plant","isAlive","grow","removeBite"];
	var regex_functionDeclaration = /((public)|(private))\s+(static\s+)?([a-zA-Z0-9]+)\s+[a-zA-Z0-9]+\s*\(/gi;
	$(UIpanel).append("<span>Helper Methods: </span>");
	$.each(trCodeLines,function(tri,tr) {	// iterates each line of code below
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		var decl = (codeText.match(regex_functionDeclaration))?codeText.match(regex_functionDeclaration)[0]:null;
		if(decl) {
			var functionName = decl.match(/[a-zA-Z0-9]+\s*\(/gi)[0].replace("(","");
			// var matchingFunction = _.filter(givenMethods, function(w) { return functionName.indexOf(w)!=-1; });
			if(givenMethods.indexOf(functionName)==-1) {
				addButtonComment(tr,"Helper method with no comments","User-generated helper methods require block comments.","pink");
				$(UIpanel).append(makeLableWithClickToScroll(functionName,tr));
			}
		}
	});	
	$(UIpanel).append("<p>(2 point) comments</p>");
	$(UIpanel).append("<p>- deduct 1 if many helper methods have no comment block above them</p>");
	$(UIpanel).append("<p>- deduct 1 if none of the longer methods have some comments within them where there's complex code</p>");
	$(UIpanel).append("<p>Score<input class='partialScore' kind='style' value='2'/></p>");

	///////////////////////////////////////////////////////////////////////////////////////////////////
	// TOTAL SCORE
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:lightblue'>TOTAL SCORE</h3>");
	$("<p>Style score(max. 10)<input class='totalScore' id='score_style'></p>").appendTo(UIpanel);
	// update total scores when any partial score changes
	$("input.partialScore").blur(function() {
		var styleScore = _.reduce($.makeArray($("input.partialScore[kind='style']")), function(memo,input) {
			return memo+parseInt($(input).val(),10);
		},0);
		$("input#score_style").val(styleScore);
	});
	var styleScore = _.reduce($.makeArray($("input.partialScore[kind='style']")), function(memo,input) {
			return memo+parseInt($(input).val(),10);
		},0);
	$("input#score_style").val(styleScore);
	// report total score to grade server tab
	$("<button>REPORT TO GRADE SERVER</button>").click(function() {
		console.log("report");
		var studentId = $("h1").text().match(/cs131.../);
		reportScore({
			studentId: studentId[0],
			scores: [
				{ column:'Style', score: $("input#score_style").val() }
			]
		});
		var publishBut = $("a.link:contains('Publish All')");
		if(publishBut) {
			eventFire(publishBut[0],"click");	
		}
	}).appendTo(UIpanel);
}

function cs131project6(UIpanel) {
	paneToScroll = $(".GMYHEHOCJK");
	var studentCreatedFiles = [	"animalManagement/Menagerie.java",
								"animalManagement/PetStore.java",
								"animalManagement/SortedListOfImmutables.java"];
	// getAllCheckedTrCodeLines will return a list of TR elements
	var trCodeLines = getAllCheckedTrCodeLines(studentCreatedFiles);
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 1. Prohibited Words
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:yellow'>Prohibited Words</h3>");
	var wordsToFind = ["instanceof","ArrayList","Arrays.sort"];	
	$.each(trCodeLines,function(tri,tr) {	// iterates each line of code below
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		if(codeText.match(/\/\//i)) return;
		var wordsFoundInCodeText = _.filter(wordsToFind, function(w) { return codeText.indexOf(w)!=-1; });
		_.each(wordsFoundInCodeText, function(w) {
			$(UIpanel).append(makeLableWithClickToScroll(w,tr));
		});
	});
	// check "for","while" loop used in Mensagerie or PetStore
	$(UIpanel).append("<span>'for','while' in Menagerie or PetStore (ignore within toString())</span>");
	var trCodeLines_Menagerie_PetStore = getAllCheckedTrCodeLines(["animalManagement/PetStore.java", "animalManagement/Menagerie.java"]);
	wordsToFind = ["for","while"];
	var previousLineContainsRetValue = false;
	var forloopUsed = [];
	$.each(trCodeLines_Menagerie_PetStore,function(tri,tr) {	// iterates each line of code below
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		if(codeText.match(/((\/\/)|(\*))/i)) return;
		// start checking if the for-loop is within toString method (should ignore) 
		if(previousLineContainsRetValue) { previousLineContainsRetValue=false; return; }
		if(codeText.match(/String retValue =/)) previousLineContainsRetValue=true;
		// end checking
		var wordsFoundInCodeText = _.filter(wordsToFind, function(w) { return codeText.indexOf(w)!=-1; });
		_.each(wordsFoundInCodeText, function(w) {
			var labelText = codeText.replace(/^\s+/,"").replace(/\s+$/,"");
			$(UIpanel).append(makeLableWithClickToScroll(labelText,tr));
			forloopUsed.push(labelText);
			addButtonComment(tr,"Loops Used","Loops are not allowed to use in Menagerie and PetStore.","yellow");
		});
	});	
	$(UIpanel).append("<p>For each loop, give -1 (max:-2) below.</p>");
	// list all the helper methods that are not given. 
	$(UIpanel).append("<br><br><span>Student created helper methods below: </span>");
	var givenMethods = ["getName","getWholesaleCost","getRetailValue","equals","toString",
						"PetStore","getMenu","addMenagerie","getInventory","getCash","checkIfInInventory",
						"addShipmentToInventory","placeOrder",
						"SortedListOfImmutables","getSize","get","add","remove","getWholeSaleCost","getRetailValue",
						"checkAvailability"];
	var regex_functionDeclaration = /((public)|(private))\s+(static\s+)?([a-zA-Z0-9]+)\s+[a-zA-Z0-9]+\(/gi;	
	$.each(trCodeLines,function(tri,tr) {	// iterates each line of code below
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		var decl = (codeText.match(regex_functionDeclaration))?codeText.match(regex_functionDeclaration)[0]:null;
		if(decl) {
			var functionName = decl.match(/[a-zA-Z0-9]+\(/gi)[0].replace("(");
			var functionNotGiven = _.filter(givenMethods, function(w) { return codeText.indexOf(functionName)!=-1; });
			_.each(functionNotGiven, function(f) {
				$(UIpanel).append(makeLableWithClickToScroll(f,tr));
			});
		}
	});	
	$(UIpanel).append("<p>if a sort function is used, give -1 below.</p>");
	$(UIpanel).append("<p>Penalty: <input class='partialScore' kind='style' value='"+(0-Math.min(2,forloopUsed.length))+"'/></p>");


	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 2. Style points (total 5)
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:orange'>Code Redundancy</h3>");
	// checking add list not reusing add single item
	var trCodeLines_targetMethod = rangeSelectCodeBlock(trCodeLines,/public void add\(Sorte/,/\/\*/);
	var isRedundant = true;
	$.each(trCodeLines_targetMethod,function(tri,tr) {
		var codeText = $(tr).find("div.gwt-Label")[0].innerText;
		if(codeText.match(/add\(/)) isRedundant = false;
	});
	if(isRedundant) $(UIpanel).append(makeLableWithClickToScroll("add:SortedList",trCodeLines_targetMethod[0]));
	// checking remove list not reusing remove single item
	trCodeLines_targetMethod = rangeSelectCodeBlock(trCodeLines,/public void remove\(Sorte/,/\/\*/);
	isRedundant = true;
	$.each(trCodeLines_targetMethod,function(tri,tr) {
		var codeText = $(tr).find("div.gwt-Label")[0].innerText;
		if(codeText.match(/remove\(/)) isRedundant = false;
	});
	if(isRedundant) $(UIpanel).append(makeLableWithClickToScroll("remove:SortedList",trCodeLines_targetMethod[0]));
	// checking checkAvailability list not reusing single item version
	trCodeLines_targetMethod = rangeSelectCodeBlock(trCodeLines,/public boolean checkAvailability\(SortedListOfImmutables/,  /\/\*/);
	isRedundant = true;
	$.each(trCodeLines_targetMethod,function(tri,tr) {
		var codeText = $(tr).find("div.gwt-Label")[0].innerText;
		if(codeText.match(/checkAvailability\(/)) isRedundant = false;
	});
	if(isRedundant) $(UIpanel).append(makeLableWithClickToScroll("checkAvailability:SortedList",trCodeLines_targetMethod[0]));
	$(UIpanel).append("<p>add:2pts,  remove:2pts, checkAvail.:1pts.</p>");
	$(UIpanel).append("<p>Score<input class='partialScore' kind='style' value='5'/></p>");

	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC extra. good variable names
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:orange'>Others</h3>");
	$(UIpanel).append("Variables :");
	var generalVars = []; 
	var regex_declaration = /\s*((int)|(String)|(boolean)|(Listable)|(Listable\[\])|(SortedListOfImmutables))\s[A-Za-z0-9]+\s*(=|;)/g;
	$.each(trCodeLines,function(tri,tr) {
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		if(!codeText) return;
		var statements = codeText.split(";");
		$.each(statements, function(ddi,st) { // per statements in one line
			var dl = st.match(regex_declaration);
			if(dl===null) return;
			$.each(dl, function(di,d) {
				var varNames = d.replace(/^\s*((int)|(String)|(boolean)|(Listable)|(Listable\[\])|(SortedListOfImmutables))\s/g,"");
				var namesList = varNames.split(",");
				$.each(namesList, function(ni,name) {
					var varName = $.trim(name.replace(/=.*$/ig,""));
					if (generalVars.indexOf(varName)===-1) {
						generalVars.push(varName);
						$(UIpanel).append(makeLableWithClickToScroll(varName,tr));	
						addButtonComment(tr,"Variable Used: "+varName,"Non-descriptive Variable Names : "+varName +" is not descriptive of its purpose","yellow");
					}
				}); // end of namesList
			}); // end of each dec
		});  // end of each decList
	});	// end of tr_code loop

	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 3. other stuff
	///////////////////////////////////////////////////////////////////////////////////////////////////
	
	$(UIpanel).append("<p>Look for the following and leave comments but do not deduct points for: <br>* places where comments should be inserted within the code <br>* testing things already known to be true or false like having and if-elseif where the 'elseif' tests the negation of what that if had tested</p>");


	///////////////////////////////////////////////////////////////////////////////////////////////////
	// TOTAL SCORE
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:lightblue'>TOTAL SCORE</h3>");
	$("<p>Style score(max. 5)<input class='totalScore' id='score_style'></p>").appendTo(UIpanel);
	// update total scores when any partial score changes
	$("input.partialScore").blur(function() {
		var styleScore = _.reduce($.makeArray($("input.partialScore[kind='style']")), function(memo,input) {
			return memo+parseInt($(input).val(),10);
		},0);
		$("input#score_style").val(styleScore);
	});
	var styleScore = _.reduce($.makeArray($("input.partialScore[kind='style']")), function(memo,input) {
			return memo+parseInt($(input).val(),10);
		},0);
	$("input#score_style").val(styleScore);
	// report total score to grade server tab
	$("<button>REPORT TO GRADE SERVER</button>").click(function() {
		console.log("report");
		var studentId = $("h1").text().match(/cs131.../);
		reportScore({
			studentId: studentId[0],
			scores: [
				{ column:'Style', score: $("input#score_style").val() }
			]
		});
		var publishBut = $("a.link:contains('Publish All')");
		if(publishBut) {
			eventFire(publishBut[0],"click");	
		}
	}).appendTo(UIpanel);
	
}



function cs131project5(UIpanel) {
	paneToScroll = $(".GMYHEHOCJK");
	var trCodeLines = getAllCheckedTrCodeLines(["poker/Deck.java","poker/PokerHandEvaluator.java"]);
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 1. Prohibited Class (ArrayList and LinkedList)
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:yellow'>ArrayList, LinkedList</h3>");
	var wordsToFind = ["ArrayList","LinkedList"];
	var wordsFound = [];
	$.each(trCodeLines,function(tri,tr) {	// iterates each line of code below
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		if(codeText.match(/\/\//i)) return;
		var wordsFoundInCodeText = _.filter(wordsToFind, function(w) { return codeText.indexOf(w)!=-1; });
		_.each(wordsFoundInCodeText, function(w) {
			$(UIpanel).append(makeLableWithClickToScroll(w,tr));
			addButtonComment(tr,"ArrayList&LinkedList"," ","blue");
		});
	});
	$(UIpanel).append("<p>if exist, set all score T1~T19 zero</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 1. Code redundancy (hasStraightFlush = straight+flush)
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:orange'>Helper methods for hasStraightFlush</h3>");
	var helperMethods = ["hasStraight(","hasFlush("]; //
	var trCodeLines_hasStraight = rangeSelectCodeBlock(trCodeLines,/public static boolean hasStraightFlush/,/public static boolean/);
	$.each(trCodeLines_hasStraight,function(tri,tr) {
		var codeText = $(tr).find("div.gwt-Label")[0].innerText;
		// actual test of the code string
		var methodsFound= _.filter(helperMethods, function(w) { return codeText.indexOf(w)!=-1; });
		_.each(methodsFound, function(w) {
			$(UIpanel).append(makeLableWithClickToScroll(w,tr));
		});
	});
	$(UIpanel).append("<p>if no helper methods used, -2 style points</p>");
	$(UIpanel).append("<p>Score<input class='partialScore' kind='style' value='2'/></p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 2. good variable names
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:yellow'>Variables Declared</h3>");
	var generalVars = []; 
	var regex_declaration = /\s*((int)|(int\[\])|(String)|(Card)|(Card\[\])|(Deck)|(boolean))\s[A-Za-z0-9]+\s*(=|;)/g;
	$.each(trCodeLines,function(tri,tr) {
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		if(!codeText) return;
		var statements = codeText.split(";");
		$.each(statements, function(ddi,st) { // per statements in one line
			var dl = st.match(regex_declaration);
			if(dl===null) return;
			$.each(dl, function(di,d) {
				var varNames = d.replace(/^\s*((int)|(int\[\])|(String)|(Card)|(Card\[\])|(Deck)|(boolean))\s/g,"");
				var namesList = varNames.split(",");
				$.each(namesList, function(ni,name) {
					var varName = $.trim(name.replace(/=.*$/ig,""));
					// if(varName.length<2 && whitelist.indexOf(varName.toLowerCase())==-1) {
					// 	addButtonComment(tr,"Variable Used: "+varName,"Non-descriptive Variable Names : "+varName +" is not descriptive of its purpose","yellow");
					// 	$(shortVarsDiv).append(makeLableWithClickToScroll(varName,tr))
					// 	shortVars.push(varName);
					// }
					if (generalVars.indexOf(varName)===-1) {
						generalVars.push(varName);
						$(UIpanel).append(makeLableWithClickToScroll(varName,tr));	
						addButtonComment(tr,"Variable Used: "+varName,"Non-descriptive Variable Names : "+varName +" is not descriptive of its purpose","yellow");
					}
				}); // end of namesList
			}); // end of each dec
		});  // end of each decList
	});	// end of tr_code loop
	$(UIpanel).append("<p>if they have MANY poor variable names, they lose 2 points</p>");
	$(UIpanel).append("<p>Score:<input class='partialScore' kind='style' value='2'/></p>");
	// $(UIpanel).append("<p>Default Comment:<br><input class='defaultComment' id='comment_variable' value='Non-descriptive Variable Names : [varName] is not descriptive of its purpose.'/></p>");
	
	// show the result on summary UIPanel
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 3. indentation
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:yellow'>Indentation</h3>");
	$(UIpanel).append("<p>if they have multiple examples of bad indenting, they lose 1 point</p>");
	$(UIpanel).append("<p>Score<input class='partialScore' kind='style' value='1'/></p>");

	// now start JUNIT test
	var trCodeLines = getAllCheckedTrCodeLines(["poker/StudentTests.java"]);
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// JUNIT 1. coverage
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:lightblue'>Test Coverage</h3>");
	var keywordsMatchedTotal = [];   var keywordsWithAssertFalse = [];
	var keywords = ["PokerHandEvaluator.hasPair","PokerHandEvaluator.hasTwoPair","PokerHandEvaluator.hasThreeOfAKind","PokerHandEvaluator.hasFourOfAKind","PokerHandEvaluator.hasFlush","PokerHandEvaluator.hasStraight","PokerHandEvaluator.hasFullHouse","PokerHandEvaluator.hasStraightFlush" ];
	$.each(trCodeLines,function(tri,tr) {
		var codeText = $($(tr).find("div.gwt-Label")[0]).text();
		var keywordsMatched = _.filter(keywords, function(w) { return codeText.match(new RegExp(w,"g"))!==null; });
		if(keywordsMatched.length===0) return;
		var aFalse = codeText.match(/((assertFalse)|(false))/g);
		if(aFalse) {
			keywordsWithAssertFalse = _.unique(_.union(keywordsWithAssertFalse, keywordsMatched));
		}
		keywordsMatchedTotal = _.union(keywordsMatchedTotal, keywordsMatched);
	});
	var startingLineOfStudentTest = findTrUsingRegex(trCodeLines,/public class StudentTests \{/);
	var keywordsNonMatched = _.map(_.difference(keywords,_.unique(keywordsMatchedTotal)), function(w){ return w.replace("PokerHandEvaluator.","");});
	if(keywordsNonMatched.length>0) addButtonComment(startingLineOfStudentTest,"Missing Tests", "Missing JUnit tests for "+keywordsNonMatched,"yellow");
	var scoreAssertFalse;
	if(keywordsWithAssertFalse.length>=4) scoreAssertFalse = 2;
	else if(keywordsWithAssertFalse.length>=2) scoreAssertFalse = 1;
	else scoreAssertFalse=0;
	$(UIpanel).append("<p>Hands that are not tested:"+makeLabels(keywordsNonMatched)+"</p>");
	$(UIpanel).append("<p>Hands that tested false cases:"+makeLabels(_.map(keywordsWithAssertFalse, function(w) {return w.replace("PokerHandEvaluator.","");}))+"</p>");
	elTestPassed = $("<p></p>").appendTo(UIpanel);
	$(UIpanel).append("Score<input class='partialScore' kind='JUnit' value='"+(Math.min(7,keywordsMatchedTotal.length)+scoreAssertFalse)+"'/>");

	///////////////////////////////////////////////////////////////////////////////////////////////////
	// JUNIT 2. Student Test Results
	///////////////////////////////////////////////////////////////////////////////////////////////////
	var submissionPageURL = window.location.origin+$("a.gwt-Anchor:contains('submission')").attr("href");
	callbackHTMLStringHandler = $.proxy(function(htmlStr) {
		// console.log(dom);
		var el = $('<div></div>');
		el.html(htmlStr);
		var allTR = $("tr",el);
		var studentTestTR = _.filter($.makeArray(allTR), function(tr) {
			return $("td:nth-child(1)",tr).text()=="STUDENT";
		});
		var testPassed = _.filter(studentTestTR, function(tr) {
			return $("td:nth-child(3)",tr).text()=="passed";
		});
		var result = $("<p>Student test that passed:"+testPassed.length+" out of "+studentTestTR.length+"</p>");
		$(elTestPassed).append(result);
	},this);
	loadURL(submissionPageURL,callbackHTMLStringHandler);

	///////////////////////////////////////////////////////////////////////////////////////////////////
	// TOTAL SCORE
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:lightblue'>TOTAL SCORE</h3>");
	$("<p>JUnit score(max. 9)<input class='totalScore' id='score_JUnit'></p>").appendTo(UIpanel);
	$("<p>Style score(max. 5)<input class='totalScore' id='score_style'></p>").appendTo(UIpanel);
	// update total scores when any partial score changes
	$("input.partialScore").blur(function() {
		var styleScore = _.reduce($.makeArray($("input.partialScore[kind='style']")), function(memo,input) {
			return memo+parseInt($(input).val(),10);
		},0);
		var JUnitScore = _.reduce($.makeArray($("input.partialScore[kind='JUnit']")), function(memo,input) {
			return memo+parseInt($(input).val(),10);
		},0);
		$("input#score_JUnit").val(JUnitScore);
		$("input#score_style").val(styleScore);
	});
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
	}).appendTo(UIpanel);
}

function cs131project4(UIpanel) {
	// second, find a list <tr>tags containing codes
	var sectionsStudentModified = ["p4_student/QuadraticEquation.java"];
	var trCodeLines = _.reduce(sectionsStudentModified, function(memo,sec){
		var tr_list = $("div.GMYHEHOCNK:contains('"+sec+"')").parent().find("tr");
		return _.union(memo,tr_list);
	},[]);
	paneToScroll = $(".GMYHEHOCJK");
	// eventFire($("a:contains('"+sectionsStudentModified[0]+"')")[0],'click');
	trCodeLines = trCodeLines[0];	// flatten for 1-level to get <tr> for each codeline
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 1. good variable names
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:yellow'>Variables Declared</h3>");
	var shortVarsDiv=$("<p>[shortVars] </p>").appendTo(UIpanel);
	var generalVars = []; shortVars=[];  whitelist = ['a','b','c','d','e','f'];
	var tokens_java_types = ["int","String","MyDouble"];  // list of type tokens for finding variable names (should be added for later projects)
	var regex_declaration = /\s*((int)|(String)|(MyDouble))\s[A-Za-z0-9]+\s*(=|;)/g;
	$.each(trCodeLines,function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if(!codeText) return;
		var statements = codeText.split(";");
		$.each(statements, function(ddi,st) { // per statements in one line
			var dl = st.match(regex_declaration);
			if(dl===null) return;
			$.each(dl, function(di,d) {
				var varNames = d.replace(/\s*((int)|(String)|(MyDouble))\s/gi,"");
				var namesList = varNames.split(",");
				$.each(namesList, function(ni,name) {
					var varName = $.trim(name.replace(/=.*$/ig,""));
					if(varName.length<2 && whitelist.indexOf(varName.toLowerCase())==-1) {
						addButtonComment(tr,"Variable Used: "+varName,"Non-descriptive Variable Names : "+varName +" is not descriptive of its purpose","yellow");
						$(shortVarsDiv).append(makeLableWithClickToScroll(varName,tr))
						shortVars.push(varName);
					}
					generalVars.push(varName);
				}); // end of namesList
			}); // end of each dec
		});  // end of each decList
	});	// end of tr_code loop
	// show the result on summary UIPanel
	//$(UIpanel).append("<p>[GENERAL VARS]"+makeLabels(_.unique(generalVars)).join(" ")+"</p>");
	$(UIpanel).append("<p>max-deduct :-2 <br> -1 per single-letter variable (a,b,c,d,e,f,g are okay). <br>-1 for other non-descriptive variables.</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 2. Unnecessary variable in QE
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// $(UIpanel).append("<h3 style='color:lightgreen'>QuadraticEquation containing other than three MyDouble values</h3>");
	// $(UIpanel).append("<p>max-deduct :-3 <br> -1 for ZERO constant.</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 3. MyDouble.zero
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:lightblue'>MyDouble.zero or new MyDouble(0)</h3>");
	var patternToFind = "new MyDouble(0)"; count = 0;
	$.each(trCodeLines,function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if (codeText.indexOf(patternToFind)!==-1) {
			count++;
			if(codeText.indexOf("public static MyDouble zero")===-1) {
				addButtonComment(tr,"MyDouble.zero","Use MyDouble.zero instead of creating your own static one","blue");
				$(UIpanel).append(makeLableWithClickToScroll("MyDouble(0)",tr));
			}
		}
	});
	$(UIpanel).append("<p>"+count+" new MyDouble(0) are used</p>");
	$(UIpanel).append("<p>max-deduct :-1</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 4. Public helper method
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:red'>Public Helper Methods</h3>");
	console.log("finding public methods");
	var regex_publicFunction = /public\s+(static\s+)?([a-zA-Z0-9])+\s+[a-zA-Z0-9]+\(/gi;
	var givenMethods = [/QuadraticEquation\s*\(/i, /getA\s*\(/i, /getB\s*\(/i,
						/getC\s*\(/i, /evaluate\s*\(/i, /add\s*\(/i, /subtract\s*\(/i, /limitedMultiply\s*\(/i,
						/derivative\s*\(/i, /normalize\s*\(/i, /compareTo\s*\(/i, /toString\s*\(/i, /parseQuadratic\s*\(/i,
						/equals\s*\(/i   ];   //
	$.each(trCodeLines,function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if(codeText.match(regex_publicFunction)) {
			console.log(codeText);
			var helperMethodsFound = _.filter(givenMethods, function(m) { return codeText.match(m)!==null; });
			if(helperMethodsFound.length===0) {
				addButtonComment(tr, "public helper","A helper method should be private not public","red");
				$(UIpanel).append(makeLableWithClickToScroll(codeText,tr));
			}
		}
	});
	$(UIpanel).append("<p>max-deduct :-1</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 5. Indentation in toString and parseQuadratic
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:orange'>Indentation</h3>");
	$(UIpanel).append("<p>If they don't have good indenting and bracket use in the toString and in the parseQuadratic methods, deduct 2 points (these are the ones that have the most need of indenting and brackets).</p>");
	$(UIpanel).append("<p>max-deduct :-2</p>");

	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 6. Use of Array
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:pink'>Use of Array</h3>");
	$.each(trCodeLines,function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if(codeText.indexOf("int[")!==-1 || codeText.indexOf("String[")!==-1) {
			$(UIpanel).append(makeLableWithClickToScroll("codeText",tr));
		}
	});
	$(UIpanel).append("<p>deduct harsh!!!</p>");


}



function cs131project3(UIpanel) {
	// second, find a list <tr>tags containing codes
	var sectionsStudentModified = ["p3_student/PhotoTools.java"];
	var trCodeLines = _.reduce(sectionsStudentModified, function(memo,sec){
		var tr_list = $("div.GMYHEHOCNK:contains('"+sec+"')").parent().find("tr");
		return _.union(memo,tr_list);
	},[]);
	paneToScroll = $(".GMYHEHOCJK");
	// eventFire($("a:contains('"+sectionsStudentModified[0]+"')")[0],'click');
	trCodeLines = trCodeLines[0];	// flatten for 1-level to get <tr> for each codeline
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 0. Proper indenting
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:plum'>Proper Indenting</h3>");
	$(UIpanel).append("<p>-1 for small mistakes <br> -2 for lack of effort</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 1. good variable names
	///////////////////////////////////////////////////////////////////////////////////////////////////
	var loopVars = [];  generalVars = []; rowColMisuses = [];   whitelist = ['row','col','x','y'];
	var tokens_java_types = ["int","String","boolean","Scanner"];  // list of type tokens for finding variable names (should be added for later projects)
	//var regex_declaration = /^\s*(final)?\s*(static)?\s*((int)|(String)|(boolean)|(Scanner)) .*/g;
	var regex_declaration = /\s*((int)|(String)|(boolean)|(Scanner))\s[A-Za-z0-9]+\s*(=|;)/g;
	var regex_camelcase = /[a-z]([A-Z0-9][a-z][a-z0-9]*[A-Z]|[a-z0-9]*[A-Z][A-Z0-9]*[a-z])*[A-Za-z0-9]*/g;
	$.each(trCodeLines,function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if(!codeText) return;
		// actual test of the code string
		var statements = codeText.split(";");
		$.each(statements, function(ddi,st) { // per statements in one line
			var dl = st.match(regex_declaration);
			if(dl==null) return;
			// there could be multiple declarations in one line, so we use $.each
			$.each(dl, function(di,d) {
				var varNames = d.replace(/int/gi,"");
				var namesList = varNames.split(",");
				$.each(namesList, function(ni,name) {
					var varName = $.trim(name.replace(/=.*$/ig,""));
					if(varName.length<3 && whitelist.indexOf(varName)==-1)
							addButtonComment(tr,"Variable Used: "+varName,"Non-descriptive Variable Names : "+varName +" is not descriptive of its purpose","yellow");
					// loop vars
					if(codeText.match(/((for)|(while))/i)) {
						loopVars.push(varName);
						if(		(codeText.match(/width/i) && varName=="row")
							||	(codeText.match(/height/i) && varName=="col")
						) addButtonComment(tr,"row/col misused?","do not use row to refer columns, or vice versa.","yellow");
					} else {
					// regular vars
						generalVars.push(varName);
						//highlightText(codeDiv,varName,"yellow");
					}
				}); // end of namesList
			}); // end of each dec
		});  // end of each decList
	}); 	// end of tr_code loop
	// show the result on summary UIPanel
	$(UIpanel).append("<h3 style='color:yellow'>Variables Declared</h3>");
	$(UIpanel).append("<p>[GENERAL VARS]"+makeLabels(_.unique(generalVars)).join(" ")+"</p>");
	$(UIpanel).append("<p>[LOOP VARS] "+makeLabels(_.unique(loopVars)).join(" ")+"</p>");
	$(UIpanel).append("<p>max-deduct :-2 <br> -1 per single-letter loop variable (x,y are okay) or row/col misuse. <br>-1 for other non-descriptive variables.</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 2. Symbilic constants for vertical/horizontal stretch
	///////////////////////////////////////////////////////////////////////////////////////////////////
	var literalsUsed = [];
	var trCodeLines_stretched = rangeSelectCodeBlock(trCodeLines,/public static Photograph stretched/,/public static Photograph/);
	$.each(trCodeLines_stretched,function(tri,tr) {
		var codeText = $(tr).find("div.gwt-Label")[0].innerText;
		// actual test of the code string
		var regex_if_statement = /if(\s)*\([\s\S]+\)/;
		var regex_conditional_expr =/\([\s\S]+\)/;
		var regex_string_literal =/\"([a-zA-Z0-9]|\s)+\"/;
		var regex_int_literal =/==\s*[0-9]+/;
		if(codeText.match(regex_if_statement)) {
			var expr = codeText.match(regex_conditional_expr)[0];
			if(expr.match(/type/i) && expr.match(regex_int_literal)) {
				//console.log(codeText+", "+expr+", "+expr.match(regex_int_literal)[0]);
				literalsUsed.push(expr);
				addButtonComment(tr,"Use symbolic contants for 0 and 1","0 and 1 should be named constants, not literals.","orange");
				//$(tr).css("background-color","orange");
			}
		}
	});
	// show the result on summary UIPanel
	$(UIpanel).append("<h3 style='color:orange'>Conditionals containing literals</h3>");
	$(UIpanel).append("<p>[LITERALS IN CONDITIONAL FOUND] "+ makeLabels(literalsUsed).join(" ")   +"</p>");
	$(UIpanel).append("<p>don't deduct. only comment.</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 3. BLOCK COMMENTS ON HELPER METHODS
	//	add comment buttons for each helper method declaration. user clicks it -> count up -> calculate deducted points
	///////////////////////////////////////////////////////////////////////////////////////////////////
	var regex_functionDeclaration = /((public)|(private))\s+(static\s+)?((void)|(int)|(String)|(boolean)|(Photograph))\s+[a-zA-Z0-9]+\(/gi;
	$.each(trCodeLines, function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if(!codeText) {  return; }
		// store code for each helper method block
		// actual test of the code string
		var statements = codeText.split(";");
		$.each(statements, function(ddi,st) { // per statements in one line
			var funcDec = st.match(regex_functionDeclaration);
			if (funcDec===null) return;
			$.each(funcDec, function(di,dec) {
				addButtonComment(tr,"Comment Block: does it have block comment?","Every Method you implement must have a comment block to tell its purpose","plum");
			});
		});
	});
	$(UIpanel).append("<h3 style='color:plum'>Comments</h3>");
	$(UIpanel).append("<p>(max deduct: -2) -2 for no comments at all. <br> -1 for missing a lot. </p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 4. CODE REUSE
	//	it employs the helperMethods
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// highlights all the helper method names used throughout the code
	helperMethods = [/copy\(/,/makeGrayscale\(/,/pixelated\(/,/stretched\(/,/enlargement\(/,/rotated\(/,/upsideDown\(/,/stitchHelper\(/,/stitched\(/];
	//
	casesOfCodeReuse = [];
	$.each(trCodeLines, function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if(!codeText) {  return; }
		if(codeText.match(regex_functionDeclaration)) return;	// do not apply on function declaration line
		_.each(helperMethods, function(hm,hmi) {
			if(codeText.match(hm) && !codeText.match(regex_functionDeclaration)) addCommentOnly(tr,hm,"green");
		});
	});
	var trCodeLines_singleMethod;  var helperMethodsUsed;  var tr_methodDefinition;
	// check pixelated function uses copy method.
	trCodeLines_singleMethod = rangeSelectCodeBlock(trCodeLines,/public static Photograph pixelated/,/((public)|(private)) static/);
	helperMethodsUsed = getHelperMethodsUsedInCodeBlock(trCodeLines_singleMethod,helperMethods);
	if (_.filter(helperMethodsUsed, function(reg) { return reg.source==(/copy\(/).source;}).length===0)  { //
		tr_methodDefinition = findTrUsingRegex(trCodeLines, /public static Photograph pixelated/);
		addButtonComment(tr_methodDefinition,"Code Reuse: Pixelated without reusing copy method","Code Reuse: Pixelated function could have reused copy method of Photograph.","lightgreen");
	}
	casesOfCodeReuse.push({message:"Pixelated without reusing copy method", scrollTo:tr_methodDefinition});
	// check enlargement didn't call stretched twice
	trCodeLines_singleMethod = rangeSelectCodeBlock(trCodeLines,/public static Photograph enlargement/,/((public)|(private)) static/);
	helperMethodsUsed = getHelperMethodsUsedInCodeBlock(trCodeLines_singleMethod,helperMethods);
	if (_.filter(helperMethodsUsed, function(reg) { return reg.source==(/stretched\(/).source;}).length===0)  { //
		tr_methodDefinition = findTrUsingRegex(trCodeLines, /public static Photograph enlargement/);
		addButtonComment(tr_methodDefinition,"Code Reuse: Enlargement without reusing stretched method","Code Reuse: Enlargement function could have reused stretched method of Photograph.","lightgreen");
	}
	casesOfCodeReuse.push({message:"Enlargement without reusing stretched method", scrollTo:tr_methodDefinition});
	// upside-down didn't call rotated twice
	trCodeLines_singleMethod = rangeSelectCodeBlock(trCodeLines,/public static Photograph upsideDown/,/((public)|(private)) static/);
	helperMethodsUsed = getHelperMethodsUsedInCodeBlock(trCodeLines_singleMethod,helperMethods);
	if (_.filter(helperMethodsUsed, function(reg) { return reg.source==(/rotated\(/).source;}).length===0)  { //
		tr_methodDefinition = findTrUsingRegex(trCodeLines, /public static Photograph upsideDown/);
		addButtonComment(tr_methodDefinition,"Code Reuse: upsideDown without reusing rotated method","Code Reuse: upsideDown function could have reused rotated method of Photograph.","lightgreen");
	}
	casesOfCodeReuse.push({message:"Upsidedown without reusing rotated method", scrollTo:tr_methodDefinition});
	// also list all method not calling any helper method
	// show the result on summary UIPanel
	$(UIpanel).append("<h3 style='color:lightgreen'>Code Reuse</h3>");
	_.each(makeLabelsWithClick(casesOfCodeReuse), function(label) {
		$(UIpanel).append(label);
	});
	$(UIpanel).append("<p>(max deduct: -3) <br>-1 for not reusing copy method. <br> -1 for not reusing stretch in enlargement. <br> -1 for not reusing rotate in upside-down.</p>");
}
function cs131project2(UIpanel) {
	// second, find a list <tr>tags containing codes
	var sectionsStudentModified = ["src/studentCode/LetterMaker.java"];
	var trCodeLines = _.reduce(sectionsStudentModified, function(memo,sec){
		var tr_list = $("div.GMYHEHOCNK:contains('"+sec+"')").parent().find("tr");
		return _.union(memo,tr_list);
	},[]);
	eventFire($("a:contains('"+sectionsStudentModified[0]+"')")[0],'click');
	trCodeLines = trCodeLines[0];	// flatten for 1-level to get <tr> for each codeline
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 1. good variable names
	///////////////////////////////////////////////////////////////////////////////////////////////////
	var loopVars = [];  generalVars = [];  whitelist = ['row','col','x','y'];
	var tokens_java_types = ["int","String","boolean","Scanner"];  // list of type tokens for finding variable names (should be added for later projects)
	//var regex_declaration = /^\s*(final)?\s*(static)?\s*((int)|(String)|(boolean)|(Scanner)) .*/g;
	var regex_declaration = /\s*((int)|(String)|(boolean)|(Scanner))\s[A-Za-z0-9]+\s*(=|;)/g;
	var regex_camelcase = /[a-z]([A-Z0-9][a-z][a-z0-9]*[A-Z]|[a-z0-9]*[A-Z][A-Z0-9]*[a-z])*[A-Za-z0-9]*/g;
	$.each(trCodeLines,function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if(!codeText) return;
		// actual test of the code string
		var statements = codeText.split(";");
		$.each(statements, function(ddi,st) { // per statements in one line
			var dl = st.match(regex_declaration);
			if(dl==null) return;
			// there could be multiple declarations in one line, so we use $.each
			$.each(dl, function(di,d) {
				var varNames = d.replace(/int/gi,"");
				var namesList = varNames.split(",");
				$.each(namesList, function(ni,name) {
					var varName = $.trim(name.replace(/=.*$/ig,""));
					if(varName.length<3 && whitelist.indexOf(varName)==-1)
							addButtonComment(tr,"Variable Name","Non-descriptive Variable Names : "+varName +" is not descriptive of its purpose","yellow");
					// loop vars
					if(!codeText.match(/((for)|(while))/i)) {
						loopVars.push(varName);
						//highlightText(codeDiv,varName,"yellow");
					} else {
					// regular vars
						generalVars.push(varName);
						//highlightText(codeDiv,varName,"yellow");
					}
				}); // end of namesList
			}); // end of each dec
		});  // end of each decList
	}); 	// end of tr_code loop
	// show the result on summary UIPanel
	$(UIpanel).append("<h3 style='color:yellow'>Variables Declared</h3>");
	$(UIpanel).append("<p>[GENERAL VARS]"+makeLabels(_.unique(generalVars)).join(" ")+"</p>");
	$(UIpanel).append("<p>[LOOP VARS] "+makeLabels(_.unique(loopVars)).join(" ")+"</p>");
	$(UIpanel).append("<p>max-deduct :-4 <br> -1 per single-letter loop variable (up to -2. x,y are okay). <br>-1 per other non-descriptive variables (up to 2)</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 2. BLOCK COMMENTS ON HELPER METHODS
	//	add comment buttons for each helper method declaration. user clicks it -> count up -> calculate deducted points
	///////////////////////////////////////////////////////////////////////////////////////////////////
	var helperMethods = {}, massingComments=[];
	var codeBlockPerHelperMethods = {};
	var givenMethods = ["getCenter","drawTopBar","drawT","errorGrid","drawLetter"];
	var regex_functionDeclaration = /((public)|(private))\s+(static\s+)?((void)|(int)|(String)|(boolean))\s+[a-zA-Z0-9]+\(/gi;
	var prev_tr, currentMethodName;
	$.each(trCodeLines, function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if(!codeText) {  return; }
		// store code for each helper method block
		// actual test of the code string
		var statements = codeText.split(";");
		$.each(statements, function(ddi,st) { // per statements in one line
			var funcDec = st.match(regex_functionDeclaration);
			if (funcDec==null) return;
			$.each(funcDec, function(di,dec) {
				var functionName = dec.replace(/^.*\s([a-zA-Z0-9]+)\(/,"$1");
				if(givenMethods.indexOf(functionName)==-1) {
					helperMethods[functionName] = {div:codeDiv, codeline:$(codeDiv).parents("tr").find(".line-number").text()};
					currentMethodName = functionName;
					addButtonComment(tr,"Comment Block: does it have block comment?","Every Method you implement must have a comment block to tell its purpose","plum");
				}
			});
		});
		if(currentMethodName) { codeBlockPerHelperMethods[currentMethodName] = (codeBlockPerHelperMethods[currentMethodName])? codeBlockPerHelperMethods[currentMethodName]+" "+codeText : codeText; }
	});
	$(UIpanel).append("<h3 style='color:plum'>Block Comments</h3>");
	$(UIpanel).append("<p>-1 per helper methods without comment (up to -3) </p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 3. CODE REUSE
	//	it employs the helperMethods
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// highlights all the helper method names used throughout the code
	$.each(trCodeLines, function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if(!codeText) {  return; }
		if(codeText.match(regex_functionDeclaration)) return;	// do not apply on function declaration line
		_.each(_.keys(helperMethods), function(hm,hmi) {
			if(codeText.match(hm)) addCommentOnly(tr,hm,"green");
		});
	});
	// show the result on summary UIPanel
	$(UIpanel).append("<h3 style='color:lightgreen'>Helper methods</h3>");
	$(UIpanel).append("<p>"+makeLabels(_.keys(helperMethods)).join(" ")+"</p>");
	$(UIpanel).append("<p>(max deduct: -4) <br>-1~2: for not using helper methods that draw left/right vertical strokes.<br> -1: no helper used for diagonals in N and X.  <br>-1: no helper used for corner cells.</p>");
	$.each(codeBlockPerHelperMethods, function(cbi,cb) {
		console.log(cb);
		var numberOfHelperMethodsUsedWitinBlock = 0;
		_.each(helperMethods, function(mDiv,m) {
			if(cbi!=m && cb.indexOf(m)>-1) {
				numberOfHelperMethodsUsedWitinBlock++;
				console.log(m);
			}
		});
		if(numberOfHelperMethodsUsedWitinBlock==0) {
			$("<p>"+makeLabels([cbi])+" employs no helper method.</p>")
				.attr("codeline",helperMethods[cbi].codeline)
				.appendTo(UIpanel);
		}
	});
	$(UIpanel).append("<h3 style='color:orange'>Modularity</h3>");
	$(UIpanel).append("<p>-1: no method for drawing each letter used. Say 'Lack of modularity in code structure : each letter drawing operation deserves to be a separate method.' </p>");
	// add function to open textarea and automatically put the same text in
}
function cs131project1(UIpanel) {
	// second, find a list <tr>tags containing codes
	var sectionsStudentModified = ["src/CryptoQuiz.java","src/CryptoQuiz.java"];
	var trCodeLines = _.reduce(sectionsStudentModified, function(memo,sec){
		var tr_list = $("div.GMYHEHOCNK:contains('"+sec+"')").parent().find("tr");
		return _.union(memo,tr_list);
	},[]);
	trCodeLines = trCodeLines[0];	// flatten for 1-level to get <tr> for each codeline
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 1. good variable names
	// 		we use blacklist such as [x, y, x1, temp2, junk, j, i, jj, kk, prt, lev]
	///////////////////////////////////////////////////////////////////////////////////////////////////
	var blacklist = ["x","y","temp","junk","i","j","jj","kk","prt","lev"];
	var nonfinalDeclarations = []; finalDeclarations= []; blacklistUsed = [], nonCamelCaseUsed= [], badSymbolicUsed= [];
	var tokens_java_types = ["int","String","boolean","Scanner"];  // list of type tokens for finding variable names (should be added for later projects)
	var regex_declaration = /^\s*(final)?\s*(static)?\s*((int)|(String)|(boolean)|(Scanner)) .*/g;
	var regex_camelcase = /[a-z]([A-Z0-9][a-z][a-z0-9]*[A-Z]|[a-z0-9]*[A-Z][A-Z0-9]*[a-z])*[A-Za-z0-9]*/g;
	var regex_symbolic = /[A-Z]([A-Z0-9]*_)*[A-Z0-9]/g;
	$.each(trCodeLines,function(tri,tr) {
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		if(!codeText) return;
		// actual test of the code string
		var decList = codeText.split(";");
		$.each(decList, function(ddi,dec) { // per statements in one line
			var dl = dec.match(regex_declaration);
			if(dl==null) return;
			// there could be multiple declarations in one line, so we use $.each
			$.each(dl, function(di,d) {
				var varNames = d.replace(/(final)|(int)|(String)|(boolen)|(Scanner)/gi,"");
				var namesList = varNames.split(",");
				$.each(namesList, function(ni,name) {
					var varName = $.trim(name.replace(/=.*$/ig,""));
					// check the variable is in the blacklist
					if(blacklist.indexOf(varName)>-1) {
						blacklistUsed.push(varName);
						highlightText(codeDiv,varName,"yellow");
					}
					// check camelCase of the non-symbolic variable name
					if(!codeText.match(/final/i)) {
						nonfinalDeclarations.push(varName);
						//if(varName.match(regex_camelcase)==null){
						//	nonCamelCaseUsed.push(varName);
						//}
					}
					// check symbolic constant format
					if(codeText.match(/final/i)) {
						finalDeclarations.push(varName);
						if (varName.match(regex_symbolic)==null) {
							badSymbolicUsed.push(varName);
							highlightText(codeDiv,varName,"yellow");
						}
					}
				}); // end of namesList
			}); // end of each dec
		});  // end of each decList
	}); // end of trCodeLines
	// show the result on summary UIPanel
	$(UIpanel).append("<h3 style='color:yellow'>Variables Declared</h3>");
	$(UIpanel).append("<p>[NONFINAL VARS]"+makeLabels(_.unique(nonfinalDeclarations)).join(" ")+"</p>");
	$(UIpanel).append("<p>[FINAL VARS] "+makeLabels(_.unique(finalDeclarations)).join(" ")+"</p>");
	$(UIpanel).append("<p>[WEIRD FINALS] "+makeLabels(_.unique(badSymbolicUsed)).join(" ")+"</p>");
	$(UIpanel).append("<p>[BLACKLISTED] "+makeLabels(_.unique(blacklistUsed)).join(" ")+"</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 2. Proper use of symbilic constants
	///////////////////////////////////////////////////////////////////////////////////////////////////
	var literalsUsed = [], conditionalsUsed=[];
	$.each(trCodeLines,function(tri,tr) {
		var codeText = $(tr).find("div.gwt-Label")[0].innerText;
		// actual test of the code string
		var regex_if_statement = /if(\s)*\([\s\S]+\)/;
		var regex_conditional_expr =/\([\s\S]+\)/;
		var regex_string_literal =/\"([a-zA-Z0-9]|\s)+\"/;
		var regex_int_literal =/==\s*[0-9]+/;
		if(codeText.match(regex_if_statement)) {
			var expr = codeText.match(regex_conditional_expr)[0];
			conditionalsUsed.push(expr);
			if(expr.match(regex_string_literal)) {
				console.log(codeText+", "+expr+", "+expr.match(regex_string_literal)[0]);
				literalsUsed.push(expr);
				highlightLine(tr,"Use symbolic contants in conditionals","orange");
			}
			if(expr.match(regex_int_literal)) {
				console.log(codeText+", "+expr+", "+expr.match(regex_int_literal)[0]);
				literalsUsed.push(expr);
				highlightLine(tr,"Use symbolic contants in conditionals","orange");
				//$(tr).css("background-color","orange");
			}
		}
	});
	// show the result on summary UIPanel
	$(UIpanel).append("<h3 style='color:orange'>Conditionals containing literals</h3>");
	$(UIpanel).append("<p>[ALL CONDITIONALS] "+ makeLabels(conditionalsUsed).join(" ")   +"</p>");
	$(UIpanel).append("<p>[LITERALS FOUND] "+ makeLabels(literalsUsed).join(" ")   +"</p>");
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 5. check line length > 80
	///////////////////////////////////////////////////////////////////////////////////////////////////
	var countOfTooLongLines = 0;
	$.each(trCodeLines,function(tri,tr) {
		var code = $(tr).find("div.gwt-Label").clone();
		var tip = code.children();   tip.remove();
		var codeText = code.text();
		codeText = codeText.replace(/\t/ig,"    ");
		if(codeText.length>80) {
			// count and modify too long lines of code
			countOfTooLongLines =countOfTooLongLines+1;
			//tooltip(tr,"Line Length > 80");
			highlightLine(tr,"Line length should be shorter than 80 characters.","lightgreen");
		}
	});
	// show the result on summary UIPanel
	$(UIpanel).append("<h3 style='color:lightgreen'>Line length longer than 80</h3>");
	$(UIpanel).append("<p> total "+countOfTooLongLines+" lines found</p>");
	// add function to open textarea and automatically put the same text in
	$(".tip").click(function() {
		eventFire($(this).parent()[0],'dblclick');
		var self =this;
		setTimeout(function() {
			$(self).parent().parent().find("input[type='checkbox']").prop("checked",false);
			$(self).parent().parent().find("textarea").val($(self).text());
			$(self).parent().parent().find("textarea").focus().select();
			$(self).parent().parent().find("textarea").focus().select();
			eventFire($(self).parent().parent().find("a:contains('Save')")[0],'click');
		},500);
	});
} // end of project 1

function cs433project(UIpanel) {
	// 1. modify the line below to specify single/multiple section titles to look up
	var sectionsStudentModified = ["src/cmsc433_p3/"];
	var trCodeLines = _.reduce(sectionsStudentModified, function(memo,sec){
		var tr_list = $("div.GMYHEHOCNK:contains('"+sec+"')").parent().find("tr");
		return _.union(memo,tr_list);
	},[]);
	paneToScroll = $(".GMYHEHOCJK");
	trCodeLines = trCodeLines[0];
	///////////////////////////////////////////////////////////////////////////////////////////////////
	// RUBRIC 0. FINDING  WORDS
	///////////////////////////////////////////////////////////////////////////////////////////////////
	$(UIpanel).append("<h3 style='color:plum'>FINDING WORDS</h3>");
	$(UIpanel).append("<p>any descriptive text here.</p>");
	$(UIpanel).append("<p>[WORDS FOUND] <br></p>");
	var wordsToFind = ["sleep(","wait(","notify(","synchronized(","ReentrantLock"];
	var wordsFound = [];
	// iterates each line of code below
	$.each(trCodeLines,function(tri,tr) {
		console.log(codeText);
		var codeDiv = $(tr).find("div.gwt-Label")[0];
		var codeText = $(codeDiv).text();
		//console.log(codeText);
		if(codeText.match(/\/\//i)) return;
		var wordsFoundInCodeText = _.filter(wordsToFind, function(w) { return codeText.indexOf(w)!=-1; });
		// if wordsFoundInCodeText=['sleep','wait'], it means the code line contains sleep and wait words.
		// let's do some actions (delete unwanted options)
		// option 1. adding comment button
		_.each(wordsFoundInCodeText, function(w) {
			//addButtonComment(tr,"button title",wordsFoundInCodeText[0]+" not allowed.","yellow");
			$(UIpanel).append(makeLableWithClickToScroll(w,tr));
		});
		// option 2. simply adding comment
		//addCommentOnly(tr,"comment message","green");
		// option 3. count or remember something to show in summary UI panel
		// for example, you can update a list of unique words found so far
		// wordsFound = _.unique(_.union(wordsFound, wordsFoundInCodeText));
	});  // end of code line iteration
	// it's time to show the summary in the UIPanel
	// $(UIpanel).append("<p>[WORDS FOUND] "+ makeLabels(wordsFound).join(" ")   +"</p>");
	// END OF RUBRIC 0.
}