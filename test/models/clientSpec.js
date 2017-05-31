process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var Client = require("../../models/client.js");
var Parent = require("../../models/parent.js");
var sinon = require('sinon');

var fields = {
	parentId: "123",
	name: "Name",
	paymentTier: "Payment",
	companyName: "Company",
	address: "Some address",
	phone: "Some phone",
	email: "Some email"
}
var client = new Client(fields);

describe("Client", function() {
	// Fields
	describe("fields", function() {
		it("should have a parentId parameter", function() {
			expect(client).to.have.a.property("parentId", fields.parentId);
		});
		it("should have an name parameter", function() {
			expect(client).to.have.a.property("name", fields.name);
		});
		it("should have an paymentTier parameter", function() {
			expect(client).to.have.a.property("paymentTier", fields.paymentTier);
		});
		it("should have an companyName parameter", function() {
			expect(client).to.have.a.property("companyName", fields.companyName);
		});
		it("should have an address parameter", function() {
			expect(client).to.have.a.property("address", fields.address);
		});
		it("should have an phone parameter", function() {
			expect(client).to.have.a.property("phone", fields.phone);
		});
		it("should have an email parameter", function() {
			expect(client).to.have.a.property("email", fields.email);
		});
	});
});

describe("client", function() {
	before(function() {
		client.save();
	})
	describe("#userForbidden", function() {
		describe("when client has a parentId", function() {
			beforeEach(function() {
				client.parentId = "123";
			});
			describe("when user is internal", function() {
				it("should return false", function() {
					var user = { internal: true };
					expect(client.userForbidden(user)).to.be.false;
				});
			});
			describe("when user is a parent and parent is parent of client", function() {
				it("should return false", function() {
					client.parentId = "123";
					var user = { internal: false, parentId: "123" };
					expect(client.userForbidden(user)).to.be.false;
				});
			});
			describe("when user is a parent and parent is not parent of client", function() {
				it("should return true", function() {
					client.parentId = "12345";
					var user = { internal: false, parentId: "123" };
					expect(client.userForbidden(user)).to.be.true;
				});
			});
			describe("when user is client and client has same ID", function() {
				it("should return false", function() {
					var user = { internal: false, clientId: client._id };
					expect(client.userForbidden(user)).to.be.false;
				});
			});
			describe("when user is client and client does not have same ID", function() {
				it("should return true", function() {
					var user = { internal: false, clientId: "1234" };
					expect(client.userForbidden(user)).to.be.true;
				});
			});
			describe("when user is nothing", function() {
				it("should return true", function() {
					var user = {};
					expect(client.userForbidden(user)).to.be.true;
				});
			});
		});
		describe("when client has no parentId", function() {
			beforeEach(function() {
				client.parentId = null;
			});
			describe("when user is internal", function() {
				it("should return false", function() {
					var user = { internal: true };
					expect(client.userForbidden(user)).to.be.false;
				});
			});
			describe("when user has parentId of null and clientId matches", function() {
				it("should return false", function() {
					var user = { internal: false, parentId: null, clientId: client._id };
					expect(client.userForbidden(user)).to.be.false;
				});
			});
			describe("when user has parentId of null and clientId does not match", function() {
				it("should return true", function() {
					var user = { internal: false, parentId: null, clientId: "anything else" };
					expect(client.userForbidden(user)).to.be.true;
				});
			});
			describe("when user has a matching clientId and payeeId", function() {
				it("should return true", function() {
					var user = { internal: false, parentId: null, clientId: client._id, payeeId: "123" };
					expect(client.userForbidden(user)).to.be.true;
				});
			});
			describe("when user has a non-matching clientId and payeeId", function() {
				it("should return true", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: "123" };
					expect(client.userForbidden(user)).to.be.true;
				});
			});
		});
	});
	describe("#parent", function() {
		it("should return an object", function() {
			expect(client.parent()).to.be.an('Object');
		});
		describe("when client has a parentId", function() {
			var parent = new Parent({ name: "Parent" });
			var newClient;
			var stub = sinon.stub(Parent, 'findOne');
			before(function() {
				parent.save();
				newClient = new Client({ name: "New Client", parentId: parent._id });
				newClient.save();
			});
			after(function() {
				stub.restore();
			});
			it("should call Parent.findOne with the parentId", function() {
				expect(stub.calledWith({ _id: parent._id })).to.be.true;
				newClient.parent();
			});
			it("should return the returned value from Parent.findOne", function() {
				var parent = "parent";
				stub.returns(parent);
				expect(newClient.parent()).to.eq(parent);
			});
			it("should return a parent object", function() {
				expect(newClient.parent()).to.be.a('Parent');
			});
		});
		describe("when client has no parentId", function() {
			it("should return a blank object", function() {
				before(function() {
					client.parentId = null;
				});
				expect(client.parent()).to.deep.eq({});	
			});
		});
	});
});