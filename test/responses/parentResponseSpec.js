process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var Parent = require('../../models/parent');

chai.use(chaiHttp);

var internal = jwt.sign({ internal: true }, config.jsonSecretToken, { expiresIn: 86400 });
var client = jwt.sign({ internal: false, clientId: "123456" }, config.jsonSecretToken, { expiresIn: 86400 });
var payee = jwt.sign({ internal: false, clientId: "123456", payeeId: "4312" }, config.jsonSecretToken, { expiresIn: 86400 });

describe("/parents", function() {

	beforeEach(function(done) {
		var parent1 = new Parent({ name: "Parent 1" });
		parent1.save();
		var parent2 = new Parent({ name: "Parent 2" });
		parent2.save();
		var parent3 = new Parent({ name: "Parent 3" });
		parent3.save();
		done();
	});

	afterEach(function(done) {
		Parent.collection.drop();
		done();
	});

	describe("when an internal user", function() {
		describe("/ GET", function() {
			it("should return a list of parents", function(done) {
				chai.request(server)
		    .get('/parents')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.parents).to.be.an('array');
		    	Parent.count({}, function(e, count) {
		    		expect(res.body.parents.length).to.be.eq(count);
		    		done();
		    	});
		    });
			});
			it("should return metadata of parents index on / GET", function(done) {
				chai.request(server)
		    .get('/parents')
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
		    .get('/parents')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/parents?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/parents')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/parents?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .end(function(err, res) {
		    	expect(res.body.parents.length).to.eq(1);
		    	Parent.count({}, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		
		describe("/:id GET", function() {
			describe("when a parent is found", function() {
				it("should return a parent and 200 status", function(done) {
					Parent.find({}, function(e, parents) {
						var id = parents[0]._id;
						chai.request(server)
				    .get('/parents/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", internal)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.name).to.eq(parents[0].name);
				    	done();
				    });
					});
				});
			});
			describe("when a parent is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Parent with ID " + id);
			    	done();
			    });
				});
			});
		});

		describe("/:id PUT", function() {
			describe("when a parent is found", function() {
				it("should update with passed values only", function(done) {
					Parent.find({}, function(e, parents) {
						var id = parents[0]._id;
						var changedName = parents[0].name + "changed";
						chai.request(server)
				    .put('/parents/' + id)
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
			});
			describe("when a parent is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ name: "Changed Client Name" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Parent with ID " + id);
			    	done();
			    });
				});
			});
		});

		describe("/:id DELETE", function() {
			describe("when a parent is found", function() {
				it("should delete the parents and return a 200 status", function(done) {
					Parent.find({}, function(e, parents) {
						var id = parents[0]._id;
						chai.request(server)
				    .delete('/parents/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", internal)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	Parent.find({}, function(e, newParents) {
				    		expect(newParents.length).to.eq(parents.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a parent is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Parent with ID " + id);
			    	done();
			    });
				});
			});
		});

		describe("/ POST", function() {
			it("should return a parent created with the passed parameters", function(done) {
				params = { name: "Post Parent" }
				chai.request(server)
		    .post('/parents')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.name).to.eq(params.name);
		    	done();
		    });
			});
			it("should add the parent to the database", function(done) {
				Parent.find({}, function(e, parents) {
					params = { name: "Post Parent" }
					chai.request(server)
			    .post('/parents')
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send(params)
			    .end(function(err, res) {
			    	Parent.find({}, function(e, newParents) {
			    		expect(newParents.length).to.eq(parents.length + 1);
			    		done();
			    	});
			    });
		    });
			});
		});
	});

	describe("when a parent user", function() {
		var parentId, parent;
		beforeEach(function(done) {
			Parent.find({}, function(err, parents) {
				parentId = parents[0]._id;
				parent = jwt.sign({ internal: false, parentId: parentId }, config.jsonSecretToken, { expiresIn: 86400 });
				done();
			});
		});

		describe("/ GET", function() {
			it("should return a 403 status", function(done) {
				chai.request(server)
		    .get('/parents')
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
			describe("when user parentId matches found parents ID", function() {
				it("should return the parent object and a 200 status", function(done) {
					Parent.find({}, function(e, parents) {
						var id = parents[0]._id;
						chai.request(server)
				    .get('/parents/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.name).to.eq(parents[0].name);
				    	done();
				    });
					});
				});
			});
			describe("when user parentId matches found parents ID", function() {
				it("should return a 403 status", function(done) {
					Parent.find({}, function(e, parents) {
						var id = parents[2]._id;
						chai.request(server)
				    .get('/parents/' + id)
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
		});
		describe("/:id PUT", function() {
			describe("when user parentId matches found parents ID", function() {
				it("should the return parent object and a 200 status", function(done) {
					Parent.find({}, function(e, parents) {
						var id = parents[0]._id;
						var params = { name: "New Parent Name" };
						chai.request(server)
				    .put('/parents/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .send(params)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.name).to.eq(params.name);
				    	done();
				    });
					});
				});
			});
			describe("when user parentId matches found parents ID", function() {
				it("should return a 403 status", function(done) {
					Parent.find({}, function(e, parents) {
						var id = parents[2]._id;
						chai.request(server)
				    .put('/parents/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .send({ name: "New Parent Name" })
				    .end(function(err, res) {
				    	expect(res.status).to.eq(403);
				    	expect(res.body.message).to.eq('Forbidden');
				    	done();
				    });
					});
				});
				it("should not update the parent", function(done) {
					Parent.find({}, function(e, parents) {
						var id = parents[1]._id;
						var params = { name: "New Parent Name" };
						chai.request(server)
				    .put('/parents/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", parent)
				    .send(params)
				    .end(function(err, res) {
				    	Parent.find({ _id: parents[1]._id }, function(e, newParents) {
				    		expect(newParents[0].name).to.eq(parents[1].name);
				    		done();
				    	});
				    });
					});
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 status", function(done) {
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .delete('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete parent object", function(done) {
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .delete('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	Parent.count({}, function(e, count) {
			    		expect(parents.length).to.eq(count);
			    		done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 status", function(done) {
				chai.request(server)
		    .post('/parents')
		    .set("applicationToken", config.applicationToken)
		    .set("token", parent)
		    .send({ name: "New Parent" })
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
			it("should not create a Parent", function(done) {
				Parent.count({}, function(err, initialCount) {
					chai.request(server)
			    .post('/parents')
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ name: "New Parent" })
			    .end(function(err, res) {
			    	Parent.count({}, function(err, newCount) {
			    		expect(initialCount).to.eq(newCount);
			    		done();
			    	});
			    });
				});
			});
		});
	});

	describe("when a client user", function() {
		describe("/ GET", function() {
			it("should return a 403 status", function(done) {
				chai.request(server)
		    .get('/parents')
		    .set("applicationToken", config.applicationToken)
		    .set("token", client)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
		});
		describe("/:id GET", function() {
			it("should return a 403 status", function(done) {
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .get('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", client)
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
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .put('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", client)
			    .send({ name: "New name" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not update parent object", function(done) {
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .put('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", client)
			    .send({ name: "New name" })
			    .end(function(err, res) {
			    	Parent.find({ _id: id }, function(e, newParents) {
			    		expect(newParents[0].name).to.eq(parents[0].name)
			    		done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 status", function(done) {
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .delete('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", client)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not update parent object", function(done) {
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .delete('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", client)
			    .end(function(err, res) {
			    	Parent.count({}, function(e, count) {
			    		expect(parents.length).to.eq(count);
			    		done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 status", function(done) {
				chai.request(server)
		    .post('/parents')
		    .set("applicationToken", config.applicationToken)
		    .set("token", client)
		    .send({ name: "New Parent" })
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
			it("should not create a Parent", function(done) {
				Parent.count({}, function(err, initialCount) {
					chai.request(server)
			    .post('/parents')
			    .set("applicationToken", config.applicationToken)
			    .set("token", client)
			    .send({ name: "New Parent" })
			    .end(function(err, res) {
			    	Parent.count({}, function(err, newCount) {
			    		expect(initialCount).to.eq(newCount);
			    		done();
			    	});
			    });
				});
			});
		});
	});

	describe("when a payee user", function() {
		describe("/ GET", function() {
			it("should return a 403 status", function(done) {
				chai.request(server)
		    .get('/parents')
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
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .get('/parents/' + id)
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
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .put('/parents/' + id)
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
			it("should not update parent object", function(done) {
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .put('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "New name" })
			    .end(function(err, res) {
			    	Parent.find({ _id: id }, function(e, newParents) {
			    		expect(newParents[0].name).to.eq(parents[0].name)
			    		done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 status", function(done) {
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .delete('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not update parent object", function(done) {
				Parent.find({}, function(e, parents) {
					var id = parents[0]._id;
					chai.request(server)
			    .delete('/parents/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	Parent.count({}, function(e, count) {
			    		expect(parents.length).to.eq(count);
			    		done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 status", function(done) {
				chai.request(server)
		    .post('/parents')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .send({ name: "New Parent" })
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq('Forbidden');
		    	done();
		    });
			});
			it("should not create a Parent", function(done) {
				Parent.count({}, function(err, initialCount) {
					chai.request(server)
			    .post('/parents')
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ name: "New Parent" })
			    .end(function(err, res) {
			    	Parent.count({}, function(err, newCount) {
			    		expect(initialCount).to.eq(newCount);
			    		done();
			    	});
			    });
				});
			});
		});
	});

});