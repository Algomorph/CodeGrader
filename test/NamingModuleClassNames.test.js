require('jest');

const JavaParser = require("../third_party/javaparser15_node");
const naming_module = require("../modules/naming_module")
const code_analysis = require("../code_analysis/code_component_search")
CodeFile = require("../code_analysis/code_file")
const multiline = require("multiline");

function generateTrCodeLines(fileCode){
    const lines = fileCode.split("/n");
    return lines.map(line => {
            const trLine = document.createElement("tr");
            const text = document.createTextNode(line);
            trLine.appendChild(text);
            return trLine;
        }
    );

}

test("NamingModuleClassNames", () => {
    const codeFileDictionary = new Map();

    const javaSourceFile1 = multiline(() => {/*
        public class PascalCaseName {
        }
        */
    });
    codeFileDictionary.set("file1", new CodeFile("file1", javaSourceFile1, generateTrCodeLines(javaSourceFile1), JavaParser.parse(javaSourceFile1), null));
    const javaSourceFile2 = multiline(() => {/*
        public class camelCaseName {
        }
        */
    });
    codeFileDictionary.set("file2", new CodeFile("file2", javaSourceFile2, generateTrCodeLines(javaSourceFile2), JavaParser.parse(javaSourceFile2), null));
    const javaSourceFile3 = multiline(() => {/*
        public class UPPER_SNAKE_CASE_NAME {
        }
        */
    });
    codeFileDictionary.set("file3", new CodeFile("file13", javaSourceFile3, generateTrCodeLines(javaSourceFile3), JavaParser.parse(javaSourceFile3), null));
    const globalTypeMap = new Map();
    for (const codeFile of codeFileDictionary.values()) {
        code_analysis.findComponentsInCodeFileAst(codeFile, globalTypeMap);
    }




})