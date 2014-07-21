var LINE_ID_NAME = "terminal-line-",
    LINE_CLASSNAME = "terminalLine";

/**
 * Represents output and everything related to it.
 * todo: reorganise "animations" usage
 * todo: remove "highlight output" option
 */
var Output = function() {

    /**
     * @param {number} INDEX
     * @constructor
     */
    var TerminalLine = function(INDEX) {

        var lineElement = document.createElement("div"),
            __this = this,
            linePlainText = "";

        /**
         * Initialisation.
         */
        (function(){

            lineElement.id = LINE_ID_NAME + INDEX;
            lineElement.className = LINE_CLASSNAME;

            dom.objects.output.appendChild(lineElement);

        }());

        /**
         * Renders linePlainText to html.
         */
        this.render = function() {

            lineElement.innerHTML = linePlainText.replace(/&/g, "&amp;").replace(/</g, "&lt;");

        };

        /**
         * Writes plain text to line starting from position. If line overflows, overflowing text won't
         * be appended to line and will be returned.
         *
         * @param {string} text
         * @param {number} [position]
         * @returns {string}
         */
        this.writePlain = function(text, position) {

            var writePart = text.substr(0, _this.width - linePlainText.length);

            console.log(writePart);

            if (!position) position = linePlainText.length;

            if (position > linePlainText.length) {
                for (var i = linePlainText.length; i <= position; i++) {
                    linePlainText += " ";
                }
            }

            linePlainText = linePlainText.splice(position, writePart.length, writePart);
            __this.render();

            return text.substr(writePart.length, text.length);

        };

    };

    /**
     * Output stack. A string including everything related to output and used to update terminal
     * output once per ~25ms
     *
     * @type {string}
     */
    var stack = "",

        /**
         * @type {HTMLElement|null}
         * @deprecated - CWTv2: Terminal has only one output target.
         */
        target = null,

        /**
         * @type {boolean}
         * @deprecated - Rebase marking mechanism.
         */
        mark = false,

        _this = this,

        /**
         * Current line number beginning from 0. Used in output control.
         *
         * @type {number}
         */
        CURRENT_LINE = 0,
        MAX_LINE = 0, // maximal created line

        /**
         * Line elements.
         *
         * @type {TerminalLine[]}
         */
        lines = [new TerminalLine(0)];

    /**
     * Caret position.
     *
     * @type {{x: number, y: number}}
     */
    this.caret = {
        x: 1,
        y: 1
    };

    this.width = 0;
    this.height = 0;

    /**
     * Outputs plain text to terminal.
     *
     * @param text
     */
    var outPlainText = function(text) {

        do {
            text = getCurrentLine().writePlain(text);
            if (text) {
                _this._controls.appendLine();
                CURRENT_LINE++;
            }
        } while (text);

    };

    /**
     * @returns {TerminalLine|undefined}
     */
    var getCurrentLine = function() {
        return lines[CURRENT_LINE];
    };

    /**
     * @private
     */
    this._controls = {

        /**
         * Inserts HTML element for new line after maxLine.
         */
        appendLine: function() {
            lines.push(new TerminalLine(++MAX_LINE));
        }

    };

    /**
     * Output and parse all control symbols.
     * @private
     */
    this._output = function(text) {

        var line = getCurrentLine(),
            textOrigin = text,
            lastIndex = 0;

        text.replace(/[\r\n]|\x1b[^@-~][@-~]/g, function(part, index, string) {
            var beforePart = string.substring(lastIndex, index);
            if (!lastIndex) textOrigin = string;
            lastIndex = index + part.length;
            if (beforePart) outPlainText(beforePart);
            return "";
        });

        var textLeft = textOrigin.substring(lastIndex, textOrigin.length);

        if (textLeft) outPlainText(textLeft);

        line.innerHTML += text;

    };

    var STACK_REFRESH_INTERVAL = 25;

    /**
     * Writes text to output as standalone message. If oldOutput defined, write will be forced to old output object.
     * Optional processEscape parameter will turn on escape characters processing for current output. This option
     * will be automatically turned off in case of any call of forceWrite function (turning once for current stack).
     * Also escape characters processing are unavailable for forceWrite call. To process escape-characters, set
     * html-container as a field of output, then perform forceWrite once with empty body, and then use write with
     * processEscape flag.
     *
     * @param text {string}
     * @param {boolean} [processEscape]
     */
    this.write = function(text, processEscape) {

        /*escapeCharactersProcessing = !!(processEscape);
         if (target == dom.objects.output) {
         this.forceWrite(text);
         } else {
         stack += text.replace('[0J','');
         }*/
        stack += text;

    };

    /**
     * Sets output target to object.
     *
     * @param object
     * @returns {boolean}
     * @deprecated - CWTv2: Terminal has only one output target.
     */
    this.setTarget = function(object) {
        target = object;
        return true;
    };

    /**
     * Clears output field.
     * @deprecated - CWTv2: use escape sequence instead.
     */
    this.clear = function() {

        // @todo: fix this potentially wrong code
        dom.clearOutput();
        stack = "";

        var t = document.createElement("DIV"); // @wrong
        t.className = "terminal-message-body terminal-output-body"; // @absolute
        dom.objects.output.appendChild(t); // @fix
        target = t; // @todo: fix this

    };

    /**
     * Marks down all marked log headers.
     */
    this.markDownAll = function() {
        if (mark == false) dom.performForClassObjects("waiting", function(object){
            object.className = object.className.replace(/waiting/g,"complete")
        });
    };

    /**
     * Writing output to object immediately.
     *
     * @param text
     * @param [marking] - Shows if it needed to mark log as "executing". Mark will still
     *                    continue until another force write call.
     * @return {object} - Object to output to.
     */
    this.forceWrite = function(text, marking) {

        /*if (typeof marking == "undefined") marking = false;
         escapeCharactersProcessing = false;

         var div = document.createElement("div");
         div.id = "terminal-log-"+lastID++;
         div.className = "terminal-outputContainer animated01";
         if (marking) {
         div.style.opacity = "0";
         }

         var head = document.createElement("div");
         head.className = "terminal-message-head"+((marking)?" waiting":"");
         head.innerHTML = terminal.namespace.getMask();

         var body = document.createElement("div");
         body.className = "terminal-message-body terminal-output-body";
         body.innerHTML = text;

         div.appendChild(head);
         div.appendChild(body);
         target.appendChild(div);
         setTimeout(function(){div.style.opacity = "1";},1);

         dom.scrollBottom();

         return body;*/
        _this.freeStack();

    };

    this.freeStack = function(highlight) {

        /*if (!stack) return;

         if (settings.get_animations()) {
         var el = document.createElement("span");
         el.className = "animated01";
         el.innerHTML = (highlight)?parser.highlightHTML(stack):stack;
         el.style.opacity = "0";
         setTimeout(function(){ el.style.opacity = "1" }, 1);
         target.appendChild(el);
         } else {
         target.innerHTML += stack;
         }*/

        if (!stack) return;
        _this._output(stack);
        dom.scrollBottom();
        stack = "";

    };

    /**
     * Window size change handler. Recalculates terminal size.
     */
    this.sizeChanged = function() {

        var tel = document.createElement("span");

        dom.objects.output.appendChild(tel);
        tel.innerHTML = "X";

        var w1 = tel.offsetWidth,
            h1 = tel.offsetHeight;

        _this.width = Math.floor(dom.objects.output.offsetWidth / w1);
        _this.height = Math.floor(dom.objects.output.offsetHeight / h1);

        dom.objects.output.removeChild(tel);

    };

    setInterval(this.freeStack, STACK_REFRESH_INTERVAL); // refreshing output

};