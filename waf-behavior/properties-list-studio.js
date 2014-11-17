(function() {
    "use strict";
    var Properties = WAF.require('waf-behavior/properties');
    var Studio = WAF.require('waf-behavior/studio');

    var custom = Properties._propertiesCustomHelper;

    Properties.types.list.afterAddStudio = function(name, property) {
        var klass = this;
        var lname = name.toLowerCase();

        var columns = [];
        if(!property.attributes) {
            columns.push({ name: '', type: 'textField' });
        } else {
            columns = property.attributes.map(function(column) {
                if(!((column.type || '*') in Properties.types) || !custom(column, 'listable')) {
                    throw 'Unsupported attribute type "' + column.type + '" in list property "' + name + '".';
                }
                var attribute = custom(column, 'attribute');
                if(typeof attribute === 'function') {
                    attribute = attribute.call(this, name, column);
                }
                attribute = WAF.extend({
                    type: 'textField',
                    name: column.name,
                    defaultValue: column.defaultValue,
                    onchange: function(data) {
                        var widget = this.data.tag.getWidget();
                        var row = this.row;
                        var index = row.grid.getRows().indexOf(row);
                        var accessor = widget[property.functionName];
                        var element = accessor(index);
                        if(column.name === '') {
                            element = custom(column, 'normalize').call(widget, this.getValue());
                        } else {
                            element[column.name] = custom(column, 'normalize').call(widget, this.getValue());
                        }
                        accessor._changeSubscriber.pause();
                        accessor(index, element);
                        accessor._changeSubscriber.resume();
                    }
                }, attribute);
                if(attribute.type === 'checkbox') {
                    attribute.onclick = attribute.onchange;
                    delete attribute.onchange;
                }
                return attribute;
            });
        }

        // add the grid attribute
        klass._addAttribute('data-' + lname, {
            type: 'grid',
            columns: columns,
            ready: function() {
                // fill the list with all the previous values
                if(this.json && this.json.length) {
                    this.json.forEach(function(item) {
                        columns.forEach(function(column) {
                            if(!(column in item)) {
                                item[column] = '';
                            }
                        });
                    });
                    return;
                }

                var widget = this.data.tag.getWidget();
                var attribute = this.data.tag._config.attributes
                        .filter(function(a) { return a.name === 'data-' + lname; })[0];
                widget[property.functionName]().forEach(function(item) {
                    this.addRow(columns.map(function(column, i) {
                        return WAF.extend(WAF.clone(attribute.columns[i]), {
                            value: column.name === '' ? item : (item && item[column.name])
                        });
                    }), /* fromInit= */false, /* silentMode= */true, /* save= */false);
                }.bind(this));
            },
            afterRowAdd: function(data) {
                // fill the new row with the default values
                var widget = this.data.tag.getWidget();
                var element = {};
                columns.forEach(function(column, i) {
                    var value = column.defaultValue;
                    var attribute = property.attributes && property.attributes[i] || column;
                    if(attribute.defaultValueCallback) {
                        value = Studio.execute(widget, attribute.defaultValueCallback, attribute);
                    }
                    data.items[i].setValue(value || '');
                    element[column.name] = value;
                    if(column.name === '') {
                        element = value;
                    }
                });
                widget[property.functionName]._changeSubscriber.pause();
                Studio.execute(widget, function() {
                    widget[property.functionName].push(element);
                });
                widget[property.functionName]._changeSubscriber.resume();
            },
            afterRowSort: function(data) {
                var widget = this.data.tag.getWidget();
                widget[property.functionName]._changeSubscriber.pause();
                Studio.execute(widget, function() {
                    widget[property.functionName].move(data.movedIndex, data.index);
                });
                widget[property.functionName]._changeSubscriber.resume();
            },
            afterRowDelete: function(data) {
                var widget = this.data.tag.getWidget();
                widget[property.functionName]._changeSubscriber.pause();
                Studio.execute(widget, function() {
                    widget[property.functionName].remove(data.index);
                });
                widget[property.functionName]._changeSubscriber.resume();
            }
        });
        if('domAttribute' in property) {
            klass._addAttribute('data-' + lname, { domAttribute: property.domAttribute });
        }

        // add the events
        klass.addEvent('change', {
            targets: Object.keys(klass._properties),
            category: 'Property Events'
        });
        var eventOptions = {
            category: 'Property Events',
            targets: Object.keys(klass._properties).filter(function(k) { return klass._properties[k].type === 'list'; })
        };
        klass.addEvent('insert', eventOptions);
        klass.addEvent('remove', eventOptions);
        klass.addEvent('modify', eventOptions);
        klass.addEvent('move', eventOptions);
    };

    Properties.types.list.afterRemoveStudio = function(name, property) {
        var klass = this;
        var lname = name.toLowerCase();

        klass._removeAttribute('data-' + lname);
        if(Object.keys(klass._properties).length === 0) {
            klass.removeEvent('change');
        }
        if(Object.keys(klass._properties).filter(function(name) { return klass._properties[name].type === 'list'; }).length === 0) {
            klass.removeEvent('insert');
            klass.removeEvent('remove');
            klass.removeEvent('modify');
            klass.removeEvent('move');
        }
    };

    Properties.types.list.denormalize = function(value) {
        if(value == null) {
            return '';
        }
        return JSON.stringify(value);
    };

})();
