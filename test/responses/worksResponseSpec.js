process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var Work = require('../../models/work');
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
var payee = jwt.sign({ internal: false, parentId: null, clientId: client._id, payeeId: "123", contractIds: contractIds }, config.jsonSecretToken, { expiresIn: 86400 });

describe("/works", function() {

	beforeEach(function(done) {
		var work1 = new Work({ clientId: client._id, title: "Work 1", salesReturnsRights: [{ contractId: contractId }] });
		work1.save();
		var work2 = new Work({ clientId: client._id, title: "Work 2", costsRights: [{ contractId: contractId }] });
		work2.save();
		var work3 = new Work({ clientId: client._id, title: "Work 3" });
		work3.save();
		var work4 = new Work({ clientId: "anything else", title: "Work 4" });
		work4.save();
		done();
	});

	afterEach(function(done) {
		Work.collection.drop();
		done();
	});

	describe("as a client user", function() {
		describe("/ GET", function() {
			it("should return a list of works", function(done) {
				chai.request(server)
		    .get('/works')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.works).to.be.an('array');
		    	Work.find({ clientId: client._id }, function(e, works) {
		    		console.log(works);
		    		expect(res.body.works.length).to.be.eq(works.length);
		    		done();
		    	});
		    });
			});
			it("should return metadata of works index on / GET", function(done) {
				chai.request(server)
		    .get('/works')
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
		    .get('/works')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/works?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/works')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/works?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.works.length).to.eq(1);
		    	Work.count({ clientId: client._id }, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});

		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/works/export')
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
				var newWork = [ "ID", "Title", "Composer", "Identifier", "Aliases" ];
				createXlsx.createInTemplate([[newWork]], appRootDir + config.exportTemplates.work, function(err, outputFile) { 
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
			describe("when a work is found", function() {
				it("should return a work and 200 status", function(done) {
					Work.find({}, function(e, works) {
						var id = works[0]._id;
						chai.request(server)
				    .get('/works/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.clientId).to.eq(works[0].clientId);
				    	expect(res.body.contractId).to.eq(works[0].contractId);
				    	expect(res.body.title).to.eq(works[0].title);
				    	expect(res.body.artist).to.eq(works[0].artist);
				    	expect(res.body.identifier).to.eq(works[0].identifier);
				    	done();
				    });
					});
				});
			});
			describe("when a work is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Work with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			describe("when a work is found", function() {
				it("should update with passed values only", function(done) {
					Work.find({}, function(e, works) {
						var id = works[0]._id;
						var changedTitle = works[0].title + "changed";
						chai.request(server)
				    .put('/works/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ title: changedTitle })
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.title).to.eq(changedTitle);
				    	done();
				    });
					});
				});
				it("should not update clientId", function(done) {
					Work.find({}, function(e, works) {
						var id = works[0]._id;
						var changedTitle = works[0].title + "changed";
						chai.request(server)
				    .put('/works/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ name: changedTitle, clientId: "changed" })
				    .end(function(err, res) {
				    	expect(res.body.clientId).to.eq(works[0].clientId);
				    	done();
				    });
					});
				});
			});
			describe("when a work is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send({ title: "Changed Work Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Work with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			describe("when a work is found", function() {
				it("should delete the work and return a 200 status", function(done) {
					Work.find({}, function(e, works) {
						var id = works[0]._id;
						chai.request(server)
				    .delete('/works/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	Work.find({}, function(e, newWorks) {
				    		expect(newWorks.length).to.eq(works.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a work is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Work with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a work created with the passed parameters", function(done) {
				params = { 
					clientId: "ClientID",
					campaignIds: [1, 2, 3],
					title: "Title",
					composer: "composer",
					identifier: "identifier",
					salesReturnsRights: [{ contractId: "123" }],
					costsRights: [{ contractId: "456" }],
					aliases: [34, 46] 
				}
				chai.request(server)
		    .post('/works')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.clientId).to.eq(params.clientId);
		    	expect(res.body.campaignIds).to.deep.eq(params.campaignIds);
		    	expect(res.body.title).to.eq(params.title);
		    	expect(res.body.composer).to.eq(params.composer);
		    	expect(res.body.salesReturnsRights[0].contractId).to.eq(params.salesReturnsRights[0].contractId);
		    	expect(res.body.costsRights[0].contractId).to.deep.eq(params.costsRights[0].contractId);
		    	expect(res.body.aliases).to.deep.eq(params.aliases);
		    	done();
		    });
			});
			it("should add the work to the database", function(done) {
				Work.find({}, function(e, works) {
					params = { clientId: "123", name: "Post Work" }
					chai.request(server)
			    .post('/works')
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send(params)
			    .end(function(err, res) {
			    	Work.find({}, function(e, newWorks) {
			    		expect(newWorks.length).to.eq(works.length + 1);
			    		done();
			    	});
			    });
		    });
			});
		});

		describe("/import POST", function() {
			it("should import works from file", function(done) {
				chai.request(server)
		    .post('/works/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_work.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.works.length).to.eq(2);
		    	done();
		    });
			});
			it("should add the works in the file to the database", function(done) {
				chai.request(server)
		    .post('/works/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_work.xlsx')
		    .end(function(err, res) {
		    	Work.find({clientId: client._id, identifier: 'ID1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Work.find({clientId: client._id, identifier: 'ID2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/works/import')
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
		    .post('/works/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", nullUser)
		    .attach('file', 'test/test-data/test_work.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should return any errors in the errors field of the response", function(done) {
				chai.request(server)
		    .post('/works/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_null_work.xlsx')
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
		    .get('/works')
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
		    .get('/works/export')
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
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .get('/works/' + id)
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
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .put('/works/' + id)
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
			it("should not update the work", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .put('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Work.find({ _id: works[0]._id }, function(err, newWorks) {
				    	expect(newWorks[0].title).to.eq(works[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .delete('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the work", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .delete('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	Work.count({ _id: works[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .post('/works')
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
			it("should not create a work", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .post('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Work.count({}, function(err, count) {
				    	expect(works.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/works/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .attach('file', 'test/test-data/test_work.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a work", function(done) {
				Work.find({}, function(err, works) {
					chai.request(server)
			    .post('/works/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", internal)
		    	.attach('file', 'test/test-data/test_work.xlsx')
			    .end(function(err, res) {
			    	Work.count({}, function(err, count) {
				    	expect(works.length).to.eq(count);
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
		    .get('/works')
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
		    .get('/works/export')
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
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .get('/works/' + id)
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
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .put('/works/' + id)
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
			it("should not update the work", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .put('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Work.find({ _id: works[0]._id }, function(err, newWorks) {
				    	expect(newWorks[0].title).to.eq(works[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .delete('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the work", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .delete('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	Work.count({ _id: works[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .post('/works')
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
			it("should not create a work", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .post('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Work.count({}, function(err, count) {
				    	expect(works.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/works/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .attach('file', 'test/test-data/test_work.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a work", function(done) {
				Work.find({}, function(err, works) {
					chai.request(server)
			    .post('/works/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", internal)
		    	.attach('file', 'test/test-data/test_work.xlsx')
			    .end(function(err, res) {
			    	Work.count({}, function(err, count) {
				    	expect(works.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

	});

	describe("as a payee user", function() {

		describe("/ GET", function() {
			it("should return all works associated with the payee", function(done) {
				chai.request(server)
		    .get('/works')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .end(function(err, res) {
		    	Work.count({ $and: [{ clientId: client._id }, { $or: [{ 'salesReturnsRights.contractId': { $in: contractIds } }, { 'costsRights.contractId': { $in: contractIds } }] }] }, function(err, count) {
		    		expect(res.status).to.eq(200);
			    	expect(res.body.works.length).to.eq(count);
			    	done();
		    	});
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/works/export')
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
				var newWork = [ "ID", "Title", "Composer", "Identifier", "Aliases" ];
				createXlsx.createInTemplate([[newWork]], appRootDir + config.exportTemplates.work, function(err, outputFile) { 
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
			describe("when work is associated with the payee", function() {
				it("should return the work", function(done) {
					Work.find({ 'salesReturnsRights.contractId': contractId }, function(err, works) {
						var id = works[0]._id;
						chai.request(server)
				    .get('/works/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", payee)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.title).to.eq(works[0].title);
				    	done();
				    });
					});
				});
			});
			describe("when the work is not associated with the payee", function() {
				it("should return a 403 forbidden response", function(done) {
					Work.find({}, function(err, works) {
						var id = works[0]._id;
						chai.request(server)
				    .get('/works/' + id)
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
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .put('/works/' + id)
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
			it("should not update the work", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .put('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Work.find({ _id: works[0]._id }, function(err, newWorks) {
				    	expect(newWorks[0].title).to.eq(works[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .delete('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the work", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .delete('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	Work.count({ _id: works[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .post('/works')
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
			it("should not create a work", function(done) {
				Work.find({}, function(err, works) {
					var id = works[0]._id;
					chai.request(server)
			    .post('/works/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Work.count({}, function(err, count) {
				    	expect(works.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should import works from file", function(done) {
				chai.request(server)
		    .post('/works/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_work.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.works.length).to.eq(2);
		    	done();
		    });
			});
			it("should add the works in the file to the database", function(done) {
				chai.request(server)
		    .post('/works/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_work.xlsx')
		    .end(function(err, res) {
		    	Work.find({clientId: client._id, identifier: 'ID1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Work.find({clientId: client._id, identifier: 'ID2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/works/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors).to.deep.eq(["Requires a file to be uploaded"]);
		    	done();
		    });
			});
			it("should return any errors in the errors field of the response", function(done) {
				chai.request(server)
		    .post('/works/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_null_work.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors.length).to.above(0);
		    	done();
		    });
			});
		});

	});

});