/* jshint strict:false,expr:true */
/* global describe, it, expect, beforeEach, afterEach, sources, sinon, moduleDescribe */
var Widget = WAF.require('waf-core/widget');

moduleDescribe('waf-behavior/layout/repeater-livescroll', function() {
    var W, W2, w, data;
    beforeEach(function() {
        W2 = Widget.create('W2');
        W2.prototype.init = function() {
            this.node.style.position = 'absolute';
        };
        W = Widget.create('W');
        W.addProperty('items', { type: 'datasource', pageSize: 40 });
        W.inherit('waf-behavior/layout/repeater-livescroll');
        W.linkDatasourcePropertyToRepeater('items');
        W.repeatedWidget(W2);
        W.prototype.getRowHeight = function() { return 13; };
        W.prototype.getScrolledNode = function() {
            if(!$('div', this.node).length) {
                this.node.innerHTML = '<div></div>';
            }
            return $('div', this.node).css({ position: 'relative' }).get(0);
        };


        data = [];
        for(var i = 0; i < 1000; i++) {
            data.push({ toto: 'toto' + i, tata: i });
        }
        window.sources = {
            datasource: new WAF.DataSourceVar({
                "variableReference": data,
                "data-attributes": 'toto:string,tata:number'
            })
        };

        w = new W({ items: sources.datasource });
        w.node.style.overflow = 'scroll';
        w.node.style.height = '200px';
        document.body.appendChild(w.node);
        sinon.spy(w.items, 'fetch');
    });
    afterEach(function() {
        delete window.sources;
        w.destroy();
        document.body.removeChild(w.node);
    });
    describe('_getContainerNode()', function() {
        it('should call getScrolledNode()', function() {
            var o = {};
            w.getScrolledNode = sinon.stub().returns(o);
            expect(w._getContainerNode()).to.equal(o);
            expect(w.getScrolledNode).to.have.been.called;
        });
    });
    describe('repeaterAttachWidget()', function() {
        it('should attach widget after', function() {
            w._currentStart = 0;
            var w2 = new W2();
            w.repeaterAttachWidget(w2, 0);
            w2 = new W2();
            w.repeaterAttachWidget(w2, 1);
            expect(w.indexOfWidget(w2)).to.equal(1);
        });
        it('should attach widget before', function() {
            w._currentStart = 1;
            var w2 = new W2();
            w.repeaterAttachWidget(w2, 1);
            w2 = new W2();
            w.repeaterAttachWidget(w2, 0);
            expect(w.indexOfWidget(w2)).to.equal(0);
        });
        it('should set the top of the widget', function() {
            var w2 = new W2();
            w.repeaterAttachWidget(w2, 7);
            expect(w2.node.offsetTop).to.equal(7*13);
        });
        it('should set waf-state-selected', function() {
            var w2 = new W2();
            w.repeaterAttachWidget(w2, 0);
            expect(w2.hasClass('waf-state-selected')).to.be.true;
        });
        it('should remoeve waf-state-selected', function() {
            var w2 = new W2();
            w2.addClass('waf-state-selected');
            w.repeaterAttachWidget(w2, 1);
            expect(w2.hasClass('waf-state-selected')).to.be.false;
        });
    });
});

