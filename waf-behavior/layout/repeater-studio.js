(function() {
    "use strict";
    var Repeater = WAF.require('waf-behavior/layout/repeater');

    Repeater.containerChildrenAreSubWidgets();

    Repeater.doAfter('_init', function() {
        if(!this.repeatedWidget() && this.constructor.repeatedWidget()) {
            var Widget = this.constructor.repeatedWidget();
            this.repeatedWidget(new Widget());
        }
        if(!this.countWidgets()) {
            this.attachWidget(this.repeatedWidget());
        }
        for(var i = 0; i < this.constructor._studioRepeatedClones; i++) {
            var widget = this.repeatedWidget().clone();
            widget.addClass('waf-studio-donotsave');
            widget.node.id = widget.id = this.node.id + '-ghost-clone-' + i;
            widget.studioCanDrop = function() { return false; };
            widget._studioUnselectable = true;
            this.attachWidget(widget);
        }
    });

    Repeater._studioRepeatedClones = 0;
    Repeater.studioRepeatedClones = function(number) {
        this._studioRepeatedClones = number;
    }

    Repeater._containerDisableCustomNodes = true;
})();

