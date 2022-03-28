/*
* Copyright 2021 Gregory Kramida
* */
class CodeEntity {

    #trCodeLine = null

    /** @param {HTMLTableRowElement} trCodeLine - the table row element in the html where the tag for this issue will be inserted */
    constructor(trCodeLine) {
        this.#trCodeLine = trCodeLine;
    }

    /** @return {number} */
    get points(){
        return 0;
    }

    /** @return {boolean} */
    get isIssue(){
        return false;
    }

    /**
     * @return {string}
     * @protected
     */
    get _labelStyleClass(){
        return "";
    }

    /**
     * @return {string}
     * @protected
     */
    get _labelName(){
        throw ("labelName property getter for any subclass of " + CodeEntity.constructor.name + " should be overridden.");
    }

    /**
     * @return {string}
     * @protected
     */
    get _toolTip(){
        return "No problems were automatically detected.";
    }

    /**
     * @return {string}
     * @protected
     */
    get _tagName(){
        throw ("tagName property getter for any subclass of " + CodeEntity.constructor.name + " should be overridden.");
    }

    /**
     * @return {string}
     * @protected
     */
    get _defaultMessageText(){
        return "";
    }

    /** @return {string} hex color for the tag
     * @protected */
    get _tagColor(){
        return "";
    }


    /**
     * Add a button-like label to panel with the name of the code entity and its description in the tooltip
     * @param {HTMLDivElement} panel where to add the label HTML element
     */
    addAsLabelToPanel(panel){
        $(panel).append(makeLabelWithClickToScroll(this._labelName, this.#trCodeLine, this._labelStyleClass, this._toolTip));
    }

    addAsCodeTagWithDefaultComment(){
        addCodeTagWithComment(
            this.#trCodeLine,
            this._tagName,
            this._defaultMessageText,
            this._tagColor
        );
    }

}

// allow usage in node.js modules
try {
    if (module !== undefined) {
        module.exports = CodeEntity
    }
} catch (error) {
    // keep silent
}