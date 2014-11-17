/* jshint strict:false,expr:true */
/* global describe, it, expect, beforeEach, afterEach, sources, sinon, moduleDescribe */
var Widget = WAF.require('waf-core/widget');

moduleDescribe('waf-behavior/livescroll', function() {
    var W, w, data;
    beforeEach(function() {
        W = Widget.create('W');
        W.addProperty('items', { type: 'datasource', pageSize: 40 });
        W.inherit('waf-behavior/livescroll');
        W.linkDatasourcePropertyToLiveScroll('items');
        W.prototype.getRowHeight = function() { return 13; };
        W.prototype.getScrolledNode = function() {
            if(!$('div', this.node).length) {
                this.node.innerHTML = '<div></div>';
            }
            return $('div', this.node).get(0);
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
    describe('init', function() {
        it('should set the scrolled node height at init', function() {
            expect(w.getScrolledNode().style.height).to.equal(sources.datasource.length * 13 + 'px');
        });
        it('should throw if no property', function() {
            W.removeProperty('items');
            expect(function() {
                new W();
            }).to.throw();
        });
        it('should throw if no pageSize defined', function() {
            W.removeProperty('items');
            W.addProperty('items', { type: 'datasource' });
            expect(function() {
                new W();
            }).to.throw();
        });
    });
    describe('on datasource change', function() {
        it('should set the scrolled node height', function() {
            var w = new W();
            w.items(sources.datasource);
            expect(w.getScrolledNode().style.height).to.equal(sources.datasource.length * 13 + 'px');
        });
    });
    describe('collectionChange event', function() {
        it('should set the scrolled node height', function() {
            data.push({ toto: 'ccc', tata: 123456 });
            sources.datasource.sync();
            expect(w.getScrolledNode().style.height).to.equal(sources.datasource.length * 13 + 'px');
        });
    });
    describe('onScroll event', function() {
        beforeEach(function() {
            w.items.onPageChange(function(elements, start, pageSize) {
                var end = Math.min(sources.datasource.length, start + pageSize);
                this.getItemsToRemoveOnUpdate([], start, end);
            });
        });
        it('should not fetch if between current page', function() {
            w.items.fetch.reset();
            w.node.scrollTop = 100;
            $(w.node).trigger('scroll');
            expect(w.items.fetch).to.not.have.been.called;
        });
        it('should fetch a new page if scroll after getThreshold', function() {
            w.items.fetch.reset();
            w.node.scrollTop = 13 * (40 - 1);
            $(w.node).trigger('scroll');
            expect(w.items.fetch).to.have.been.called;
            var args = w.items.fetch.lastCall.args[0];
            expect(args).to.have.a.property('start', 40);
        });
        it('should fetch a new page if scroll after getThreshold elsewhere', function() {
            w.items.fetch.reset();
            w.node.scrollTop = 1500;
            $(w.node).trigger('scroll');
            expect(w.items.fetch).to.have.been.called;
            var args = w.items.fetch.lastCall.args[0];
            expect(args).to.have.a.property('start', Math.floor(1500 / 13) - 8);
        });
        it('should fetch a new page if scroll before theshold', function() {
            w.node.scrollTop = 1500;
            $(w.node).trigger('scroll');

            var s = w._currentStart;

            w.items.fetch.reset();

            w.node.scrollTop = 1500 - 9 * 40;
            $(w.node).trigger('scroll');

            expect(w.items.fetch).to.have.been.called;
            var args = w.items.fetch.lastCall.args[0];
            expect(args).to.have.a.property('start', s - 40);
        });
        it('should fetch a new page if scroll before theshold anywhere', function() {
            w.node.scrollTop = 1500;
            $(w.node).trigger('scroll');

            var s = w._currentStart;

            w.items.fetch.reset();

            w.node.scrollTop = 1500 - 9 * 40;
            $(w.node).trigger('scroll');

            expect(w.items.fetch).to.have.been.called;
            var args = w.items.fetch.lastCall.args[0];
            expect(args).to.have.a.property('start', s - 40);
        });
    });
    describe('getItemsToRemoveOnUpdate(items, start, end)', function() {
        it('should remove all if non contiguous after', function() {
            w.items.pageSize(5);
            w._currentStart = 10;
            w._currentPageSize = 10;
            var items = [];
            for(var i = 0; i < w._currentPageSize; i++) {
                items.push(w._currentStart + i);
            }
            var result = w.getItemsToRemoveOnUpdate(items, 100, 105);
            expect(result).to.deep.equal([10,11,12,13,14,15,16,17,18,19]);
        });
        it('should remove all if non contiguous before', function() {
            w.items.pageSize(5);
            w._currentStart = 10;
            w._currentPageSize = 10;
            var items = [];
            for(var i = 0; i < w._currentPageSize; i++) {
                items.push(w._currentStart + i);
            }
            var result = w.getItemsToRemoveOnUpdate(items, 0, 5);
            expect(result).to.deep.equal([10,11,12,13,14,15,16,17,18,19]);
        });
        it('should remove nothing if contiguous after but only one page or less', function() {
            w.items.pageSize(10);
            w._currentStart = 10;
            w._currentPageSize = 10;
            var items = [];
            for(var i = 0; i < w._currentPageSize; i++) {
                items.push(w._currentStart + i);
            }
            var result = w.getItemsToRemoveOnUpdate(items, 5, 10);
            expect(result).to.deep.equal([]);
        });
        it('should remove nothing if contiguous before but only one page or less', function() {
            w.items.pageSize(10);
            w._currentStart = 10;
            w._currentPageSize = 10;
            var items = [];
            for(var i = 0; i < w._currentPageSize; i++) {
                items.push(w._currentStart + i);
            }
            var result = w.getItemsToRemoveOnUpdate(items, 20, 25);
            expect(result).to.deep.equal([]);
        });
        it('should remove one page if contiguous after', function() {
            w.items.pageSize(5);
            w._currentStart = 10;
            w._currentPageSize = 10;
            var items = [];
            for(var i = 0; i < w._currentPageSize; i++) {
                items.push(w._currentStart + i);
            }
            debugger;
            var result = w.getItemsToRemoveOnUpdate(items, 20, 25);
            expect(result).to.deep.equal([10,11,12,13,14]);
        });
        it('should remove one page if contiguous before', function() {
            w.items.pageSize(5);
            w._currentStart = 10;
            w._currentPageSize = 10;
            var items = [];
            for(var i = 0; i < w._currentPageSize; i++) {
                items.push(w._currentStart + i);
            }
            var result = w.getItemsToRemoveOnUpdate(items, 5, 10);
            expect(result).to.deep.equal([15,16,17,18,19]);
        });
    });
});

