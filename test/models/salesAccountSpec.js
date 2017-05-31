process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var SalesAccount = require("../../models/salesAccount.js");

var fields = {
	clientId: "ClientID",
	name: "Name",
	type: "Type"
}
var salesAccount = new SalesAccount(fields);

describe("SalesAccount", function() {
	// Fields
	describe("fields", function() {
		it("should have a clientId parameter", function() {
			expect(salesAccount).to.have.a.property("clientId", fields.clientId);
		});
		it("should have a name parameter", function() {
			expect(salesAccount).to.have.a.property("name", fields.name);
		});
		it("should have a type parameter", function() {
			expect(salesAccount).to.have.a.property("type", fields.type);
		});
	});
});

describe("salesAccount", function() {
	before(function() {
		salesAccount.save();
	})
	describe("#userForbidden", function() {
		describe("when user is a client", function() {
			describe("and when clientId matches client ID", function() {
				it("should return false", function() {
					var user = { internal: false, parentId: null, clientId: fields.clientId, payeeId: null };
					expect(salesAccount.userForbidden(user)).to.be.false;
				});
			});
			describe("and when clientId does not match client ID", function() {
				it("should return true", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(salesAccount.userForbidden(user)).to.be.true;
				});
			});
		});
		describe("when user is an internal user without a clientId", function() {
			it("should return true", function() {
				var user = { internal: true, parentId: null, clientId: null, payeeId: null };
				expect(salesAccount.userForbidden(user)).to.be.true;
			});
		});
		describe("when user is a parent user without a clientId", function() {
			it("should return true", function() {
				var user = { internal: false, parentId: "parentId", clientId: null, payeeId: null };
				expect(salesAccount.userForbidden(user)).to.be.true;
			});
		});
		describe("when user is a payee user", function() {
			it("should return true", function() {
				var user = { internal: true, parentId: null, clientId: fields.clientId, payeeId: "payeeId" };
				expect(salesAccount.userForbidden(user)).to.be.true;
			});
		});
	});
});