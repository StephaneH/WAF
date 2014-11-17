(function() {
    "use strict";
    /* global Designer */
    var Properties = WAF.require('waf-behavior/properties');

    //Properties.types.template.attribute = { typeValue: 'datasource' };
    Properties.types.template.afterAddStudio = function(name, property) {
        var klass = this;
        var lname = name.toLowerCase();
        var category = String.capitalize(name) + ' property';

        var previousValue, attributeFilter;

        var comboOptions = [],
            history = {},
            firstRun = true;

        if (property.templates) {
            comboOptions = property.templates.map(function(temp) {
                // temporary fix: replace tabulations by spaces, see task: 11573
                return { key: temp.template.replace(/\t/g, ' '), value: temp.name };
            });
        }

        if('datasourceProperty' in property) {
            var dsName = 'data-' + property.datasourceProperty.toLowerCase();
            attributeFilter = new RegExp('^' + dsName + '-attribute-');

            // saves mapping when changing template so that it can be restored when going
            // back to this template
            var saveMapping = function(tag, widget) {
                var tagId = tag.getId(),
                    previousTpl = widget[property.functionName](),
                    attributes = widget[property.functionName].attributes(),
                    prefix = dsName + '-attribute-',
                    currentNode;

                if (!history[tagId]) {
                    history[tagId] = {};
                }

                currentNode = history[tagId];

                if (!currentNode[previousTpl]) {
                    currentNode[previousTpl] = {};
                }

                currentNode = currentNode[previousTpl];

                attributes.forEach(function(attributeName) {
                    var attName = prefix + attributeName,
                        attribute = tag.getAttribute(attName.toLowerCase()),
                        val = attribute && attribute.getValue() || '';

                    currentNode[attributeName.toLowerCase()] = val;
                });
            };

            var updateDatasourceAttributes = function(tag, refreshAttributes) {
                var dsCategory = klass._configuration.attributes[dsName].category;
                var widget = tag.getWidget();

                var attributes = widget[property.functionName].attributes(),
                    previousMapping = null;

                // on first run, there is no history available: we need to check for this
                if (history[tag.getId()] && history[tag.getId()][widget[property.functionName]()]) {
                    previousMapping = history[tag.getId()][widget[property.functionName]()];
                } else {
                    if (!history[tag.getId()]) {
                        history[tag.getId()] = {};
                    }
                    previousMapping = history[tag.getId()][widget[property.functionName]()] = {};
                }

                if (refreshAttributes === true) {
                    // Remove previous data-<datasource>-attribute-* from tag
                    tag.config.attributes = tag.config.attributes.filter(function(i) {
                        if(!attributeFilter.test(i.name)) {
                            return true;
                        }

                        tag._attributes.remove(i.name, true);

                        // remove attribute from hash as well since
                        // TODO: move fix into Tag/Attribute but cannot do that now since some code may break
                        delete tag._attributes._hash[i.name];

                        // and manually delete it from json since tag.DOMUpdate
                        // guess tag.removeAttribute() should remove it from element as well
                        // TODO: move fix into Tag/Attribute once it's fixed there as well
                        tag.getElementNode().removeAttribute(i.name);

                        return false;
                    });

                    // Add new data-<datasource>-attribute-*
                    // NOTE that due to a bug inside designer.tag.attribute.remove, tag will retrieve its latest value

                    attributes.forEach(function(attribute) {
                        var attributeName = dsName + '-attribute-' + attribute.toLowerCase();

                        // since panel property iterates through config, we have to add it to the config in addition to the
                        // tag itself
                        tag.addAttribute(attributeName);
                        tag.config.attributes.push({
                            name : attributeName,
                            description: attribute.capitalize() + ' attribute',
                            category: dsCategory,
                            type: 'textField',
                            typeValue: 'datasource',
                            prefixDatasourceAttribute: dsName
                        });

                        // restore history
                        if (previousMapping && previousMapping[attribute.toLowerCase()]) {
                            tag.getAttribute(attributeName).setValue(previousMapping[attribute.toLowerCase()]);
                        } else {
                            previousMapping[attribute.toLowerCase()] = tag.getAttribute(attributeName).getValue();
                        }
                    });
                }

                // static binding
                tag.config.attributes.some(function(staticAttribute) {
                    if(staticAttribute.name !== 'data-static-' + property.datasourceProperty.toLowerCase()) {
                        return false;
                    }
                    staticAttribute.columns = attributes.map(function(name) {
                        return { name: name, type: 'textField' };
                    });
                    return true;
                });

                Designer.tag.refreshPanels(tag, false);
            };

            klass._addAttribute('data-' + lname, {
                type: 'dropdown',
                category: category,
                options: comboOptions,
                defaultValue: comboOptions[0].key,
                onchange: function(data) {
                    var widget = this.data.tag.getWidget();

                    // save previous mapping
                    saveMapping(this.data.tag, widget);

                    // set new value
                    widget[property.functionName](this.getValue());

                    firstRun = true;

                    // update attributes list
                    updateDatasourceAttributes(this.data.tag, true);

                    // be sure to remove older attributes from json
                    this.data.tag.domUpdate();
                },
                ready: function() {
                    var description = '';
                    if(property.description) {
                        description += property.description + '\n';
                    }
                    description += 'this.' + property.functionName + '(string)';
                    this.htmlObject.parents('tr').find('label').slice(0, 1).attr('title', description);
                }
            });

            klass._studioOn('propertyPanelReady', function() {
                // if we receive a propertyPanelReady it means panel has been refreshed
                // so we don't need to refresh it again
                updateDatasourceAttributes(Designer.getCurrent(), firstRun === true);

                firstRun = false;
            });

        } else {
            attributeFilter = new RegExp('^data-' + lname + '-(attribute|binding)-');

            // update attributes list: called on template change
            var updateTemplateAttributes = function(tag) {
                var widget = tag.getWidget();

                var attributes = widget[property.functionName].attributes();

                // Remove previous template attributes
                tag.config.attributes = tag.config.attributes.filter(function(i) {
                    // only remove template attributes starting with 'data-collection-attribute-' that are not present in the new template as well:
                    // two templates can share the same variables ; removing the second check would remove attributes that are shared with both template
                    if (!attributeFilter.test(i.name) || attributes.indexOf(i.name.replace('data-collection-attribute-', '')) === -1) {
                        return true;
                    }

                    tag._attributes.remove(i.name, true);

                    // remove attribute from hash as well since
                    // TODO: move fix into Tag/Attribute but cannot do that now since some code may break
                    delete tag._attributes._hash[i.name];

                    return false;
                });

                // Add new attributes
                attributes.forEach(function(attribute) {
                    var attributeName = 'data-' + lname + '-attribute-' + attribute.toLowerCase();
                    tag.addAttribute(attributeName);
                    tag.config.attributes.push({
                        name : attributeName,
                        description: attribute.capitalize(),
                        category: category,
                        type: 'textField'
                    });

                    attributeName = 'data-' + lname + '-binding-' + attribute.toLowerCase();
                    tag.addAttribute(attributeName);
                    tag.config.attributes.push({
                        name : attributeName,
                        description: attribute.capitalize() + ' source',
                        category: category,
                        type: 'textField',
                        typeValue: 'datasource'
                    });
                });

                Designer.tag.refreshPanels(tag, false);
            };

            klass._addAttribute('data-' + lname, {
                type: 'combobox',
                category: category,
                options: comboOptions,
                defaultValue: comboOptions[0].key,
                onchange: function( data) {
                    var widget = this.data.tag.getWidget();
                    widget[property.functionName](this.getValue());

                    firstRun = true;

                    updateTemplateAttributes(this.data.tag);
                },
                ready: function() {
                    var description = '';
                    if(property.description) {
                        description += property.description + '\n';
                    }
                    description += 'this.' + property.functionName + '(string)';
                    this.htmlObject.parents('tr').find('label').slice(0, 1).attr('title', description);
                }
            });

            klass._studioOn('propertyPanelReady', function() {
                updateTemplateAttributes(Designer.getCurrent());
            });

        }
    };

    //Properties.types.template.afterInitBehaviorStudio = function(name, property) {
    //};

})();
