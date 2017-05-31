process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var Campaign = require('../../models/campaign');
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

describe("/campaigns", function() {

	beforeEach(function(done) {
		var campaign1 = new Campaign({ clientId: client._id, title: "Campaign 1" });
		campaign1.save();
		var campaign2 = new Campaign({ clientId: client._id, contractId: contractId, title: "Campaign 2" });
		campaign2.save();
		var campaign3 = new Campaign({ clientId: client._id, contractId: contractId, title: "Campaign 2" });
		campaign3.save();
		var campaign4 = new Campaign({ clientId: "anything else", title: "Campaign 3" });
		campaign4.save();
		done();
	});

	afterEach(function(done) {
		Campaign.collection.drop();
		done();
	});

	describe("as a client user", function() {
		describe("/ GET", function() {
			it("should return a list of campaigns", function(done) {
				chai.request(server)
		    .get('/campaigns')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.campaigns).to.be.an('array');
		    	Campaign.find({ clientId: client._id }, function(e, campaigns) {
		    		console.log(campaigns);
		    		expect(res.body.campaigns.length).to.be.eq(campaigns.length);
		    		done();
		    	});
		    });
			});
			it("should return metadata of campaigns index on / GET", function(done) {
				chai.request(server)
		    .get('/campaigns')
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
		    .get('/campaigns')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/campaigns?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/campaigns')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/campaigns?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.campaigns.length).to.eq(1);
		    	Campaign.count({ clientId: client._id }, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/campaigns/export')
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
				var newCampaign = [ "ID", "Campaign 1", "Artist 1", "IDENTIFIER", "ReleaseID", "TrackID", "WorkID" ];
				createXlsx.createInTemplate([[newCampaign]], appRootDir + config.exportTemplates.campaign, function(err, outputFile) { 
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
			describe("when a campaign is found", function() {
				it("should return a campaign and 200 status", function(done) {
					Campaign.find({}, function(e, campaigns) {
						var id = campaigns[0]._id;
						chai.request(server)
				    .get('/campaigns/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.clientId).to.eq(campaigns[0].clientId);
				    	expect(res.body.contractId).to.eq(campaigns[0].contractId);
				    	expect(res.body.title).to.eq(campaigns[0].title);
				    	expect(res.body.artist).to.eq(campaigns[0].artist);
				    	expect(res.body.identifier).to.eq(campaigns[0].identifier);
				    	done();
				    });
					});
				});
			});
			describe("when a campaign is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Campaign with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			describe("when a campaign is found", function() {
				it("should update with passed values only", function(done) {
					Campaign.find({}, function(e, campaigns) {
						var id = campaigns[0]._id;
						var changedTitle = campaigns[0].title + "changed";
						chai.request(server)
				    .put('/campaigns/' + id)
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
					Campaign.find({}, function(e, campaigns) {
						var id = campaigns[0]._id;
						var changedTitle = campaigns[0].title + "changed";
						chai.request(server)
				    .put('/campaigns/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ name: changedTitle, clientId: "changed" })
				    .end(function(err, res) {
				    	expect(res.body.clientId).to.eq(campaigns[0].clientId);
				    	done();
				    });
					});
				});
			});
			describe("when a campaign is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send({ title: "Changed Campaign Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Campaign with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			describe("when a campaign is found", function() {
				it("should delete the campaign and return a 200 status", function(done) {
					Campaign.find({}, function(e, campaigns) {
						var id = campaigns[0]._id;
						chai.request(server)
				    .delete('/campaigns/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	Campaign.find({}, function(e, newCampaigns) {
				    		expect(newCampaigns.length).to.eq(campaigns.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a campaign is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Campaign with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a campaign created with the passed parameters", function(done) {
				params = { clientId: "ClientID", contractId: "ContractID", title: "Title", artist: "Artist", identifier: "ID", releaseIds: [1, 2], trackIds: [3, 4, 5], workIds: [6, 7, 8] }
				chai.request(server)
		    .post('/campaigns')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .send(params)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.clientId).to.eq(client._id.toString());
		    	expect(res.body.contractId).to.eq(params.contractId);
		    	expect(res.body.title).to.eq(params.title);
		    	expect(res.body.artist).to.eq(params.artist);
		    	expect(res.body.identifier).to.eq(params.identifier);
		    	done();
		    });
			});
			it("should add the campaign to the database", function(done) {
				Campaign.find({}, function(e, campaigns) {
					params = { clientId: "123", name: "Post Campaign" }
					chai.request(server)
			    .post('/campaigns')
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send(params)
			    .end(function(err, res) {
			    	Campaign.find({}, function(e, newCampaigns) {
			    		expect(newCampaigns.length).to.eq(campaigns.length + 1);
			    		done();
			    	});
			    });
		    });
			});
		});
		describe.only("/import POST", function() {
			it("should import campagns from file", function(done) {
				chai.request(server)
		    .post('/campaigns/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_campaign.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.campaigns.length).to.eq(2);
		    	done();
		    });
			});
			it("should add the campaigns in the file to the database", function(done) {
				chai.request(server)
		    .post('/campaigns/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_campaign.xlsx')
		    .end(function(err, res) {
		    	Campaign.find({clientId: client._id, identifier: 'ID1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Campaign.find({clientId: client._id, identifier: 'ID2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/campaigns/import')
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
		    .post('/campaigns/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", nullUser)
		    .attach('file', 'test/test-data/test_campaign.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should return any errors in the errors field of the response", function(done) {
				chai.request(server)
		    .post('/campaigns/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_null_campaign.xlsx')
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
		    .get('/campaigns')
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
		    .get('/campaigns/export')
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
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .get('/campaigns/' + id)
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
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .put('/campaigns/' + id)
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
			it("should not update the campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .put('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Campaign.find({ _id: campaigns[0]._id }, function(err, newCampaigns) {
				    	expect(newCampaigns[0].title).to.eq(campaigns[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .delete('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .delete('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	Campaign.count({ _id: campaigns[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .post('/campaigns')
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
			it("should not create a campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .post('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Campaign.count({}, function(err, count) {
				    	expect(campaigns.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/campaigns/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .attach('file', 'test/test-data/test_campaign.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					chai.request(server)
			    .post('/campaigns/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", internal)
		    	.attach('file', 'test/test-data/test_campaign.xlsx')
			    .end(function(err, res) {
			    	Campaign.count({}, function(err, count) {
				    	expect(campaigns.length).to.eq(count);
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
		    .get('/campaigns')
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
		    .get('/campaigns/export')
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
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .get('/campaigns/' + id)
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
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .put('/campaigns/' + id)
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
			it("should not update the campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .put('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Campaign.find({ _id: campaigns[0]._id }, function(err, newCampaigns) {
				    	expect(newCampaigns[0].title).to.eq(campaigns[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .delete('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .delete('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	Campaign.count({ _id: campaigns[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .post('/campaigns')
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
			it("should not create a campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .post('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Campaign.count({}, function(err, count) {
				    	expect(campaigns.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/campaigns/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", parent)
		    .attach('file', 'test/test-data/test_campaign.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					chai.request(server)
			    .post('/campaigns/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", parent)
		    	.attach('file', 'test/test-data/test_campaign.xlsx')
			    .end(function(err, res) {
			    	Campaign.count({}, function(err, count) {
				    	expect(campaigns.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
	});

	describe("as a payee user", function() {

		describe("/ GET", function() {
			it("should return all campaigns associated with the payee", function(done) {
				chai.request(server)
		    .get('/campaigns')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .end(function(err, res) {
		    	Campaign.count({ contractId: { $in: payee.contractIds } }, function(err, count) {
		    		expect(res.status).to.eq(200);
			    	expect(res.body.campaigns.length).to.eq(count);
			    	done();
		    	});
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/campaigns/export')
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
				var newCampaign = [ "ID", "Campaign 1", "Artist 1", "IDENTIFIER", "ReleaseID", "TrackID", "WorkID" ];
				createXlsx.createInTemplate([[newCampaign]], appRootDir + config.exportTemplates.campaign, function(err, outputFile) { 
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
			describe("when campaign is associated with the payee", function() {
				it("should return the campaign", function(done) {
					Campaign.find({ contractId: { $in: contractIds } }, function(err, campaigns) {
						var id = campaigns[0]._id;
						chai.request(server)
				    .get('/campaigns/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", payee)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.title).to.eq(campaigns[0].title);
				    	done();
				    });
					});
				});
			});
			describe("when the campaign is not associated with the payee", function() {
				it("should return a 403 forbidden response", function(done) {
					Campaign.find({}, function(err, campaigns) {
						var id = campaigns[0]._id;
						chai.request(server)
				    .get('/campaigns/' + id)
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
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .put('/campaigns/' + id)
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
			it("should not update the campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .put('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Campaign.find({ _id: campaigns[0]._id }, function(err, newCampaigns) {
				    	expect(newCampaigns[0].title).to.eq(campaigns[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .delete('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .delete('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	Campaign.count({ _id: campaigns[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .post('/campaigns')
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
			it("should not create a campaign", function(done) {
				Campaign.find({}, function(err, campaigns) {
					var id = campaigns[0]._id;
					chai.request(server)
			    .post('/campaigns/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Campaign.count({}, function(err, count) {
				    	expect(campaigns.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should import campagns from file", function(done) {
				chai.request(server)
		    .post('/campaigns/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_campaign.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.campaigns.length).to.eq(2);
		    	done();
		    });
			});
			it("should add the campaigns in the file to the database", function(done) {
				chai.request(server)
		    .post('/campaigns/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_campaign.xlsx')
		    .end(function(err, res) {
		    	Campaign.find({clientId: client._id, identifier: 'ID1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Campaign.find({clientId: client._id, identifier: 'ID2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/campaigns/import')
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
		    .post('/campaigns/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_null_campaign.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors.length).to.above(0);
		    	done();
		    });
			});
		});

	});

});