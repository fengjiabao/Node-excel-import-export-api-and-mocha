process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var Cost = require("../../models/cost.js");

var contractId = "ContractID";
var fields = {
	clientId: "clientId",
	name: "name",
	type: "type",
	invoiceNo: "invoice",
	description: "description",
	file: "file",
	amount: 123.45678,
	releases: [1, 2, 3],
	tracks: [3, 4, 5],
	works: [6, 7, 8],
	contracts: [9, 10],
	associatedContractIds: [11, 12, 13]
}
var cost = new Cost(fields);

describe("Cost", function() {
	// Fields
	describe("fields", function() {
		it("should have a clientId parameter", function() {
			expect(cost).to.have.a.property("clientId", fields.clientId);
		});
		it("should have a name parameter", function() {
			expect(cost).to.have.a.property("name", fields.name);
		});
		it("should have a type parameter", function() {
			expect(cost).to.have.a.property("type", fields.type);
		});
		it("should have a invoiceNo parameter", function() {
			expect(cost).to.have.a.property("invoiceNo", fields.invoiceNo);
		});
		it("should have a description parameter", function() {
			expect(cost).to.have.a.property("description", fields.description);
		});
		it("should have a file parameter", function() {
			expect(cost).to.have.a.property("file", fields.file);
		});
		it("should have an amount parameter", function() {
			expect(cost).to.have.a.property("amount", fields.amount);
		});
		it("should have a releases parameter", function() {
			expect(cost.releases).to.deep.eq(fields.releases);
		});
		it("should have a tracks parameter", function() {
			expect(cost.tracks).to.deep.eq(fields.tracks);
		});
		it("should have a works parameter", function() {
			expect(cost.works).to.deep.eq(fields.works);
		});
		it("should have a contracts parameter", function() {
			expect(cost.contracts).to.deep.eq(fields.contracts);
		});
		it("should have a associatedContractIds parameter", function() {
			expect(cost.associatedContractIds).to.deep.eq(fields.associatedContractIds);
		});
	});
});

describe("cost", function() {
	before(function() {
		cost.save();
	});
	describe("#userForbidden", function() {
		describe("when action is read", function() {
			var action = "read";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds math", function() {
					var user = { internal: false, parentId: null, clientId: cost.clientId, payeeId: null };
					expect(cost.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(cost.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has a clientId and a payeeId (is a payee user)", function() {
				it("should return false when contractIds match", function() {
					var user = { internal: false, parentId: null, clientId: cost.clientId, payeeId: "123", contractIds: [contractId, "12345678"] };
					cost.associatedContractIds = [contractId];
					expect(cost.userForbidden(user, action)).to.be.false;
				});
				it("should return true when contractIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: cost.clientId, payeeId: "123", contractIds: ["12345678"] };
					expect(cost.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(cost.userForbidden(user, action)).to.be.true;
				});
			});
		});
		describe("when action is write", function() {
			var action = "write";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds math", function() {
					var user = { internal: false, parentId: null, clientId: cost.clientId, payeeId: null };
					expect(cost.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(cost.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when uesr has a clientId and a payeeId (is a payee user)", function() {
				it("should return true when contractIds match", function() {
					var user = { internal: false, parentId: null, clientId: cost.clientId, payeeId: "123", contractIds: [contractId, "12345678"] };
					expect(cost.userForbidden(user, action)).to.be.true;
				});
				it("should return true when contractIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: cost.clientId, payeeId: "123", contractIds: ["12345678"] };
					expect(cost.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(cost.userForbidden(user, action)).to.be.true;
				});
			});
		});
	});
	describe("#containsContractIds", function() {
		describe("when passed an array", function() {
			var contractId = "ContractId";
			var contractIds = [contractId, "somethingElse"];
			describe("when cost has contractId within associatedContractIds", function() {
				it("should return true", function(done) {
					cost.associatedContractIds = [contractId];
					cost.containsContractIds(contractIds, function(val) {
						expect(val).to.be.true;
						done();
					});
				});
			});
			describe("when cost does not have contractId within associatedContractIds", function() {
				it("should return false", function(done) {
					cost.associatedContractIds = [];
					cost.containsContractIds(contractIds, function(val) {
						expect(val).to.be.false;
						done();
					});
				});
			});
		});
		describe("when not passed an array", function() {
			it("should return false", function(done) {
				cost.associatedContractIds = [];
				cost.containsContractIds(null, function(val) {
					expect(val).to.be.false;
					done();
				});
			});
		});
	});
});