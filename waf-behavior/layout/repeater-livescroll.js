WAF.define('waf-behavior/layout/repeater-livescroll', function() {
    "use strict";

    /**
     * @class Layout.Repeater
     * @augments Layout.Container
     */
    var Behavior = WAF.require('waf-core/behavior'),
        klass = Behavior.create(),
        proto = klass.prototype;

    klass.inherit('waf-behavior/layout/repeater');
    klass.inherit('waf-behavior/livescroll');

    klass.doAfterClassMethod('linkDatasourcePropertyToRepeater', function(property) {
        this.linkDatasourcePropertyToLiveScroll(property);
    });

    klass.repeaterReuseClonedWidgets();

    function accessor(that) {
        return that[that.constructor._liveScrollProperty];
    }

    proto.getScrolledNode = function() {
        throw 'Repeater-LiveScroll need a #getScrolledNode() method';
    };

    proto.repeaterAttachWidget = function(widget, position) {
        widget.top(position * this.getRowHeight());
        widget.removeClass('waf-state-selected');
        if(position === accessor(this)().getPosition()) {
            widget.addClass('waf-state-selected');
        }
        this.insertWidget(Math.max(0, position - this._currentStart), widget);
    };

    proto.widgetsToRemoveOnUpdate = function(start, end) {
        var slice = this.getItemsToRemoveOnUpdate(this.widgets(), start, end);
        return slice;
    };

    proto._getContainerNode = function() {
        return this.getScrolledNode(); // repeater specific
    };

    return klass;
});
