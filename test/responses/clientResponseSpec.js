process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var Client = require('../../models/client');

chai.use(chaiHttp);

var internal = jwt.sign({ internal: true }, config.jsonSecretToken, { expiresIn: 86400 });
var parentId = "parent123";
var parent = jwt.sign({ internal: false, parentId: parentId }, config.jsonSecretToken, { expiresIn: 86400 });
var payee = jwt.sign({ internal: false, clientId: "123456", payeeId: "4312" }, config.jsonSecretToken, { expiresIn: 86400 });

describe("/clients", function() {

	beforeEach(function(done) {
		var client1 = new Client({ name: "Client 1" });
		client1.save();
		var client2 = new Client({ name: "Client 2", parentId: "parent123" });
		client2.save();
		var client3 = new Client({ name: "Client 3", parentId: "parent123" });
		client3.save();
		var client4 = new Client({ name: "Client 4", parentId: "parent12345" });
		client4.save();
		done();
	});

	afterEach(function(done) {
		Client.collection.drop();
		done();
	});

	describe("when an internal user", function() {
		describe("/ GET", function() {
			it("should return a list of clients", function(done) {
				chai.request(server)
		    .get('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.clients).to.be.an('array');
		    	Client.count({}, function(e, count) {
		    		expect(res.body.clients.length).to.be.eq(count);
		    		done();
		    	});
		    });
			});
			it("should return metadata of clients index on / GET", function(done) {
				chai.request(server)
		    .get('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.meta).to.be.an('object');
		    	done();
		    });
			});
			it("should return the first page if not passed a specific page", function(done) {
				chai.request(server)
		    .get('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/clients?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/clients?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.body.clients.length).to.eq(1);
		    	Client.count({}, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		
		describe("/:id GET", function() {
			describe("when a client is found", function() {
				it("should return a client and 200 status", function(done) {
					Client.find({}, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .get('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", internal)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.parentId).to.eq(clients[0].parentId);
				    	expect(res.body.name).to.eq(clients[0].name);
				    	expect(res.body.paymentTier).to.eq(clients[0].paymentTier);
				    	expect(res.body.companyName).to.eq(clients[0].companyName);
				    	expect(res.body.address).to.eq(clients[0].address);
				    	expect(res.body.phone).to.eq(clients[0].phone);
				    	expect(res.body.email).to.eq(clients[0].email);
				    	done();
				    });
					});
				});
			});
			describe("when a client is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/clients/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Client with ID " + id);
			    	done();
			    });
				});
			});
		});

		describe("/:id PUT", function() {
			describe("when a client is found", function() {
				it("should update with passed values only", function(done) {
					Client.find({}, function(e, clients) {
						var id = clients[0]._id;
						var changedName = clients[0].name + "changed";
						chai.request(server)
				    .put('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", internal)
				    .send({ name: changedName })
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.name).to.eq(changedName);
				    	done();
				    });
					});
				});
				it("should not update parentId", function(done) {
					Client.find({}, function(e, clients) {
						var id = clients[0]._id;
						var changedName = clients[0].name + "changed";
						chai.request(server)
				    .put('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", internal)
				    .send({ name: changedName, parentId: "changed" })
				    .end(function(err, res) {
				    	expect(res.body.parentId).to.eq(clients[0].parentId);
				    	done();
				    });
					});
				});
			});
			describe("when a client is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/clients/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ name: "Changed Client Name" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Client with ID " + id);
			    	done();
			    });
				});
			});
		});

		describe("/:id DELETE", function() {
			describe("when a client is found", function() {
				it("should delete the client and return a 200 status", function(done) {
					Client.find({}, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .delete('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", internal)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	Client.find({}, function(e, newClients) {
				    		expect(newClients.length).to.eq(clients.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a client is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/clients/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Client with ID " + id);
			    	done();
			    });
				});
			});
		});

		describe("/ POST", function() {
			it("should return a client created with the passed parameters", function(done) {
				params = { parentId: "parent 1", name: "Post Client", paymentTier: "Premium", companyName: "Company 1", address: "123", phone: "456", email: "hello@company.com" }
				chai.request(server)
		    .post('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.parentId).to.eq(params.parentId);
		    	expect(res.body.name).to.eq(params.name);
		    	expect(res.body.paymentTier).to.eq(params.paymentTier);
		    	expect(res.body.companyName).to.eq(params.companyName);
		    	expect(res.body.address).to.eq(params.address);
		    	expect(res.body.phone).to.eq(params.phone);
		    	expect(res.body.email).to.eq(params.email);
		    	done();
		    });
			});
			it("should add the client to the database", function(done) {
				Client.find({}, function(e, clients) {
					params = { parentId: "parent 1", name: "Post Client", paymentTier: "Premium", companyName: "Company 1", address: "123", phone: "456", email: "hello@company.com" }
					chai.request(server)
			    .post('/clients')
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send(params)
			    .end(function(err, res) {
			    	Client.find({}, function(e, newClients) {
			    		expect(newClients.length).to.eq(clients.length + 1);
			    		done();
			    	});
			    });
		    });
			});
		});
	});

	describe("when a parent user", function() {
		describe("/ GET", function() {
			it("should return the clients associated with the parent", function(done) {
				chai.request(server)
		    .get('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", parent)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.clients).to.be.an('array');
		    	Client.count({ parentId: parentId }, function(e, count) {
		    		expect(res.body.clients.length).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		
		describe("/:id GET", function() {
			describe("when a client is found and associated with the parent", function() {
				it("should return a client and 200 status", function(done) {
					Client.find({ parentId: parentId }, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .get('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.parentId).to.eq(clients[0].parentId);
				    	expect(res.body.name).to.eq(clients[0].name);
				    	expect(res.body.paymentTier).to.eq(clients[0].paymentTier);
				    	expect(res.body.companyName).to.eq(clients[0].companyName);
				    	expect(res.body.address).to.eq(clients[0].address);
				    	expect(res.body.phone).to.eq(clients[0].phone);
				    	expect(res.body.email).to.eq(clients[0].email);
				    	done();
				    });
					});
				});
			});
			describe("when a client is found and not with the parent", function() {
				it("should return a 403 status", function(done) {
					Client.find({ parentId: "parent12345" }, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .get('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(403)
				    	expect(res.body.message).to.eq("Forbidden")
				    	done();
				    });
					});
				});
			});
		});

		describe("/:id PUT", function() {
			describe("when a client is found and associated with the parent", function() {
				it("should update with passed values only", function(done) {
					Client.find({ parentId: parentId }, function(e, clients) {
						var id = clients[0]._id;
						var changed = "changed";
						var params = { name: clients[0].name + changed, paymentTier: clients[0].paymentTier + changed, companyName: clients[0].companyName + changed, address: clients[0].address + changed, phone: clients[0].phone + changed, email: clients[0].email + changed }
						chai.request(server)
				    .put('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .send(params)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.name).to.eq(params.name);
				    	expect(res.body.paymentTier).to.eq(params.paymentTier);
				    	expect(res.body.companyName).to.eq(params.companyName);
				    	expect(res.body.address).to.eq(params.address);
				    	expect(res.body.phone).to.eq(params.phone);
				    	expect(res.body.email).to.eq(params.email);
				    	done();
				    });
					});
				});
				it("should not update the parentId", function(done) {
					Client.find({ parentId: parentId }, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .put('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .send({ parentId: "changedParentID" })
				    .end(function(err, res) {
				    	expect(res.body.parentId).to.eq(parentId);
				    	done();
				    });
					});
				});
			});
			describe("when a client is found and not associated with the parent", function() {
				it("should return a 403 status", function(done) {
					Client.find({ parentId: parentId }, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .put('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .send({ parentId: "changedParentID" })
				    .end(function(err, res) {
				    	expect(res.body.parentId).to.eq(parentId);
				    	done();
				    });
					});
				});
			});
		});

		describe("/:id DELETE", function() {
			describe("when a client is found and is associated with the parent", function() {
				it("should delete the client and return a 200 status", function(done) {
					Client.find({ parentId: parentId }, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .delete('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .end(function(err, res) {
				    	Client.count({ parentId: parentId }, function(err, count) {
				    		expect(count).to.eq(clients.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a client is found and is not associated with the parent", function() {
				it("should return a 403 status", function(done) {
					Client.find({ parentId: "parent12345" }, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .delete('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(403);
				    	expect(res.body.message).to.eq("Forbidden");
				    	done();
				    });
					});
				});
				it("should not delete a client", function(done) {
					Client.find({ parentId: "parent12345" }, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .delete('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .end(function(err, res) {
				    	Client.count({ parentId: "parent12345" }, function(err, count) {
				    		expect(count).to.eq(clients.length);
				    		done();
				    	});
				    });
					});
				});
			});
		});

		describe("/ POST", function() {
			it("should return a client created with the passed parameters", function(done) {
				params = { parentId: "parent 1", name: "Post Client", paymentTier: "Premium", companyName: "Company 1", address: "123", phone: "456", email: "hello@company.com" }
				chai.request(server)
		    .post('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", parent)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.name).to.eq(params.name);
		    	expect(res.body.paymentTier).to.eq(params.paymentTier);
		    	expect(res.body.companyName).to.eq(params.companyName);
		    	expect(res.body.address).to.eq(params.address);
		    	expect(res.body.phone).to.eq(params.phone);
		    	expect(res.body.email).to.eq(params.email);
		    	done();
		    });
			});
			it("should set the parentId to the user's parentId", function(done) {
				params = { parentId: "parent 1", name: "Post Client", paymentTier: "Premium", companyName: "Company 1", address: "123", phone: "456", email: "hello@company.com" }
				chai.request(server)
		    .post('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", parent)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.body.parentId).to.eq(parentId);
		    	done();
		    });
			});
		});
	});

	describe("when a client user", function() {
		var clientId, client;
		beforeEach(function(done) {
			Client.find({}, function(err, clients) {
				clientId = clients[0]._id
				client = jwt.sign({ internal: false, clientId: clientId }, config.jsonSecretToken, { expiresIn: 86400 });
				done();
			});
		});

		describe("/ GET", function() {
			it("should return a 403 status", function(done) {
				chai.request(server)
		    .get('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", client)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			})
		});

		describe("/:id GET", function() {
			describe("when the client is found and associated with the user", function() {
				it("should return the client and a 200 status", function(done) {
					Client.find({ _id: clientId }, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .get('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", client)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.parentId).to.eq(clients[0].parentId);
				    	expect(res.body.name).to.eq(clients[0].name);
				    	expect(res.body.paymentTier).to.eq(clients[0].paymentTier);
				    	expect(res.body.companyName).to.eq(clients[0].companyName);
				    	expect(res.body.address).to.eq(clients[0].address);
				    	expect(res.body.phone).to.eq(clients[0].phone);
				    	expect(res.body.email).to.eq(clients[0].email);
				    	done();
				    });
					});
				});
			});
			describe("when the client is found and not associated with the user", function() {
				it("should return a 403 status", function(done) {
					Client.find({}, function(e, clients) {
						var id = clients[2]._id;
						chai.request(server)
				    .get('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", client)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(403);
				    	expect(res.body.message).to.eq("Forbidden");
				    	done();
				    });
					});
				});
			});
		});

		describe("/:id PUT", function() {
			describe("when the client is found and associated with the user", function() {
				it("should update the client fields", function(done) {
					Client.find({ _id: clientId }, function(e, clients) {
						var id = clients[0]._id;
						var changed = "changed";
						var params = { name: clients[0].name + changed, paymentTier: clients[0].paymentTier + changed, companyName: clients[0].companyName + changed, address: clients[0].address + changed, phone: clients[0].phone + changed, email: clients[0].email + changed }
						chai.request(server)
				    .put('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", client)
				    .send(params)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.name).to.eq(params.name);
				    	expect(res.body.paymentTier).to.eq(params.paymentTier);
				    	expect(res.body.companyName).to.eq(params.companyName);
				    	expect(res.body.address).to.eq(params.address);
				    	expect(res.body.phone).to.eq(params.phone);
				    	expect(res.body.email).to.eq(params.email);
				    	done();
				    });
					});
				});
			});
			describe("when the client is found and not associated with the user", function() {
				it("should return a 403 status", function(done) {
					Client.find({}, function(e, clients) {
						var id = clients[2]._id;
						var changed = "changed";
						var params = { name: clients[0].name + changed, paymentTier: clients[0].paymentTier + changed, companyName: clients[0].companyName + changed, address: clients[0].address + changed, phone: clients[0].phone + changed, email: clients[0].email + changed }
						chai.request(server)
				    .put('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", client)
				    .send(params)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(403);
				    	expect(res.body.message).to.eq("Forbidden");
				    	done();
				    });
					});
				});
			});
		});

		describe("/:id DELETE", function() {
			describe("when the client has the user's clientId", function() {
				it("should return a 403 status", function(done) {
					Client.find({ _id: clientId }, function(e, clients) {
						var id = clients[0]._id;
						chai.request(server)
				    .delete('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", client)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(403);
				    	expect(res.body.message).to.eq("Forbidden");
				    	done();
				    });
					});
				});
			});
			describe("when the client does not have the user's clientId", function() {
				it("should return a 403 status", function(done) {
					Client.find({}, function(e, clients) {
						var id = clients[2]._id;
						chai.request(server)
				    .delete('/clients/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", client)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(403);
				    	expect(res.body.message).to.eq("Forbidden");
				    	done();
				    });
					});
				});
			});
		});

		describe("/ POST", function() {
			it("should return a 403 status", function(done) {
				params = { name: "Post Client", paymentTier: "Premium", companyName: "Company 1", address: "123", phone: "456", email: "hello@company.com" }
				chai.request(server)
		    .post('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", client)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
		});
	});

describe("when a payee user", function() {
	var clientId, payee;
	beforeEach(function(done) {
		Client.find({}, function(err, clients) {
			clientId = clients[0]._id
			payee = jwt.sign({ internal: false, clientId: clientId, payeeId: "123" }, config.jsonSecretToken, { expiresIn: 86400 });
			done();
		});
	});

		describe("/ GET", function() {
			it("should return a 403 status", function(done) {
				chai.request(server)
		    .get('/clients')
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
			it("should return a 403 status", function(done) {
				Client.find({}, function(e, clients) {
					var id = clients[0]._id;
					chai.request(server)
			    .get('/clients/' + id)
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
		describe("/:id PUT", function() {
			it("should return a 403 status", function(done) {
				Client.find({}, function(e, clients) {
					var id = clients[0]._id;
					chai.request(server)
			    .put('/clients/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "New name" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not update client object", function(done) {
				Client.find({}, function(e, clients) {
					var id = clients[0]._id;
					chai.request(server)
			    .put('/clients/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "New name" })
			    .end(function(err, res) {
			    	Client.find({ _id: id }, function(e, newClients) {
			    		expect(newClients[0].name).to.eq(clients[0].name)
			    		done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 status", function(done) {
				Client.find({}, function(e, clients) {
					var id = clients[0]._id;
					chai.request(server)
			    .delete('/clients/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not update client object", function(done) {
				Client.find({}, function(e, clients) {
					var id = clients[0]._id;
					chai.request(server)
			    .delete('/clients/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	Client.count({}, function(e, count) {
			    		expect(clients.length).to.eq(count);
			    		done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 status", function(done) {
				chai.request(server)
		    .post('/clients')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .send({ name: "New Client" })
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
			it("should not create a Client", function(done) {
				Client.count({}, function(err, initialCount) {
					chai.request(server)
			    .post('/clients')
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "New Client" })
			    .end(function(err, res) {
			    	Client.count({}, function(err, newCount) {
			    		expect(initialCount).to.eq(newCount);
			    		done();
			    	});
			    });
				});
			});
		});
	});

});