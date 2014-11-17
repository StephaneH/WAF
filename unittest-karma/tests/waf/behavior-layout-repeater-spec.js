/* jshint strict:false,expr:true */
/* global describe, it, expect, moduleDescribe, afterEach, source, sources, beforeEach, sinon */
var Widget = WAF.require('waf-core/widget');

moduleDescribe('waf-behavior/layout/repeater', function() {
    var W, W2, w, data;
    beforeEach(function() {
        window.sources = window.source = {};
        W = Widget.create('W');
        W.inherit('waf-behavior/layout/repeater');
        W.addProperty('items', { type: 'datasource' });
        W.linkDatasourcePropertyToRepeater('items');
        w = new W();
        data = [ { toto: "coucou", tata: 13 }, { toto: "bonjour", tata: 42 }, { toto: "hello", tata: 7 } ];
        source.datasource = new WAF.DataSourceVar({
            "variableReference": data,
            "data-attributes": 'toto:string,tata:number'
        });
    });
    afterEach(function() {
        delete window.source;
        delete window.sources;
    });

    describe('.linkDatasourcePropertyToRepeater(property)', function() {
        it('should do nothing if unknown property', function() {
            W.linkDatasourcePropertyToRepeater('coucou');
            w = new W();
        });
        it('should do nothing if no property', function() {
            W.removeProperty('items');
            w = new W();
        });
    });
    describe('.repeatedWidget(widget)', function() {
        it('should return undefined', function() {
            expect(W.repeatedWidget()).to.be.undefined;
        });
        it('should save a widget', function() {
            var W2 = Widget.create('W2');
            W.repeatedWidget(W2);
            expect(W.repeatedWidget()).to.equal(W2);
        });
    });
    describe('#repeatedWidget(widget)', function() {
        it('should return undefined', function() {
            expect(w.repeatedWidget()).to.be.undefined;
        });
        it('should save a widget', function() {
            var W2 = Widget.create('W2');
            var w2 = new W2();
            w.repeatedWidget(w2);
            expect(w.repeatedWidget()).to.equal(w2);
        });
        it('should return the class widget widget', function() {
            var W2 = Widget.create('W2');
            W.repeatedWidget(W2);
            w = new W();
            expect(w.repeatedWidget()).to.be.instanceOfClass(W2);
        });
        it('should return the first attached widget', function() {
            var W2 = Widget.create('W2');
            WAF.define('W', function() {
                return { W: W, W2: W2 };
            });
            w = new W($('<div data-type="W" data-package="W"><div data-type="W2" data-package="W" id="W2a"></div><div data-type="W2" data-package="W" id="W2b"></div></div>').get(0));
            expect(w.repeatedWidget()).to.be.instanceOfClass(W2);
            expect(w.repeatedWidget().id).to.equal('W2a');
        });
        it('should remove previously attached widgets', function() {
            var W2 = Widget.create('W2');
            WAF.define('W', function() {
                return { W: W, W2: W2 };
            });
            w = new W($('<div data-type="W" data-package="W"><div data-type="W2" data-package="W" id="W2a"></div><div data-type="W2" data-package="W" id="W2b"></div></div>').get(0));
            expect(w.countWidgets()).to.equal(0);
        });
        it('should redraw the repeater when we change the widget', function() {
        });
    });
    function testMap(s, options) {
        describe('.mapAttributesToRepeatedWidgetProperties' + s, function() {
            beforeEach(function() {
                W = Widget.create('W');
                W.inherit('waf-behavior/layout/repeater');
                W.addProperty('items', { type: 'datasource', attributes: ['toto'] });
                W.linkDatasourcePropertyToRepeater('items');
                W2 = Widget.create('W2', {
                    plop: Widget.property()
                });
                W.repeatedWidget(W2);
                W.mapAttributesToRepeatedWidgetProperties(options);
            });
            it('should bind properties of the repeated widgets on init', function() {
                var w = new W({
                    'items': 'datasource', 
                    'items-attribute-toto': 'toto'
                });
                var bound = w.repeatedWidget().plop.boundDatasource();
                expect(bound).to.have.a.property('datasource', source.datasource);
                expect(bound).to.have.a.property('attribute', 'toto');
            });
            it('should bind properties of the repeated widgets on datasource change', function() {
                var w = new W();
                w.items(source.datasource);
                w.items.mapping({ toto: 'toto' });
                var bound = w.repeatedWidget().plop.boundDatasource();
                expect(bound).to.have.a.property('datasource', source.datasource);
                expect(bound).to.have.a.property('attribute', 'toto');
            });
            if(options.getWidget) {
                it('should call getWidget', function() {
                    sinon.spy(options, 'getWidget');
                    var w = new W({
                        'items': 'datasource', 
                        'items-attribute-toto': 'toto'
                    });
                    var bound = w.repeatedWidget().plop.boundDatasource();
                    expect(bound).to.have.a.property('datasource', source.datasource);
                    expect(bound).to.have.a.property('attribute', 'toto');
                    expect(options.getWidget).to.have.been.calledOn(w);
                    expect(options.getWidget).to.have.been.calledWith(w.repeatedWidget());
                });
            }
            it('should bind properties on the new repeated widgets', function() {
                var w = new W();
                w.items(source.datasource);
                w.items.mapping({ toto: 'toto' });
                var w2 = new W2();
                w.repeatedWidget(w2);
                var bound = w2.plop.boundDatasource();
                expect(bound).to.have.a.property('datasource', source.datasource);
                expect(bound).to.have.a.property('attribute', 'toto');
            });
        });
    }
    testMap('({ attribute: "property" })', { toto: 'plop' });
    testMap('({ attribute: { property: "property" } })', { toto: { property: 'plop' } });
    testMap('({ attribute: { property: "property", getWidget: function() {} } })', { toto: { property: 'plop', getWidget: function(w) { return w; } } });
    // TODO:
    //testMap('({ attribute: { property: "property", formatters: [] } })', { toto: { property: 'plop', formatters: [] } });

    function testRepeat(name, setup) {
        describe('repeat ' + name, function() {
            it('should call getNewItem', function() {
                w = setup();
                var l = Math.min(source.datasource.length, w.items.start() + w.items.pageSize());
                expect(w.getNewItem).to.have.callCount(l - w.items.start());
                for(var i = w.items.start(); i < l; i++) {
                    expect(w.getNewItem).to.have.been.calledWith(i);
                }
            });
            it('should attach the clone to the widget', function() {
                w = setup();
                var l = Math.min(source.datasource.length, w.items.start() + w.items.pageSize());
                expect(w.countWidgets()).to.equal(l - w.items.start());
                for(var i = w.items.start(); i < l; i++) {
                    var clone = w.widget(i - w.items.start());
                    expect(clone.constructor).to.equal(w.repeatedWidget().constructor);
                }
            });
            it('should propagate bindDatasourceElement on clones', function() {
                w = setup();
                var l = Math.min(source.datasource.length, w.items.start() + w.items.pageSize());
                for(var i = w.items.start(); i < l; i++) {
                    var clone = w.widget(i - w.items.start());
                    expect(clone.propagate).to.have.been.calledWith('bindDatasourceElement', source.datasource, i);
                }

            });
            it('should call repeaterAttachWidget', function() {
                w = setup();
                expect(w.repeaterAttachWidget).to.have.been.calledOn(w);
                w.widgets().forEach(function(w2, i) {
                    expect(w.repeaterAttachWidget).to.have.been.calledWith(w2, w.items.start() + i);
                });
            });
            it('should call widgetsToRemoveOnUpdate', function() {
                w = setup();
                expect(w.widgetsToRemoveOnUpdate).to.have.been.calledOn(w);
                expect(w.widgetsToRemoveOnUpdate).to.have.been.calledWith(
                    w.items.start(), 
                    Math.min(w.items().length, w.items.start() + w.items.pageSize())
                );
            });

            describe('#getPosition(widget)', function() {
                it('should return the position of the widget', function() {
                    w = setup();
                    var w3 = w.widget(1);
                    expect(w.getPosition(w3)).to.equal(w.items.start() + 1);
                });
                it('should return the position of the widget index', function() {
                    w = setup();
                    expect(w.getPosition(1)).to.equal(w.items.start() + 1);
                });
                it('should return the position of the widget html node', function() {
                    w = setup();
                    var w3 = w.widget(1);
                    expect(w.getPosition(w3.node)).to.equal(w.items.start() + 1);
                });
                it('should call widget.get with the widget html node', function() {
                    w = setup();
                    var w3 = w.widget(1);
                    sinon.spy(Widget, 'get');
                    w.getPosition(w3.node);
                    expect(Widget.get).to.have.been.calledWith(w3.node);
                    Widget.get.restore();
                });
                it('should throw if not part of the repeater', function() {
                    w = setup();
                    var w3 = new W2();
                    expect(function() {
                        w.getPosition(w3);
                    }).to.throw();
                });
            });
            describe('#widgetByPosition(position)', function() {
                it('should return a widget', function() {
                    w = setup();
                    expect(w.widgetByPosition(w.items.start() + 1)).to.equal(w.widget(1));
                });
                it('should return null if outside the current page', function() {
                    w = setup();
                    expect(w.widgetByPosition(w.items.start() + w.items.pageSize() + 1)).to.be.null;
                });
            });
        });
    }

    testRepeat('onChange', function() {
        W2 = Widget.create('W2');
        sinon.spy(W2.prototype, 'propagate');
        w.repeatedWidget(new W2());
        sinon.spy(w, 'getNewItem');
        sinon.spy(w, 'repeaterAttachWidget');
        sinon.spy(w, 'widgetsToRemoveOnUpdate');
        w.items(source.datasource);
        return w;
    });
    testRepeat('init', function() {
        W2 = Widget.create('W2');
        sinon.spy(W2.prototype, 'propagate');
        W.repeatedWidget(W2);
        sinon.spy(W.prototype, 'getNewItem');
        sinon.spy(W.prototype, 'repeaterAttachWidget');
        sinon.spy(W.prototype, 'widgetsToRemoveOnUpdate');
        w = new W({ items: 'datasource' });
        return w;
    });
    testRepeat('collectionChange', function() {
        W2 = Widget.create('W2');
        sinon.spy(W2.prototype, 'propagate');
        W.repeatedWidget(W2);
        w = new W({ items: 'datasource' });
        sinon.spy(w, 'getNewItem');
        sinon.spy(w, 'repeaterAttachWidget');
        sinon.spy(w, 'widgetsToRemoveOnUpdate');
        W2.prototype.propagate.reset();
        source.datasource.sync();
        return w;
    });
    testRepeat('fetch start', function() {
        W2 = Widget.create('W2');
        sinon.spy(W2.prototype, 'propagate');
        W.repeatedWidget(W2);
        w = new W({ items: 'datasource' });
        sinon.spy(w, 'getNewItem');
        sinon.spy(w, 'repeaterAttachWidget');
        sinon.spy(w, 'widgetsToRemoveOnUpdate');
        W2.prototype.propagate.reset();
        w.items.fetch({ start: 1 });
        return w;
    });
    testRepeat('fetch pageSize', function() {
        W2 = Widget.create('W2');
        sinon.spy(W2.prototype, 'propagate');
        W.repeatedWidget(W2);
        w = new W({ items: 'datasource' });
        sinon.spy(w, 'getNewItem');
        sinon.spy(w, 'repeaterAttachWidget');
        sinon.spy(w, 'widgetsToRemoveOnUpdate');
        W2.prototype.propagate.reset();
        w.items.fetch({ pageSize: 2 });
        return w;
    });
    testRepeat('repeatedWidget change', function() {
        W2 = Widget.create('W2');
        sinon.spy(W2.prototype, 'propagate');
        W.repeatedWidget(W2);
        w = new W({ items: 'datasource' });
        w.items.fetch();

        W2 = Widget.create('W3');
        sinon.spy(W2.prototype, 'propagate');
        sinon.spy(w, 'getNewItem');
        sinon.spy(w, 'repeaterAttachWidget');
        sinon.spy(w, 'widgetsToRemoveOnUpdate');
        w.repeatedWidget(new W2());
        return w;
    });

    describe('.repeaterReuseClonedWidgets()', function() {
        beforeEach(function() {
            W.repeaterReuseClonedWidgets();
            W2 = Widget.create('W2');
            sinon.spy(W2.prototype, 'propagate');
            W.repeatedWidget(W2);
            w = new W();
            w.items(source.datasource);
        });
        it("shouldn't call getNewWidgets", function() {
            sinon.spy(w, 'getNewItem');
            w.items.fetch({start: 1, pageSize: 1 });
            expect(w.getNewItem).to.have.not.been.called;
        });
        it('should reuse widgets', function() {
            var list = w.widgets();
            w.items.fetch({start: 1, pageSize: 1 });
            w.widgets().forEach(function(w2) {
                expect(list).to.contain(w2);
            });
        });
    });
    describe('#widgetsToRemoveOnUpdate(stard, end)', function() {
        it('should remove the returned widget', function() {
            W2 = Widget.create('W2');
            w.repeatedWidget(new W2());
            w.items('datasource');
            w.items.fetch({ start: 0, pageSize: 2 });
            var w2 = w.widget(1);
            var w3 = w.widget(0);
            w.widgetsToRemoveOnUpdate = function() {
                return [w2];
            };
            w.items.fetch({start:2, pageSize: 2});

            expect(w.widgets()).to.contain(w3);
            expect(w.widgets()).to.not.contain(w2);
        });
    });
});
