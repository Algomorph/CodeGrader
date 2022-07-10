//  Created by Gregory Kramida (https://github.com/Algomorph) on 6/27/22.
//  Copyright (c) 2022 Gregory Kramida
require('jest');
const multiline = require("multiline");
const json5Writer = require("json5-writer")

test("Json5WriterParse", () => {
    const json5string = multiline(() => {/*
    {
        course: 'CMSC132',
        filesToCheck: [],
        firstStudent: 'a',
        lastStudent: '{',
        lateScoreAdjustment: -12,
        moduleOptions: {
            brace_style_module: {
                enabled: false,
                markAllBraces: false,
            },
            grade_server_module: {
                customRubricCategories: [],
                enabled: true,
                gradeServerAssignmentName: '',
                graderName: '',
                maximumCodeStyleScore: 10,
                maximumStudentTestsScore: 0,
                minimumScoreAdjustment: 0,
            },
            indentation_module: {
                enabled: false,
                ignoreMixedTabsAndSpaces: false,
            },
            keyword_and_pattern_module: {
                enabled: false,
                keywords: [],
                patterns: [],
            },
            line_length_module: {
                enabled: false,
                lineLengthLimit: 80,
                tabCharacterWidth: 4,
            },
            loop_module: {
                enabled: false,
                methodList: [],
                methodListUsage: 'disallowed',
                showAll: true,
            },
            method_call_module: {
                enabled: false,
                ignoredMethods: {
                    global: [],
                },
                ignoredTypes: [],
                showUniqueOnly: false,
            },
            naming_module: {
                allowedSpecialWords: [
                    'min',
                    'max',
                ],
                checkConstants: true,
                checkMethods: true,
                checkTypes: true,
                checkVariablesAndFields: true,
                enabled: false,
                ignoredNames: {
                    global: [],
                },
                numbersAllowedInNames: true,
                showUniqueOnly: true,
                sortAlphabetically: false,
                treatInstanceFinalFieldsAsConstants: false,
            },
            spacing_module: {
                checkSpacingAroundAssignmentOperators: true,
                checkSpacingAroundBinaryOperators: true,
                enabled: false,
            },
            test_module: {
                enabled: false,
                methodsExpectedToBeTested: [],
            },
            unused_code_module: {
                checkMethods: false,
                checkTypes: false,
                checkVariables: true,
                enabled: false,
                ignoredNames: {
                    global: [],
                },
                markAllUsages: false,
            },
        },
        semesterSeason: 'summer',
        submitServerAssignmentName: '',
        usageStatisticsOptions: {
            anonymizeUser: true,
            enabled: true,
        },
        year: '2022',
    }
    */
    });
    json5Writer.load(json5string);
});