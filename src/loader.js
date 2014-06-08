// Loader
// http://alexpts.ru
// (c) 2011-2014 Alexpts
// Loader may be freely distributed under the MIT license

(function($, window){
    'use strict';

    var $head = $('head');
    var $document = $(document);

    var _createNode = function(name, attrs) {
        var node = document.createElement(name), attr;

        for(attr in attrs) {
            if(attrs.hasOwnProperty(attr)) {
                node.setAttribute(attr, attrs[attr]);
            }
        }

        return node;
    };

    var _getExt = function(url){
        return url.replace(/.*\.(\w+)$/, '$1').toLowerCase(); // .js, .css, .json, .tpl
    };

    var _lazyScriptTransport = function(s, originalOptions, jqXHR) {
        var ext = _getExt(s.url), node;

        return {
            send: function(headers, callback ) {
                // @todo add api to extend types
                switch(ext) {
                    case 'js':
                        node = _createNode('script', {'src': s.url});
                        break;
                    case 'css':
                        node = _createNode('link', {'href': s.url, 'rel': 'stylesheet'});
                        break;
                    default :
                        console.log("Unknow extension module");
                        jqXHR.abort();
                        return false;
                }

                node.charset = s.scriptCharset || "utf-8";

                node.onload = node.onreadystatechange = function() {
                    if(!node.readyState || /loaded|complete/.test(node.readyState)) {
                        node = node.onload = node.onreadystatechange = null;
                        callback(200, "success");
                    }
                };

                node.onerror = function(){
                    $head[0].removeChild(node);
                    node = node.onload = node.onreadystatechange = null;
                    callback(404, "error");
                };

                $head[0].appendChild(node);
                return true;
            },

            abort: function() {
                node.onerror();
            }
        };
    };
    $.ajaxTransport('lazy_script', _lazyScriptTransport);

    /**
     * @param {Function|Array} stack
     * @param {Array|Function} newCallback
     * @returns {Array}
     */
    var _addCallback = function(stack, newCallback){

        if(!stack) {
            stack = [];
        } else if(!Array.isArray(stack)) {
            stack = [stack];
        }

        if(Array.isArray(newCallback)) {
            stack = stack.concat(newCallback);
        } else {
            stack.push(newCallback);
        }

        return stack;
    };

    /**
     * @param {Object} [options]
     * @param {String} options.moduleDir
     * @param {Boolean} options.addFromPage
     * @param {Object} options.components
     */
    var Loader = function(options) {
        options = options || {};

        var READY = 1;
        var PENDING = 2;
        var ERROR = 3;

        options = $.extend({
            moduleDir: '', // relpath
            addFromPage: true,
            components: []
        }, options);

        var pool = {};
        var components = {};

        /**
         * @param {String} name
         * @param {Object} [params]
         * @returns {String}
         */
        var getUrl = function(name, params) {

            if(params.url) {
                return params.url;
            }

            if(params.relUrl) {
                return options.moduleDir + '/' + params.relUrl;
            }

            if(components[name]) {
                return getUrl(name, components[name]);
            }

            return (/\/\//.test(name)) ? name :  options.moduleDir + '/' + name; // [http(s):]//ya.ru/path.js
        };

        /**
         * @param {String} name
         * @param {Object} [params] - implement $.ajax(params) - http://stage.api.jquery.com/jQuery.ajax/
         * @param {String} [params.relUrl]
         * @param {Function} [callback]
         * @returns {Object} jqXHR
         */
        var load = function(name, params, callback) {
            params = params || {};
            if(typeof params === 'function') {
                callback = params;
                params = {};
            }

            var ext = _getExt(name);
            var url = getUrl(name, params);

            if(isLoad(name, url)) {
                return false; // ready
            }

            if(getStatus(name) === PENDING){
                return false; // loading
            }

            params.success = _addCallback(params.success, [
                function(){
                    pool[name] = {
                        url: url,
                        status: READY
                    };
                    console.log('load ' + name);
                },
                function(){
                    $document.trigger('Loader.load', [name, ext, url]);
                }
            ]);

            if(callback instanceof Function) {
                params.success.unshift(callback);
            }

            params.error = _addCallback(params.error, function(){
                console.log("Модуль " + name + " не был успешно загружен");
                pool[name] = {
                    status: ERROR
                };
            });

            pool[name] = {
                url: url,
                status: PENDING
            };

            params = $.extend({
                type: 'GET',
                crossDomain: true,
                cache: true,
                url: url,
                statusCode: {
                    404: params.error
                }
            }, params);

            params['dataType'] = 'lazy_script';

            return $.ajax(params);
        };

        /**
         * @param {String} name
         * @param {String} url
         * @returns {boolean}
         */
        var isLoad = function(name, url) {

            if(pool[name] && pool[name]['status'] === READY) {
                if(pool[name]['url'] && (pool[name]['url'] != url)) {
                    console.log("Скрипт " + name + " был подгружен ранее, но с другого адреса " + pool[name]);
                }
                return true;
            }

            return false;
        };

        /**
         * @param {String} name
         * @returns {String|bool}
         */
        var getStatus = function(name){
            return pool[name] ? pool[name]['status'] : false;
        };

        var addHavesModules = function(){
            var css = $("link[href$='css']", $head);
            var js = $("script[src$='js']", $head);
            js.add(css).each(function() {
                var $this = $(this);
                var url = $this.attr('src') || $this.attr('href');
                var name = $this.data('name') || url;
                pool[name] = {
                    url: url,
                    status: READY
                };
            });
        };

        /**
         * @param  {Array} modules
         * @returns {boolean}
         */
        var isLoads = function(modules) {
            var i = modules.length;

            while(i--) {
                var name, url;
                var module = modules[i];

                if(typeof module === 'string') {
                    name = url = module;
                } else {
                    name = module.name;
                    url = module.params.url;
                }

                if ( !isLoad(name, url) ) {
                    return false;
                }
            }

            return true;
        };

        /**
         * @param {Array} modules
         * @param {Function} callback
         */
        var loads = function(modules, callback){
            if(isLoads(modules)) {
                callback ? callback() : '';
            } else {
                for(var i = modules.length; i--;) {
                    var module = modules[i];
                    var name = module.name || module;
                    var params = (typeof module === 'string') ? {} : module.params;
                    load(name, params);
                }
                var loadDepend = function(){
                    if(isLoads(modules)) {
                        $(document).off('Loader.load', loadDepend);
                        callback();
                    }
                };

                if(callback) {
                    $(document).on('Loader.load', loadDepend);
                }
            }
        };

        /**
         * @param {String} name
         * @param {Object} params
         * @param {String} params.url
         * @param {String} params.relUrl
         */
        var addComponent = function(name, params) {
            components[name] = params;
        };

        if(options.addFromPage) {
            addHavesModules();
        }

        return {
            load: load,
            loads: loads,
            addComponent: addComponent,
            pool: pool,
            components: components
        };
    };

    window.Loader = Loader;
})(jQuery, window);