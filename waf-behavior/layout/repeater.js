WAF.define('waf-behavior/layout/repeater', function() {
    "use strict";

    /**
     * @class Layout.Repeater
     * @augments Layout.Container
     */
    var Behavior = WAF.require('waf-core/behavior'),
        Widget = WAF.require('waf-core/widget'),
        klass = Behavior.create(),
        proto = klass.prototype;

    klass.inherit('waf-behavior/layout/container');

    /**
     * Declare the datasource property to use
     * @param {string} property - The property name to use
     * @memberof Layout.Repeater
     * @method linkDatasourcePropertyToRepeater 
     */
    klass.linkDatasourcePropertyToRepeater = function(property) {
        this._repeatedProperty = property;
    };

    function accessor(that) {
        return that[that.constructor._repeatedProperty];
    }

    /**
     * Declare the widget class to repeat
     * @param {WidgetClass} widget
     * @memberof Layout.Repeater
     * @method repeatedWidget
     */
    klass.repeatedWidget = function(widget) {
        if(arguments.length) {
            this._repeatedWidget = widget;
        }
        return this._repeatedWidget;
    };

    /**
     * Map datasource attributes to widget properties
     * @param {object} options - hash map of the attributes to map
     * It could be either :
     * @param {string} options.<attribute> - the name of the property to map to <attribute>
     * or :
     * @param {object} options.<attribute> - an object describing the mapping of <attribute>
     * @param {string} options.<attribute>.property - the name of the property to map
     * @param {callback} options.<attribute>.getWidget -  a function returning the widget that have the property
     * @param {formatters[]} options.<attribute>.formatters - a chain of formatters (not implemented yet)
     * @memberof Layout.Repeater
     * @method mapAttributesToRepeatedWidgetProperties 
     */
    klass.mapAttributesToRepeatedWidgetProperties = function(options) {
        this._mapAttributesToRepeatedWidgetProperties = {};
        for(var attribute in options) {
            this._mapAttributesToRepeatedWidgetProperties[attribute] = options[attribute];
            if(typeof options[attribute] === 'string') {
                this._mapAttributesToRepeatedWidgetProperties[attribute] = { property: options[attribute] };
            }
        }
    };

    /**
     * Declare that the repeater should reuse cloned widgets (stored in a pool) instead of destroying them and recreate them on every update
     * @memberof Layout.Repeater
     * @method repeaterReuseClonedWidgets
     */
    klass.repeaterReuseClonedWidgets = function() {
        this._repeaterReuseClonedWidgets = true;
    };

    proto._initBehavior = function() {
        this._repeaterWidgetPool = [];

    };

    /**
     * Return the list of widget to remove when updating the widget
     * This function can be overridden and allow to kepp some widgets when updateing (multiple page siplayed simultaneously)
     * @param {integer} start - start position of the new displayed page
     * @param {integer} end - end position of the new displayed page
     * @memberof Layout.Repeater
     * @instance
     * @method widgetsToRemoveOnUpdate
     */
    proto.widgetsToRemoveOnUpdate = function(start, end) {
        return this.widgets();
    };

    /**
     * Attach a cloned widget to the repeater
     * This function can be overridden to insert the widget in a different way, or to modify the widget state according to it's position
     * @param {Widget} widget - the widget instance to attach
     * @param {integer} position - it's position in the datasource
     * @memberof Layout.Repeater
     * @instance
     * @method repeaterAttachWidget
     */
    proto.repeaterAttachWidget = function(widget, index) {
        this.attachWidget(widget);
    };

    /**
     * Return the position in the datasource for the given widget or widget index
     * @param {Widget|HTMLElement|integer} widgetOrIndex - The widget, or the index of the widget or an HTML element of the widget
     * @return {integer} The position on the datasource corresponding to this widget
     * @throws Error if the widget is not found or not part of the repeater
     * @memberof Layout.Repeater
     * @instance
     * @method getPosition
     */
    proto.getPosition = function(widget) {
        if(typeof widget === 'number') {
            widget = this.widget(widget);
        }
        if(widget instanceof HTMLElement) {
            widget = Widget.get(widget);
        }
        if(!widget || widget.parentWidget !== this) {
            throw 'Widget is not part of the repeater';
        }
        return widget.boundDatasourceElement(accessor(this)());
    };

    /**
     * Return the widget associated with this position, or null if it's not possible.
     * @param {integer} position - The position to search
     * @return {Widget|null}
     * @memberof Layout.Repeater
     * @instance
     * @method widgetByPosition
     */
    proto.widgetByPosition = function(position) {
        var that = this;
        return this.widgets().filter(function(widget) {
            return that.getPosition(widget) === position;
        })[0] || null;
    };

    function mapAttributes(that, widget) {
        // map attributes
        var myBinding = accessor(that).boundDatasource();
        if(!myBinding) {
            return;
        }
        if(!widget) {
            widget = that.repeatedWidget();
        }
        for(var attribute in that.constructor._mapAttributesToRepeatedWidgetProperties) {
            var mapping = that.constructor._mapAttributesToRepeatedWidgetProperties[attribute];
            if(mapping.getWidget) {
                widget = mapping.getWidget(widget);
            }

            if(widget && widget[mapping.property] && that._repeaterMapAttributes[attribute]) {
                var binding = WAF.extend({}, myBinding.attributes[attribute]);
                binding.formatters = (binding.formatters || []).concat(mapping.formatters || []);
                widget[mapping.property].bindDatasource(binding);
            }
        }
    }

    proto._init = function() {
        if(!accessor(this)) {
            return;
        }

        var _updatePage = function(elements, start, pageSize) {
            if(!this.repeatedWidget()) {
                return;
            }
            var datasource = accessor(this)();
            if(!datasource) {
                return;
            }
            if(start === undefined) {
                start = accessor(this).start();
            }
            var end = start + (pageSize || accessor(this).pageSize());
            end = Math.min(end, datasource.length);

            if(!this.constructor._repeaterReuseClonedWidgets) {
                this.widgetsToRemoveOnUpdate(start, end).forEach(function(widget) {
                    widget._detach();
                    widget.destroy();
                });
            } else {
                this.widgetsToRemoveOnUpdate(start, end).forEach(function(widget) {
                    if(this._repeaterWidgetPool.indexOf(widget) < 0) {
                        this._repeaterWidgetPool.push(widget);
                    }
                    widget._detach();
                }.bind(this));
            }

            for(var i = start; i < end; i++) {
                var widget = null;
                if(this.constructor._repeaterReuseClonedWidgets) {
                    widget = this._repeaterWidgetPool.shift();
                }
                if(!widget) {
                    widget = this.getNewItem(i);
                }
                this.repeaterAttachWidget(widget, i);
                widget.propagate('bindDatasourceElement', datasource, i);
            }
        };

        accessor(this).onPageChange(_updatePage);


        this.subscribe('datasourceBindingChange', this.constructor._repeatedProperty, function() {
            mapAttributes(this);
            this.children().forEach(mapAttributes.bind(undefined, this));
        }, this);

        var widgetClass = this.constructor.repeatedWidget();
        if(this.countWidgets()) {
            this.repeatedWidget(this.widget(0));
        } else if(widgetClass) {
            this.repeatedWidget(new widgetClass());
        }
    };

    /**
     * Set or get the widget instance to clone and repeat
     * @param {Widget} [widget] - To set another widget to clone
     * @return {Widget} The widget to clone
     * @memberof Layout.Repeater
     * @instance
     * @method repeatedWidget
     */
    proto.repeatedWidget = function(widget) {
        if(arguments.length) {
            this._repeatedWidget = widget;
            if(widget.parentWidget === this) {
                this.detachWidget(widget);
            }

            // we must keep track of widgets that could be manually bound, so we don't force bind them to the repeated datasource
            this._repeaterMapAttributes = {};
            for(var attribute in this.constructor._mapAttributesToRepeatedWidgetProperties) {
                var mapping = this.constructor._mapAttributesToRepeatedWidgetProperties[attribute];
                if(mapping.getWidget) {
                    widget = mapping.getWidget(widget);
                }

                this._repeaterMapAttributes[attribute] = widget && widget[mapping.property] && !widget[mapping.property].boundDatasource();
            }
            mapAttributes(this);

            // we changed the widget to clone, so we must destroy the clones in order to rebuild the widget
            this._repeaterWidgetPool.forEach(function(widget) {
                widget.destroy();
            });
            this._repeaterWidgetPool.length = 0;
            this.detachAndDestroyAllWidgets();

            // we rebuild the widget
            accessor(this).fetch({ force: true });
        }
        return this._repeatedWidget;
    };

    /**
     * Return a new cloned widget
     * This method can be overriden
     * @param {integer} position - The initial position of the newly cloned widget (note: if the repeater is set to reuse cloned widget, the position will vary)
     * @return {Widget} The newly cloned widget
     * @memberof Layout.Repeater
     * @instance
     * @method getNewItem
     */
    proto.getNewItem = function(position) {
        return this.repeatedWidget().clone();
    };

    return klass;
});
