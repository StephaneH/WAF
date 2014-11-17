/* jshint strict:false,expr:true */
/* global describe, it, expect, beforeEach, afterEach, sinon, source, testAccessor, moduleDescribe */
var Widget = WAF.require('waf-core/widget');

moduleDescribe('waf-behavior/properties-template', function() {
    describe('addProperty(datasourceProperty: undefined)', function() {
        var W, w, data;
        beforeEach(function() {
            window.sources = window.source = {};
            W = Widget.create('W');
            W.addProperty('prop', { type: 'template', templates: [
                { name: 'plop', template: '<b>{{ name }}</b>' },
                { name: 'plip', template: '<i>{{ name }}</i>' }
            ]});
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

        testAccessor({ type: 'template' }, [ 'a', 'b', 'c']);

        describe('accessor()', function() {
            it('should trigger a onDataChange', function() {
                var spy = sinon.spy();
                w.subscribe('dataChange', 'prop', spy);
                w.prop('coucou');
                expect(spy).to.have.been.called;
            });
        });

        describe('accessor.templates()', function() {
            it('should return the list of templates', function() {
                expect(w.prop.templates()).to.deep.equal([
                    { name: 'plop', template: '<b>{{ name }}</b>' },
                    { name: 'plip', template: '<i>{{ name }}</i>' }
                ]);
            });
            it('should return an empty list if no predefined templates', function() {
                W.addProperty('prop2', { type: 'template' });
                w = new W();
                expect(w.prop2.templates()).to.be.an('array').to.have.length(0);
            });
        });
        describe('accessor.select(name)', function() {
            it('should change the template', function() {
                w.prop.select('plop');
                expect(w.prop()).to.equal('<b>{{ name }}</b>');
            });
            it('should return the selected template name', function() {
                w.prop('<b>{{ name }}</b>');
                expect(w.prop.select()).to.equal('plop');
            });
            it('should return null if the current template is not predefined', function() {
                w.prop('<bjgfjgff>');
                expect(w.prop.select()).to.be.null;
            });
            it('should throw if unknown template name', function() {
                expect(function() {
                    w.prop.selct('kbhv');
                }).to.throw;
            });
        });
        describe('accessor.render(object)', function() {
            it('should return a rendered string', function() {
                w.prop('<b>{{ coucou }}</b>{{toto}}');
                expect(w.prop.render({ coucou: 'a', toto: 5 })).to.equal('<b>a</b>5');
            });
            it('should call prop.attribute() for missing values', function() {
                sinon.spy(w.prop, 'attribute');
                w.prop('<b>{{ coucou }}</b>{{toto}}');
                w.prop.render({ toto: 5 });
                expect(w.prop.attribute).to.have.been.calledWith('coucou');
                expect(w.prop.attribute).to.not.have.been.calledWith('toto');
            });
            it('should call prop.attribute() if no values', function() {
                sinon.spy(w.prop, 'attribute');
                w.prop('<b>{{ coucou }}</b>{{toto}}');
                w.prop.render();
                expect(w.prop.attribute).to.have.been.calledWith('coucou');
                expect(w.prop.attribute).to.have.been.calledWith('toto');
            });
            it('should throw if no template', function() {
                expect(function() {
                    w.prop.render({});
                }).to.throw;
            });
            it('should use the toString() of an object', function() {
                w.prop('<b>{{ coucou }}</b>');
                expect(w.prop.render({ coucou: {} })).to.equal('<b>[object Object]</b>');
            });
            it('should use the toString() of an object 2', function() {
                w.prop('<b>{{ coucou }}</b>');
                expect(w.prop.render({ coucou: { toString: function() { return 'plop'; } } })).to.equal('<b>plop</b>');
            });
            it('should automatically resolve image datasource attributes', function() {
                w.prop('<b>{{ coucou }}</b>');
                expect(w.prop.render({ coucou: { __deferred: { uri: 'aaa'  } } })).to.equal('<b>aaa</b>');
            });
        });
        describe('accessor.attributes()', function() {
            // override default widget for this test since by default first template bug has been fixed
            beforeEach(function() {
                W = Widget.create('W');
                W.addProperty('prop', { type: 'template' });
                w = new W();
            });
            it('should return the list of attributes', function() {
                w.prop('<b>{{ coucou }}</b>{{toto}}');
                expect(w.prop.attributes()).to.be.an('array').to.have.length(2);
                expect(w.prop.attributes()).to.contain('coucou');
                expect(w.prop.attributes()).to.contain('toto');
            });
            it('should return empty list if no template', function() {
                expect(w.prop.attributes()).to.be.an('array').to.have.length(0);
            });
        });
        describe('accessor.onDataChange(callback)', function() {
            it('should subscribe to a dataChange event', function() {
                var spy = sinon.spy();
                w.prop.onDataChange(spy);
                w.fire('dataChange');
                expect(spy).to.have.been.calledWith('<b></b>');
                expect(spy).to.have.been.calledOn(w);
            });
        });
        describe('accessor.attribute(attributeName, value)', function() {
            beforeEach(function() {
                w.prop('<b>{{ coucou }}</b>{{toto}}');
            });
            it('should return null on init', function() {
                expect(w.prop.attribute('coucou')).to.be.null;
            });
            it('should set a new value', function() {
                expect(w.prop.attribute('coucou', 'blabla')).to.equal('blabla');
            });
            it('should retreive a value', function() {
                w.prop.attribute('coucou', 'blabla');
                expect(w.prop.attribute('coucou')).to.equal('blabla');
            });
            it('should trigger a datachange on new value', function() {
                var spy = sinon.spy();
                w.subscribe('dataChange', 'prop', spy);
                w.prop.attribute('coucou', 'blabla');
                expect(spy).to.have.been.called;
            });
            it('should not trigger a datachange on same value', function() {
                var spy = sinon.spy();
                w.subscribe('dataChange', 'prop', spy);
                w.prop.attribute('coucou', 'blabla');
                w.prop.attribute('coucou', 'blabla');
                expect(spy).to.have.been.calledOnce;
            });
            it('should get values from init', function() {
                w = new W({ 'prop': '{{ coucou }}', 'prop-attribute-coucou': 'bonjour' });
                expect(w.prop.attribute('coucou')).to.equal('bonjour');
            });
        });
        describe('accessor.bindAttribute(attributeName, binding)', function() {
            it('should call bindDatasourceAttribute', function() {
                sinon.spy(w, 'bindDatasourceAttribute');
                w.prop.bindAttribute('coucou', { datasource: source.datasource, attribute: 'toto' });
                expect(w.bindDatasourceAttribute).to.have.been.called;
            });
            it('should call bindDatasourceAttribute with string', function() {
                sinon.spy(w, 'bindDatasourceAttribute');
                w.prop.bindAttribute('coucou', 'datasource.toto');
                expect(w.bindDatasourceAttribute).to.have.been.called;
            });
            it('should return a subscriber', function() {
                var subscriber = w.prop.bindAttribute('coucou', { datasource: source.datasource, attribute: 'toto' });
                expect(subscriber).to.have.a.property('unsubscribe').to.be.a('function');
            });
            it('should unsubscribe previous binding', function() {
                var subscriber = w.prop.bindAttribute('coucou', { datasource: source.datasource, attribute: 'toto' });
                sinon.spy(subscriber, 'unsubscribe');
                var datasource = new WAF.DataSourceVar({
                    "variableReference": data,
                    "data-attributes": 'attr1:string'
                });
                w.prop.bindAttribute('coucou', { datasource: datasource, attribute: 'attr1' });
                expect(subscriber.unsubscribe).to.have.been.called;
            });
            it('should call attribute on datasource binding', function() {
                sinon.spy(w.prop, 'attribute');
                w.prop.bindAttribute('coucou', { datasource: source.datasource, attribute: 'toto' });
                expect(w.prop.attribute).to.have.been.calledWith('coucou', 'coucou');
            });
            it('should call attribute on datasource binding with string binding', function() {
                sinon.spy(w.prop, 'attribute');
                w.prop.bindAttribute('coucou', 'datasource.toto');
                expect(w.prop.attribute).to.have.been.calledWith('coucou', 'coucou');
            });
            it('should call attribute on datasource update', function() {
                w.prop.bindAttribute('coucou', { datasource: source.datasource, attribute: 'toto' });
                sinon.spy(w.prop, 'attribute');
                source.datasource.getAttribute('toto').setValue('bonjour');
                expect(w.prop.attribute).to.have.been.calledWith('coucou', 'bonjour');
            });
            it('should call attribute on datasource update with string binding', function() {
                w.prop.bindAttribute('coucou', 'datasource.toto');
                sinon.spy(w.prop, 'attribute');
                source.datasource.getAttribute('toto').setValue('bonjour');
                expect(w.prop.attribute).to.have.been.calledWith('coucou', 'bonjour');
            });
            it('should be able to render without arguments on datasource binding', function() {
                w.prop('{{ coucou }}');
                w.prop.bindAttribute('coucou', { datasource: source.datasource, attribute: 'toto' });
                expect(w.prop.render()).to.equal('coucou');
            });
            it('should be able to render without arguments on datasource binding with string binding', function() {
                w.prop('{{ coucou }}');
                w.prop.bindAttribute('coucou', 'datasource.toto');
                expect(w.prop.render()).to.equal('coucou');
            });
            it('should be able to render without arguments on datasource update', function() {
                w.prop('{{ coucou }}');
                w.prop.bindAttribute('coucou', { datasource: source.datasource, attribute: 'toto' });
                source.datasource.getAttribute('toto').setValue('bonjour');
                expect(w.prop.render()).to.equal('bonjour');
            });
            it('should be able to render without arguments on datasource update with string binding', function() {
                w.prop('{{ coucou }}');
                w.prop.bindAttribute('coucou', 'datasource.toto');
                source.datasource.getAttribute('toto').setValue('bonjour');
                expect(w.prop.render()).to.equal('bonjour');
            });
            // FIXME: the binding is single way
            // it('should update datasource on attribute update', function() {
            //     w.prop.bindAttribute('coucou', { datasource: source.datasource, attribute: 'toto' });
            //     w.prop.attribute('coucou', 'bonjour');
            //     expect(source.datasource.getAttribute('toto').getValue()).to.equal('bonjour');
            // });
            it('should get values from init', function() {
                w = new W({ 'prop': '{{ plop }}', 'prop-binding-plop': 'datasource.toto' });
                expect(w.prop.attribute('plop')).to.equal('coucou');
            });
            it('should keep subscribing after changing the template', function() {
                w.prop('{{ coucou }}');
                w.prop.bindAttribute('coucou', 'datasource.toto');
                w.prop('encore {{ coucou }}');
                w.prop.onDataChange(function(s) {
                    expect(s).to.equal('encore coucou');
                });
            });
            it('should unsubscribe old attributes after changing the template', function() {
                w.prop('{{ coucou }}');
                var sub = w.prop.bindAttribute('coucou', 'datasource.toto');
                sinon.spy(sub, 'unsubscribe');
                w.prop('{{ blabla }}');
                expect(sub.unsubscribe).to.have.been.called;
            });
        });
    });


    describe('addProperty(datasourceProperty: defined)', function() {
        it('should throw if wrong datasource property', function() {
            var W = Widget.create('W');
            W.addProperty('prop2', { type: 'string' });
            W.addProperty('prop', {
                type: 'template',
                templates: [
                    { name: 'plop', template: '<b>{{ name }}</b>' },
                    { name: 'plip', template: '<i>{{ name }}</i>' }
                ],
                datasourceProperty: 'prop2'
            });
            expect(function() {
                new W();
            }).to.throw();
        });
        it('should throw if unknown datasource property', function() {
            var W = Widget.create('W');
            W.addProperty('prop', {
                type: 'template',
                templates: [
                    { name: 'plop', template: '<b>{{ name }}</b>' },
                    { name: 'plip', template: '<i>{{ name }}</i>' }
                ],
                datasourceProperty: 'prop2'
            });
            expect(function() { new W(); }).to.throw();
        });
        it('should not throw if datasource property declared after', function() {
            var W = Widget.create('W');
            W.addProperty('prop', {
                type: 'template',
                templates: [
                    { name: 'plop', template: '<b>{{ name }}</b>' },
                    { name: 'plip', template: '<i>{{ name }}</i>' }
                ],
                datasourceProperty: 'prop2'
            });
            W.addProperty('prop2', { type: 'datasource' });
            expect(function() { new W(); }).to.not.throw();
        });
    });

    describe('addProperty(datasourceProperty: defined)', function() {
        var W, w, data;
        beforeEach(function() {
            window.sources = window.source = {};
            W = Widget.create('W');
            W.addProperty('prop2', { type: 'datasource' });
            W.addProperty('prop', {
                type: 'template',
                templates: [
                    { name: 'plop', template: '<b>{{ name }}</b>' },
                    { name: 'plip', template: '<i>{{ name }}</i>' }
                ],
                datasourceProperty: 'prop2'
            });
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

        testAccessor({ type: 'template' }, [ 'a', 'b', 'c']);
        
        describe('accessor()', function() {
            it('should trigger a onDataChange', function() {
                var spy = sinon.spy();
                w.subscribe('dataChange', 'prop', spy);
                w.prop('coucou');
                expect(spy).to.have.been.called;
            });
        });

        describe('datasourceaccessor.attributes()', function() {
            it('should return the list of attributes', function() {
                w.prop('<b>{{ coucou }}</b>{{toto}}');
                expect(w.prop2.attributes()).to.be.an('array').to.have.length(2);
                var names = w.prop2.attributes().map(function(i) { return i.name; });
                expect(names).to.contain('coucou');
                expect(names).to.contain('toto');
            });
            // note: this test fails since by default the first template is selected according to SPEC
            // so attributes() returns the array ['name']
//            it('should return empty list if no template', function() {
//                expect(w.prop2.attributes()).to.be.an('array').to.have.length(0);
//            });
        });

        describe('accessor.bindAttribute(attributeName, binding)', function() {
            // it('should throw an exception', function() {
            // });
        });

        describe('datasourceaccessor()', function() {
            it('should fire a dataChange', function() {
                w.prop('<b>{{ a }}</b>{{ b }}');
                w.prop2.mapping({ a: 'toto', b: 'tata'});
                var spy = sinon.spy();
                w.prop.onDataChange(spy);
                w.prop2(source.datasource);
                expect(spy).to.have.been.calledOn(w);
            });
            it('should fire a dataChange with rendered strings', function(done) {
                w.prop('<b>{{ a }}</b>{{ b }}');
                w.prop2.mapping({ a: 'toto', b: 'tata'});
                w.prop.onDataChange(function(rendered) {
                    expect(rendered).to.be.a('array').to.have.length(3);
                    expect(rendered).to.deep.equal([ '<b>coucou</b>13', '<b>bonjour</b>42', '<b>hello</b>7' ]);
                    done();
                });
                w.prop2(source.datasource);
            });
        });
        describe('datasourceaccessor.fetch()', function() {
            it('should fire a dataChange', function() {
                w.prop('<b>{{ a }}</b>{{ b }}');
                w.prop2.mapping({ a: 'toto', b: 'tata'});
                w.prop2(source.datasource);
                var spy = sinon.spy();
                w.prop.onDataChange(spy);
                w.prop2.fetch();
                expect(spy).to.have.been.calledOn(w);
            });
            it('should fire a dataChange with rendered strings', function(done) {
                w.prop('<b>{{ a }}</b>{{ b }}');
                w.prop2.mapping({ a: 'toto', b: 'tata'});
                w.prop2(source.datasource);
                w.prop.onDataChange(function(rendered) {
                    expect(rendered).to.be.a('array').to.have.length(3);
                    expect(rendered).to.deep.equal([ '<b>coucou</b>13', '<b>bonjour</b>42', '<b>hello</b>7' ]);
                    done();
                });
                w.prop2.fetch();
            });
        });

        describe('accessor.template() with an array', function() {
            it('should automatically select the first template if none specified', function() {
                var test = w.prop();
                expect(w.prop()).to.be.a('string').to.be.equal('<b>{{ name }}</b>');
            });
        });
        
        describe('accessor.extractVariables', function() {
            beforeEach(function() {
                W = Widget.create('W');
                W.addProperty('template', {
                    type: 'template',
                    templates: [
                    {
                        name: 'plop',
                        template: '<b>{{ name }}</b>'
                    },
                    {
                        name: 'plop 2',
                        template: '<b>{{#if true}}<span class="attachment">{{ Yop }}</span>{{else}}{{ Yep }}{{/if}}{{ Yeah }}</b>'
                    },
                    {
                        name: 'plop 3',
                        template: '<b>{{#if Cond}}Yep{{/if}}</b>'
                    },
                    {
                        name: 'plop 4',
                        template: '<b>{{var1}}Yep{{var1}}</b>'
                    }]
                });
                
                w = new W();
                source.datasource = new WAF.DataSourceVar({
                    "variableReference": data,
                    "data-attributes": 'toto:string,tata:number'
                });
                source.datasource2 = new WAF.DataSourceVar({
                    "variableReference": [],
                    "data-attributes": 'toto:string,tata:number'
                });   
            }); 
            
            afterEach(function() {
                delete window.source;
                delete window.sources;
            });
            
            it('should return all (and only) variables', function() {
                var vars = w.template.extractVariables();
                
                expect(vars).to.be.a('array');
                expect(vars).to.have.length(1);
                expect(vars).to.have.members(['name']);
            });

            it('should properly handle variables found inside else statements', function() {
                w.template.select('plop 2');
                var vars = w.template.extractVariables();

                expect(vars).to.be.a('array');
                expect(vars).to.have.length(3);
                expect(vars).to.have.members(['Yop','Yep','Yeah']);
            });
            
            it('should properly extract variables part of if test', function() {
                w.template.select('plop 3');
                var vars = w.template.extractVariables();

                expect(vars).to.be.a('array');
                expect(vars).to.have.length(1);
                expect(vars).to.have.members(['Cond']);
            });
            
            it('should return unique variables', function() {
                w.template.select('plop 4');
                var vars = w.template.extractVariables();

                expect(vars).to.be.a('array');
                expect(vars).to.have.length(1);
                expect(vars).to.have.members(['var1']);
            });
            // TODO...
//            it('should return unique variables', function() {
//                var vars = w.template.extractVariables();
//                
//                expect(vars).to.be.a('array');
//                expect(vars).to.have.length(1);
//                expect(vars).to.have.members(['name']);
//            });
//            
//            
//            it('should return an empty array if no variables are found', function() {
//                var vars = w.template.extractVariables();
//                
//                expect(vars).to.be.a('array');
//                expect(vars).to.have.length(1);
//                expect(vars).to.have.members(['name']);
//            });
        });
    });
});
