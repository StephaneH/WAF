/** @module waf-behavior/properties-datasource */
WAF.define('waf-behavior/properties-datasource', ['waf-core/subscriber', 'waf-core/event'], function(Subscriber, Event) {
    "use strict";
    function getSource(name) {
        var sources = window.sources || window.source || {};
        return sources[name];
    }
    var Properties = WAF.require('waf-behavior/properties');

    var custom = Properties._propertiesCustomHelper;

    Properties.types.datasource = {
        createAccessor: function(name, property, storage) {
            var that = this;

            var accessor = that[property.functionName] = function(newValue) {
                if(arguments.length) {
                    var old = storage[name];
                    var old2 = accessor._datasourceName;
                    if(typeof newValue === 'string') {
                        accessor._datasourceName = newValue;
                    }
                    storage[name] = custom(property, 'normalize').call(that, newValue, property, name);
                    if(old2 !== accessor._datasourceName || old !== storage[name]) {
                        that.fire('datasourceBindingChange', name, accessor.boundDatasource());
                    }
                    if(old !== storage[name]) {
                        that.fire('change', name, { value: storage[name], oldValue: old });
                    }
                }
                return storage[name];
            };

            accessor.onChange = function(callback) {
                return that.subscribe('change', name, function(event) {
                    callback.call(that, event.data.value, event.data.oldValue, event.target);
                }, that);
            };

            var start = 0;
            var pageSize = property.pageSize || Infinity;
            var first = true;
            var subscribers = { pageChange: [] };
            accessor._subscribers = subscribers;
            var mapping;

            /**
             * Return the list of all attributes
             * @returns {object[]}
             * @method attributes
             * @public
             */
            accessor.attributes = function() {
                return property.attributes;
            };

            /**
             * Return the daatsource attribute name for the given property attribute name
             * @param {string} name
             * @returns {string}
             * @method attributeFor
             * @public
             */
            accessor.attributeFor = function(n) {
                return mapping && mapping[n];
            };

            /**
             * Set the current mapping
             * keys are attribute names of the property, values are attribute names of the datasource
             * @param {object} map
             * @method setMapping
             * @public
             */
            accessor.setMapping = function(map) {
                accessor.mapping(map);
            };

            /**
             * Set or get the current mapping
             * keys are attribute names of the property, values are attribute names of the datasource
             * @param {object} map
             * @method mapping
             * @public
             */
            accessor.mapping = function(map) {
                if(arguments.length) {
                    mapping = map;
                    that.fire('datasourceBindingChange', name, accessor.boundDatasource());
                }
                return mapping;
            };

            /**
             * Return a mapped element (an element with attribute mapped to there widget defined values)
             * If no attributes, return the original elemen
             * @param {object} element
             * @returns {object}
             * @method mapElement
             * @public
             */
            accessor.mapElement = function(element) {
                if (!mapping) {
                    return element;
                }

                var result = {};
                for (var k in mapping) {
                    result[k] = element.getAttributeValue ? element.getAttributeValue(mapping[k]) : element[mapping[k]];
                }
                return result;
            };

            /**
             * call the callback with the mapped page
             * @param {object} [options]
             * @param {integer} [options.start] Default #<property>.start()
             * @param {integer} [options.pageSize] Default #<property>.pageSize()
             * @param {function} callback
             * @param {function} errorCallback
             * @method getPage
             * @public
             */
            accessor.getPage = function(options, callback, errorCallback) {
                var source = accessor();

                if (typeof options === 'function') {
                    errorCallback = callback;
                    callback = options;
                    options = {};
                }

                callback = options.callback || callback;
                errorCallback = options.errorCallback || errorCallback;

                if (!source) {
                    callback.call(that, []);
                    return;
                }

                var _start = options.start || accessor.start();
                var _pageSize = options.pageSize || accessor.pageSize();

                source.getElements(_start, _pageSize, function(event) {
                    var elements = event.elements;
                    if (mapping && that.options['static-binding-' + name.toLowerCase()] !== 'true') {
                        elements = elements.map(accessor.mapElement);
                    }
                    callback.call(that, elements, _start, _pageSize);
                }, errorCallback);
            };

            /**
             * call the callback with the mapped collection
             * @param {object} [options]
             * @param {integer} [options.start] Default #<property>.start()
             * @param {integer} [options.pageSize] Default #<property>.pageSize()
             * @param {function} callback
             * @param {function} errorCallback
             * @method getCollection
             * @deprecated
             * @public
             */
            accessor.getCollection = accessor.getPage;

            /**
             * return the current start value
             * @param {integer} [start] - new start
             * @return {integer}
             * @method start
             * @public
             */
            accessor.start = function(_start) {
                if(typeof _start === 'number') {
                    start = _start;
                }
                return start;
            };

            /**
             * return the current page size value
             * @param {integer} [pageSize] - new page size
             * @return {integer}
             * @method pageSize
             * @public
             */
            accessor.pageSize = function(_pageSize) {
                if(typeof _pageSize === 'number') {
                    pageSize = _pageSize;
                }
                return pageSize;
            };

            /**
             * fetch a new page. If needed trigger the on PageChange
             * @param {object} [options]
             * @param {integer} [options.start] Default #<property>.start()
             * @param {integer} [options.pageSize] Default #<property>.pageSize()
             * @param {boolean} [options.force] force fetch even if start and pageSize doesn't change
             * @method fetch
             * @public
             */
            accessor.fetch = function(options) {
                options = options || {};
                var source = accessor();
                if(!source) {
                    return;
                }
                var _start = options.start !== undefined ? options.start : (start || 0);
                var _pageSize = options.pageSize || pageSize;

                if(_start !== start || _pageSize !== pageSize || options.force || first) {
                    first = false;
                    start = _start;
                    pageSize = _pageSize;
                    accessor._firePageChange();
                }
            };

            accessor._firePageChange = function() {
                var event = new Event({
                    kind: 'pageChange',
                    emitter: that
                });
                subscribers.pageChange.forEach(function(subscriber) {
                    subscriber.fire(event);
                });
            };

            accessor.onPageChange = function(callback) {
                var subscriber = accessor.subscribe('attributeChange', function(event) {
                    if(event.kind === 'currentElementChange') {
                        return;
                    }
                    if(event.kind === 'attributeChange') {
                        var pos = accessor().getPosition();
                        if(start > pos || pos >= start + pageSize) {
                            return; 
                        }
                    }
                    subscriber.pause();
                    accessor.getPage(function(elements, _start, _pageSize) {
                        callback.call(that, elements, _start, _pageSize);
                        subscriber.resume();
                    }, function() {
                        subscriber.resume();
                    });
                }, that);

                subscribers.pageChange.push(subscriber);

                return subscriber;
            };

            /**
             * subscribe to a datasource event
             * if the datasource change, the callback will be installed to the new datasource
             * @param {string} event
             * @param {string} [target]
             * @param {function} callback
             * @param {object} [observer]
             * @param {object} [userData]
             * @returns {Subscriber}
             * @method subscribe
             * @public
             */
            accessor.subscribe = function(event, target, callback, observer, userData) {
                // target is optional
                if(typeof target === 'function') {
                    userData = observer;
                    observer = callback;
                    callback = target;
                    target = undefined;
                }

                subscribers[event] = subscribers[event] || [];

                var subscriber = new Subscriber({
                    callback: callback,
                    target: target,
                    observer: observer,
                    userData: userData,
                    unsubscribe: function() {
                        WAF.remove(subscribers[event], this);
                        WAF.remove(subscribers.pageChange, this);
                        if(this._realSubscriber) {
                            this._realSubscriber.unsubscribe();
                        }
                    },
                    pause: function() {
                        this._pause = true;
                        if(this._realSubscriber) {
                            this._realSubscriber.pause();
                        }
                    },
                    resume: function() {
                        this._pause = false;
                        if(this._realSubscriber) {
                            this._realSubscriber.resume();
                        }
                    }
                });
                if(accessor()) {
                    subscriber._realSubscriber = accessor().subscribe(event, target, callback, observer, userData);
                }
                subscribers[event].push(subscriber);

                return subscriber;
            };


            /**
             * install a callback on the collection change to get the mapped collection
             * @param {function} callback
             * @param {function} errorCallback
             * @return {Subscriber}
             * @method onCollectionChange
             * @deprecated
             * @public
             */
            accessor.onCollectionChange = function(callback, errorCallback) {
                return accessor.subscribe('collectionChange', function(event) {
                    accessor.getCollection(callback, errorCallback);
                }, that);
            };

            /**
             * return the binding infos
             * @return {object}
             * @method boundDatasource
             * @public
             */
            accessor.boundDatasource = function() {
                if(!accessor() && !accessor._datasourceName) {
                    return null;
                }
                var attributeBindings = {};
                if(property.attributes) {
                    property.attributes.forEach(function(attribute) {
                        attributeBindings[attribute.name] = {
                            datasourceName: accessor._datasourceName || (accessor() && accessor()._private.id),
                            datasource: accessor(),
                            attribute: accessor.attributeFor(attribute.name),
                            formatters: []
                        };
                    });
                }
                return {
                    datasourceName: accessor._datasourceName || (accessor() && accessor()._private.id),
                    datasource: accessor(),
                    attributes: attributeBindings,
                    formatters: [],
                    valid: !!accessor()
                };
            };


            accessor.onChange(function() {
                start = 0;
                pageSize = property.pageSize || Infinity;
                Object.keys(subscribers).forEach(function(event) {
                    if(event === 'pageChange') {
                        return;
                    }
                    subscribers[event].forEach(function(subscriber) {
                        if(subscriber._realSubscriber) {
                            subscriber._realSubscriber.unsubscribe();
                        }
                        subscriber._realSubscriber = undefined;
                        if(accessor()) {
                            subscriber._realSubscriber = accessor().subscribe(event, subscriber.target, subscriber.callback, subscriber.observer, subscriber.userData);
                            if(subscriber._pause) {
                                subscriber._realSubscriber.pause();
                            }
                        }
                    });
                });

                if (accessor()) {
                    if (!WAF.require('waf-core/widget').bindingList) {
                        WAF.require('waf-core/widget').bindingList = {};
                    }

                    WAF.require('waf-core/widget').bindingList[accessor().getID()] = accessor().getID();
                }
            });

        },
        afterAdd: function(name, property) {
            if (property.attributes) {
                property.attributes = property.attributes.map(function(attribute) {
                    return typeof attribute === 'string' ? {name: attribute} : attribute;
                });
            }
        },
        optionsParsers: function(name, property) {
            Properties.types['*'].optionsParsers.call(this, name, property);

            this.optionsParsers['static-' + name.toLowerCase()] = function() {
                var accessor = this[property.functionName];
                if (!this.options['static-' + name.toLowerCase()]) {
                    return;
                }

                var data = JSON.parse(this.options['static-' + name.toLowerCase()]);

                var source = new WAF.DataSourceVar({
                    "variableReference": data,
                    "data-attributes": accessor.attributes().map(function(att) {
                        return att.name + ':' + (att.type || 'string');
                    }).join(','),
                });

                this[property.functionName](source);

            };
        },
        installCallbacks: function(name, property) {
            Properties.types['*'].installCallbacks.call(this, name, property);

            var that = this;
            var accessor = this[property.functionName];
            var map = {};
            var count = 0;
            (accessor.attributes() || []).forEach(function(attribute) {
                var optionName = name.toLowerCase() + '-attribute-' + attribute.name.toLowerCase();
                if (optionName in that.options) {
                    map[attribute.name] = that.options[optionName];
                    count++;
                }
            });
            accessor.mapping(count ? map : undefined);

            function handleDependencies() {
                if(accessor()) {
                    var reload;
                    for(var k in accessor.mapping()) {
                        if(accessor.mapping()[k].indexOf('.') >= 0) {
                            accessor().declareDependencies(accessor.mapping()[k]);
                            reload = true;
                        }
                    }
                    // we must issue a query() for this datasource if some dependencies are declared.
                    if(reload) {
                        accessor().query();
                    }
                }
            }

            handleDependencies();
            this.subscribe('datasourceBindingChange', name, function() {
                handleDependencies();
                accessor._firePageChange();
            }, that);
        },
        normalize: function(v, property, name) {
            if (typeof v === 'string') {
                return getSource(v) || null;
            }
            return v;
        },
        options: {
            bindable: false
        },
        destroy: function(name, property) {
            var accessor = this[property.functionName];
            Object.keys(accessor._subscribers).forEach(function(event) {
                if(event === 'pageChange') {
                    return;
                }
                accessor._subscribers[event].forEach(function(subscriber) {
                    subscriber.unsubscribe();
                });
            });
        }
    };

    return undefined;
});
