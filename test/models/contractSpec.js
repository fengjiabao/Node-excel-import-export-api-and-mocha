process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var Contract = require("../../models/contract.js");
var sinon = require('sinon');

require('../../models/db');

var fields = {
	clientId: "ClientId",
	payeeId: "payeeId",
	name: "Name 1",
	type: "type",
	accountingPeriod: "Period",
	minPayout: 123,
	salesTerms: ["sales"],
	returnsTerms: ["returns"],
	costsTerms: ["costs"],
	mechanicalTerms: ["mechanical"],
	reserves: ["reserves"]
}
var contract = new Contract(fields);

describe("Contract", function() {
	// Fields
	describe("fields", function() {
		it("should have a clientId parameter", function() {
			expect(contract).to.have.a.property("clientId", fields.clientId);
		});
		it("should have a payeeId parameter", function() {
			expect(contract).to.have.a.property("payeeId", fields.payeeId);
		});
		it("should have a name parameter", function() {
			expect(contract).to.have.a.property("name", fields.name);
		});
		it("should have a type parameter", function() {
			expect(contract).to.have.a.property("type", fields.type);
		});
		it("should have an accountingPeriod parameter", function() {
			expect(contract).to.have.a.property("accountingPeriod", fields.accountingPeriod);
		});
		it("should have a minPayout parameter", function() {
			expect(contract).to.have.a.property("minPayout", fields.minPayout);
		});
		it("should have a salesTerms parameter", function() {
			expect(contract.salesTerms).to.be.an('array');
		});
		it("should have a returnsTerms parameter", function() {
			expect(contract.returnsTerms).to.be.an('array');
		});
		it("should have a costsTerms parameter", function() {
			expect(contract.costsTerms).to.be.an('array');
		});
		it("should have a mechanicalTerms parameter", function() {
			expect(contract.mechanicalTerms).to.be.an('array');
		});
		it("should have a reserves parameter", function() {
			expect(contract.reserves).to.be.an('array');
		});
	});
});

describe("multipleContractsForXlsx", function() {
    describe("when passed an array", function() {
      	var contracts = [contract];
		before(function() {
			contract.save();
		});
		it("should not return an error", function(done) {
			Contract.multipleContractsForXlsx(contracts, function(err, mappedData) {
			  expect(err).to.eq(null);
			  done();
			});
		});
		it("should return an array", function(done) {
			Contract.multipleContractsForXlsx(contracts, function(err, mappedData) {
			 	expect(mappedData instanceof Array).to.be.true;
			  	done();
			});
		});
		it("should call exportData", function(done) {
			var spy = sinon.spy(contract, "exportData");
			Contract.multipleContractsForXlsx(contracts, function(err, mappedData) {
			  	expect(spy.callCount).to.eq(1);
			  	done();
			});
			after(function() {
			  	spy.restore();
			});
		});
		it("should add the returned value from exportData to the returned array", function(done) {
			Contract.multipleContractsForXlsx(contracts, function(err, mappedData) {
				expect(mappedData.length).to.eq(6);
				done();
			});
		});
    });
  	describe("when not passed an array", function() {
		it("should return an error in the callback stating it must be passed an array", function(done) {
			Contract.multipleContractsForXlsx(null, function(err, mappedData) {
				expect(err).to.eq("Must be passed an Array of Contracts");
				done();
			});
		});
    });
});

