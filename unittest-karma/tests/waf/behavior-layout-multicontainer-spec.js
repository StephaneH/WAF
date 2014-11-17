/* jshint strict:false,expr:true */
/* global describe, it, expect, beforeEach, afterEach, sinon, moduleDescribe */

var Widget   = WAF.require('waf-core/widget'),
    Behavior = WAF.require('waf-core/behavior'),
    WakError = WAF.require('waf-core/error');

moduleDescribe('waf-behavior/layout/multicontainer', function() {
    var W, W1, w, w1;
    beforeEach(function() {
        W = Widget.create('W');
        W.inherit('waf-behavior/layout/multicontainer');
        W1 = Widget.create('W1');
        W1.inherit('waf-behavior/layout/container');
        W.defaultContainer(W1);
        w = new W();
    });
    describe('#currentContainerIndex(index)', function() {
        it('should return undefined if no container selected', function() {
            expect(w.currentContainerIndex()).to.be.undefined;
        });
        it('should set the current container index', function() {
            w.attachWidget(new W1());
            w.currentContainerIndex(0);
            expect(w.currentContainerIndex()).to.equal(0);
        });
        it('should set the current container css class', function() {
            w.attachWidget(new W1());
            w.currentContainerIndex(0);
            expect(w.container(0).node.className.split(' ')).to.contain('waf-state-active');
        });
        it('should remove the container css class', function() {
            w.attachWidget(new W1());
            w.attachWidget(new W1());
            w.currentContainerIndex(0);
            expect(w.container(0).node.className.split(' ')).to.contain('waf-state-active');
            w.currentContainerIndex(1);
            expect(w.container(0).node.className.split(' ')).to.not.contain('waf-state-active');
            expect(w.container(1).node.className.split(' ')).to.contain('waf-state-active');
        });
        it('should throw if set unknown container', function() {
            expect(function() {
                w.currentContainerIndex(123);
            }).to.throw();
        });
    });
    describe('#currentContainer()', function() {
        it('should throw if not current', function() {
            expect(function() {
                w.currentContainer();
            }).to.throw();
        });
        it('should return the current container', function() {
            w.attachWidget(new W1());
            w.currentContainerIndex(0);
            expect(w.currentContainer()).to.equal(w.container(0));
        });
    });
    describe('#setLastContainerAsCurrent()', function() {
        it('should set the last as current', function() {
            w.attachWidget(new W1());
            w.setLastContainerAsCurrent();
            expect(w.currentContainerIndex()).to.equal(0);
        });
    });
    describe('#addContainer(options)', function() {
        it('should call insertContainer', function() {
            sinon.spy(w, 'insertContainer');
            var o = {};
            w.addContainer(o);
            expect(w.insertContainer).to.have.been.calledWith(0, o);
        });
    });
    describe('#removeContainer(index)', function() {
        it('should call detachWidget', function() {
            sinon.spy(w, 'detachWidget');
            w.addContainer();
            w.removeContainer(0);
            expect(w.detachWidget).to.have.been.calledWith(0);
        });
        it('should preserve current container', function() {
            w.addContainer();
            w.addContainer();
            w.addContainer();
            w.currentContainerIndex(0);
            w.removeContainer(1);
            expect(w.currentContainerIndex()).to.equal(0);
        });
        it('should preserve current container if after', function() {
            w.addContainer();
            w.addContainer();
            w.addContainer();
            w.currentContainerIndex(2);
            w.removeContainer(1);
            expect(w.currentContainerIndex()).to.equal(1);
        });
        it('should change current container', function() {
            w.addContainer();
            w.addContainer();
            w.addContainer();
            w.currentContainerIndex(1);
            w.removeContainer(1);
            expect(w.currentContainerIndex()).to.equal(1);
        });
        it('should change current container if was last', function() {
            w.addContainer();
            w.addContainer();
            w.currentContainerIndex(1);
            w.removeContainer(1);
            expect(w.currentContainerIndex()).to.equal(0);
        });
    });
    describe('#insertContainer(index, options)', function() {
        it('should throw if no default container class', function() {
            W.defaultContainer(undefined);
            w = new W();
            expect(function() {
                w.insertContainer(0);
            }).to.throw();
        });
        it('should call insertWidget', function() {
            sinon.spy(w, 'insertWidget');
            w.insertContainer(0);
            expect(w.insertWidget).to.have.been.called;
        });
        it('should preserve current container', function() {
            w.addContainer();
            w.currentContainerIndex(0);
            w.insertContainer(1);
            expect(w.currentContainerIndex()).to.equal(0);
        });
        it('should preserve current container if after', function() {
            w.addContainer();
            w.currentContainerIndex(0);
            w.insertContainer(0);
            expect(w.currentContainerIndex()).to.equal(1);
        });
        it('should create a container class widget', function() {
            w.insertContainer(0);
            expect(w.container(0).constructor).to.equal(W1);
        });
        it('should pass options to the container', function() {
            var o = { a: 1, b: 0 };
            w.insertContainer(0, o);
            var options = w.container(0).options;
            for(var k in o) {
                expect(options).to.have.a.property(k, o[k]);
            }
        });
        it('should attach the given container', function() {
            var w2 = new W1();
            w.insertContainer(0, w2);
            expect(w.container(0)).to.equal(w2);
        });
        it('should attach the given container as option', function() {
            var w2 = new W1();
            w.insertContainer(0, { container: w2 });
            expect(w.container(0)).to.equal(w2);
        });
        it('should instanciate a containerClass container', function() {
            var W2 = Widget.create('W2');
            W2.inherit('waf-behavior/layout/container');
            w.insertContainer(0, { containerClass: W2 });
            expect(w.container(0).constructor).to.equal(W2);
        });
        it('should throw if not a container', function() {
            var W2 = Widget.create('W2');
            expect(function() {
                w.insertContainer(0, { containerClass: W2 });
            }).to.throw();
        });
        it('should attach content widget', function() {
            var a = new W1();
            var b = new W1();
            w.insertContainer(0, { content: [ a, b ] });
            expect(w.container(0).widget(0)).to.equal(a);
            expect(w.container(0).widget(1)).to.equal(b);
        });
    });
    describe('#moveContainer(from, to)', function() {
        it('should call moveWidget', function() {
            sinon.spy(w, 'moveWidget');
            w.addContainer();
            w.addContainer();
            w.moveContainer(0, 1);
            expect(w.moveWidget).to.have.been.calledWith(0,1);
        });
        it('should preserve current container', function() {
            w.addContainer();
            w.addContainer();
            w.addContainer();
            w.currentContainerIndex(0);
            w.moveContainer(0, 1);
            expect(w.currentContainerIndex()).to.equal(1);
        });
        it('should preserve current container if after', function() {
            w.addContainer();
            w.addContainer();
            w.addContainer();
            w.currentContainerIndex(2);
            w.moveContainer(0, 1);
            expect(w.currentContainerIndex()).to.equal(2);
        });
        it('should preserve current container', function() {
            w.addContainer();
            w.addContainer();
            w.addContainer();
            w.currentContainerIndex(1);
            w.moveContainer(0, 2);
            expect(w.currentContainerIndex()).to.equal(0);
        });
        it('should preserve current container if was last', function() {
            w.addContainer();
            w.addContainer();
            w.addContainer();
            w.currentContainerIndex(1);
            w.moveContainer(2, 0);
            expect(w.currentContainerIndex()).to.equal(2);
        });
    });
    describe('#defaultContainerClass(containerClass)', function() {
        it('should return undefined', function() {
            W = Widget.create('W');
            W.inherit('waf-behavior/layout/multicontainer');
            expect(W.defaultContainer()).to.be.undefined;
        });
        it('should return the widget class', function() {
            expect(W.defaultContainer()).to.equal(W1);
        });
        it('should set the widget class', function() {
            W1 = Widget.create('W1');
            W1.inherit('waf-behavior/layout/container');
            expect(W.defaultContainer(W1)).to.equal(W1);
            expect(W.defaultContainer()).to.equal(W1);
        });
        it('should set the defaultContainer in the instance', function() {
            expect(w.defaultContainerClass()).to.equal(W1);
        });
    });
    describe('.defaultContainer(widget)', function() {
        it('should set the default container class', function() {
            var W2 = Widget.create('W2');
            W2.inherit('waf-behavior/layout/container');
            expect(w.defaultContainerClass(W2)).to.equal(W2);
            expect(w.defaultContainerClass()).to.equal(W2);
        });
        it('should create instances of container', function() {
            var W2 = Widget.create('W2');
            W2.inherit('waf-behavior/layout/container');
            w.addContainer();
            expect(w.lastContainer().constructor).to.equal(W1);
            w.defaultContainerClass(W2);
            w.addContainer();
            expect(w.lastContainer().constructor).to.equal(W2);
        });
    });
});
