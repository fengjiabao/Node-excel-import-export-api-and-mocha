process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var Release = require('../../models/release');
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

describe("/releases", function() {

	beforeEach(function(done) {
		var release1 = new Release({ clientId: client._id, title: "Release 1", salesReturnsRights: [{ contractId: contractId }] });
		release1.save();
		var release2 = new Release({ clientId: client._id, title: "Release 2", costsRights: [{ contractId: contractId }] });
		release2.save();
		var release3 = new Release({ clientId: client._id, title: "Release 3" });
		release3.save();
		var release4 = new Release({ clientId: "anything else", title: "Release 4" });
		release4.save();
		done();
	});

	afterEach(function(done) {
		Release.collection.drop();
		done();
	});

	describe("as a client user", function() {
		describe("/ GET", function() {
			it("should return a list of releases", function(done) {
				chai.request(server)
		    .get('/releases')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.releases).to.be.an('array');
		    	Release.find({ clientId: client._id }, function(e, releases) {
		    		console.log(releases);
		    		expect(res.body.releases.length).to.be.eq(releases.length);
		    		done();
		    	});
		    });
			});
			it("should return metadata of releases index on / GET", function(done) {
				chai.request(server)
		    .get('/releases')
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
		    .get('/releases')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/releases?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/releases')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/releases?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.releases.length).to.eq(1);
		    	Release.count({ clientId: client._id }, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/releases/export')
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
				var newRelease = [ "ID", "Title", "Version", "Artist", "CatNo", "Barcode", "", "", "", 1, "", "", "", "", "", "", "", "", "", "" ];
				createXlsx.createInTemplate([[newRelease]], appRootDir + config.exportTemplates.release, function(err, outputFile) { 
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
			describe("when a release is found", function() {
				it("should return a release and 200 status", function(done) {
					Release.find({}, function(e, releases) {
						var id = releases[0]._id;
						chai.request(server)
				    .get('/releases/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.clientId).to.eq(releases[0].clientId);
				    	expect(res.body.contractId).to.eq(releases[0].contractId);
				    	expect(res.body.title).to.eq(releases[0].title);
				    	expect(res.body.artist).to.eq(releases[0].artist);
				    	expect(res.body.identifier).to.eq(releases[0].identifier);
				    	done();
				    });
					});
				});
			});
			describe("when a release is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Release with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			describe("when a release is found", function() {
				it("should update with passed values only", function(done) {
					Release.find({}, function(e, releases) {
						var id = releases[0]._id;
						var changedTitle = releases[0].title + "changed";
						chai.request(server)
				    .put('/releases/' + id)
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
					Release.find({}, function(e, releases) {
						var id = releases[0]._id;
						var changedTitle = releases[0].title + "changed";
						chai.request(server)
				    .put('/releases/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ name: changedTitle, clientId: "changed" })
				    .end(function(err, res) {
				    	expect(res.body.clientId).to.eq(releases[0].clientId);
				    	done();
				    });
					});
				});
			});
			describe("when a release is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send({ title: "Changed Release Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Release with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			describe("when a release is found", function() {
				it("should delete the release and return a 200 status", function(done) {
					Release.find({}, function(e, releases) {
						var id = releases[0]._id;
						chai.request(server)
				    .delete('/releases/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	Release.find({}, function(e, newReleases) {
				    		expect(newReleases.length).to.eq(releases.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a release is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Release with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a release created with the passed parameters", function(done) {
				params = { 
					clientId: "ClientID",
					campaignIds: [1, 2, 3],
					title: "Title",
					version: "Version",
					artist: "Artist",
					catNo: "CatNo",
					barcode: "12345678",
					releaseDate: new Date,
					format: "Format",
					priceCategory: "Front",
					dealerPrice: 123.45,
					mcpsId: "MCPS",
					exemptFromMechanicals: true,
					salesReturnsRights: [{ contractId: "123" }],
					costsRights: [{ contractId: "456" }],
					aliases: [34, 46] 
				}
				chai.request(server)
		    .post('/releases')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.clientId).to.eq(params.clientId);
		    	expect(res.body.campaignIds).to.deep.eq(params.campaignIds);
		    	expect(res.body.title).to.eq(params.title);
		    	expect(res.body.version).to.eq(params.version);
		    	expect(res.body.artist).to.eq(params.artist);
		    	expect(res.body.catNo).to.eq(params.catNo);
		    	expect(res.body.barcode).to.eq(params.barcode);
		    	//expect(res.body.releaseDate).to.eq(params.releaseDate);
		    	expect(res.body.format).to.eq(params.format);
		    	expect(res.body.priceCategory).to.eq(params.priceCategory);
		    	expect(res.body.dealerPrice).to.eq(params.dealerPrice);
		    	expect(res.body.mcpsId).to.eq(params.mcpsId);
		    	expect(res.body.exemptFromMechanicals).to.eq(params.exemptFromMechanicals);
		    	expect(res.body.salesReturnsRights[0].contractId).to.eq(params.salesReturnsRights[0].contractId);
		    	expect(res.body.costsRights[0].contractId).to.deep.eq(params.costsRights[0].contractId);
		    	expect(res.body.aliases).to.deep.eq(params.aliases);
		    	done();
		    });
			});
			it("should add the release to the database", function(done) {
				Release.find({}, function(e, releases) {
					params = { clientId: "123", name: "Post Release" }
					chai.request(server)
			    .post('/releases')
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send(params)
			    .end(function(err, res) {
			    	Release.find({}, function(e, newReleases) {
			    		expect(newReleases.length).to.eq(releases.length + 1);
			    		done();
			    	});
			    });
		    });
			});
		});
		describe("/import POST", function() {
			it("should import releases from file", function(done) {
				chai.request(server)
		    .post('/releases/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_release.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.releases.length).to.eq(2);
		    	done();
		    });
			});
			it("should add the releases in the file to the database", function(done) {
				chai.request(server)
		    .post('/releases/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_release.xlsx')
		    .end(function(err, res) {
		    	Release.find({clientId: client._id, catNo: 'ID1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Release.find({clientId: client._id, catNo: 'ID2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/releases/import')
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
		    .post('/releases/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", nullUser)
		    .attach('file', 'test/test-data/test_release.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should return any errors in the errors field of the response", function(done) {
				chai.request(server)
		    .post('/releases/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_null_release.xlsx')
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
		    .get('/releases')
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
		    .get('/releases/export')
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
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .get('/releases/' + id)
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
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .put('/releases/' + id)
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
			it("should not update the release", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .put('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Release.find({ _id: releases[0]._id }, function(err, newReleases) {
				    	expect(newReleases[0].title).to.eq(releases[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .delete('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the release", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .delete('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	Release.count({ _id: releases[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .post('/releases')
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
			it("should not create a release", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .post('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Release.count({}, function(err, count) {
				    	expect(releases.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/releases/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .attach('file', 'test/test-data/test_release.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a release", function(done) {
				Release.find({}, function(err, releases) {
					chai.request(server)
			    .post('/releases/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", internal)
		    	.attach('file', 'test/test-data/test_release.xlsx')
			    .end(function(err, res) {
			    	Release.count({}, function(err, count) {
				    	expect(releases.length).to.eq(count);
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
		    .get('/releases')
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
		    .get('/releases/export')
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
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .get('/releases/' + id)
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
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .put('/releases/' + id)
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
			it("should not update the release", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .put('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Release.find({ _id: releases[0]._id }, function(err, newReleases) {
				    	expect(newReleases[0].title).to.eq(releases[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .delete('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the release", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .delete('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	Release.count({ _id: releases[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .post('/releases')
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
			it("should not create a release", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .post('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Release.count({}, function(err, count) {
				    	expect(releases.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/releases/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", parent)
		    .attach('file', 'test/test-data/test_release.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a release", function(done) {
				Release.find({}, function(err, releases) {
					chai.request(server)
			    .post('/releases/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", parent)
		    	.attach('file', 'test/test-data/test_release.xlsx')
			    .end(function(err, res) {
			    	Release.count({}, function(err, count) {
				    	expect(releases.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

	});

	describe("as a payee user", function() {

		describe("/ GET", function() {
			it("should return all releases associated with the payee", function(done) {
				chai.request(server)
		    .get('/releases')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .end(function(err, res) {
		    	Release.count({ $and: [{ clientId: client._id }, { $or: [{ 'salesReturnsRights.contractId': { $in: contractIds } }, { 'costsRights.contractId': { $in: contractIds } }] }] }, function(err, count) {
		    		expect(res.status).to.eq(200);
			    	expect(res.body.releases.length).to.eq(count);
			    	done();
		    	});
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/releases/export')
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
				var newRelease = [ "ID", "Title", "Version", "Artist", "CatNo", "Barcode", "", "", "", 1, "", "", "", "", "", "", "", "", "", "" ];
				createXlsx.createInTemplate([[newRelease]], appRootDir + config.exportTemplates.release, function(err, outputFile) { 
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
			describe("when release is associated with the payee", function() {
				it("should return the release", function(done) {
					Release.find({ 'salesReturnsRights.contractId': contractId }, function(err, releases) {
						var id = releases[0]._id;
						chai.request(server)
				    .get('/releases/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", payee)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.title).to.eq(releases[0].title);
				    	done();
				    });
					});
				});
			});
			describe("when the release is not associated with the payee", function() {
				it("should return a 403 forbidden response", function(done) {
					Release.find({}, function(err, releases) {
						var id = releases[0]._id;
						chai.request(server)
				    .get('/releases/' + id)
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
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .put('/releases/' + id)
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
			it("should not update the release", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .put('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Release.find({ _id: releases[0]._id }, function(err, newReleases) {
				    	expect(newReleases[0].title).to.eq(releases[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .delete('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the release", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .delete('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	Release.count({ _id: releases[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .post('/releases')
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
			it("should not create a release", function(done) {
				Release.find({}, function(err, releases) {
					var id = releases[0]._id;
					chai.request(server)
			    .post('/releases/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Release.count({}, function(err, count) {
				    	expect(releases.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe.only("/import POST", function() {
			it("should import releases from file", function(done) {
				chai.request(server)
		    .post('/releases/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_release.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.releases.length).to.eq(2);
		    	done();
		    });
			});
			it("should add the releases in the file to the database", function(done) {
				chai.request(server)
		    .post('/releases/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_release.xlsx')
		    .end(function(err, res) {
		    	Release.find({clientId: client._id, catNo: 'ID1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Release.find({clientId: client._id, catNo: 'ID2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/releases/import')
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
		    .post('/releases/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_null_release.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors.length).to.above(0);
		    	done();
		    });
			});
		});

	});

});