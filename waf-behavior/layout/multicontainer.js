WAF.define('waf-behavior/layout/multicontainer', function() {
    "use strict";
    var Class = WAF.require('waf-core/class'),
        Behavior = WAF.require('waf-core/behavior'),
        WakError = WAF.require('waf-core/error'),
        Widget = WAF.require('waf-core/widget');

    /**
     * @class Layout.MultiContainer
     * @augments Layout.Container
     */
    var klass = Behavior.create();
    var proto = klass.prototype;
    klass.inherit(WAF.require('waf-behavior/layout/container'));
    klass.restrictWidget(WAF.require('waf-behavior/layout/container'));

    // Instance methods
    /**
     * Return or change the current container index
     * @param {integer} [index] - If given change the current container
     * @return {integer} The current container index
     * @memberof Layout.MultiContainer
     * @instance
     * @method currentContainerIndex
     */
    proto.currentContainerIndex = function(index) {
        if(typeof index === 'number') {
            if(index < 0 || index >= this._children.length) {
                throw new WakError.Container("Container not found");
            }
            this.invoke('removeClass', 'waf-state-active');
            this._currentContainer = index;
            this._children[this._currentContainer].addClass('waf-state-active');
            this.fire('select', { index: index, widget: this._children[this._currentContainer] });
        }
        return this._currentContainer;
    };

    /**
     * Return the current container 
     * @return {Container} The current container
     * @memberof Layout.MultiContainer
     * @instance
     * @method currentContainer
     */
    proto.currentContainer = function() {
        if(typeof this._currentContainer === 'undefined') {
            throw new WakError.Container("Container not found");
        }
        return this.container(this._currentContainer);
    };

    /**
     * Set the current container as the last inserted or appended container
     * @memberof Layout.MultiContainer
     * @instance
     * @method setLastContainerAsCurrent
     */
    proto.setLastContainerAsCurrent = function() {
        this.currentContainerIndex(this._lastWidgetIndex);
    };

    /**
     * Add a new container
     * @param {object|Container} options - Options to create the container or a container
     * @param {Container} [options.container] - The container to insert
     * @param {Container} [options.containerClass] - The container class to use to create the container
     * @returns {integer} container index
     * @memberof Layout.MultiContainer
     * @instance
     * @method addContainer
     */
    proto.addContainer = function(options) {
        return this.insertContainer(this.countContainers(), options);
    };

    /**
     * Remove container at index 
     * @param {integer} index
     * @memberof Layout.MultiContainer
     * @instance
     * @method removeContainer
     */
    proto.removeContainer = function(index) {
        this.detachWidget(index);
        if(index === this._currentContainer) {
            this.currentContainerIndex(index >= this._children.length ? index - 1 : index);
        } else if(this._currentContainer > index) {
            this._currentContainer--;
        }
        if(this._currentContainer < 0) {
            this._currentContainer = undefined;
        }
    };

    /**
     * Insert container at index
     * @param {integer} index
     * @param {object|Container} [options] - Options to create the container or a container
     * @param {Container} [options.container] - The container to insert
     * @param {Container} [options.containerClass] - The container class to use to create the container
     * @returns {integer} the container index
     * @memberof Layout.MultiContainer
     * @instance
     * @method insertContainer
     */
    proto.insertContainer = function(index, options) {
        var p;
        options = options || {};
        if(Class.instanceOf(options, this._restrict)) {
            p = options;
        } else if(options.container) {
            p = options.container;
        } else {
            var klass = options.containerClass || this._defaultContainerClass;
            if(typeof klass !== 'function') {
                throw "Container class is not a constructor";
            }
            p = new klass(options);
        }
        if(!Class.instanceOf(p, 'waf-behavior/layout/container')) {
            throw "Widget is not a container";
        }
        index = this.insertWidget(index, p);
        if(index <= this._currentContainer) {
            this._currentContainer++;
        }
        if(Array.isArray(options.content)) {
            options.content.forEach(function(e) {
                p.attachWidget(e);
            });
        }
        return index;
    };

    /**
     * Move a container
     * @param {integer} from
     * @param {integer} to
     * @memberof Layout.Container
     * @instance
     * @method moveContainer
     */
    proto.moveContainer = function(from, to) {
        var current;
        try {
            current = this.currentContainer();
        } catch(e) {
        }
        this.moveWidget(from, to);
        if(current) {
            this.currentContainerIndex(this.indexOfWidget(current));
        }
    };

    /**
     * Get or set the container at index
     * @param {integer} index
     * @param {Container} [container] - If given, replace the container at index
     * @returns {Container} 
     * @memberof Layout.MultiContainer
     * @instance
     */
    proto.container           = proto.widget;
    /**
     * Return an array of all the containers
     * @returns {Container[]}
     * @memberof Layout.MultiContainer
     * @instance
     */
    proto.containers          = proto.widgets;
    /**
     * return the numbers of containers
     * @returns {integer}
     * @memberof Layout.MultiContainer
     * @instance
     */
    proto.countContainers     = proto.countWidgets;
    /**
     * Remove all the containers
     * @memberof Layout.MultiContainer
     * @instance
     */
    proto.removeAllContainers = proto.detachAllWidgets;
    /**
     * Remove and destroy all the containers
     * @memberof Layout.MultiContainer
     * @instance
     */
    proto.destroyAllContainers = proto.detachAndDestroyAllWidgets;
    /**
     * Return the last inserted or appended containers (not the container at the end of the conatiner)
     * @returns {Container} 
     * @memberof Layout.MultiContainer
     * @instance
     */
    proto.lastContainer       = proto.lastWidget;

    /**
     * Called to initialize behaviors properties
     * @private
     * @memberof Layout.MultiContainer
     * @instance
     * @method _initProperties
     */
    proto._initProperties = function() {
        this._defaultContainerClass = this.constructor._defaultContainerClass || Widget.Container;
    };

    /**
     * Return or set the default container class to create new containers
     * By default its a Widget.Container
     * @param {ContainerClass} [containerClass] - If given set the container class
     * @memberof Layout.MultiContainer
     * @instance
     * @method defaultContainerClass
     */
    proto.defaultContainerClass = function(containerClass) {
        if(arguments.length) {
            this._defaultContainerClass = containerClass || this.constructor._defaultContainerClass || Widget.Container;
        }
        return this._defaultContainerClass;
    };

    // Class methods
    /**
     * Return or set the default container class to create new containers
     * By default its a Widget.Container
     * @param {ContainerClass} [containerClass] - If given set the container class
     * @memberof Layout.MultiContainer
     * @method defaultContainer
     */
    klass.defaultContainer = function(widget) {
        if(arguments.length) {
            this._defaultContainerClass = widget || Widget.Container;
        }
        return this._defaultContainerClass;
    };


    return klass;
});
