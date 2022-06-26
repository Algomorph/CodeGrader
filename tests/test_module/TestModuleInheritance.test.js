require('jest')
const groundTruth = require('./TestModuleInheritance.ground_truth.json5');
const JavaParser = require("../../third_party/javaparser15_node");

const test_module = require("../../modules/test_module");
const code_analysis = require("../../code_analysis/code_component_search");
CodeFile = require("../../code_analysis/code_file");
const multiline = require("multiline");
const naming_module = require("../../modules/naming_module");
testing_utilities = require("../testing_utilities")

test("TestModule_Interfaces", () => {
    const codeFileDictionary = new Map();
    const javaSourceFile_ShapeInterface = multiline(() => {/*
        package geometry;
        public interface Shape {
            float getArea();
        }
        */
    });
    codeFileDictionary.set("geometry/Shape.java", new CodeFile("Shape.java", javaSourceFile_ShapeInterface,
        testing_utilities.generateTrCodeLines(javaSourceFile_ShapeInterface),
        JavaParser.parse(javaSourceFile_ShapeInterface), null));
    const javaSourceFile_RectangleClass = multiline(() => {/*
        package geometry;
        public class Rectangle implements Shape {
            public float width;
            public float height;
            public Rectangle(float width, float height){
                this.width = width;
                this.height = height;
            }
            public float getArea() {
                return this.width * this.height;
            }
        }
        */
    });
    codeFileDictionary.set("geometry/Rectangle.java", new CodeFile("Rectangle.java", javaSourceFile_RectangleClass,
        testing_utilities.generateTrCodeLines(javaSourceFile_RectangleClass),
        JavaParser.parse(javaSourceFile_RectangleClass), null));
    const javaSourceFile_SquareClass = multiline(() => {/*
        package geometry;
        public class Square extends Rectangle {
            public Square(float sideLength){
                super(sideLength, sideLength);
            }
            public float getSideLength(){
                return this.width;
            }
        }
        */
    });


    const javaSourceFile_JUnitTest = multiline(() => {/*
        package tests;
        import static org.junit.Assert.*;
        import geometry.*;

        public class Tests{
            @Test
            public void testRectangleGetArea(){
                Shape rect = new Rectangle(5.0, 10.0);
                assertEquals(rect.getArea(), 50.0);
            }

            @Test
            public void testSquareGetArea(){
                Shape square = new Square(5.0);
                assertEquals(square.getArea(), 25.0);
            }
        }
        */
    });

    codeFileDictionary.set("tests/Tests.java", new CodeFile("Tests.java", javaSourceFile_JUnitTest,
        testing_utilities.generateTrCodeLines(javaSourceFile_JUnitTest),
        JavaParser.parse(javaSourceFile_JUnitTest), null));

    const globalTypeMap = new Map();
    for (const codeFile of codeFileDictionary.values()) {
        code_analysis.findComponentsInCodeFileAst(codeFile, globalTypeMap);
    }

    const module_options = test_module.getDefaultOptions();
    module_options.enabled = true;
    module_options.methodsExpectedToBeTested = ["$Rectangle$.getArea", "$Square$.getArea", "$Square$.getSideLength"];

    const global_options = {
        moduleOptions: {
            test_module : module_options
        }
    };
    test_module.initialize(global_options);
    test_module.processCode(codeFileDictionary);
    const codeEntitiesPlain = test_module.getCodeEntities().map( entity => entity.toPlainObject());
    const testSpecificGroundTruth = groundTruth.TestModule_Interfaces;
    expect(codeEntitiesPlain).toEqual(testSpecificGroundTruth);

});