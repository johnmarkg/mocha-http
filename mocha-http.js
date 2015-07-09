(function() {


    var assert = require('assert');
    var request = require('request');

	var portfinder = require('portfinder');
	var debug = require('debug')('tests:http');

	function Tests(host){
		this.port = null;
		this.host = host || process.env.MOCHA_HOST || 'http://localhost';
		this.defaultParams = {};
		
		return this;
	}

	module.exports = new Tests();

	// access to constructor
	Tests.prototype.MochaHttp = Tests;

	Tests.prototype.deleteDefaultParam = function(key) {
		delete this.defaultParams[key];
		return this;
	};
	Tests.prototype.setDefaultParam = function(key, val) {
		this.defaultParams[key] = val;
		return this;
	};

	function addParamTerminator(path){
		if (path.indexOf('?') < 0) {
			return '?';
		} else {
			return '&';
		}		
	}

	Tests.prototype.url = function(path, params) {

		for(var key in this.defaultParams){
			
			if(params && typeof params[key] !== 'undefined'){
				continue;
			}
			path += addParamTerminator(path);
			path += encodeURIComponent(key) + '=' + encodeURIComponent(this.defaultParams[key])
		}			


		if(params && Object.keys(params).length > 0){
			for(var key in params){
				if(params[key] == null){
					continue;
				}
				path += addParamTerminator(path);
				path += encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
			}
		}
		
		path = path.replace(/&&/g, '&');
		debug(this.host + (this.port ? ':'+ this.port : '') + '/' + path);
		return this.host + (this.port ? ':'+ this.port : '') + '/' + path;

	}
	Tests.prototype.openPort = function(cb) {
		var t = this;
		if(process.env.MOCHA_HOST){
			return;
		}
        portfinder.getPort(function(err,_port){
        	t.port = _port
        	cb(err, t.port);
        });
	}
	Tests.prototype.http = function(data,cb) {
		var t = this;
		var fn = (data.method || 'get').toLowerCase();

		var _cb = function(err,res,body){
			if(err){
				throw err;
			}

			assert.equal(res.statusCode, (data.status || 200));	        

            if(data.json){
	            var json = JSON.parse(body);
	            for(var key in data.json){
	            	assert.equal(getProperty(json,key), data.json[key])
	            }
            }

            if(typeof cb === 'function'){
            	cb(err,res,body);		
            }
		}

		// assert.doesNotThrow(function(){
			request[fn]( t.url(data.path, data.params, data.log), _cb);	
		// },'Error throw on request')
		
	}

	function getProperty(o, s) {
	    s = s.replace(/\[(\w+)\]/g, '.$1');  // convert indexes to properties
	    s = s.replace(/^\./, ''); // strip leading dot
	    var a = s.split('.');

	    for (var i = 0, n = a.length; i < n; ++i) {
	        var key = a[i];
	        if (typeof o[key] === 'object') {
	            o = o[key];
	        } else {
	            return o[key];
	        }
	    }
	}


}).call(this)