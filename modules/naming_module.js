var namingModule = {};

(function() {

const NameType = {
    METHOD: 'method',
    VARIABLE: 'variable',
    TYPE: 'type',
    CONSTANT: 'constant',
}


class CodeName{
	constructor(name, trCodeLine, type){
		this.name = name;
		this.trCodeLine = trCodeLine;
		this.type = type;
	}
}

function getTrCodeLineForName (name, nameType, codeFile, usedCodeLines){
	var associatedTrCodeLine = null;
	var nameRegex = new RegExp( "(?<!\\w)" + name + "(?!\\w)");

	codeFile.trCodeLines.forEach(
		(trCodeLine, lineIndex) => {
			if(associatedTrCodeLine == null){
				const trCodeText = getCodeFromTrCodeLine(trCodeLine);
				if(nameRegex.test(trCodeText)){
					const statements = trCodeText.split(/;|,/);
					var iStatement = 0;
					for(const statement of statements){
						if(associatedTrCodeLine == null && !(usedCodeLines.has(lineIndex) && usedCodeLines.get(lineIndex).has(iStatement))){
							const match = nameRegex.exec(statement);
							if(match){
								const nameIndex = match.index;
								if(nameIndex != -1){
									const stringBefore = statement.substring(0, nameIndex);

									if(stringBefore.includes("class") || stringBefore.includes("enum")){
										if(nameType == NameType.TYPE){
											associatedTrCodeLine = trCodeLine;
										}
									} else if (stringBefore.includes("final")) {
										const stringWithAndAfter = statement.substring(nameIndex);
										const regex = RegExp(name + "\\s\\(");
										if(regex.test(stringWithAndAfter)){
											if(nameType == NameType.METHOD){
												associatedTrCodeLine = trCodeLine;
											}
										} else {
											if(nameType == NameType.CONSTANT){
												associatedTrCodeLine = trCodeLine;
											} 	
										}
									} else {
										if(nameType == NameType.VARIABLE || nameType == NameType.METHOD){
											associatedTrCodeLine = trCodeLine;
										}
									}

									if (associatedTrCodeLine != null){
										if(usedCodeLines.has(lineIndex)){
											usedCodeLines.get(lineIndex).add(iStatement);
										} else {
											statementSet = new Set();
											statementSet.add(iStatement);
											usedCodeLines.set(lineIndex, statementSet);
										}
									}
								}
							}
						}
						iStatement++;
					}
				}
			}
		}
	);
	return associatedTrCodeLine;
}


function nameTypeToString(nameType){
	switch(nameType){
		case NameType.METHOD:
			return "Method";
		case NameType.VARIABLE:
			return "Variable";
		case NameType.CONSTANT:
			return "Constant";
		case NameType.TYPE:
			return "Type";
	}
}



function handleFieldOrVariableDeclaration(declaration, constantNames, methodAndVariableNames, codeFile, usedCodeLines){
	var is_constant = false;
	for(const modifier of declaration.modifiers){
		if(modifier.keyword == "final"){
			is_constant = true;
		}
	}
	for(const fragment of declaration.fragments){
		const name = fragment.name.identifier;
		if(is_constant){
			const trCodeLine = getTrCodeLineForName(name, NameType.CONSTANT, codeFile, usedCodeLines);
			constantNames.push(new CodeName(name, trCodeLine, NameType.CONSTANT));
		} else {
			const trCodeLine = getTrCodeLineForName(name, NameType.VARIABLE, codeFile, usedCodeLines);
			methodAndVariableNames.push(new CodeName(name, trCodeLine, NameType.VARIABLE));	
		}
	}
}

function uniqueNames(namesArray){
	var uniqueNamesMap = new Map();
	namesArray.forEach(
		(codeName) => {
			if (!uniqueNamesMap.has(codeName.name)){
				uniqueNamesMap.set(codeName.name, codeName);
			}
		}
	);
	return [ ...uniqueNamesMap.values() ];
}

function getTypeNames(type, codeFile, usedCodeLines){
	var methodAndVariableNames = [];
	var constantNames = [];
	var typeNames = [];

	const name = type.name.identifier;
	const trCodeLine = getTrCodeLineForName(name, NameType.TYPE, codeFile, usedCodeLines);
	
	typeNames.push(new CodeName(name, trCodeLine, NameType.TYPE));

	for (const declaration of type.bodyDeclarations){
		switch(declaration.node){
			case "FieldDeclaration":
				handleFieldOrVariableDeclaration(declaration, constantNames, methodAndVariableNames, codeFile, usedCodeLines);
				break;
			case "MethodDeclaration":
				if(!declaration.constructor){
					const name = declaration.name.identifier;
					const trCodeLine = getTrCodeLineForName(name, NameType.METHOD, codeFile, usedCodeLines);
					methodAndVariableNames.push(new CodeName(name, trCodeLine, NameType.METHOD));

					for(const parameter of declaration.parameters){
						const name = parameter.name.identifier;
						const trCodeLine = getTrCodeLineForName(name, NameType.VARIABLE, codeFile, usedCodeLines);
						methodAndVariableNames.push(new CodeName(name, trCodeLine, NameType.VARIABLE));
					}

					for(const statement of declaration.body.statements){
						if(statement.node == "VariableDeclarationStatement"){
							handleFieldOrVariableDeclaration(statement, constantNames, methodAndVariableNames, codeFile, usedCodeLines);
						}
					}
				}
				break;
			case "TypeDeclaration": // inner class
				const [innerTypeMethodsAndVariables, innerTypeConstants, innerTypeTypeNames] = getTypeNames(declaration, codeFile, usedCodeLines);
				methodAndVariableNames.push(...innerTypeMethodsAndVariables);
				constantNames.push(...innerTypeConstants);
				typeNames.push(...innerTypeTypeNames);
				break;
			default:
				break;
		}
	}
	return [methodAndVariableNames, constantNames, typeNames];
}

function processNameArray(UIpanel, codeNames, color){
	for(const codeName of codeNames){
		lineTop = codeName.trCodeLine.offsetTop;
		fileTop = codeName.trCodeLine.parentElement.parentElement.offsetTop;

		$(UIpanel).append(makeLableWithClickToScroll(codeName.name, codeName.trCodeLine, lineTop + fileTop ));

		addButtonComment(
			codeName.trCodeLine, nameTypeToString(codeName.type) + " Used: " + codeName.name, 
			"Non-descriptive naming : " + codeName.name +" is not descriptive of its purpose.",
			color
		);	
	}
}

this.initialize = function(UIpanel, fileDictionary, trCodeLines, allowedSpecialWords){

	$(UIpanel).append("<h3 style='color:orange'>Naming</h3>");
	//str = JSON.stringify(fileDictionary["Blackjack.java"].abstractSyntaxTree, null, 4);
	//console.log(str)
	var methodAndVariableNames = [];
	var constantNames = []
	var typeNames = [];

	for (const [filename, codeFile] of fileDictionary.entries()) {
		syntax_tree = codeFile.abstractSyntaxTree;
		//iterate over classes / enums / etc.
		for (const type of syntax_tree.types){
			var usedCodeLines = new Map();
			const [typeMethodsAndVariables, typeConstants, typeTypeNames] = getTypeNames(type, codeFile, usedCodeLines);

			methodAndVariableNames.push(...typeMethodsAndVariables);
			constantNames.push(...typeConstants);
			typeNames.push(...typeTypeNames);
		}
	}
	methodAndVariableNames = uniqueNames(methodAndVariableNames);
	constantNames = uniqueNames(constantNames);
	typeNames = uniqueNames(typeNames);

	color = "#4fa16b";
	$(UIpanel).append("<h4 style='color:" + color + ">Variables & Methods</h4>");
	processNameArray(UIpanel, methodAndVariableNames, color);
	color = "#4f72e3";
	$(UIpanel).append("<h4 style='color:" + color + "'>Constants</h4>");
	processNameArray(UIpanel, constantNames, color);
	color = "orange";
	$(UIpanel).append("<h4 style='color:" + color + "'>Classes & Enums</h4>");
	processNameArray(UIpanel, typeNames, color);
	
}

}).apply(namingModule);