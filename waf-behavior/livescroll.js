WAF.define('waf-behavior/livescroll', function() {
    "use strict";

    /**
     * @class LiveScroll
     */
    var Behavior = WAF.require('waf-core/behavior'),
        klass = Behavior.create(),
        proto = klass.prototype;

    /**
     * Declare the datasource property to use
     * @param {string} property - The property name to use
     * @memberof Livescroll
     * @method linkDatasourcePropertyToLiveScroll 
     */
    klass.linkDatasourcePropertyToLiveScroll = function(property) {
        this._liveScrollProperty = property;
    };

    function accessor(that) {
        return that[that.constructor._liveScrollProperty];
    }

    /**
     * return the scroller DOM node
     * can be overrided
     * @returns {HTMLElement} Scroller DOM node
     * @memberof LiveScroll
     * @instance
     * @method getScrollerNode
     */
    proto.getScrollerNode = function() {
        return this.node;
    };

    /**
     * return the scrolled DOM node
     * must be overrided
     * @returns {HTMLElement} Scrolled DOM node
     * @memberof LiveScroll
     * @instance
     * @method getScrolledNode
     */
    proto.getScrolledNode = function() {
        // FIXME: return by default the first node in the scroller ?
        throw "LiveScroll: You must implement a getScrolledNode() function.";
    };

    /**
     * return the height of a row
     * must be overrided
     * @returns {float} Height of a row
     * @memberof LiveScroll
     * @instance
     * @method getRowHeight
     */
    proto.getRowHeight = function() {
        throw "LiveScroll: You must implement a getRowHeight() function that return the height of a row in pixel.";
    };

    /**
     * return the number of row left to display before fetching a new page
     * can be overrided
     * @returns {integer} number of rows
     * @memberof LiveScroll
     * @instance
     * @method getThreshold
     */
    proto.getThreshold = function() {
        return Math.round(0.2 * accessor(this).pageSize());
    };

    var scrollHandler = function(event) {
        var that = event.data.that;
        var start = Math.floor(that.getScrollerNode().scrollTop / that.getRowHeight());
        var end = start + Math.ceil(that.getScrollerNode().offsetHeight / that.getRowHeight());
        var newStart = that._currentStart;
        if(that._currentStart > 0 && that._currentStart + that.getThreshold() > start) {
            // need to fecth before
            newStart = Math.max(that._currentStart - accessor(that).pageSize(), 0);
            if(start < newStart + that.getThreshold()) {
                newStart = Math.max(start - that.getThreshold(), 0);
            }
        }

        if(that._currentStart + that._currentPageSize < accessor(that)().length && that._currentStart + that._currentPageSize - that.getThreshold() < end ) {
            // need to fecth after
            newStart = that._currentStart + that._currentPageSize;
            if(start > newStart + accessor(that).pageSize() - that.getThreshold()) {
                newStart = Math.max(start - that.getThreshold(), 0);
            }
        }

        if(newStart !== that._currentStart && !event.data.fetching) {
            event.data.fetching = true;
            accessor(that).fetch({
                start: newStart
            });
        }
    };

    proto._initBehavior = function() {
        if(!accessor(this)) {
            throw "LiveScroll: linkDatasourcePropertyToLiveScroll should point to a datasource property";
        }
        if(accessor(this).pageSize() === Infinity) {
            throw 'LiveScroll: You must define a pageSize for the property "' + this.constructor._liveScrollProperty +'"';
        }
    };

    proto._init = function() {
        var data = { that: this };
        $(this.getScrollerNode()).scroll(data, scrollHandler);

        accessor(this).subscribe('collectionChange', function() {
            this.getScrolledNode().style.height = this.getRowHeight() * accessor(this)().length + 'px';
        }, this);
        accessor(this).onChange(function() {
            this.getScrolledNode().style.height = this.getRowHeight() * accessor(this)().length + 'px';
        });
        if(accessor(this)()) {
            this.getScrolledNode().style.height = this.getRowHeight() * accessor(this)().length + 'px';
        }
        accessor(this).onPageChange(function() {
            data.fetching = false;
        });

        data.fetching = true;
        this._currentStart = Math.max(0, Math.floor(this.node.scrollTop / this.getRowHeight()) - this.getThreshold());
        this._currentPageSize = accessor(this).pageSize();
        accessor(this).fetch({
            start: this._currentStart,
            force: true
        });
    };

    /**
     * return the list of items currently displayed that should be removed
     * @param {array} items - a list of the items currently displayed
     * @param {integer} start - the start position of the new page to display
     * @param {integer} end - the position of the item that don't belong to the new page to display
     * @return {array} a list of items to remove
     * @memberof Livescroll
     * @instance
     * @method getItemsToRemoveOnUpdate
     */
    proto.getItemsToRemoveOnUpdate = function(items, start, end) {
        this._currentStart = this._currentStart || 0;
        this._currentPageSize = this._currentPageSize || accessor(this).pageSize();

        var toRemove = Math.min(end - start, (this._currentPageSize || accessor(this).pageSize()) - accessor(this).pageSize());
        //non contiguous
        if(end < this._currentStart || this._currentStart + this._currentPageSize < start) {
            this._currentStart = start;
            this._currentPageSize = end - start;
            return items;
        }
        // after, contiguous
        if(this._currentStart + this._currentPageSize >= start && this._currentStart < start) {
            // we remove end - start elements at the begining
            this._currentStart = this._currentStart + toRemove;
            this._currentPageSize = end - this._currentStart;
            return items.slice(0, toRemove);
        }
        // before, contiguous
        if(end >= this._currentStart && end < this._currentStart + this._currentPageSize ) {
            // we remove end - start elements at the end
            this._currentStart = start;
            this._currentPageSize = this._currentPageSize - toRemove + end - start;
            if(toRemove) {
                return items.slice(-toRemove);
            }
        }
        return [];
    };

    proto._destroyBehavior = function() {
        $(this.getScrollerNode()).off('scroll', scrollHandler);
    };

    return klass;
});
