let unused_code_module = {};

(function (){
    class Options {
        /**
         * Build default options
         * @param {boolean} enabled whether the module is enabled.
         * @param {boolean} markAllUsages whether to mark every single type/method/variable usage in the code, regardless of detected errors.
         */
        constructor(enabled = false, markAllUsages = true) {
            this.enabled = enabled;
            this.markAllUsages = markAllUsages;
        }
    }

    this.getDefaultOptions = function () {
        return new Options();
    }


}).apply(unused_code_module);