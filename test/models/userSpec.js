process.env.NODE_ENV = 'test';
var chai = require("chai");
var expect = chai.expect;
var User = require("../../models/user.js");
var bcrypt = require('bcrypt');
var sinon = require('sinon');

// Setup User
var salt = bcrypt.genSaltSync(10);
var fields = {
	internal: true,
	clientId: "ClientID",
	parentId: "ParentID",
	parentId: "payeeId",
	email: "Email",
	status: "Active",
	password: bcrypt.hashSync("password", salt),
	forgotPasswordToken: "Forgot",
	forgotPasswordDate: new Date
}
var user = new User(fields);
user.save();

describe("User", function() {
	// Fields
	describe("fields", function() {
		it("should have a internal parameter", function() {
			expect(user).to.have.a.property("internal", fields.internal);
		});
		it("should have a clientId parameter", function() {
			expect(user).to.have.a.property("clientId", fields.clientId);
		});
		it("should have a parentId parameter", function() {
			expect(user).to.have.a.property("parentId", fields.parentId);
		});
		it("should have a payeeId parameter", function() {
			expect(user).to.have.a.property("payeeId", fields.payeeId);
		});
		it("should have a email parameter", function() {
			expect(user).to.have.a.property("email", fields.email);
		});
		it("should have a status parameter", function() {
			expect(user).to.have.a.property("status", fields.status);
		});
		it("should have a password parameter", function() {
			expect(user).to.have.a.property("password", fields.password);
		});
		it("should have a forgotPasswordToken parameter", function() {
			expect(user).to.have.a.property("forgotPasswordToken", fields.forgotPasswordToken);
		});
		it("should have a forgotPasswordDate parameter", function() {
			expect(user).to.have.a.property("forgotPasswordDate", fields.forgotPasswordDate);
		});
	});

	describe(".hashPassword", function() {
		describe("when passed a string", function() {
			var password = "password";
			var salt = bcrypt.genSaltSync(10);
			var stub = sinon.stub(bcrypt, "genSaltSync");
			stub.returns(salt);
			after(function() {
				stub.restore();
			});
			it("should return a string", function() {
				expect(User.hashPassword(password)).to.be.a("string");
			});
			it("should return the hashed password", function() {
				var hashedPassword = bcrypt.hashSync(password, salt);
				expect(User.hashPassword(password)).to.eq(hashedPassword);
			});
			it("should call bcrypt.hashSync with the passed password and returned value from bcrypt.genSaltSync", function() {
				var spy = sinon.spy(bcrypt, "hashSync");
				User.hashPassword(password);
				expect(spy.calledWith(password, salt)).to.be.true;
			});
		});
		describe("when not passed a string", function() {
			it("should return undefined", function() {
				expect(User.hashPassword(null)).to.eq(undefined);
			});
		});
	});

});

describe("user", function() {
	describe("#forgotPassword", function() {
		it("should set the forgotPasswordToken to the returned value from bcrypt.genSaltSync", function() {
			var salt = bcrypt.genSaltSync(10);
			var stub = sinon.stub(bcrypt, "genSaltSync");
			stub.returns(salt);
			user.forgotPassword();
			expect(user).to.have.a.property("forgotPasswordToken", salt);
			after(function() {
				stub.restore();
			});
		});
		it("should set the forgotPasswordDate to the current date", function() {
			var date = new Date;
			var stub = sinon.stub(Date, "now");
			stub.returns(date);
			user.forgotPassword();
			expect(user).to.have.a.property("forgotPasswordDate", date);
			after(function() {
				stub.restore();
			});
		});
		it("should call user.save", function() {
			var spy = sinon.spy(user, 'save');
			user.forgotPassword();
			expect(spy.called).to.be.true;
			after(function() {
				spy.restore();
			});
		});
		xit("should call the passed callback with the returned value from bcrypt.genSaltSync", function() {
			var salt = bcrypt.genSaltSync(10);
			var stub = sinon.stub(bcrypt, "genSaltSync");
			stub.returns(salt);
			var callback = sinon.spy();
			user.forgotPassword(function(val) {
				callback(val);
				expect(callback.calledWith(salt)).to.be.true;
			});
			after(function() {
				stub.restore();
			});
		});
	});

	describe("#setNewPassword", function() {
		var password = "password";
		it("should set forgotPasswordToken to null", function() {
			user.setNewPassword(password, function() {});
			expect(user.forgotPasswordToken).to.eq(null);
		});
		it("should set forgotPasswordDate to null", function() {
			user.setNewPassword(password, function() {});
			expect(user.forgotPasswordDate).to.eq(null);
		});
		xit("should call User.hashPassword with the passed password", function() {
			var spy = sinon.spy(User, 'hashPassword');
			user.setNewPassword(password, function() {});
			expect(spy.calledWith(password)).to.be.true;
			after(function() {
				spy.restore();
			});
		});
		xit("should set password to the returned value from User.hashPassword", function() {
			var stub = sinon.stub(User, 'hashPassword');
			stub.returns("Hashed Password");
			user.setNewPassword(password, function() {});
			expect(user.password).to.eq("Hashed Password");
			stub.restore();
		});
		it("should call the passed callback", function() {
			var callback = sinon.spy();
			user.setNewPassword(password, callback);
			expect(callback.called).to.be.true;
		});
	});

	describe("#authenticate", function() {
		var password = "password";
		it("should return an object", function() {
			expect(user.authenticate("something")).to.be.an('object');
		});
		describe("when the password matches and the user status is Active", function() {
			it("should return a response of true", function() {
				expect(user.authenticate(password).response).to.be.true;
			});
			it("should return a message of 'Authentication passed.'", function() {
				expect(user.authenticate(password).message).to.eq("Authentication passed.");
			});
		});
		describe("when the password matches by the user status is not Active", function() {
			before(function() {
				user.status = "Inactive";
			});
			it("should return a response of false", function() {
				expect(user.authenticate(password).response).to.be.false;
			});
			it("should return a message of 'User access is restricted.'", function() {
				expect(user.authenticate(password).message).to.eq("User access is restricted.");
			});
			after(function() {
				user.status = "Active";
			});
		});
		describe("when the password does not match", function() {
			var falsePassword = "not the password";
			it("should return a response of false", function() {
				expect(user.authenticate(falsePassword).response).to.be.false;
			});
			it("should return a message of 'Password is incorrect. Please try again.'", function() {
				expect(user.authenticate(falsePassword).message).to.eq("Password is incorrect. Please try again.");
			});
		});
	});

	describe("#type", function() {
		it("should return internal when user.internal is true", function() {
			var user = new User({ internal: true, clientId: "clientId" });
			expect(user.type()).to.eq("internal");
		});
		it("should return parent when user.parentId is present", function() {
			var user = new User({ internal: false, parentId: "parentId", clientId: "clientId" });
			expect(user.type()).to.eq("parent");
		});
		it("should return client when user.clientId is present and payeeId is blank", function() {
			var user = new User({ internal: false, clientId: "clientId" });
			expect(user.type()).to.eq("client");
		});
		it("should return payee when user.clientId and user.payeeId is present", function() {
			var user = new User({ internal: false, clientId: "clientId", payeeId: "payeeId" });
			expect(user.type()).to.eq("payee");
		});
		it("should return payee when user.payeeId is present and clientId is blank", function() {
			var user = new User({ internal: false, payeeId: "payeeId" });
			expect(user.type()).to.eq("payee");
		});
	});
});