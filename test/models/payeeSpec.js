process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var Payee = require("../../models/payee.js");
var sinon = require('sinon');

require('../../models/db');

var fields = {
	clientId: "ClientID",
	name: "name",
	address: "address",
	country: "country",
	vatNo: "VATNO"
}
var payee = new Payee(fields);

describe("Payee", function() {
	// Fields
	describe("fields", function() {
		it("should have a clientId parameter", function() {
			expect(payee).to.have.a.property("clientId", fields.clientId);
		});
		it("should have a name parameter", function() {
			expect(payee).to.have.a.property("name", fields.name);
		});
		it("should have a address parameter", function() {
			expect(payee).to.have.a.property("address", fields.address);
		});
		it("should have a country parameter", function() {
			expect(payee).to.have.a.property("country", fields.country);
		});
		it("should have a vatNo parameter", function() {
			expect(payee).to.have.a.property("vatNo", fields.vatNo);
		});
	});
});

describe("convertPayeesForXlsx", function() {
    describe("when passed an array", function() {
      	var payees = [payee];
		before(function() {
			payee.save();
		});
		it("should not return an error", function(done) {
			Payee.convertPayeesForXlsx(payees, function(err, mappedData) {
			  expect(err).to.eq(null);
			  done();
			});
		});
		it("should return an array", function(done) {
			Payee.convertPayeesForXlsx(payees, function(err, mappedData) {
			 	expect(mappedData instanceof Array).to.be.true;
			  	done();
			});
		});
		it("should call exportData for payees", function(done) {
			var spy = sinon.spy(payee, "exportData");
			Payee.convertPayeesForXlsx(payees, function(err, mappedData) {
			  	expect(spy.callCount).to.eq(1);
			  	done();
			});
			after(function() {
			  	spy.restore();
			});
		});
		it("should add the returned value from exportData to the returned array", function(done) {
			Payee.convertPayeesForXlsx(payees, function(err, mappedData) {
				expect(mappedData.length).to.eq(1);
				done();
			});
		});
    });
  	describe("when not passed an array", function() {
		it("should return an error in the callback stating it must be passed an array", function(done) {
			Payee.convertPayeesForXlsx(null, function(err, mappedData) {
				expect(err).to.eq("Must be passed an Array of Payees");
				done();
			});
		});
    });
});

describe("importPayee", function() {
	// Find using the ID or VatNo
  	describe("when passed an object", function() {
  		var spy = sinon.spy(Payee, "findOne");
    	describe("when _id is present", function() {
      		it("should call find with the passed _id and clientId", function() {
	        	Payee.importPayee(payee, payee.clientId, function(err, result) {
	          		expect(spy.called).to.be.true;
	          		spy.restore();
	        	});
    		});
    	});
    	describe("when _id is not present", function() {
      		describe("when vatNo is present", function() {
		        it("should call find with the passed vatNo and clientId", function() {
					var newPayee = { _id: "", clientId: "ClientID", name: "Payee 2", address: "Address 2", vatNo: "ID" };
					Payee.importPayee(newPayee, payee.clientId, function(err, result) {
						expect(spy.called).to.be.true;
						spy.restore();
					});
		        });
		        describe("when a payee is found by the vatNo", function() {
		        	it("should update the found payee with the passed fields", function() {
			            var newPayee = { _id: "", clientId: "ClientID", name: "Payee 2", address: "Address 2", vatNo: "ID" };
			            Payee.importPayee(newPayee, payee.clientId, function(err, result) {
			            	expect(result.name).to.eq('Payee 2');
			            	expect(result.address).to.eq('Address 2');
			            });
		        	});
		        });
	        	describe("when a payee is not found by the vatNo", function() {
	        		it("should create a new payee", function() {
	            		var newPayee = { _id: "", clientId: "ClientID", name: "Payee 3", address: "Address 3", vatNo: "ID 3" };
	            		Payee.importPayee(newPayee, payee.clientId, function(err, result) {
			            	expect(result.name).to.eq('Payee 3');
			            	expect(result.address).to.eq('Address 3');
			            	expect(result.vatNo).to.eq('ID 3');
			            });
	          		});
	        	});
		        it("should set the passed fields to the Payee", function() {
		          	var newPayee = { _id: "", clientId: "ClientID", name: "Payee 4", address: "Address 4", vatNo: "ID 4" };
		          	Payee.importPayee(newPayee, payee.clientId, function(err, result) {
		            	expect(result.name).to.eq("Payee 4")
		            	expect(result.address).to.eq("Address 4")
		            	expect(result.vatNo).to.eq("ID 4")
		          	});
		        });
    		});
	      	describe("when vatNo is not present", function() {
		      	it("should return an error to the callback stating that an vatNo is required", function() {
		        	var newPayee = { _id: "", clientId: "ClientID", name: "Payee 1", address: "Address 1" };
		        	Payee.importPayee(newPayee, payee.clientId, function(err, result) {
		            	expect(err).to.eq("VatNo must be passed")
		          	});
		        });
		      	it("should not create a new Payee", function() {
		        	var newPayee = { _id: "", clientId: "ClientID", name: "Payee 1", address: "Address 1" };
		          	Payee.importPayee(newPayee, payee.clientId, function(err, result) {
		            	expect(err).to.eq("VatNo must be passed")
		          	});
		        });
      		});
    	});
	});
	describe("when not passed an object", function() {
    	it("should return an error in the callback stating it must be passed an object", function() {
	      	Payee.importPayee(null, payee.clientId, function(err, result) {
	        	expect(err).to.eq("Payee must be passed")
	      	});
    	});
  	});
});

