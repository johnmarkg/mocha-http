(function() {

    var assert = require('assert');
    var url = require('url');
    var request = require('request');


    var sinon = require('sinon');
    var http = require('http');

	var spy = sinon.spy(request, "get");


	var server = http.createServer(function (req, res) {
		var parsed = url.parse(req.url, true);

		if (req.url === '/') {
			// res.setHeader('set-cookie', 'foo=bar')
			res.statusCode = 200
			return res.end();
		}
		if (req.url === '/500') {
			res.statusCode = 500
			return res.end();
		}		
		if (req.url === '/json') {
			res.statusCode = 200
			return res.end(JSON.stringify({
				value: 123, 
				nested: {value: 456} 
			}));
		}		
		if (req.url === '/badjson') {
			res.statusCode = 200
			return res.end("this is not json");
		}						
		if (req.url === '/array') {
			res.statusCode = 200
			return res.end(JSON.stringify([
				123,
				[0,456, 789]				 
			]));
		}		
	});

	var port;
	var mochaHttp = require('../mocha-http');

	before(function(done){
        mochaHttp.openPort(function(err, _port){
            if(err){ throw err; }
            port = _port;
            server.listen(port, done);               
        });		
	})



    describe('responses', function(){

    	it('default status 200',function(done){
    		mochaHttp.http({
    			path: '',
    		},done);
    	})

    	it('non default status check',function(done){
    		mochaHttp.http({
    			path: '500',
    			status: 500
    		},done);    		
    	});

    	it('json check, nested objects',function(done){
    		mochaHttp.http({
    			path: 'json',
    			json:{
    				'value': 123,
    				'nested.value': 456
    			}
    		},done);    		
    	});

    	it('json check, nested array',function(done){
    		mochaHttp.http({
    			path: 'array',
    			json:{
    				'[0]': 123,
    				'[1][1]': 456,
    				'length': 2,
    				'[1].length': 3
    			}
    		},done);    		
    	});


    	it('json check, nested array',function(done){
    		mochaHttp.http({
    			path: 'array',
    			json:{
    				'[0]': 123,
    				'[1][1]': 456,
    				'length': 2,
    				'[1].length': 3
    			}
    		},done);    		
    	});



	});


	describe('requests', function(){
		
		beforeEach(function(){
			spy.reset();
		})

	   	it('add a param', function(){
    		mochaHttp.http({
    			path: 'params',
    			params:{
    				param1: 'abc'
    			}
    		}); 
    		assert.equal(spy.args[0][0],"http://localhost:" + port + "/params?param1=abc");
    	})

	   	it('2 params', function(){
    		mochaHttp.http({
    			path: 'params',
    			params:{
    				param1: 'abc',
    				param2: 'efg'
    			}
    		}); 
    		assert.equal(spy.args[0][0],"http://localhost:" + port + "/params?param1=abc&param2=efg");
    	})

    	it('default param', function(){
    		mochaHttp
    			.setDefaultParam('defaultParam', 'hey')
    			.http({
	    			path: 'params',
    			}); 
			assert.equal(spy.args[0][0],"http://localhost:" + port + "/params?defaultParam=hey");    			
    	})

    	it('override default param', function(){
    		mochaHttp
    			.http({
	    			path: 'params',
	    			params:{
	    				defaultParam: 'heyhey'
	    			}
    			}); 
    		assert.equal(spy.args[0][0],"http://localhost:" + port + "/params?defaultParam=heyhey");
    	});

    	it('override default param to null', function(){

    		mochaHttp
    			.http({
	    			path: 'params',
	    			params:{
	    				defaultParam: null
	    			}
    			}); 
    		assert.equal(spy.args[0][0],"http://localhost:" + port + "/params");
    	});


    	it('delete default param', function(){

    		mochaHttp
    			.deleteDefaultParam('defaultParam')
    			.http({
	    			path: 'params',
	    			params:{
	    				differentParam: 1
	    			}
    			}); 
	    	assert.equal(spy.args[0][0],"http://localhost:" + port + "/params?differentParam=1");

    	});

 		it('body data', function(){
    		mochaHttp
    			.http({
	    			path: '',
	    			body:{
	    				bodyData: true
	    			}
    			}); 
	    	assert.deepEqual(spy.args[0][1],{ bodyData: true });
 		})    	

	});


	describe('fail', function(){
    
    	// remove mocha handler so we can catch it and check the error
    	// http://stackoverflow.com/questions/9025095/how-can-i-test-uncaught-errors-in-mocha
    	var originalException;
    	before(function(){
			originalException = process.listeners('uncaughtException').pop();
	        process.removeListener('uncaughtException', originalException);    		
    	});
    	after(function(){
    		process.on('uncaughtException',originalException)
    	})

    	it('status',function(done){
			
	        process.once("uncaughtException", function (error) {
	            assert.equal(error.expected, 301);
	            assert.equal(error.actual, 200);
	            assert.equal(error.name, "AssertionError");
	            done();
	        })


			mochaHttp.http({
				path: '',
				status: 301
			});    			

    	});

    	it('json',function(done){
			
	        process.once("uncaughtException", function (error) {
	            assert.equal(error.expected, 4567);
	            assert.equal(error.actual, 456);
	            assert.equal(error.name, "AssertionError");
	            done();
	        })


			mochaHttp.http({
				path: 'json',
				json:{
    				'value': 123,
    				'nested.value': 4567					
				}
			});    			

    	});


    	it('malformed json',function(done){

	        process.once("uncaughtException", function (error) {
	            assert.equal(error.toString(), 'SyntaxError: Unexpected token h');
	            done();
	        })
    		mochaHttp.http({
    			path: 'badjson',
    			json:{
    				'value': 123,
    				'nested.value': 456
    			}
    		});    		    			


    	});    	
    });

	describe('find open port', function(){
		it('dont use the same as before', function(done){

			var mochaHttp2 = mochaHttp.MochaHttpUtils();
	        mochaHttp.openPort(function(err, _port){
	        	assert.notEqual(_port, port);
	        	assert.equal(_port, port + 1);
	            done();                 
	        });					
		})
	})


	describe('host', function(){
		it('MOCHA_HOST', function(){
			process.env.MOCHA_HOST='fakehost';
			var mochaHttp3 = mochaHttp.MochaHttpUtils();
	        mochaHttp3.openPort();
	        assert.throws(function(){
	    		mochaHttp3.http({
	    			path: ''
	    		}); 	        	
	        }, /Invalid URI "fakehost\/"/)
		});

		it('host passed to constructor', function(){
			
			var mochaHttp4 = mochaHttp.MochaHttpUtils('constructor');
	        
	        assert.throws(function(){
	    		mochaHttp4.http({
	    			path: ''
	    		}); 	        	
	        }, /Invalid URI "constructor\/"/)
		})  		
	})


}).call(this);    