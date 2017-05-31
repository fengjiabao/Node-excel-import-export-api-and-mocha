process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var Work = require("../../models/work.js");
var sinon = require('sinon');

require('../../models/db');

var contractId = "ContractID";
var fields = {
	clientId: "ClientID",
	title: "Title",
	composer: "Composer",
	identifier: "identifier",
	salesReturnsRights: ["Sales Rights"],
	costsRights: ["Costs"],
	aliases: ["Aliases"],
	campaignIds: ["Campaigns"]
}
var work = new Work(fields);

describe("Work", function() {
	// Fields
	describe("fields", function() {
		it("should have a clientId parameter", function() {
			expect(work).to.have.a.property("clientId", fields.clientId);
		});
		it("should have a title parameter", function() {
			expect(work).to.have.a.property("title", fields.title);
		});
		it("should have a composer parameter", function() {
			expect(work).to.have.a.property("composer", fields.composer);
		});
		it("should have a identifier parameter", function() {
			expect(work).to.have.a.property("identifier", fields.identifier);
		});
		it("should have a salesReturnsRights parameter", function() {
			expect(work.salesReturnsRights).to.be.an('array');
		});
		it("should have a costsRights parameter", function() {
			expect(work.costsRights).to.be.an('array');
		});
		it("should have a aliases parameter", function() {
			expect(work.aliases).to.be.an('array');
		});
		it("should have a campaignIds parameter", function() {
			expect(work.campaignIds).to.be.an('array');
		});
	});
});

describe("convertWorksForXlsx", function() {
    describe("when passed an array", function() {
      	var works = [work];
		before(function() {
			work.save();
		});
		it("should not return an error", function(done) {
			Work.convertWorksForXlsx(works, function(err, mappedData) {
			  expect(err).to.eq(null);
			  done();
			});
		});
		it("should return an array", function(done) {
			Work.convertWorksForXlsx(works, function(err, mappedData) {
			 	expect(mappedData instanceof Array).to.be.true;
			  	done();
			});
		});
		it("should call exportData for aliases", function(done) {
			var spy = sinon.spy(work, "exportData");
			Work.convertWorksForXlsx(works, function(err, mappedData) {
			  	expect(spy.callCount).to.eq(1);
			  	done();
			});
			after(function() {
			  	spy.restore();
			});
		});
		it("should add the returned value from exportData to the returned array", function(done) {
			Work.convertWorksForXlsx(works, function(err, mappedData) {
				expect(mappedData.length).to.eq(1);
				done();
			});
		});
    });
  	describe("when not passed an array", function() {
		it("should return an error in the callback stating it must be passed an array", function(done) {
			Work.convertWorksForXlsx(null, function(err, mappedData) {
				expect(err).to.eq("Must be passed an Array of Works");
				done();
			});
		});
    });
});

