var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var should = chai.should;

chai.use(chaiHttp);

describe("/", function() {

	describe("when applicationToken is missing", function() {
		it("should return a status of 401 and application token missing message", function(done) {
			chai.request(server)
	    .get('/')
	    .end(function(err, res){
	    	expect(res.status).to.eq(401);
	    	expect(res.body.message).to.eq("Application token is missing");
	      done();
	    });
		});
	});	

	describe("when applicationToken is invalid", function() {
		it("should return a status of 401 and application token invalid message", function(done) {
			chai.request(server)
	    .get('/')
	    .set("applicationToken", "something wrong")
	    .end(function(err, res){
	    	expect(res.status).to.eq(401);
	    	expect(res.body.message).to.eq("Application token is invalid");
	      done();
	    });
		});
	});

	describe("when applicationToken is valid", function() {

		describe("and user token is missing", function() {
			it("should return a status of 401 and token missing message", function(done) {
				chai.request(server)
		    .get('/')
		    .set("applicationToken", config.applicationToken)
		    .end(function(err, res){
		    	expect(res.status).to.eq(401);
		    	expect(res.body.message).to.eq("Authentication token is missing");
		      done();
		    });
			});
		});

		describe("and user token is invlaid", function() {
			it("should return a status of 401 and token missing message", function(done) {
				chai.request(server)
		    .get('/')
		    .set("applicationToken", config.applicationToken)
		    .set("token", "something wrong")
		    .end(function(err, res){
		    	expect(res.status).to.eq(401);
		    	expect(res.body.message).to.eq("Authentication token is invalid");
		      done();
		    });
			});
		});

		describe("and user token is valid", function() {
			it("should return a status of 200", function(done) {
				var token = jwt.sign({ hello: 'World' }, config.jsonSecretToken, { expiresIn: 86400 });
				chai.request(server)
		    .get('/')
		    .set("applicationToken", config.applicationToken)
		    .set("token", token)
		    .end(function(err, res){
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("Authentication passed");
		      done();
		    });
			});
		});

	});

});