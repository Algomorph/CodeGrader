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
        #name
        /** @type {number} */
        #points
        /** @type {boolean} */
        #isProblem
        /** @type {color | null} */
        #defaultCodeTagColor
        /** @type {string} */
        #defaultLabelStyleClass
        /** @type {string} */
        #defaultDescription
        /** @type {string} */
        #shortDescription

        /**
         * Construct a default
         * @param {color | null} defaultCodeTagColor
         * @param {string} defaultLabelStyleClass
         * @param {string} name
         * @param {number} points
         * @param {boolean} isProblem
         * @param {string} defaultDescription - stuff that's gonna appear in the message to the student
         * @param {string} shortDescription -
         */
        constructor(name, points, isProblem,
                    defaultCodeTagColor = null,
                    defaultLabelStyleClass = "",
                    defaultDescription = "", shortDescription = "") {
            this.#name = name;
            this.#points = points;
            this.#isProblem = isProblem;
            this.#defaultCodeTagColor = defaultCodeTagColor;
            this.#defaultLabelStyleClass = defaultLabelStyleClass;
            this.#defaultDescription = defaultDescription;
            this.#shortDescription = shortDescription;
        }

        get name(){
            return this.#name;
        }

        get points(){
            return this.#points;
        }

        get isProblem(){
            return this.#isProblem;
        }

        get defaultCodeTagColor(){
            return this.#defaultCodeTagColor;
        }

        get defaultLabelStyleClass(){
            return this.#defaultLabelStyleClass;
        }

        get defaultDescription(){
            return this.#defaultDescription;
        }

        get shortDescription(){
            return this.#shortDescription;
        }

    } // class Category

    static NO_DETECTED_PROBLEMS = new CodeEntity.Category("default category", 0, false, null, "", "",
    "No problems were automatically detected.")

    /**
     * @return {CodeEntity.Category}
     */
    get category() {
        return CodeEntity.NO_DETECTED_PROBLEMS;
    }

    get labelName(){
        throw ("labelName property getter for any subclass of " + CodeEntity.constructor.name + " should be overridden.");
    }

    get tagName(){
        throw ("tagName property getter for any subclass of " + CodeEntity.constructor.name + " should be overridden.");
    }

    get points() {
        return this.category.points;
    }

    get defaultMessageText(){
        if (this.category === CodeEntity.NO_DETECTED_PROBLEMS){
            return ""; // There is no default message -- leave the message up to the instructor to manually populate
        }
        return this.category.description;
    }

    get toolTip(){
        return this.category.description;
    }

    /** @return {color} */
    get tagColor(){
        return this.category.defaultCodeTagColor;
    }


    /**
     * Add a button-like label to panel with the name of the code entity and its description in the tooltip
     * @param {HTMLDivElement} panel where to add the label HTML element
     */
    addAsLabelToPanel(panel){
        $(panel).append(makeLabelWithClickToScroll(this.labelName, this.trCodeLine, this.category.defaultLabelStyleClass,
            this.toolTip));
    }

    addAsCodeTagWithDefaultComment(){
        addCodeTagWithComment(
            this.trCodeLine,
            this.tagName,
            this.defaultMessageText
        );
    }

}