describe("importWork", function() {
	// Find using the ID or identifier
  	describe("when passed an object", function() {
  		var spy = sinon.spy(Work, "findOne");
    	describe("when _id is present", function() {
      		it("should call find with the passed _id and clientId", function() {
	        	Work.importWork(work, work.clientId, function(err, result) {
	          		expect(spy.called).to.be.true;
	          		spy.restore();
	        	});
    		});
    	});
    	describe("when _id is not present", function() {
      		describe("when identifier is present", function() {
		        it("should call find with the passed identifier and clientId", function() {
					var newWork = { _id: "", clientId: "ClientID", title: "Work 2", composer: "Composer 2", identifier: "ID", aliases: "Aliases" };
					Work.importWork(newWork, work.clientId, function(err, result) {
						expect(spy.called).to.be.true;
						spy.restore();
					});
		        });
		        describe("when a work is found by the identifier", function() {
		        	it("should update the found work with the passed fields", function() {
			            var newWork = { _id: "", clientId: "ClientID", title: "Work 2", composer: "Composer 2", identifier: "ID", aliases: "Aliases" };
			            Work.importWork(newWork, work.clientId, function(err, result) {
			            	expect(result.title).to.eq('Work 2');
			            	expect(result.composer).to.eq('Composer 2');
			            });
		        	});
		        });
	        	describe("when a work is not found by the identifier", function() {
	        		it("should create a new work", function() {
	            		var newWork = { _id: "", clientId: "ClientID", title: "Work 3", composer: "Composer 3", identifier: "ID 3", aliases: "Aliases" };
	            		Work.importWork(newWork, work.clientId, function(err, result) {
			            	expect(result.title).to.eq('Work 3');
			            	expect(result.composer).to.eq('Composer 3');
			            	expect(result.identifier).to.eq('ID 3');
			            });
	          		});
	        	});
		        it("should set the passed fields to the Work", function() {
		          	var newWork = { _id: "", clientId: "ClientID", title: "Work 4", composer: "Composer 4", identifier: "ID 4", aliases: "Aliases" };
		          	Work.importWork(newWork, work.clientId, function(err, result) {
		            	expect(result.title).to.eq("Work 4")
		            	expect(result.composer).to.eq("Composer 4")
		            	expect(result.identifier).to.eq("ID 4")
		          	});
		        });
    		});
	      	describe("when identifier is not present", function() {
		      	it("should return an error to the callback stating that an identifier is required", function() {
		        	var newWork = { _id: "", clientId: "ClientID", title: "Work 1", composer: "Composer 1", aliases: "Aliases" };
		        	Work.importWork(newWork, work.clientId, function(err, result) {
		            	expect(err).to.eq("Identifier must be passed")
		          	});
		        });
		      	it("should not create a new Work", function() {
		        	var newWork = { _id: "", clientId: "ClientID", title: "Work 1", composer: "Composer 1", aliases: "Aliases" };
		          	Work.importWork(newWork, work.clientId, function(err, result) {
		            	expect(err).to.eq("Identifier must be passed")
		          	});
		        });
      		});
    	});
	});
	describe("when not passed an object", function() {
    	it("should return an error in the callback stating it must be passed an object", function() {
	      	Work.importWork(null, work.clientId, function(err, result) {
	        	expect(err).to.eq("Work must be passed")
	      	});
    	});
  	});
});

describe("importWorks", function() {
  	describe("when passed an array", function() {
	    var works = [
	      { _id: "", title: "Work 1", composer: "Composer 1", identifier: "ID1" },
	      {_id: ""}
	    ]
	    it("should call importWork for each work passed", function() {
	      	Work.importWorks(works, work.clientId, function(err, result) {
	        	expect(err).to.eq(null);
	      	});
	    });
	    var works = [
	      { _id: "", title: "Work 1", composer: "Composer 1", identifier: "ID1" },
	      { _id: "", title: "Work 1", composer: "Composer 1" },
	      {_id: ""}
	    ]
	    it("should add each returned error from importWork to the errors array", function() {
	      	Work.importWorks(works, work.clientId, function(err, result) {
	        	expect(err.length).to.eq(1);
	      	});
	    });
	    it("should add each returned work from importWork to the imported array", function() {
	      	Work.importWorks(works, work.clientId, function(err, result) {
	        	expect(result.length).to.eq(works.length);
	      	});
	    });
  	});
  	describe("when not passed an array", function() {
    	var works = { _id: "123", title: "Work 1", composer: "Composer 1", identifier: "ID1" };    	
	    it("should return an error in the callback stating it must be passed an array", function() {
	      	Work.importWorks(works, work.clientId, function(err, result) {
	        	expect(err).to.eq("Data must be an Array");
	      	});
	    });
  	});
  	describe("when not passed a clientId", function() {
	    var works = [
	      { _id: "123", title: "Work 1", composer: "Composer 1", identifier: "ID1" },
	      { _id: "123", title: "Work 1", composer: "Composer 1", identifier: "ID1" },
	      { _id: "123", title: "Work 1", composer: "Composer 1", identifier: "ID1" },
	      {_id: ""}
	    ]
	    it("should return an error in the callback stating it must be passed a client ID", function() {
	      	Work.importWorks(works, null, function(err, result) {
	        	expect(err).to.eq("A Client ID must be passed");
	      	});
	    });
  	});
});

