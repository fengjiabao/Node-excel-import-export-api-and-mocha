process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var SalesFile = require("../../models/salesFile.js");

var fields = {
	clientId: "ClientID",
	name: "Name",
	salesAccountName: "Account Name",
	salesAccountId: "AccountID",
	salesTemplateName: "Template Name",
	salesTemplateId: "Tempalte ID",
	totalValue: 123.456,
	status: "Status",
	valid: true,
	unmappedLines: 123,
	file: "File Location"
}
var salesFile = new SalesFile(fields);

describe("SalesFile", function() {
	// Fields
	describe("fields", function() {
		it("should have a clientId parameter", function() {
			expect(salesFile).to.have.a.property("clientId", fields.clientId);
		});
		it("should have a name parameter", function() {
			expect(salesFile).to.have.a.property("name", fields.name);
		});
		it("should have an salesAccountName parameter", function() {
			expect(salesFile).to.have.a.property("salesAccountName", fields.salesAccountName);
		});
		it("should have an salesAccountId parameter", function() {
			expect(salesFile).to.have.a.property("salesAccountId", fields.salesAccountId);
		});
		it("should have an salesTemplateName parameter", function() {
			expect(salesFile).to.have.a.property("salesTemplateName", fields.salesTemplateName);
		});
		it("should have an salesTemplateId parameter", function() {
			expect(salesFile).to.have.a.property("salesTemplateId", fields.salesTemplateId);
		});
		it("should have a totalValue parameter", function() {
			expect(salesFile).to.have.a.property("totalValue", fields.totalValue);
		});
		it("should have a status parameter", function() {
			expect(salesFile).to.have.a.property("status", fields.status);
		});
		it("should have a valid parameter", function() {
			expect(salesFile).to.have.a.property("valid", fields.valid);
		});
		it("should have an unmappedLines parameter", function() {
			expect(salesFile).to.have.a.property("unmappedLines", fields.unmappedLines);
		});
		it("should have a file parameter", function() {
			expect(salesFile).to.have.a.property("file", fields.file);
		});
	});
});

describe("salesFile", function() {
	before(function() {
		salesFile.save();
	})
	describe("#userForbidden", function() {
		describe("when user is a client", function() {
			describe("and when clientId matches client ID", function() {
				it("should return false", function() {
					var user = { internal: false, parentId: null, clientId: fields.clientId, payeeId: null };
					expect(salesFile.userForbidden(user)).to.be.false;
				});
			});
			describe("and when clientId does not match client ID", function() {
				it("should return true", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(salesFile.userForbidden(user)).to.be.true;
				});
			});
		});
		describe("when user is an internal user without a clientId", function() {
			it("should return true", function() {
				var user = { internal: true, parentId: null, clientId: null, payeeId: null };
				expect(salesFile.userForbidden(user)).to.be.true;
			});
		});
		describe("when user is a parent user without a clientId", function() {
			it("should return true", function() {
				var user = { internal: false, parentId: "parentId", clientId: null, payeeId: null };
				expect(salesFile.userForbidden(user)).to.be.true;
			});
		});
		describe("when user is a payee user", function() {
			it("should return true", function() {
				var user = { internal: true, parentId: null, clientId: fields.clientId, payeeId: "payeeId" };
				expect(salesFile.userForbidden(user)).to.be.true;
			});
		});
	});
});