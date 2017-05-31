process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var Parent = require("../../models/parent.js");

var fields = {
			parentIds: [1, 2, 3],
			name: "Name"
		}
var parent = new Parent(fields);

describe("Parent", function() {
	// Fields
	describe("fields", function() {
		it("should have a clientIds parameter", function() {
			expect(parent.clientIds).to.be.an('array');
		});
		it("should have a name parameter", function() {
			expect(parent).to.have.a.property("name", fields.name);
		});
	});
});

describe("parent", function() {
	before(function() {
		parent.save();
	});

	describe("#userForbidden", function() {
		describe("when parent has a parentId", function() {
			beforeEach(function() {
				parent.parentId = "123";
			});
			describe("when user is internal", function() {
				it("should return false", function() {
					var user = { internal: true };
					expect(parent.userForbidden(user)).to.be.false;
				});
			});
			describe("when user is a parent and parentId matches parent", function() {
				it("should return false", function() {
					var user = { internal: false, parentId: parent._id };
					expect(parent.userForbidden(user)).to.be.false;
				});
			})
			describe("when user is a parent and parentId does not match parent", function() {
				it("should return true", function() {
					var user = { internal: false, parentId: "1234" };
					expect(parent.userForbidden(user)).to.be.true;
				});
			})
			describe("when user is a client", function() {
				it("should return true", function() {
					var user = { internal: false, clientId: "1234" };
					expect(parent.userForbidden(user)).to.be.true;
				});
			});
		});
	});
});