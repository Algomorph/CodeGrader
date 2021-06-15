/*
* Copyright 2021 Gregory Kramida
* */
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
        /** @type {color} */
        defaultCodeTagColor
        /** @type {string} */
        defaultLabelStyleClass
        /** @type {string} */
        description
        /** @type {string} */
        short_description

        /**
         * Construct a default
         * @param {color} defaultCodeTagColor
         * @param {string} defaultLabelStyleClass
         * @param {string} name
         * @param {number} points
         * @param {boolean} isProblem
         * @param {string} description
         * @param {string} short_description
         */
        constructor(name, points, isProblem,
                    defaultCodeTagColor = null,
                    defaultLabelStyleClass = "",
                    description = "", short_description = "") {
            this.name = name;
            this.points = points;
            this.isProblem = isProblem;
            this.defaultCodeTagColor = defaultCodeTagColor;
            this.defaultLabelStyleClass = defaultLabelStyleClass;
            this.description = description;
            this.short_description = short_description;
        }

    } // class Category

    get category() {
        throw ("The category property getter for any subclass of " + CodeEntity.constructor.name +
            " that has rendering functionality should be overridden with a method that returns the instance of "
            + CodeEntity.Category.constructor.name + " subclass associated with that subclass.");
    }

    // TODO: UI rendering functions, figure out how to properly generate descriptions based on both
    //  CodeEntity and description info.


    get points() {
        return this.category.points;
    }

}
