process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var Contract = require('../../models/contract');
var Client = require('../../models/client');
var appRootDir = require('app-root-dir').get();
var createXlsx = require('../../libs/createXlsx');
var fs = require('fs');
var XLSX = require('xlsx');

chai.use(chaiHttp);

var client = new Client({ name: "Client 1" });
client.save();

var internal = jwt.sign({ internal: true }, config.jsonSecretToken, { expiresIn: 86400 });
var parent = jwt.sign({ internal: false, parentId: "parentId" }, config.jsonSecretToken, { expiresIn: 86400 });
var clientUser = jwt.sign({ internal: false, parentId: null, clientId: client._id }, config.jsonSecretToken, { expiresIn: 86400 });
var contractId = "345";
var contractIds = [contractId, "678"];
var payeeId = "123";
var payee = jwt.sign({ internal: false, parentId: null, clientId: client._id, payeeId: payeeId, contractIds: contractIds }, config.jsonSecretToken, { expiresIn: 86400 });

describe("/contracts", function() {

	beforeEach(function(done) {
		var contract1 = new Contract({ clientId: client._id, payeeId: payeeId, name: "Contract 1" });
		contract1.save();
		var contract2 = new Contract({ clientId: client._id, name: "Contract 2" });
		contract2.save();
		var contract3 = new Contract({ clientId: client._id, name: "Contract 3" });
		contract3.save();
		var contract4 = new Contract({ clientId: "anything else", name: "Contract 4" });
		contract4.save();
		done();
	});

	afterEach(function(done) {
		Contract.collection.drop();
		done();
	});

	describe("as a client user", function() {
		describe("/ GET", function() {
			it("should return a list of contracts", function(done) {
				chai.request(server)
		    .get('/contracts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.contracts).to.be.an('array');
		    	Contract.find({ clientId: client._id }, function(e, contracts) {
		    		expect(res.body.contracts.length).to.be.eq(contracts.length);
		    		done();
		    	});
		    });
			});
			it("should return metadata of contracts index on / GET", function(done) {
				chai.request(server)
		    .get('/contracts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.meta).to.be.an('object');
		    	done();
		    });
			});
			it("should return the first page if not passed a specific page", function(done) {
				chai.request(server)
		    .get('/contracts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/contracts?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/contracts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/contracts?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.contracts.length).to.eq(1);
		    	Contract.count({ clientId: client._id }, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/contracts/export')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.header["content-type"]).to.eq('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		    	expect(res.header["content-length"]).to.exist;
		    	done();
		    });
			});
			it("should return the created file by createXlsx.createInTemplate", function(done) {
				var newContract = [ "ID", "Name", "AP", "T", "1", "P" ];
				createXlsx.createInTemplate([[newContract]], appRootDir + config.exportTemplates.contract, function(err, outputFile) { 
					var workbook = XLSX.readFile(outputFile);
					var sheet = workbook.Sheets[workbook.SheetNames[0]];
					expect(sheet['A3'].v).to.eq("ID");
					expect(fs.existsSync(outputFile)).to.be.true;
					fs.unlink(outputFile, function() {
						done();
					});
				});
			});
		});
		describe("/:id GET", function() {
			describe("when a contract is found", function() {
				it("should return a contract and 200 status", function(done) {
					Contract.find({}, function(e, contracts) {
						var id = contracts[0]._id;
						chai.request(server)
				    .get('/contracts/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.clientId).to.eq(contracts[0].clientId);
				    	expect(res.body.name).to.eq(contracts[0].name);
				    	expect(res.body.type).to.eq(contracts[0].type);
				    	done();
				    });
					});
				});
			});
			describe("when a contract is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Contract with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			describe("when a contract is found", function() {
				it("should update with passed values only", function(done) {
					Contract.find({}, function(e, contracts) {
						var id = contracts[0]._id;
						var changedName = contracts[0].name + "changed";
						chai.request(server)
				    .put('/contracts/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ name: changedName })
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.name).to.eq(changedName);
				    	done();
				    });
					});
				});
				it("should not update clientId", function(done) {
					Contract.find({}, function(e, contracts) {
						var id = contracts[0]._id;
						var changedTitle = contracts[0].title + "changed";
						chai.request(server)
				    .put('/contracts/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ name: changedTitle, clientId: "changed" })
				    .end(function(err, res) {
				    	expect(res.body.clientId).to.eq(contracts[0].clientId);
				    	done();
				    });
					});
				});
			});
			describe("when a contract is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send({ title: "Changed Contract Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Contract with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			describe("when a contract is found", function() {
				it("should delete the contract and return a 200 status", function(done) {
					Contract.find({}, function(e, contracts) {
						var id = contracts[0]._id;
						chai.request(server)
				    .delete('/contracts/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	Contract.find({}, function(e, newContracts) {
				    		expect(newContracts.length).to.eq(contracts.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a contract is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Contract with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a contract created with the passed parameters", function(done) {
				params = { 
					clientId: "ClientID",
					payeeId: "PayeeID",
					name: "Contract",
					type: "Type",
					accountingPeriod: "period",
					minPayout: 123,
					salesTerms: ["Sales"],
					returnsTerms: ["Returns"],
					costsTerms: ["Costs"],
					mechanicalTerms: ["Mechanical"],
					reserves: ["Reserves"]
				}
				chai.request(server)
		    .post('/contracts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.clientId).to.eq(params.clientId);
		    	expect(res.body.payeeId).to.eq(params.payeeId);
		    	expect(res.body.name).to.eq(params.name);
		    	expect(res.body.type).to.eq(params.type);
		    	expect(res.body.accountingPeriod).to.eq(params.accountingPeriod);
		    	expect(res.body.minPayout).to.eq(params.minPayout);
		    	expect(res.body.salesTerms).to.deep.eq(params.salesTerms);
		    	expect(res.body.returnsTerms).to.deep.eq(params.returnsTerms);
		    	expect(res.body.costsTerms).to.deep.eq(params.costsTerms);
		    	expect(res.body.mechanicalTerms).to.deep.eq(params.mechanicalTerms);
		    	expect(res.body.reserves).to.deep.eq(params.reserves);
		    	done();
		    });
			});
			it("should add the contract to the database", function(done) {
				Contract.find({}, function(e, contracts) {
					params = { clientId: "123", name: "Post Contract" }
					chai.request(server)
			    .post('/contracts')
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send(params)
			    .end(function(err, res) {
			    	Contract.find({}, function(e, newContracts) {
			    		expect(newContracts.length).to.eq(contracts.length + 1);
			    		done();
			    	});
			    });
		    });
			});
		});
		describe("/import POST", function() {
			it("should import contracts from file", function(done) {
				chai.request(server)
		    .post('/contracts/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_contract.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.contracts.length).to.eq(3);
		    	done();
		    });
			});
			it("should add the contracts in the file to the database", function(done) {
				chai.request(server)
		    .post('/contracts/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_contract.xlsx')
		    .end(function(err, res) {
		    	Contract.find({clientId: client._id, name: 'ID1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Contract.find({clientId: client._id, name: 'ID2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/contracts/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors).to.deep.eq(["Requires a file to be uploaded"]);
		    	done();
		    });
			});
		});
	});

	describe("as an internal user", function() {
		
		describe("/ GET", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .get('/contracts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .get('/contracts/export')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
		});
		describe("/:id GET", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .get('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .put('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not update the contract", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .put('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Contract.find({ _id: contracts[0]._id }, function(err, newContracts) {
				    	expect(newContracts[0].title).to.eq(contracts[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .delete('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the contract", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .delete('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	Contract.count({ _id: contracts[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .post('/contracts')
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not create a contract", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .post('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Contract.count({}, function(err, count) {
				    	expect(contracts.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/contracts/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .attach('file', 'test/test-data/test_contract.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a contract", function(done) {
				Contract.find({}, function(err, works) {
					chai.request(server)
			    .post('/contracts/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", internal)
		    	.attach('file', 'test/test-data/test_contract.xlsx')
			    .end(function(err, res) {
			    	Contract.count({}, function(err, count) {
				    	expect(contracts.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

	});

	describe("as a parent user without a client", function() {
		
		describe("/ GET", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .get('/contracts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", parent)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .get('/contracts/export')
		    .set("applicationToken", config.applicationToken)
		    .set("token", parent)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
		});
		describe("/:id GET", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .get('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .put('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not update the contract", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .put('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Contract.find({ _id: contracts[0]._id }, function(err, newContracts) {
				    	expect(newContracts[0].title).to.eq(contracts[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .delete('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the contract", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .delete('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	Contract.count({ _id: contracts[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .post('/contracts')
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not create a contract", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .post('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Contract.count({}, function(err, count) {
				    	expect(contracts.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/contracts/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .attach('file', 'test/test-data/test_contract.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a contract", function(done) {
				Contract.find({}, function(err, works) {
					chai.request(server)
			    .post('/contracts/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", internal)
		    	.attach('file', 'test/test-data/test_contract.xlsx')
			    .end(function(err, res) {
			    	Contract.count({}, function(err, count) {
				    	expect(contracts.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

	});

	describe("as a payee user", function() {
		describe("/ GET", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .get('/contracts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/contracts/export')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.header["content-type"]).to.eq('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		    	expect(res.header["content-length"]).to.exist;
		    	done();
		    });
			});
			it("should return the created file by createXlsx.createInTemplate", function(done) {
				var newContract = [ "ID", "Name", "AP", "T", "1", "P" ];
				createXlsx.createInTemplate([[newContract]], appRootDir + config.exportTemplates.contract, function(err, outputFile) { 
					var workbook = XLSX.readFile(outputFile);
					var sheet = workbook.Sheets[workbook.SheetNames[0]];
					expect(sheet['A3'].v).to.eq("ID");
					expect(fs.existsSync(outputFile)).to.be.true;
					fs.unlink(outputFile, function() {
						done();
					});
				});
			});
		});
		describe("/:id GET", function() {
			describe("when the contract is associated with the payee", function() {
				it("should return the contract", function(done) {
					Contract.find({ payeeId: payeeId }, function(err, contracts) {
						var id = contracts[0]._id;
						chai.request(server)
				    .get('/contracts/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", payee)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.name).to.eq(contracts[0].name);
				    	done();
				    });
					});
				});
			});
			describe("when the contract is not associated with the payee", function() {
				it("should return a 403 forbidden response", function(done) {
					Contract.find({}, function(err, contracts) {
						var id = contracts[2]._id;
						chai.request(server)
				    .get('/contracts/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", payee)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(403);
				    	expect(res.body.message).to.eq('Forbidden');
				    	done();
				    });
					});
				});
			});
		});
		describe("/:id PUT", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .put('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "Changed Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not update the contract", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .put('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "Changed Title" })
			    .end(function(err, res) {
			    	Contract.find({ _id: contracts[0]._id }, function(err, newContracts) {
				    	expect(newContracts[0].name).to.eq(contracts[0].name);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .delete('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the contract", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .delete('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	Contract.count({ _id: contracts[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .post('/contracts')
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not create a contract", function(done) {
				Contract.find({}, function(err, contracts) {
					var id = contracts[0]._id;
					chai.request(server)
			    .post('/contracts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Contract.count({}, function(err, count) {
				    	expect(contracts.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

		describe("/import POST", function() {
			it("should import contracts from file", function(done) {
				chai.request(server)
		    .post('/contracts/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_contract.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.contracts.length).to.eq(3);
		    	done();
		    });
			});
			it("should add the contracts in the file to the database", function(done) {
				chai.request(server)
		    .post('/contracts/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_contract.xlsx')
		    .end(function(err, res) {
		    	Contract.find({clientId: client._id, name: 'ID1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Contract.find({clientId: client._id, name: 'ID2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/contracts/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors).to.deep.eq(["Requires a file to be uploaded"]);
		    	done();
		    });
			});
		});

	});

});