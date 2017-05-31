process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var SalesTemplate = require("../../models/salesTemplate.js");

var fields = {
	clientId: "ClientID",
	name: "Name",
	salesAccountName: "Account Name",
	salesAccountId: "Account ID",
	startingLine: 123,
	startingLeft: 345,
	fields: ["Some Fields"]
}
var salesTemplate = new SalesTemplate(fields);

describe("SalesTemplate", function() {
	// Fields
	describe("fields", function() {
		it("should have a clientId parameter", function() {
			expect(salesTemplate).to.have.a.property("clientId", fields.clientId);
		});
		it("should have a name parameter", function() {
			expect(salesTemplate).to.have.a.property("name", fields.name);
		});
		it("should have an salesAccountName parameter", function() {
			expect(salesTemplate).to.have.a.property("salesAccountName", fields.salesAccountName);
		});
		it("should have an salesAccountId parameter", function() {
			expect(salesTemplate).to.have.a.property("salesAccountId", fields.salesAccountId);
		});
		it("should have a startingLine parameter", function() {
			expect(salesTemplate).to.have.a.property("startingLine", fields.startingLine);
		});
		it("should have a startingLeft parameter", function() {
			expect(salesTemplate).to.have.a.property("startingLeft", fields.startingLeft);
		});
		it("should have a fields parameter", function() {
			expect(salesTemplate.fields).to.be.an('array');
		});
	});
});

describe("salesTemplate", function() {
	before(function() {
		salesTemplate.save();
	})
	describe("#userForbidden", function() {
		describe("when user is a client", function() {
			describe("and when clientId matches client ID", function() {
				it("should return false", function() {
					var user = { internal: false, parentId: null, clientId: fields.clientId, payeeId: null };
					expect(salesTemplate.userForbidden(user)).to.be.false;
				});
			});
			describe("and when clientId does not match client ID", function() {
				it("should return true", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(salesTemplate.userForbidden(user)).to.be.true;
				});
			});
		});
		describe("when user is an internal user without a clientId", function() {
			it("should return true", function() {
				var user = { internal: true, parentId: null, clientId: null, payeeId: null };
				expect(salesTemplate.userForbidden(user)).to.be.true;
			});
		});
		describe("when user is a parent user without a clientId", function() {
			it("should return true", function() {
				var user = { internal: false, parentId: "parentId", clientId: null, payeeId: null };
				expect(salesTemplate.userForbidden(user)).to.be.true;
			});
		});
		describe("when user is a payee user", function() {
			it("should return true", function() {
				var user = { internal: true, parentId: null, clientId: fields.clientId, payeeId: "payeeId" };
				expect(salesTemplate.userForbidden(user)).to.be.true;
			});
		});
	});
});