WAF.define('waf-behavior/focus', function() {
    "use strict";
    var Behavior = WAF.require('waf-core/behavior'),
        Event = WAF.require('waf-core/event'),
        WakError = WAF.require('waf-core/error');

    /**
     * @class Focus
     * @augments Behavior.BaseBehavior
     */
    var klass = Behavior.create('Focus');
    var proto = klass.prototype;
    
    /**
     * Called to initialize behaviors
     * @private
     * @memberof Focus
     * @instance
     * @method initBehavior
     */
    proto.initBehavior = function() {
        this._focus = false;
        $(this.node).hover(
            this.addClass.bind(this, 'waf-state-hover'),
            this.removeClass.bind(this, 'waf-state-hover')
        );
    
        //$(this.focus).focus(this.focus.bind(this));
        //$(this.blur).focus(this.blur.bind(this));
    };
    
    /* TODO
     * Set the focus on the widget
     * @memberof Bindable
     * @instance
    proto.focus = function() {
        this.addClass('waf-state-focus');
        this._focus = true;
    };
     */
    
    /* TODO
     * Remove the focus on the widget
     * @memberof Bindable
     * @instance
    proto.blur = function() {
        this.removeClass('waf-state-focus');
        this._focus = false;
    };
     */
    
    /* TODO
     * Tell if the widget have the focus
     * @returns {boolean}
     * @memberof Bindable
     * @instance
    proto.focused = function() {
        return this._focus;
    };
     */

    /* TODO
    proto.focusNext = function() {
    };
    */
    /* TODO
    proto.focusPrevious = function() {
    };
    */
    
    /**
     * @class Event.Focus
     * @augments Event.All
     */
    Event.create('Focus');
    /**
     * @class Event.Blur
     * @augments Event.All
     */
    Event.create('Blur');
    
    klass.inherit(WAF.require('waf-behavior/domhelpers'));
    klass.autoFireDomEvent('focus', Event.Focus);
    klass.autoFireDomEvent('blur', Event.Blur);
    
    // TODO: Global focus manager ???


    return klass;
});
