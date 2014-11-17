WAF.define('waf-behavior/bindable', [ 'waf-core/behavior', 'waf-core/error', 'waf-core/binding-parser', 'waf-core/formatters' ], function(Behavior, WakError, Parser, Formatters) {
    "use strict";

    /**
     * @class Bindable
     * @augments Observable
     */
    var klass = Behavior.create();
    var proto = klass.prototype;
    klass.inherit('waf-behavior/observable');

    /******************************************************************************/
    /* Binding datasource attribute                                               */
    /******************************************************************************/

    /**
     * Bind a datasource attribute to a property
     * @param {Datasource} datasource - The datasource object
     * @param {string} attribute - The attribute name
     * @param {string} [property=''] - The property to bind the attribute
     * @memberof Bindable
     * @instance
     * @method bindDatasourceAttribute
     */
    proto.bindDatasourceAttribute = function(datasource, attribute, property, options) {
        var bound;
        if(typeof datasource === 'string') {
            property = property || attribute;
            if(datasource === '') {
                return removeBinding(this, property);
            }

            options = Parser.parse(datasource);
            bound = _bindDatasourceAttribute(this, property, options);
        } else if(typeof datasource === 'object' && !Class.instanceOf(datasource, WAF.DataSource)) {
            property = property || attribute;
            bound = _bindDatasourceAttribute(this, property, datasource);
        } else if(typeof datasource === 'undefined') {
            return removeBinding(this, property || attribute);
        } else {
            bound = _bindDatasourceAttribute(this, property, WAF.extend({
                datasource: datasource,
                attribute: attribute
            }, options));
        }
        if(bound) {
            bound ._callback();
            return bound.subscriber;
        }
        return;
    };

    function removeBinding(that, property) {
        if(that._boundAttributes[property]) {
            if(that._boundAttributes[property].subscriber) {
                that._boundAttributes[property].subscriber.unsubscribe();
            }
            delete that._boundAttributes[property];
            that.fire('datasourceBindingChange', property);
        }
    }

    function getDatasource(name) {
        if(typeof name === 'string' && (window.source || window.sources)) {
            return (window.source || window.sources)[name];
        }
        return name;
    }

    function setupFormatters(that, rootBinding, binding) {
        binding = binding || rootBinding;
        binding.formatters = binding.formatters || [];
        binding.formatters = binding.formatters.map(function(formatter) {
            if(!Class.instanceOf(formatter, Formatters)) {
                formatter = new Formatters[formatter.formatter](formatter['arguments']);
            }
            // bind other datasources and push subscribers to subscribers
            formatter['arguments'] = formatter['arguments'].map(function(argument) {
                if(typeof argument !== 'object') {
                    return argument;
                }
                if(argument.subscriber) { // allready bound
                    return argument;
                }
                if(typeof argument.datasource === 'string') {
                    argument.datasourceName = argument.datasource;
                    argument.datasource = getDatasource(argument.datasource);
                }
                var partialBound = _bindDatasourceAttribute(that, WAF.extend({
                    setGetCallback: function() {
                        if(rootBinding._callback) {
                            // FIXME find a way to avoid running formatters two times
                            rootBinding._callback.apply(this, arguments);
                        }
                    }
                }, argument));
                if(!partialBound) {
                    throw "can't find " + argument.datasourceName + "." + arguments.attribute;
                }
                rootBinding.subscribers.push(partialBound.subscriber);
                setupFormatters(that, rootBinding, argument);
                // we replace the argument by the new binded attribute, so we can access to _getFormatedValue
                return that._boundAttributes[partialBound.subscriber.property];
            });
            return formatter;
        });
    }

    function applyFormatters(formatters, mode, value, callback) {
        formatters = formatters || [];
        if(mode === 'unformat') {
            formatters = formatters.reverse();
        }
        var i = 0;
        function formatterCallback(value) {
            if(i < formatters.length) {
                formatters[i++]._run(mode, value, formatterCallback);
            } else {
                callback(value);
            }
        }
        formatterCallback(value);
    }

    var _callbackBindingCounter = 0;
    function _bindDatasourceAttribute(that, property, options) {
        var widgetSubscriber, dsSubscriber;

        if(typeof property === 'object') {
            options = property;
            property = undefined;
        }

        if(property === undefined) {
            property = 'callback' + _callbackBindingCounter++;
            that._boundAttributes[property] = options;
        }

        var bindable = that.constructor._bindableProperties && that.constructor._bindableProperties[property];
        var bound = that._boundAttributes[property];
        if(!bindable && !bound) {
            throw new WakError.Bindable('Unknown property: ' + property);
        }

        // check if this property isn't already binded
        if (bound && bound.subscriber) {
            // FIXME need to check if options are really different
            // if (bound.datasource === options.datasource && bound.attribute === attribute) {
            //     return bound.subscriber;
            // }
            bound.subscriber.unsubscribe();
            delete bound.subscriber;
        }

        // upgrade and save "bound" with all needed values
        bound = that._boundAttributes[property] = WAF.extend(bound || {}, bindable || {}, options);
        bound.subscribers = [];

        if(typeof bound.datasource === 'string') {
            bound.datasourceName = bound.datasource;
            bound.datasource = getDatasource(bound.datasource);
        }

        that.fire('datasourceBindingChange', property, bound);

        if(!bound.datasource) {
            return;
        }
        if(!bound.datasource.getAttribute) {
            return;
        }
        if(Class.instanceOf(bound.datasource, WAF.DataSourceVar) && bound.datasource._private.sourceType === 'scalar' && !bound.attribute) {
            bound.attribute = bound.datasource.getAttributeNames()[0];
        }

        if(!bound.attribute) {
            return;
        }

        if (!bound.datasource.getAttribute(bound.attribute)) {
            //console.warn('Behavior/Bindable::bindDatasourceAttribute, attribute ', attribute, 'could not be found in Datasource => bind cancelled');
            return;
        }
        
        if (!WAF.require('waf-core/widget').bindingList) {
            WAF.require('waf-core/widget').bindingList = {};
        }
        
        WAF.require('waf-core/widget').bindingList[bound.datasource.getID()] = bound.datasource.getID();
        
        
        bound._getFormatedValue = function(callback) {
            var bound = this;
            if(bound.position == null) {
                var value = bound.datasource.getAttributeValue(bound.attribute);
                applyFormatters(bound.formatters, 'format', value, callback);
            } else {
                bound.datasource.getElement(bound.position, function(r) {
                    var value = r.element.getAttributeValue(bound.attribute);
                    applyFormatters(bound.formatters, 'format', value, callback);
                });
            }
        };
        bound.setGetCallback = bound.setGetCallback || bound.setCallback || bound.callback;

        // install the others bindings
        try {
            setupFormatters(that, bound);
        } catch(exception) {
            // something went wrong, we cancel the binding
            return;
        }

        bound._callback = function(event) {
            bound._getFormatedValue(function(value) {
                if (widgetSubscriber) {
                    widgetSubscriber.pause();
                }
                bound.setGetCallback.call(that, value);
                if (widgetSubscriber) {
                    widgetSubscriber.resume();
                }
            });
        };

        // install all the events handlers
        if (bound.event) {
            widgetSubscriber = that.subscribe(bound.event, property, function(event) {
                if(bound.position != null && bound.position !== bound.datasource.getPosition()) {
                    return;
                }
                var value = bound.getCallback ?
                        bound.getCallback.call(that) :
                        bound.setGetCallback.call(that);
                applyFormatters(bound.formatters, 'unformat', value, function(value) {
                    dsSubscriber.pause();
                    bound.datasource.setAttributeValue(bound.attribute, value);
                    // FIXME: fix old widgets so they do not need a sync THEN REMOVE THE TWO UGLY LINES BELOW !!!
                    if(Class.instanceOf(bound.datasource, WAF.DataSourceVar)) {
                        bound.datasource.sync();
                    }
                    dsSubscriber.resume();
                });
            }, that);
            bound.subscribers.push(widgetSubscriber);
        }

        dsSubscriber = bound.datasource.subscribe('attributeChange', bound.attribute, function(event) {
            if(bound.position != null && bound.position !== bound.datasource.getPosition()) {
                return;
            }
            bound._callback(event);
        });

        // prepare the unsubscribe method
        dsSubscriber.unsubscribe = (function(unsubscribe) {
            return function() {
                delete that._boundAttributes[this.property];
                unsubscribe.call(this);
                bound.subscribers.forEach(function(subscriber) {
                    subscriber.unsubscribe();
                });
                that.fire('datasourceBindingChange', property);
            };
        })(dsSubscriber.unsubscribe);
        dsSubscriber.property = property;
        dsSubscriber.unbind = dsSubscriber.unsubscribe;

        bound.subscriber = dsSubscriber;

        return bound;
    }

    /**
     * A callback that can set or return the value
     * @this the widget instance
     * @callback Bindable~GetSetCallback
     * @param {any} [value] - The value to set. Get the value if no value is passed
     * @returns {any} The current value
     */

    /**
     * A callback that can set the value
     * @this the widget instance
     * @callback Bindable~SetCallback
     * @param {any} value - The value to set
     */

    /**
     * A callback that can return the value
     * @this the widget instance
     * @callback Bindable~GetCallback
     * @returns {any} The current value
     */

    /**
     * Define a bindable property
     * This method allow to define binding for the class
     * @param {string} [property=''] - The property name
     * @param {Bindable~GetSetCallback|Bindable~SetCallback} setGetCallback - GetSet or Set callback.
     * @Param {Event} [event] - Event to subscribe on the widget to know when the value has changed
     * @param {Bindable~GetCallback} [getCallback] - Get callback.
     * @memberof Bindable
     * @method _makeBindableProperty
     * @private
     */
    klass._makeBindableProperty = function(property, setGetCallback, event, getCallback) {
        if(typeof property === 'function') {
            getCallback = event;
            event = setGetCallback;
            setGetCallback = property;
            property = '';
        }

        this._bindableProperties = this._bindableProperties || {};

        this._bindableProperties[property] = {
            setGetCallback: setGetCallback,
            event: event,
            getCallback: getCallback
        };
    };

    /**
     * Restrict bindings to a specified element of the datasource
     * @param {Datasource} datasource - The datasource object
     * @param {interger|null} position - The position to restrict the bindings of this datasource
     * @memberof Bindable
     * @instance
     * @method bindDatasourceElement
     */
    proto.bindDatasourceElement = function(datasource, position) {
        var that = this;
        var bdp = that._boundDatasourcePositions.filter(function(bound) {
            return bound.datasource === datasource;
        })[0];
        if(!bdp) {
            that._boundDatasourcePositions.push(bdp = {
                datasource: datasource
            });
        }
        bdp.position = position;

        for (var attName in that._boundAttributes) {
            var bound = that._boundAttributes[attName] || {};

            if (bound.datasource === datasource) {
                bound.position = position;
            }
        }

        if(position != null) {
            datasource.getElement(position, function(event) {
                for (var attName in that._boundAttributes) {
                    var bound = that._boundAttributes[attName] || {};

                    if(bound._callback) {
                        bound._callback();
                    }

                }
            });
        }
    };

    /**
     * get the position of the bindings for this datasource
     * @param {Datasource} datasource - The datasource object
     * @return {interger|null} The position of the bindings of this datasource
     * @memberof Bindable
     * @instance
     * @method boundDatasourceElement
     */
    proto.boundDatasourceElement = function(datasource) {
        var bdp = this._boundDatasourcePositions.filter(function(bound) {
            return bound.datasource === datasource;
        })[0];
        if(bdp) {
            return bdp.position;
        }
        return null;
    };

    /******************************************************************************/
    /* Service methods                                                            */
    /******************************************************************************/

    /**
     * Called to initialize behaviors properties
     * @private
     * @memberof Bindable
     * @instance
     * @method _initProperties
     */
    proto._initProperties = function () {
        this._boundAttributes = {};
        this._boundDatasourcePositions = [];
    };
    klass.stackInstanceMethods('_initProperties');

    /**
     * Called to initialize behaviors of a cloned widget
     * @param {BaseWidget} master - The widget cloned from
     * @private
     * @memberof Bindable
     * @instance
     * @method _cloneBehavior
     */
    proto._cloneBehavior = function(master) {
        // Attributes
        for(var property in master._boundAttributes) {
            var bound = master._boundAttributes[property];
            bound.subscribers.forEach(function(subscriber) {
                this.removeSubscriber(subscriber); // remove cloned subscriber
            }.bind(this));
            if(bound.datasource) {
                if(this.constructor._bindableProperties && property in this.constructor._bindableProperties) {
                    this.bindDatasourceAttribute(bound, property);
                } else {
                    this.bindDatasourceAttribute(bound);
                }
            }
        }
    };

    /**
     * Call when destroying widget to let inherited behaviors unsetup thing correctly
     * @function _destroyBehavior
     * @private
     * @memberof Bindable
     * @instance
     */
    proto._destroyBehavior = function() {
        for(var property in this._boundAttributes) {
            if(this._boundAttributes[property].subscriber) {
                this._boundAttributes[property].subscriber.unsubscribe();
            }
        }
    };


    WakError.create('Bindable');

    var Class = WAF.require('waf-core/class');
    Class.defaultBehaviors.push(klass); // By inheritance, add Observable


    return klass;
});
