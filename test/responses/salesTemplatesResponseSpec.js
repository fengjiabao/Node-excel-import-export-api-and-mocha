process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var SalesTemplate = require('../../models/salesTemplate');
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

describe("/salesTemplates", function() {

	beforeEach(function(done) {
		var salesTemplate1 = new SalesTemplate({ clientId: client._id, title: "SalesTemplate 1", salesReturnsRights: [{ contractId: contractId }] });
		salesTemplate1.save();
		var salesTemplate2 = new SalesTemplate({ clientId: client._id, title: "SalesTemplate 2", costsRights: [{ contractId: contractId }] });
		salesTemplate2.save();
		var salesTemplate3 = new SalesTemplate({ clientId: client._id, title: "SalesTemplate 3" });
		salesTemplate3.save();
		var salesTemplate4 = new SalesTemplate({ clientId: "anything else", title: "SalesTemplate 4" });
		salesTemplate4.save();
		done();
	});

	afterEach(function(done) {
		SalesTemplate.collection.drop();
		done();
	});

	describe("as a client user", function() {
		describe("/ GET", function() {
			it("should return a list of salesTemplates", function(done) {
				chai.request(server)
		    .get('/salesTemplates')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.salesTemplates).to.be.an('array');
		    	SalesTemplate.find({ clientId: client._id }, function(e, salesTemplates) {
		    		console.log(salesTemplates);
		    		expect(res.body.salesTemplates.length).to.be.eq(salesTemplates.length);
		    		done();
		    	});
		    });
			});
			it("should return metadata of salesTemplates index on / GET", function(done) {
				chai.request(server)
		    .get('/salesTemplates')
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
		    .get('/salesTemplates')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/salesTemplates?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/salesTemplates')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/salesTemplates?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.salesTemplates.length).to.eq(1);
		    	SalesTemplate.count({ clientId: client._id }, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		describe("/:id GET", function() {
			describe("when a salesTemplate is found", function() {
				it("should return a salesTemplate and 200 status", function(done) {
					SalesTemplate.find({}, function(e, salesTemplates) {
						var id = salesTemplates[0]._id;
						chai.request(server)
				    .get('/salesTemplates/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.clientId).to.eq(salesTemplates[0].clientId);
				    	expect(res.body.name).to.eq(salesTemplates[0].name);
				    	expect(res.body.type).to.eq(salesTemplates[0].type);
				    	done();
				    });
					});
				});
			});
			describe("when a salesTemplate is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find SalesTemplate with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			describe("when a salesTemplate is found", function() {
				it("should update with passed values only", function(done) {
					SalesTemplate.find({}, function(e, salesTemplates) {
						var id = salesTemplates[0]._id;
						var changedName = salesTemplates[0].name + "changed";
						chai.request(server)
				    .put('/salesTemplates/' + id)
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
					SalesTemplate.find({}, function(e, salesTemplates) {
						var id = salesTemplates[0]._id;
						var changedTitle = salesTemplates[0].title + "changed";
						chai.request(server)
				    .put('/salesTemplates/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ name: changedTitle, clientId: "changed" })
				    .end(function(err, res) {
				    	expect(res.body.clientId).to.eq(salesTemplates[0].clientId);
				    	done();
				    });
					});
				});
			});
			describe("when a salesTemplate is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send({ title: "Changed SalesTemplate Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find SalesTemplate with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			describe("when a salesTemplate is found", function() {
				it("should delete the salesTemplate and return a 200 status", function(done) {
					SalesTemplate.find({}, function(e, salesTemplates) {
						var id = salesTemplates[0]._id;
						chai.request(server)
				    .delete('/salesTemplates/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	SalesTemplate.find({}, function(e, newSalesTemplates) {
				    		expect(newSalesTemplates.length).to.eq(salesTemplates.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a salesTemplate is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find SalesTemplate with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a salesTemplate created with the passed parameters", function(done) {
				params = { 
					clientId: "ClientID",
					name: "Name",
					salesAccountName: "sales Account",
					salesAccountId: "123",
					startingLine: 1,
					startingLeft: 2,
					fields: ["Some", "fields"]
				}
				chai.request(server)
		    .post('/salesTemplates')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.clientId).to.eq(params.clientId);
		    	expect(res.body.name).to.eq(params.name);
		    	expect(res.body.salesAccountName).to.eq(params.salesAccountName);
		    	expect(res.body.salesAccountId).to.eq(params.salesAccountId);
		    	expect(res.body.startingLine).to.eq(params.startingLine);
		    	expect(res.body.startingLeft).to.eq(params.startingLeft);
		    	expect(res.body.fields).to.deep.eq(params.fields);
		    	done();
		    });
			});
			it("should add the salesTemplate to the database", function(done) {
				SalesTemplate.find({}, function(e, salesTemplates) {
					params = { clientId: "123", name: "Post SalesTemplate" }
					chai.request(server)
			    .post('/salesTemplates')
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send(params)
			    .end(function(err, res) {
			    	SalesTemplate.find({}, function(e, newSalesTemplates) {
			    		expect(newSalesTemplates.length).to.eq(salesTemplates.length + 1);
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
		    .get('/salesTemplates')
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
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .get('/salesTemplates/' + id)
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
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .put('/salesTemplates/' + id)
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
			it("should not update the salesTemplate", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .put('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesTemplate.find({ _id: salesTemplates[0]._id }, function(err, newSalesTemplates) {
				    	expect(newSalesTemplates[0].title).to.eq(salesTemplates[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .delete('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the salesTemplate", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .delete('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	SalesTemplate.count({ _id: salesTemplates[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .post('/salesTemplates')
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
			it("should not create a salesTemplate", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .post('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesTemplate.count({}, function(err, count) {
				    	expect(salesTemplates.length).to.eq(count);
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
		    .get('/salesTemplates')
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
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .get('/salesTemplates/' + id)
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
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .put('/salesTemplates/' + id)
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
			it("should not update the salesTemplate", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .put('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesTemplate.find({ _id: salesTemplates[0]._id }, function(err, newSalesTemplates) {
				    	expect(newSalesTemplates[0].title).to.eq(salesTemplates[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .delete('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the salesTemplate", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .delete('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	SalesTemplate.count({ _id: salesTemplates[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .post('/salesTemplates')
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
			it("should not create a salesTemplate", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .post('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesTemplate.count({}, function(err, count) {
				    	expect(salesTemplates.length).to.eq(count);
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
		    .get('/salesTemplates')
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
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .get('/salesTemplates/' + id)
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
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .put('/salesTemplates/' + id)
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
			it("should not update the salesTemplate", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .put('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "Changed Title" })
			    .end(function(err, res) {
			    	SalesTemplate.find({ _id: salesTemplates[0]._id }, function(err, newSalesTemplates) {
				    	expect(newSalesTemplates[0].name).to.eq(salesTemplates[0].name);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .delete('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the salesTemplate", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .delete('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	SalesTemplate.count({ _id: salesTemplates[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .post('/salesTemplates')
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
			it("should not create a salesTemplate", function(done) {
				SalesTemplate.find({}, function(err, salesTemplates) {
					var id = salesTemplates[0]._id;
					chai.request(server)
			    .post('/salesTemplates/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesTemplate.count({}, function(err, count) {
				    	expect(salesTemplates.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

	});

});