describe("importPayees", function() {
  	describe("when passed an array", function() {
	    var payees = [
	      { _id: "", name: "Payee 1", address: "Address 1", vatNo: "ID1" },
	      {_id: ""}
	    ]
	    it("should call importPayee for each payee passed", function() {
	      	Payee.importPayees(payees, payee.clientId, function(err, result) {
	        	expect(err).to.eq(null);
	      	});
	    });
	    var payees = [
	      { _id: "", name: "Payee 1", address: "Address 1", vatNo: "ID1" },
	      { _id: "", name: "Payee 1", address: "Address 1" },
	      {_id: ""}
	    ]
	    it("should add each returned error from importPayee to the errors array", function() {
	      	Payee.importPayees(payees, payee.clientId, function(err, result) {
	        	expect(err.length).to.eq(1);
	      	});
	    });
	    it("should add each returned payee from importPayee to the imported array", function() {
	      	Payee.importPayees(payees, payee.clientId, function(err, result) {
	        	expect(result.length).to.eq(payees.length);
	      	});
	    });
  	});
  	describe("when not passed an array", function() {
    	var payees = { _id: "123", name: "Payee 1", address: "Address 1", vatNo: "ID1" };    	
	    it("should return an error in the callback stating it must be passed an array", function() {
	      	Payee.importPayees(payees, payee.clientId, function(err, result) {
	        	expect(err).to.eq("Data must be an Array");
	      	});
	    });
  	});
  	describe("when not passed a clientId", function() {
	    var payees = [
	      { _id: "123", name: "Payee 1", address: "Address 1", vatNo: "ID1" },
	      { _id: "123", name: "Payee 1", address: "Address 1", vatNo: "ID1" },
	      { _id: "123", name: "Payee 1", address: "Address 1", vatNo: "ID1" },
	      {_id: ""}
	    ]
	    it("should return an error in the callback stating it must be passed a client ID", function() {
	      	Payee.importPayees(payees, null, function(err, result) {
	        	expect(err).to.eq("A Client ID must be passed");
	      	});
	    });
  	});
});

describe("payee", function() {
	before(function() {
		payee.save();
	});
	describe("#userForbidden", function() {
		describe("when action is read", function() {
			var action = "read";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds match", function() {
					var user = { internal: false, parentId: null, clientId: payee.clientId, payeeId: null };
					expect(payee.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(payee.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has a clientId and a payeeId (is a payee user)", function() {
				it("should return false when payeeIds match", function() {
					var user = { internal: false, parentId: null, clientId: payee.clientId, payeeId: payee._id };
					expect(payee.userForbidden(user, action)).to.be.false;
				});
				it("should return true when payeeIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: payee.clientId, payeeId: "anything else" };
					expect(payee.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(payee.userForbidden(user, action)).to.be.true;
				});
			});
		});
		describe("when action is write", function() {
			var action = "write";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds math", function() {
					var user = { internal: false, parentId: null, clientId: payee.clientId, payeeId: null };
					expect(payee.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(payee.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when uesr has a clientId and a payeeId (is a payee user)", function() {
				it("should return true when their payeeIds match", function() {
					var user = { internal: false, parentId: null, clientId: payee.clientId, payeeId: payee._id };
					expect(payee.userForbidden(user, action)).to.be.true;
				});
				it("should return true when their payeeIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: payee.clientId, payeeId: "anything else" };
					expect(payee.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(payee.userForbidden(user, action)).to.be.true;
				});
			});
		});
	});
});