describe("work", function() {
	before(function() {
		work.save();
	});
	describe("#userForbidden", function() {
		describe("when action is read", function() {
			var action = "read";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds math", function() {
					var user = { internal: false, parentId: null, clientId: work.clientId, payeeId: null };
					expect(work.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(work.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has a clientId and a payeeId (is a payee user)", function() {
				it("should return false when contractIds match", function() {
					var user = { internal: false, parentId: null, clientId: work.clientId, payeeId: "123", contractIds: [contractId, "12345678"] };
					work.salesReturnsRights = [{ contractId: contractId }];
					expect(work.userForbidden(user, action)).to.be.false;
				});
				it("should return true when contractIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: work.clientId, payeeId: "123", contractIds: ["12345678"] };
					expect(work.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(work.userForbidden(user, action)).to.be.true;
				});
			});
		});
		describe("when action is write", function() {
			var action = "write";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds math", function() {
					var user = { internal: false, parentId: null, clientId: work.clientId, payeeId: null };
					expect(work.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(work.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when uesr has a clientId and a payeeId (is a payee user)", function() {
				it("should return true when contractIds match", function() {
					var user = { internal: false, parentId: null, clientId: work.clientId, payeeId: "123", contractIds: [contractId, "12345678"] };
					expect(work.userForbidden(user, action)).to.be.true;
				});
				it("should return true when contractIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: work.clientId, payeeId: "123", contractIds: ["12345678"] };
					expect(work.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(work.userForbidden(user, action)).to.be.true;
				});
			});
		});
	});
	describe("#containsContractIds", function() {
		describe("when passed an array", function() {
			var contractId = "ContractId";
			var contractIds = [contractId, "somethingElse"];
			describe("when work has contractId within salesReturnsRights", function() {
				it("should return true", function(done) {
					work.salesReturnsRights = [{ contractId: contractId }];
					work.costsRights = [];
					work.containsContractIds(contractIds, function(val) {
						expect(val).to.be.true;
						done();
					});
				});
			});
			describe("when work has contractId within costsRights", function() {
				it("should return true", function(done) {
					work.salesReturnsRights = [];
					work.costsRights = [{ contractId: contractId }];;
					work.containsContractIds(contractIds, function(val) {
						expect(val).to.be.true;
						done();
					});
				});
			});
			describe("when work does not have contractId within either salesReturnsRights or costsRights", function() {
				it("should return false", function(done) {
					work.salesReturnsRights = [];
					work.costsRights = [];
					work.containsContractIds(contractIds, function(val) {
						expect(val).to.be.false;
						done();
					});
				});
			});
		});
		describe("when not passed an array", function() {
			it("should return false", function(done) {
				work.salesReturnsRights = [];
				work.costsRights = [];
				work.containsContractIds(null, function(val) {
					expect(val).to.be.false;
					done();
				});
			});
		});
	});
	describe("#contractIds", function() {
		it("should return an array", function(done) {
			work.contractIds(function(ids) {
				expect(ids).to.be.an('array');
				done();
			});
		});
		describe("when work has salesReturnsRights", function() {
			it("should include the contractId from each object in salesReturnsRights", function(done) {
				work.salesReturnsRights = [{ contractId: contractId }];
				work.costsRights = [];
				work.contractIds(function(ids) {
					expect(ids).to.deep.eq([contractId]);
					done();
				});
			});
		});
		describe("when work has costsRights", function() {
			it("should include the contractId from each object in costsRights", function(done) {
				work.salesReturnsRights = [];
				work.costsRights = [{ contractId: contractId }];
				work.contractIds(function(ids) {
					expect(ids).to.deep.eq([contractId]);
					done();
				});
			});
		});
		describe("when work has neither salesReturnsRights or costsRights", function() {
			it("should return a blank array", function(done) {
				work.salesReturnsRights = [];
				work.costsRights = [];
				work.contractIds(function(ids) {
					expect(ids).to.be.an('array');
					done();
				});
			});
		});
	});
});