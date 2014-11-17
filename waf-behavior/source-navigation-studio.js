/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


(function() {
	"use strict";
	var Navigation = WAF.require('waf-behavior/source-navigation');
	
	Navigation.customizeProperty('totalPages', {display: false, sourceDisplay: false});
	Navigation.customizeProperty('pageSize', {title: 'Page Size'});
	Navigation.customizeProperty('currentPage', {display: false, sourceDisplay: false});
	Navigation.customizeProperty('navigationMode', {sourceDisplay: false});
	
})();