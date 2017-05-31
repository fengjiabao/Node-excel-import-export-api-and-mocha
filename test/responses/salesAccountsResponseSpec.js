process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var SalesAccount = require('../../models/salesAccount');
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

describe("/salesAccounts", function() {

	beforeEach(function(done) {
		var salesAccount1 = new SalesAccount({ clientId: client._id, title: "SalesAccount 1", salesReturnsRights: [{ contractId: contractId }] });
		salesAccount1.save();
		var salesAccount2 = new SalesAccount({ clientId: client._id, title: "SalesAccount 2", costsRights: [{ contractId: contractId }] });
		salesAccount2.save();
		var salesAccount3 = new SalesAccount({ clientId: client._id, title: "SalesAccount 3" });
		salesAccount3.save();
		var salesAccount4 = new SalesAccount({ clientId: "anything else", title: "SalesAccount 4" });
		salesAccount4.save();
		done();
	});

	afterEach(function(done) {
		SalesAccount.collection.drop();
		done();
	});

	describe("as a client user", function() {
		describe("/ GET", function() {
			it("should return a list of salesAccounts", function(done) {
				chai.request(server)
		    .get('/salesAccounts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.salesAccounts).to.be.an('array');
		    	SalesAccount.find({ clientId: client._id }, function(e, salesAccounts) {
		    		console.log(salesAccounts);
		    		expect(res.body.salesAccounts.length).to.be.eq(salesAccounts.length);
		    		done();
		    	});
		    });
			});
			it("should return metadata of salesAccounts index on / GET", function(done) {
				chai.request(server)
		    .get('/salesAccounts')
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
		    .get('/salesAccounts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/salesAccounts?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/salesAccounts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/salesAccounts?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.salesAccounts.length).to.eq(1);
		    	SalesAccount.count({ clientId: client._id }, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		describe("/:id GET", function() {
			describe("when a salesAccount is found", function() {
				it("should return a salesAccount and 200 status", function(done) {
					SalesAccount.find({}, function(e, salesAccounts) {
						var id = salesAccounts[0]._id;
						chai.request(server)
				    .get('/salesAccounts/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.clientId).to.eq(salesAccounts[0].clientId);
				    	expect(res.body.name).to.eq(salesAccounts[0].name);
				    	expect(res.body.type).to.eq(salesAccounts[0].type);
				    	done();
				    });
					});
				});
			});
			describe("when a salesAccount is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find SalesAccount with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			describe("when a salesAccount is found", function() {
				it("should update with passed values only", function(done) {
					SalesAccount.find({}, function(e, salesAccounts) {
						var id = salesAccounts[0]._id;
						var changedName = salesAccounts[0].name + "changed";
						chai.request(server)
				    .put('/salesAccounts/' + id)
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
					SalesAccount.find({}, function(e, salesAccounts) {
						var id = salesAccounts[0]._id;
						var changedTitle = salesAccounts[0].title + "changed";
						chai.request(server)
				    .put('/salesAccounts/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ name: changedTitle, clientId: "changed" })
				    .end(function(err, res) {
				    	expect(res.body.clientId).to.eq(salesAccounts[0].clientId);
				    	done();
				    });
					});
				});
			});
			describe("when a salesAccount is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send({ title: "Changed SalesAccount Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find SalesAccount with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			describe("when a salesAccount is found", function() {
				it("should delete the salesAccount and return a 200 status", function(done) {
					SalesAccount.find({}, function(e, salesAccounts) {
						var id = salesAccounts[0]._id;
						chai.request(server)
				    .delete('/salesAccounts/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	SalesAccount.find({}, function(e, newSalesAccounts) {
				    		expect(newSalesAccounts.length).to.eq(salesAccounts.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a salesAccount is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find SalesAccount with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a salesAccount created with the passed parameters", function(done) {
				params = { 
					clientId: "ClientID",
					name: "Name",
					type: "Type"
				}
				chai.request(server)
		    .post('/salesAccounts')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.clientId).to.eq(params.clientId);
		    	expect(res.body.name).to.eq(params.name);
		    	expect(res.body.type).to.eq(params.type);
		    	done();
		    });
			});
			it("should add the salesAccount to the database", function(done) {
				SalesAccount.find({}, function(e, salesAccounts) {
					params = { clientId: "123", name: "Post SalesAccount" }
					chai.request(server)
			    .post('/salesAccounts')
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send(params)
			    .end(function(err, res) {
			    	SalesAccount.find({}, function(e, newSalesAccounts) {
			    		expect(newSalesAccounts.length).to.eq(salesAccounts.length + 1);
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
		    .get('/salesAccounts')
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
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .get('/salesAccounts/' + id)
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
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .put('/salesAccounts/' + id)
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
			it("should not update the salesAccount", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .put('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesAccount.find({ _id: salesAccounts[0]._id }, function(err, newSalesAccounts) {
				    	expect(newSalesAccounts[0].title).to.eq(salesAccounts[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .delete('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the salesAccount", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .delete('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	SalesAccount.count({ _id: salesAccounts[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .post('/salesAccounts')
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
			it("should not create a salesAccount", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .post('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesAccount.count({}, function(err, count) {
				    	expect(salesAccounts.length).to.eq(count);
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
		    .get('/salesAccounts')
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
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .get('/salesAccounts/' + id)
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
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .put('/salesAccounts/' + id)
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
			it("should not update the salesAccount", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .put('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesAccount.find({ _id: salesAccounts[0]._id }, function(err, newSalesAccounts) {
				    	expect(newSalesAccounts[0].title).to.eq(salesAccounts[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .delete('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the salesAccount", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .delete('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	SalesAccount.count({ _id: salesAccounts[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .post('/salesAccounts')
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
			it("should not create a salesAccount", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .post('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesAccount.count({}, function(err, count) {
				    	expect(salesAccounts.length).to.eq(count);
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
		    .get('/salesAccounts')
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
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .get('/salesAccounts/' + id)
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
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .put('/salesAccounts/' + id)
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
			it("should not update the salesAccount", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .put('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "Changed Title" })
			    .end(function(err, res) {
			    	SalesAccount.find({ _id: salesAccounts[0]._id }, function(err, newSalesAccounts) {
				    	expect(newSalesAccounts[0].name).to.eq(salesAccounts[0].name);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .delete('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the salesAccount", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .delete('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	SalesAccount.count({ _id: salesAccounts[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .post('/salesAccounts')
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
			it("should not create a salesAccount", function(done) {
				SalesAccount.find({}, function(err, salesAccounts) {
					var id = salesAccounts[0]._id;
					chai.request(server)
			    .post('/salesAccounts/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	SalesAccount.count({}, function(err, count) {
				    	expect(salesAccounts.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

	});

});