describe("importContract", function() {
	// Find using the ID or name
  	describe("when passed an object", function() {
  		var spy = sinon.spy(Contract, "findOne");
    	describe("when _id is present", function() {
      		it("should call find with the passed _id and clientId", function() {
	        	Contract.importContract(contract, [], contract.clientId, function(err, result) {
	          		expect(spy.called).to.be.true;
	          		spy.restore();
	        	});
    		});
    	});
    	describe("when _id is not present", function() {
      		describe("when name is present", function() {
		        it("should call find with the passed name and clientId", function() {
					var newContract = { _id: "", clientId: "ClientID", name: "Name 2", accountingPeriod: "AP 2" };
					Contract.importContract(newContract, [], contract.clientId, function(err, result) {
						expect(spy.called).to.be.true;
						spy.restore();
					});
		        });
		        describe("when a contract is found by the name", function() {
		        	it("should update the found contract with the passed fields", function() {
			            var newContract = { _id: "", clientId: "ClientID", name: "Name 2", accountingPeriod: "AP 2" };
			            Contract.importContract(newContract, [], contract.clientId, function(err, result) {
			            	expect(result.name).to.eq('Name 2');
			            	expect(result.accountingPeriod).to.eq('AP 2');
			            });
		        	});
		        });
	        	describe("when a contract is not found by the name", function() {
	        		it("should create a new contract", function() {
	            		var newContract = { _id: "", clientId: "ClientID", name: "Name 3", accountingPeriod: "AP 3" };
	            		Contract.importContract(newContract, [], contract.clientId, function(err, result) {
			            	expect(result.name).to.eq('Name 3');
			            	expect(result.accountingPeriod).to.eq('AP 3');
			            });
	          		});
	        	});
		        it("should set the passed fields to the Contract", function() {
		          	var newContract = { _id: "", clientId: "ClientID", name: "Name 4", accountingPeriod: "AP 4" };
		          	Contract.importContract(newContract, [], contract.clientId, function(err, result) {
		            	expect(result.name).to.eq("Name 4")
		            	expect(result.accountingPeriod).to.eq("AP 4")
		          	});
		        });
    		});
	      	describe("when name is not present", function() {
		      	it("should return an error to the callback stating that an name is required", function() {
		        	var newContract = { _id: "", clientId: "ClientID", accountingPeriod: "AP 1" };
		        	Contract.importContract(newContract, [], contract.clientId, function(err, result) {
		            	expect(err).to.eq("Name must be passed")
		          	});
		        });
		      	it("should not create a new Contract", function() {
		        	var newContract = { _id: "", clientId: "ClientID", accountingPeriod: "AP 1" };
		          	Contract.importContract(newContract, [], contract.clientId, function(err, result) {
		            	expect(err).to.eq("Name must be passed")
		          	});
		        });
      		});
    	});
	});
	describe("when not passed an object", function() {
    	it("should return an error in the callback stating it must be passed an object", function() {
	      	Contract.importContract(null, [], contract.clientId, function(err, result) {
	        	expect(err).to.eq("Contract must be passed")
	      	});
    	});
  	});
});

describe("importContracts", function() {
  	describe("when passed an array", function() {
	    var contracts = [
	      { _id: "", Name: "Name 1", accountingPeriod: "AP 1" },
	      { _id: "", accountingPeriod: "AP 1" },
	      {_id: ""}
	    ]
	    it("should add each returned error from importContract to the errors array", function() {
	      	Contract.importContracts(contracts, {}, contract.clientId, function(err, result) {
	        	expect(err.length).to.eq(2);
	      	});
	    });
	    it("should add each returned contract from importContract to the imported array", function() {
	      	Contract.importContracts(contracts, {}, contract.clientId, function(err, result) {
	        	expect(result.length).to.eq(0);
	      	});
	    });
  	});
  	describe("when not passed an array", function() {
    	var contracts = { _id: "123", Name: "Name 1", accountingPeriod: "AP 1" };    	
	    it("should return an error in the callback stating it must be passed an array", function() {
	      	Contract.importContracts(contracts, {}, contract.clientId, function(err, result) {
	        	expect(err).to.eq("Data must be an Array");
	      	});
	    });
  	});
  	describe("when not passed a clientId", function() {
	    var contracts = [
	      { _id: "123", Name: "Name 1", accountingPeriod: "AP 1" },
	      { _id: "123", Name: "Name 1", accountingPeriod: "AP 1" },
	      { _id: "123", Name: "Name 1", accountingPeriod: "AP 1" },
	      {_id: ""}
	    ]
	    it("should return an error in the callback stating it must be passed a client ID", function() {
	      	Contract.importContracts(contracts, {}, null, function(err, result) {
	        	expect(err).to.eq("A Client ID must be passed");
	      	});
	    });
  	});
});

describe("contract", function() {
	before(function() {
		contract.save();
	});
	describe("#userForbidden", function() {
		describe("when action is read", function() {
			var action = "read";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds match", function() {
					var user = { internal: false, parentId: null, clientId: contract.clientId, payeeId: null };
					expect(contract.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(contract.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has a clientId and a payeeId (is a contract user)", function() {
				it("should return false when contractIds match", function() {
					var user = { internal: false, parentId: null, clientId: contract.clientId, payeeId: contract.payeeId };
					expect(contract.userForbidden(user, action)).to.be.false;
				});
				it("should return true when contractIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: contract.clientId, payeeId: "anything else" };
					expect(contract.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(contract.userForbidden(user, action)).to.be.true;
				});
			});
		});
		describe("when action is write", function() {
			var action = "write";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds math", function() {
					var user = { internal: false, parentId: null, clientId: contract.clientId, payeeId: null };
					expect(contract.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(contract.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when uesr has a clientId and a payeeId (is a contract user)", function() {
				it("should return true when their payeeId match", function() {
					var user = { internal: false, parentId: null, clientId: contract.clientId, payeeId: contract.payeeId };
					expect(contract.userForbidden(user, action)).to.be.true;
				});
				it("should return true when their payeeId does not match", function() {
					var user = { internal: false, parentId: null, clientId: contract.clientId, payeeId: "anything else" };
					expect(contract.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(contract.userForbidden(user, action)).to.be.true;
				});
			});
		});
	});
});