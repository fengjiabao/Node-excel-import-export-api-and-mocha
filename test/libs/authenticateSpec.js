var chai = require("chai");
var expect = chai.expect;
var sinon = require('sinon');
var jwt = require('jsonwebtoken');
var config = require('../../config.json');
var Authenticate = require('../../libs/authenticate');
var async = require('async');

describe("Authenticate", function() {
	describe("#decodeToken", function() {
		describe("when passed a token in date", function(done) {
			value = { encoded: "token" };
			var token = jwt.sign(value, config.jsonSecretToken, { expiresIn: 86400 });
			it("should pass the decoded token to the callback", function(done) {
				var callback = sinon.stub();
				Authenticate.decodeToken(token, function(decoded) {
					callback(decoded);
					expect(callback.calledWith(value)).to.eq.true;
					done();
				});
			});
			it("should call jsonwebtoken.verify with the passed token and jsonSecretToken from config", function() {
				var spy = sinon.spy(jwt, "verify");
				expect(spy.calledWith(token, config.jsonSecretToken)).to.be.true;
				Authenticate.decodeToken(token, function(decoded) {});
				after(function() {
					spy.restore();
				});
			});
		});
		describe("when passed an out of date token", function() {
			value = { encoded: "token" };
			var token = jwt.sign(value, config.jsonSecretToken, { expiresIn: -100 });
			it("should pass undefined to the callback", function(done) {
				var callback = sinon.spy();
				Authenticate.decodeToken(token, function(decoded) {
					callback(decoded);
					expect(callback.calledWith(undefined)).to.be.true;
					done();
				});
			});
		});
		describe("when not passed anything", function() {
			it("should return undefined", function() {
				expect(Authenticate.decodeToken(undefined, function() {})).to.eq(undefined);
			});
		});
		describe("when passed a string that is not a token", function() {
			it("should return undefined", function() {
				expect(Authenticate.decodeToken("hello world", function() {})).to.eq(undefined);
			});
		});
	});
});