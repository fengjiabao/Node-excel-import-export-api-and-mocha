process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var SalesFile = require('../../models/salesFile');
var Client = require('../../models/client');

chai.use(chaiHttp);

var client = new Client({ name: "Client 1" });
client.save();

var internal = jwt.sign({ internal: true }, config.jsonSecretToken, { expiresIn: 86400 });
var parent = jwt.sign({ internal: false, parentId: "parentId" }, config.jsonSecretToken, { expiresIn: 86400 });
var clientUser = jwt.sign({ internal: false, parentId: null, clientId: client._id }, config.jsonSecretToken, { expiresIn: 86400 });
var contractId = "345";
var contractIds = [contractId, "678"];
var payee = jwt.sign({ internal: false, parentId: null, clientId: client._id, payeeId: "123", contractIds: contractIds }, config.jsonSecretToken, { expiresIn: 86400 });

describe("/salesFiles", function() {

	beforeEach(function(done) {
		var salesFile1 = new SalesFile({ clientId: client._id, title: "SalesFile 1", salesReturnsRights: [{ contractId: contractId }] });
		salesFile1.save();
		var salesFile2 = new SalesFile({ clientId: client._id, title: "SalesFile 2", costsRights: [{ contractId: contractId }] });
		salesFile2.save();
		var salesFile3 = new SalesFile({ clientId: client._id, title: "SalesFile 3" });
		salesFile3.save();
		var salesFile4 = new SalesFile({ clientId: "anything else", title: "SalesFile 4" });
		salesFile4.save();
		done();
	});

	afterEach(function(done) {
		SalesFile.collection.drop();
		done();
	});

	describe("as a client user", function() {
		describe("/ GET", function() {
			it("should return a list of salesFiles", function(done) {
				chai.request(server)
		    .get('/salesFiles')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.salesFiles).to.be.an('array');
		    	SalesFile.find({ clientId: client._id }, function(e, salesFiles) {
		    		console.log(salesFiles);
		    		expect(res.body.salesFiles.length).to.be.eq(salesFiles.length);
		    		done();
		    	});
		    });
			});
			it("should return metadata of salesFiles index on / GET", function(done) {
				chai.request(server)
		    .get('/salesFiles')
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
		    .get('/salesFiles')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/salesFiles?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/salesFiles')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/salesFiles?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.salesFiles.length).to.eq(1);
		    	SalesFile.count({ clientId: client._id }, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		describe("/:id GET", function() {
			describe("when a salesFile is found", function() {
				it("should return a salesFile and 200 status", function(done) {
					SalesFile.find({}, function(e, salesFiles) {
						var id = salesFiles[0]._id;
						chai.request(server)
				    .get('/salesFiles/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.clientId).to.eq(salesFiles[0].clientId);
				    	expect(res.body.name).to.eq(salesFiles[0].name);
				    	expect(res.body.type).to.eq(salesFiles[0].type);
				    	done();
				    });
					});
				});
			});
			describe("when a salesFile is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find SalesFile with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			describe("when a salesFile is found", function() {
				it("should update with passed values only", function(done) {
					SalesFile.find({}, function(e, salesFiles) {
						var id = salesFiles[0]._id;
						var changedName = salesFiles[0].name + "changed";
						chai.request(server)
				    .put('/salesFiles/' + id)
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
					SalesFile.find({}, function(e, salesFiles) {
						var id = salesFiles[0]._id;
						var changedTitle = salesFiles[0].title + "changed";
						chai.request(server)
				    .put('/salesFiles/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ name: changedTitle, clientId: "changed" })
				    .end(function(err, res) {
				    	expect(res.body.clientId).to.eq(salesFiles[0].clientId);
				    	done();
				    });
					});
				});
			});
			describe("when a salesFile is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send({ title: "Changed SalesFile Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find SalesFile with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			describe("when a salesFile is found", function() {
				it("should delete the salesFile and return a 200 status", function(done) {
					SalesFile.find({}, function(e, salesFiles) {
						var id = salesFiles[0]._id;
						chai.request(server)
				    .delete('/salesFiles/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	SalesFile.find({}, function(e, newSalesFiles) {
				    		expect(newSalesFiles.length).to.eq(salesFiles.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a salesFile is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find SalesFile with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a salesFile created with the passed parameters", function(done) {
				params = { 
					clientId: "ClientID",
					name: "Name",
					salesAccountName: "sales Account",
					salesAccountId: "123",
					salesTemplateName: "Template",
					salesTemplateId: "234",
					totalValue: 123.45,
					status: "Status",
					valid: true,
					unmappedLines: 123,
					file: "file"
				}
				chai.request(server)
		    .post('/salesFiles')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.clientId).to.eq(params.clientId);
		    	expect(res.body.name).to.eq(params.name);
		    	expect(res.body.salesAccountName).to.eq(params.salesAccountName);
		    	expect(res.body.salesAccountId).to.eq(params.salesAccountId);
		    	expect(res.body.salesTemplateName).to.eq(params.salesTemplateName);
		    	expect(res.body.salesTemplateId).to.eq(params.salesTemplateId);
		    	expect(res.body.totalValue).to.deep.eq(params.totalValue);
		    	expect(res.body.status).to.eq(params.status);
		    	expect(res.body.valid).to.eq(params.valid);
		    	expect(res.body.unmappedLines).to.deep.eq(params.unmappedLines);
		    	expect(res.body.file).to.deep.eq(params.file);
		    	done();
		    });
			});
			it("should add the salesFile to the database", function(done) {
				SalesFile.find({}, function(e, salesFiles) {
					params = { clientId: "123", name: "Post SalesFile" }
					chai.request(server)
			    .post('/salesFiles')
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send(params)
			    .end(function(err, res) {
			    	SalesFile.find({}, function(e, newSalesFiles) {
			    		expect(newSalesFiles.length).to.eq(salesFiles.length + 1);
			    		done();
			    	});
			    });
		    });
			});
		});
	});

	describe("as an internal user", function() {
		
		describe("/ GET", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .get('/salesFiles')
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
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .get('/salesFiles/' + id)
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
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .put('/salesFiles/' + id)
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
			it("should not update the salesFile", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .put('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesFile.find({ _id: salesFiles[0]._id }, function(err, newSalesFiles) {
				    	expect(newSalesFiles[0].title).to.eq(salesFiles[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .delete('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the salesFile", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .delete('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	SalesFile.count({ _id: salesFiles[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .post('/salesFiles')
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
			it("should not create a salesFile", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .post('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesFile.count({}, function(err, count) {
				    	expect(salesFiles.length).to.eq(count);
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
		    .get('/salesFiles')
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
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .get('/salesFiles/' + id)
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
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .put('/salesFiles/' + id)
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
			it("should not update the salesFile", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .put('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesFile.find({ _id: salesFiles[0]._id }, function(err, newSalesFiles) {
				    	expect(newSalesFiles[0].title).to.eq(salesFiles[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .delete('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the salesFile", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .delete('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	SalesFile.count({ _id: salesFiles[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .post('/salesFiles')
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
			it("should not create a salesFile", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .post('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesFile.count({}, function(err, count) {
				    	expect(salesFiles.length).to.eq(count);
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
		    .get('/salesFiles')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
		});
		describe("/:id GET", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .get('/salesFiles/' + id)
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
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .put('/salesFiles/' + id)
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
			it("should not update the salesFile", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .put('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "Changed Title" })
			    .end(function(err, res) {
			    	SalesFile.find({ _id: salesFiles[0]._id }, function(err, newSalesFiles) {
				    	expect(newSalesFiles[0].name).to.eq(salesFiles[0].name);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .delete('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the salesFile", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .delete('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	SalesFile.count({ _id: salesFiles[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .post('/salesFiles')
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
			it("should not create a salesFile", function(done) {
				SalesFile.find({}, function(err, salesFiles) {
					var id = salesFiles[0]._id;
					chai.request(server)
			    .post('/salesFiles/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesFile.count({}, function(err, count) {
				    	expect(salesFiles.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

	});

});