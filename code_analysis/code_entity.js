/*
* Copyright 2021 Gregory Kramida
* */
(function () {
    class CodeEntity {
        /**
         * Make a CodeEntity.
         * @param {{node: string, location : {start: {offset, line, column}, end : {offset, line, column}}}} astNode
         * @param {HTMLTableRowElement} trCodeLine
         */
        constructor(astNode, trCodeLine) {
            this.astNode = astNode;
            this.trCodeLine = trCodeLine;
        }

        /**
         * Describes the behavior of this particular CodeEntity (or subclass)
         * when it comes to rendering and point deductions
         */
        static Category = class {
            /** @type {string} */
            name
            /** @type {number} */
            points
            /** @type {boolean} */
            isProblem

            /**
             * Construct a default
             * @param {string} name
             * @param {number} points
             * @param {boolean} isProblem
             */
            constructor(name, points, isProblem) {
                this.name = name;
                this.points = points;
                this.isProblem = isProblem;
            }



        } // class Category

        get category() {
            throw ("The category property getter for any subclass of " + CodeEntity.constructor.name +
                " that has rendering functionality should be overridden with a method that returns the instance of "
                + CodeEntity.Category.constructor.name + " subclass associated with that subclass.")
        }

        // TODO: UI rendering functions, figure out how to properly generate descriptions based on both
        //  CodeEntity and description info.


        get points(){
            return this.category.points;
        }

    }


    this.CodeEntity = CodeEntity
}).apply(code_analysis);