process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var Payee = require('../../models/payee');
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
var nullUser = jwt.sign({ internal: false, parentId: null, clientId: null }, config.jsonSecretToken, { expiresIn: 86400 });
var contractId = "345";
var contractIds = [contractId, "678"];
var payeeId = "123";
var payee = jwt.sign({ internal: false, parentId: null, clientId: client._id, payeeId: payeeId, contractIds: contractIds }, config.jsonSecretToken, { expiresIn: 86400 });

describe("/payees", function() {

	beforeEach(function(done) {
		var payee1 = new Payee({ _id: payeeId, clientId: client._id, name: "Payee 1" });
		payee1.save();
		var payee2 = new Payee({ clientId: client._id, name: "Payee 2" });
		payee2.save();
		var payee3 = new Payee({ clientId: client._id, name: "Payee 3" });
		payee3.save();
		var payee4 = new Payee({ clientId: "anything else", name: "Payee 4" });
		payee4.save();
		done();
	});

	afterEach(function(done) {
		Payee.collection.drop();
		done();
	});

	describe("as a client user", function() {
		describe("/ GET", function() {
			it("should return a list of payees", function(done) {
				chai.request(server)
		    .get('/payees')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.payees).to.be.an('array');
		    	Payee.find({ clientId: client._id }, function(e, payees) {
		    		expect(res.body.payees.length).to.be.eq(payees.length);
		    		done();
		    	});
		    });
			});
			it("should return metadata of payees index on / GET", function(done) {
				chai.request(server)
		    .get('/payees')
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
		    .get('/payees')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/payees?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/payees')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/payees?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.payees.length).to.eq(1);
		    	Payee.count({ clientId: client._id }, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/payees/export')
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
				var newPayee = [ "ID", "Name", "Address", "Country", "VatNo", "BankName", "BankAddress", "AccountNo", "SortCode", "IBAN" ];
				createXlsx.createInTemplate([[newPayee]], appRootDir + config.exportTemplates.payee, function(err, outputFile) { 
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
			describe("when a payee is found", function() {
				it("should return a payee and 200 status", function(done) {
					Payee.find({}, function(e, payees) {
						var id = payees[0]._id;
						chai.request(server)
				    .get('/payees/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.clientId).to.eq(payees[0].clientId);
				    	expect(res.body.name).to.eq(payees[0].name);
				    	expect(res.body.type).to.eq(payees[0].type);
				    	done();
				    });
					});
				});
			});
			describe("when a payee is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Payee with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			describe("when a payee is found", function() {
				it("should update with passed values only", function(done) {
					Payee.find({}, function(e, payees) {
						var id = payees[0]._id;
						var changedName = payees[0].name + "changed";
						chai.request(server)
				    .put('/payees/' + id)
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
					Payee.find({}, function(e, payees) {
						var id = payees[0]._id;
						var changedTitle = payees[0].title + "changed";
						chai.request(server)
				    .put('/payees/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ name: changedTitle, clientId: "changed" })
				    .end(function(err, res) {
				    	expect(res.body.clientId).to.eq(payees[0].clientId);
				    	done();
				    });
					});
				});
			});
			describe("when a payee is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send({ title: "Changed Payee Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Payee with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			describe("when a payee is found", function() {
				it("should delete the payee and return a 200 status", function(done) {
					Payee.find({}, function(e, payees) {
						var id = payees[0]._id;
						chai.request(server)
				    .delete('/payees/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	Payee.find({}, function(e, newPayees) {
				    		expect(newPayees.length).to.eq(payees.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a payee is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Payee with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a payee created with the passed parameters", function(done) {
				params = { 
					clientId: "ClientID",
					name: "Name",
					address: "Address",
					country: "Country",
					vatNo: "VATNO"
				}
				chai.request(server)
		    .post('/payees')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.clientId).to.eq(params.clientId);
		    	expect(res.body.name).to.eq(params.name);
		    	expect(res.body.address).to.eq(params.address);
		    	expect(res.body.country).to.eq(params.country);
		    	expect(res.body.vatNo).to.eq(params.vatNo);
		    	done();
		    });
			});
			it("should add the payee to the database", function(done) {
				Payee.find({}, function(e, payees) {
					params = { clientId: "123", name: "Post Payee" }
					chai.request(server)
			    .post('/payees')
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send(params)
			    .end(function(err, res) {
			    	Payee.find({}, function(e, newPayees) {
			    		expect(newPayees.length).to.eq(payees.length + 1);
			    		done();
			    	});
			    });
		    });
			});
		});

		describe("/import POST", function() {
			it("should import payees from file", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_payee.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.works.length).to.eq(2);
		    	done();
		    });
			});
			it("should add the payees in the file to the database", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_payee.xlsx')
		    .end(function(err, res) {
		    	Payee.find({clientId: client._id, vatNo: 'ID1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Payee.find({clientId: client._id, vatNo: 'ID2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors).to.deep.eq(["Requires a file to be uploaded"]);
		    	done();
		    });
			});
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", nullUser)
		    .attach('file', 'test/test-data/test_payee.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should return any errors in the errors field of the response", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_null_payee.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors.length).to.above(0);
		    	done();
		    });
			});
		});
	});

	describe("as an internal user", function() {
		
		describe("/ GET", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .get('/payees')
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
		    .get('/payees/export')
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
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .get('/payees/' + id)
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
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .put('/payees/' + id)
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
			it("should not update the payee", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .put('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Payee.find({ _id: payees[0]._id }, function(err, newPayees) {
				    	expect(newPayees[0].title).to.eq(payees[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .delete('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the payee", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .delete('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	Payee.count({ _id: payees[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .post('/payees')
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
			it("should not create a payee", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .post('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Payee.count({}, function(err, count) {
				    	expect(payees.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .attach('file', 'test/test-data/test_payee.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a payee", function(done) {
				Payee.find({}, function(err, payees) {
					chai.request(server)
			    .post('/payees/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", internal)
		    	.attach('file', 'test/test-data/test_payee.xlsx')
			    .end(function(err, res) {
			    	Payee.count({}, function(err, count) {
				    	expect(payees.length).to.eq(count);
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
		    .get('/payees')
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
		    .get('/payees/export')
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
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .get('/payees/' + id)
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
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .put('/payees/' + id)
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
			it("should not update the payee", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .put('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Payee.find({ _id: payees[0]._id }, function(err, newPayees) {
				    	expect(newPayees[0].title).to.eq(payees[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .delete('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the payee", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .delete('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	Payee.count({ _id: payees[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .post('/payees')
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
			it("should not create a payee", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .post('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Payee.count({}, function(err, count) {
				    	expect(payees.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .attach('file', 'test/test-data/test_payee.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a payee", function(done) {
				Payee.find({}, function(err, payees) {
					chai.request(server)
			    .post('/payees/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", internal)
		    	.attach('file', 'test/test-data/test_payee.xlsx')
			    .end(function(err, res) {
			    	Payee.count({}, function(err, count) {
				    	expect(payees.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

	});

	describe("as a payee user", function() {
		var payeeId, payee;
		beforeEach(function(done) {
			Payee.find({}, function(err, payees) {
				payeeId = payees[0]._id;
				payee = jwt.sign({ internal: false, parentId: null, clientId: client._id, payeeId: payeeId, contractIds: contractIds }, config.jsonSecretToken, { expiresIn: 86400 });
				done();
			});
		});
		describe("/ GET", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .get('/payees')
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
		    .get('/payees/export')
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
				var newPayee = [ "ID", "Name", "Address", "Country", "VatNo", "BankName", "BankAddress", "AccountNo", "SortCode", "IBAN" ];
				createXlsx.createInTemplate([[newPayee]], appRootDir + config.exportTemplates.payee, function(err, outputFile) { 
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
			describe("when passed the payee's ID", function() {
				it("should return the payee", function(done) {
					Payee.find({ _id: payeeId }, function(err, payees) {
						var id = payees[0]._id;
						chai.request(server)
				    .get('/payees/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", payee)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.name).to.eq(payees[0].name);
				    	done();
				    });
					});
				});
			});
			describe("when passed an ID other than the payee's", function() {
				it("should return a 403 forbidden response", function(done) {
					Payee.find({}, function(err, payees) {
						var id = payees[2]._id;
						chai.request(server)
				    .get('/payees/' + id)
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
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .put('/payees/' + id)
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
			it("should not update the payee", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .put('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "Changed Title" })
			    .end(function(err, res) {
			    	Payee.find({ _id: payees[0]._id }, function(err, newPayees) {
				    	expect(newPayees[0].name).to.eq(payees[0].name);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .delete('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the payee", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .delete('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	Payee.count({ _id: payees[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .post('/payees')
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
			it("should not create a payee", function(done) {
				Payee.find({}, function(err, payees) {
					var id = payees[0]._id;
					chai.request(server)
			    .post('/payees/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Payee.count({}, function(err, count) {
				    	expect(payees.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should import payees from file", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_payee.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.works.length).to.eq(2);
		    	done();
		    });
			});
			it("should add the payees in the file to the database", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_payee.xlsx')
		    .end(function(err, res) {
		    	Payee.find({clientId: client._id, vatNo: 'ID1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Payee.find({clientId: client._id, vatNo: 'ID2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors).to.deep.eq(["Requires a file to be uploaded"]);
		    	done();
		    });
			});
			it("should return any errors in the errors field of the response", function(done) {
				chai.request(server)
		    .post('/payees/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_null_payee.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors.length).to.above(0);
		    	done();
		    });
			});
		});

	});

});