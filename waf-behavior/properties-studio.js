(function() {
    "use strict";
    /* globals Designer, $$ */
    var Properties = WAF.require('waf-behavior/properties');
    var Studio = WAF.require('waf-behavior/studio');
    Properties.inherit(WAF.require('waf-behavior/studio'));

    var custom = Properties._propertiesCustomHelper;

    Properties.types['*'].attribute = {};
    Properties.types['*'].denormalize = function(value) { if(value == null) return ''; return String(value); };
    Properties.types['boolean'].attribute = { type: 'checkbox' };
    Properties.types['integer'].attribute = {
        typeValue: 'custom',
        checkMethod: function(value) {
            if(value === '') {
                return true;
            }
            return /^[-+]?\d+(e[+]?\d+)?$/i.test(value);
        }
    };
    Properties.types['number'].attribute = {
        typeValue: 'custom',
        checkMethod: function(value) {
            if(value === '') {
                return true;
            }
            return /^[-+]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(value);
        }
    };
    Properties.types['date'].attribute = {
        typeValue: 'custom',
        checkMethod: function(value) {
            if(value === '') {
                return true;
            }
            return regexIso8601.test(value);
        },
    };
    Properties.types['date'].denormalize = function(date) {
        return date.toISOString();
    };
    Properties.types['enum'].attribute = function(name, options) {
        var comboOptions = [];
        if(Array.isArray(options.values)) {
            comboOptions = options.values.map(function(i) {
                i = String(i);
                return {
                    key: i,
                    value: i.split(/[-_]/).map(String.capitalize).join(' ')
                };
            });
        } else {
            comboOptions = Object.keys(options.values).map(function(i) {
                return {
                    key: i,
                    value: options.values[i]
                };
            });
        }
        return {
            type: 'combobox',
            allowEmpty: true,
            options: comboOptions,
            defaultValue: options.defaultValue || comboOptions[0].key
        };
    };

    Properties.types['*'].afterAddStudio = function(name, property) {
        var lname = name.toLowerCase();
        var attribute = custom(property, 'attribute');
        if(typeof attribute === 'function') {
            attribute = attribute.call(this, name, property);
        }
        if(property.defaultValueCallbask) {
            attribute.domAttribute = false;
        }
        attribute = WAF.extend({
            defaultValue: custom(property, 'denormalize').call(this, property.defaultValue, name, property),
            onchange: function(data) {
                var widget = this.data.tag.getWidget();
                var value = this.getValue();
                widget[property.functionName]._changeSubscriber.pause();
                Studio.execute(widget, function() {
                    widget[property.functionName](value);
                });
                widget[property.functionName]._changeSubscriber.resume();
            },
            ready: function() {
                this.htmlObject.parents('tr').find('label>div').slice(0, 1).click(function() {
                    // switch to binding mode
                    this.checked = false;
                    Designer.ui.form.property.hideAttribute('data-' + lname);
                    Designer.ui.form.property.showAttribute('data-binding-' + lname);
                    widget[property.functionName].bindDatasource(widget[property.functionName].oldBinding || '');
                });
                this.htmlObject.attr('placeholder', 'Static value');
                var widget = this.data.tag.getWidget();
                var accessor = widget[property.functionName];
                if(accessor.boundDatasource && accessor.boundDatasource()) {
                    this.htmlObject.parents('tr').hide();
                }

                var description = '';
                if(property.description) {
                    description += property.description + '\n';
                }
                description += 'this.' + property.functionName + '([' + (property.type === '*' ? 'any' : property.type) + '])';;
                this.htmlObject.parents('tr').find('label').slice(0, 1).attr('title', description);

                var value = custom(property, 'denormalize').call(widget, widget[property.functionName](), name, property);
                this.setValue(value);
            }
        }, attribute);
        if(attribute.type === 'checkbox') {
            attribute.onclick = attribute.onchange;
        }
        attribute.description = name.split('-').map(String.capitalize).join(' ');
        if(property.bindable) {
            attribute.description = getIconHTML(name, 0) + attribute.description;
        }
        this._addAttribute('data-' + lname, attribute);

        if(property.bindable) {
            this._addAttribute('data-binding-' + lname, {
                //description: name.split('-').map(String.capitalize).join(' ') + ' Source',
                description:  getIconHTML(name, 1) + name.split('-').map(String.capitalize).join(' '),
                typeValue: 'datasource',
                onchange: function(data) {
                    var widget = this.data.tag.getWidget();
                    var value = this.getValue();
                    widget[property.functionName]._datasourceBindingChangeSubscriber.pause();
                    Studio.execute(widget, function() {
                        widget[property.functionName].bindDatasource(value);
                    });
                    widget[property.functionName].oldBinding = value;
                    widget[property.functionName]._datasourceBindingChangeSubscriber.resume();
                },
                ready: function() {
                    var widget = this.data.tag.getWidget();
                    this.htmlObject.parents('tr').find('label>div').slice(0, 1).click(function() {
                        // switch to value mode
                        this.checked = true;
                        Designer.ui.form.property.showAttribute('data-' + lname);
                        Designer.ui.form.property.hideAttribute('data-binding-' + lname);
                        widget[property.functionName].oldBinding = '' + (widget[property.functionName].boundDatasource() || '');
                        widget[property.functionName].bindDatasource('');
                    });
                    this.htmlObject.attr('placeholder', 'Datasource');
                    var accessor = widget[property.functionName];
                    if(accessor.boundDatasource && !accessor.boundDatasource() && 'data-' + lname in widget.constructor._configuration.attributes) {
                        this.htmlObject.parents('tr').hide();
                    }

                    var description = '';
                    if(property.description) {
                        description += property.description + '\n';
                    }
                    description += 'this.' + property.functionName + '.bindDatasource(string)';
                    this.htmlObject.parents('tr').find('label').slice(0, 1).attr('title', description);

                    var value = widget[property.functionName].boundDatasource();
                    if(value) {
                        this.setValue(value.toString());
                    }
                }
            });
        }

        // add the change event
        this.addEvent('change', {
            targets: Object.keys(this._properties),
            category: 'Property Events'
        });
    };

    Properties.doAfterClassMethod('addProperty', function(name) {
        var property = this._properties[name];
        if(['source', 'binding', 'label', 'lib', 'package', 'type'].indexOf(name.toLowerCase()) >= 0 || !/^[a-z0-9_]+$/i.test(name)) {
            throw '"' + name + '" is not a valid name for a property.';
        }
        custom(property, 'afterAddStudio').call(this, name, property);
    });

    Properties.types['*'].afterRemoveStudio = function(name, property) {
        this._removeAttribute('data-' + name);
        this._removeAttribute('data-binding-' + name);
        if(Object.keys(this._properties).length === 0) {
            this.removeEvent('change');
        }
    };

    Properties.doBeforeClassMethod('removeProperty', function(name) {
        var property = this._properties[name];
        custom(property, 'afterRemoveStudio').call(this, name, property);
    });

    Properties.types['*'].afterInitBehaviorStudio = function(name, property) {
        var lname = name.toLowerCase();
        var that = this;
        var accessor = this[property.functionName];
        accessor.show = function() {
            accessor._hide = false;
            var tag = Designer.env.tag.current;
            if(tag && tag.getWidget && tag.getWidget() === that) {
                if((!accessor.boundDatasource || !accessor.boundDatasource()) && 'data-' + lname in tag.getWidget().constructor._configuration.attributes) {
                    Designer.ui.form.property.showAttribute('data-' + lname);
                } else {
                    Designer.ui.form.property.showAttribute('data-binding-' + lname);
                }
            }
        };
        accessor.hide = function() {
            accessor._hide = true;
            var tag = Designer.env.tag.current;
            if(tag && tag.getWidget && tag.getWidget() === that) {
                Designer.ui.form.property.hideAttribute('data-' + lname);
                Designer.ui.form.property.hideAttribute('data-binding-' + lname);
            }
        };
        accessor._changeSubscriber = accessor.onChange(function() {
            var tag = $$(that.node.id);
            if(tag) {
                var value = custom(property, 'denormalize').call(that, accessor(), name, property);
                var attribute = tag.getAttribute('data-' + lname);
                if(!attribute) {
                    tag.addAttribute('data-' + lname);
                    attribute = tag.getAttribute('data-' + lname);
                }
                attribute.setValue(value);
                if(tag === Designer.getCurrent()) {
                    Designer.ui.form.property.setAttributeValue('data-' + lname, value);
                }
                tag.domUpdate();
            }
        });
        accessor._datasourceBindingChangeSubscriber = that.subscribe('datasourceBindingChange', name, function() {
            var tag = $$(that.node.id);
            if(tag) {
                var bound = accessor.boundDatasource();
                if(bound) {
                    bound = bound.toString();
                } else {
                    bound = '';
                }
                var attribute = tag.getAttribute('data-binding-' + lname);
                if(!attribute) {
                    tag.addAttribute('data-binding-' + lname);
                    attribute = tag.getAttribute('data-binding-' + lname);
                }
                attribute.setValue(bound);
                if(tag === Designer.getCurrent()) {
                    Designer.ui.form.property.setAttributeValue('data-binding-' + lname, bound);
                }
                tag.domUpdate();
            }
        }, that);
    };

    Properties.doAfter('_initBehavior', function() {
        Object.keys(this.constructor._properties).forEach(function(name) {
            var property = this.constructor._properties[name];
            custom(property, 'afterInitBehaviorStudio').call(this, name, property);
        }.bind(this));
    });

    Properties._studioOn('propertyPanelReady', function() {
        for(var name in this.getWidget().constructor._properties) {
            var property = this.getWidget().constructor._properties[name];
            var accessor = this.getWidget()[property.functionName];
            if(accessor._hide) {
                accessor.hide();
            } else {
                accessor.show();
            }
        }
    });

    /**
     * customize a property display in the studio
     * @param {string} name - Property name
     * @param {object} options
     * @param {string} [options.title]
     * @param {string} [options.description]
     * @param {boolean} [options.display=true] - show the static field
     * @param {boolean} [options.multiline=false] - show a multiline field (ony for string or * properties)
     * @param {boolean} [options.radio=false] - show a radio group (only for enum properties)
     * @param {string} [options.category] - Category of the property
     * @param {boolean} [options.sourceDisplay=true] - Show the source field
     * @param {strong} [option.category] - Property category
     * @method customizeProperty
     * @memberof Properties
     * @public
     */
    Properties.customizeProperty = function(name, options) {
        var attribute;
        var lname = name.toLowerCase();
        if(!(name in this._properties)) {
            throw "You cannot customize the \"" + name + '" property because it is unknown.';
        }
        var property = this._properties[name];

        if('description' in options) {
            property.description = options.description;
        }

        if(options.display === false) {
            this._removeAttribute('data-' + lname);
        } else {
            attribute = {};
            attribute.tooltip = name;
            if('description' in options) {
                attribute.tooltip += '\n' + options.description;
            }
            attribute.description = this._configuration.attributes['data-' + lname].description;
            if('title' in options) {
                attribute.description = options.title;
            }
            // remove icon
            attribute.description = attribute.description.replace(getIconHTML(name, 0), '');
            // add icon if needed
            if(options.sourceDisplay !== false && 'data-binding-' + lname in this._configuration.attributes) {
                attribute.description = getIconHTML(name, 0) + attribute.description;
            }
            if('category' in options) {
                attribute.category = options.category || 'General';
            }
            if(property.type === 'enum' && options.radio) {
                attribute.type = 'radiogroup';
            }
            if((property.type === 'string' || property.type === '*') && options.multiline) {
                attribute.type = 'textarea';
            }
            this._addAttribute('data-' + lname, attribute);
        }

        if(options.sourceDisplay === false) {
            this._removeAttribute('data-binding-' + lname);
        } else if('data-binding-' + lname in this._configuration.attributes) {
            attribute = {};
            attribute.description = this._configuration.attributes['data-binding-' + lname].description;
            if('title' in options) {
                attribute.description = options.title;
            }
            // remove icon
            attribute.description = attribute.description.replace(getIconHTML(name, 1), '');
            // add icon if needed
            if(options.display !== false) {
                attribute.description = getIconHTML(name, 1) + attribute.description;
            }
            if('category' in options) {
                attribute.category = options.category || 'General';
            }
            this._addAttribute('data-binding-' + lname, attribute);
        }
    };

    function getIconHTML(name, num) {
        return '<div id="checkbox' + num + '-' + name + '" class="studio-form-icon-' + (num ? 'bound ' : 'notBound') + '"></div>';
    }




    // Date polyfill to fix broken webkit Date.parse in studio
    // https://github.com/ckozl/JavaScript-iso8601-Date-Parsing--xbrowser-polyfill-/blob/master/date_iso8601_polyfill.js
    var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,3})(?:Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;
    (function() {
        var d = window.Date;

        if (d.parse('2011-11-29T15:52:30.5') !== 1322581950500 ||
            d.parse('2011-11-29T15:52:30.52') !== 1322581950520 ||
            d.parse('2011-11-29T15:52:18.867') !== 1322581938867 ||
            d.parse('2011-11-29T15:52:18.867Z') !== 1322581938867 ||
            d.parse('2011-11-29T15:52:18.867-03:30') !== 1322594538867 ||
            d.parse('2011-11-29') !== 1322524800000 ||
            d.parse('2011-11') !== 1320105600000 ||
            d.parse('2011') !== 1293840000000) {

            d.__parse = d.parse;

            d.parse = function(v) {

                var m = regexIso8601.exec(v);

                if (m) {
                    return Date.UTC(
                        m[1],
                        (m[2] || 1) - 1,
                        m[3] || 1,
                        m[4] - (m[8] ? m[8] + m[9] : 0) || 0,
                        m[5] - (m[8] ? m[8] + m[10] : 0) || 0,
                        m[6] || 0,
                        ((m[7] || 0) + '00').substr(0, 3)
                    );
                }

                return d.__parse.apply(this, arguments);

            };
        }

        d.__fromString = d.fromString;

        d.fromString = function(v) {

            if (!d.__fromString || regexIso8601.test(v)) {
                return new d(d.parse(v));
            }

            return d.__fromString.apply(this, arguments);
        };
    })();

})();
