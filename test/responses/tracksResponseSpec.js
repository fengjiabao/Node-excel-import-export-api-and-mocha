process.env.NODE_ENV = 'test';
var config = require('../../config.json');
var jwt = require('jsonwebtoken');
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../../index');
var expect = chai.expect;
var Track = require('../../models/track');
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

describe("/tracks", function() {

	beforeEach(function(done) {
		var track1 = new Track({ clientId: client._id, title: "Track 1", salesReturnsRights: [{ contractId: contractId }] });
		track1.save();
		var track2 = new Track({ clientId: client._id, title: "Track 2", costsRights: [{ contractId: contractId }] });
		track2.save();
		var track3 = new Track({ clientId: client._id, title: "Track 3" });
		track3.save();
		var track4 = new Track({ clientId: "anything else", title: "Track 4" });
		track4.save();
		done();
	});

	afterEach(function(done) {
		Track.collection.drop();
		done();
	});

	describe("as a client user", function() {
		describe("/ GET", function() {
			it("should return a list of tracks", function(done) {
				chai.request(server)
		    .get('/tracks')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.tracks).to.be.an('array');
		    	Track.find({ clientId: client._id }, function(e, tracks) {
		    		console.log(tracks);
		    		expect(res.body.tracks.length).to.be.eq(tracks.length);
		    		done();
		    	});
		    });
			});
			it("should return metadata of tracks index on / GET", function(done) {
				chai.request(server)
		    .get('/tracks')
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
		    .get('/tracks')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(1);
		    	done();
		    });
			});
			it("should return the passed page when passed the parameter", function(done) {
				chai.request(server)
		    .get('/tracks?page=3')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.currentPage).to.be.eq(3);
		    	done();
		    });
			});
			it("should return the pages available", function(done) {
				chai.request(server)
		    .get('/tracks')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.meta.totalPages).to.be.eq(1);
		    	done();
		    });
			});
			it("should set the amount to be returned per page when passed a limit option", function(done) {
				chai.request(server)
		    .get('/tracks?limit=1')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .end(function(err, res) {
		    	expect(res.body.tracks.length).to.eq(1);
		    	Track.count({ clientId: client._id }, function(e, count) {
		    		expect(res.body.meta.totalPages).to.be.eq(count);
		    		done();
		    	});
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/tracks/export')
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
				var newTrack = [ "ID", "Title", "Version", "Artist", "CatNo", "Barcode", "" ];
				createXlsx.createInTemplate([[newTrack]], appRootDir + config.exportTemplates.track, function(err, outputFile) { 
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
			describe("when a track is found", function() {
				it("should return a track and 200 status", function(done) {
					Track.find({}, function(e, tracks) {
						var id = tracks[0]._id;
						chai.request(server)
				    .get('/tracks/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body).to.be.be.a("object");
				    	expect(res.body.clientId).to.eq(tracks[0].clientId);
				    	expect(res.body.contractId).to.eq(tracks[0].contractId);
				    	expect(res.body.title).to.eq(tracks[0].title);
				    	expect(res.body.artist).to.eq(tracks[0].artist);
				    	expect(res.body.identifier).to.eq(tracks[0].identifier);
				    	done();
				    });
					});
				});
			});
			describe("when a track is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .get('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Track with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id PUT", function() {
			describe("when a track is found", function() {
				it("should update with passed values only", function(done) {
					Track.find({}, function(e, tracks) {
						var id = tracks[0]._id;
						var changedTitle = tracks[0].title + "changed";
						chai.request(server)
				    .put('/tracks/' + id)
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
					Track.find({}, function(e, tracks) {
						var id = tracks[0]._id;
						var changedTitle = tracks[0].title + "changed";
						chai.request(server)
				    .put('/tracks/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .send({ name: changedTitle, clientId: "changed" })
				    .end(function(err, res) {
				    	expect(res.body.clientId).to.eq(tracks[0].clientId);
				    	done();
				    });
					});
				});
			});
			describe("when a track is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .put('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send({ title: "Changed Track Title" })
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Track with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			describe("when a track is found", function() {
				it("should delete the track and return a 200 status", function(done) {
					Track.find({}, function(e, tracks) {
						var id = tracks[0]._id;
						chai.request(server)
				    .delete('/tracks/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", clientUser)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	Track.find({}, function(e, newTracks) {
				    		expect(newTracks.length).to.eq(tracks.length - 1);
				    		done();
				    	});
				    });
					});
				});
			});
			describe("when a track is not found", function() {
				it("should return a 404 status", function(done) {
					var id = "anything"
					chai.request(server)
			    .delete('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(404);
			    	expect(res.body.message).to.eq("Could not find Track with ID " + id);
			    	done();
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a track created with the passed parameters", function(done) {
				params = { 
					clientId: "ClientID",
					campaignIds: [1, 2, 3],
					title: "Title",
					version: "Version",
					artist: "Artist",
					isrc: "ISRC",
					pLine: "P Line",
					salesReturnsRights: [{ contractId: "123" }],
					costsRights: [{ contractId: "456" }],
					aliases: [34, 46],
					releaseIds: [1, 2, 3],
					workIds: [4, 5, 6]
				}
				chai.request(server)
		    .post('/tracks')
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
		    	expect(res.body.isrc).to.eq(params.isrc);
		    	expect(res.body.pLine).to.eq(params.pLine);
		    	expect(res.body.salesReturnsRights[0].contractId).to.eq(params.salesReturnsRights[0].contractId);
		    	expect(res.body.costsRights[0].contractId).to.deep.eq(params.costsRights[0].contractId);
		    	expect(res.body.aliases).to.deep.eq(params.aliases);
		    	expect(res.body.releaseIds).to.deep.eq(params.releaseIds);
		    	expect(res.body.workIds).to.deep.eq(params.workIds);
		    	done();
		    });
			});
			it("should add the track to the database", function(done) {
				Track.find({}, function(e, tracks) {
					params = { clientId: "123", name: "Post Track" }
					chai.request(server)
			    .post('/tracks')
			    .set("applicationToken", config.applicationToken)
			    .set("token", clientUser)
			    .send(params)
			    .end(function(err, res) {
			    	Track.find({}, function(e, newTracks) {
			    		expect(newTracks.length).to.eq(tracks.length + 1);
			    		done();
			    	});
			    });
		    });
			});
		});

		describe("/import POST", function() {
			it("should import tracks from file", function(done) {
				chai.request(server)
		    .post('/tracks/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_track.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.tracks.length).to.eq(2);
		    	done();
		    });
			});
			it("should add the tracks in the file to the database", function(done) {
				chai.request(server)
		    .post('/tracks/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_track.xlsx')
		    .end(function(err, res) {
		    	Track.find({clientId: client._id, isrc: 'ISRC1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Track.find({clientId: client._id, isrc: 'ISRC2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/tracks/import')
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
		    .post('/tracks/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", nullUser)
		    .attach('file', 'test/test-data/test_track.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should return any errors in the errors field of the response", function(done) {
				chai.request(server)
		    .post('/tracks/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", clientUser)
		    .attach('file', 'test/test-data/test_null_track.xlsx')
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
		    .get('/tracks')
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
		    .get('/tracks/export')
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
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .get('/tracks/' + id)
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
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .put('/tracks/' + id)
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
			it("should not update the track", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .put('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Track.find({ _id: tracks[0]._id }, function(err, newTracks) {
				    	expect(newTracks[0].title).to.eq(tracks[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .delete('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the track", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .delete('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .end(function(err, res) {
			    	Track.count({ _id: tracks[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .post('/tracks')
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
			it("should not create a track", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .post('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", internal)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Track.count({}, function(err, count) {
				    	expect(tracks.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/tracks/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", internal)
		    .attach('file', 'test/test-data/test_track.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a track", function(done) {
				Track.find({}, function(err, tracks) {
					chai.request(server)
			    .post('/tracks/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", internal)
		    	.attach('file', 'test/test-data/test_track.xlsx')
			    .end(function(err, res) {
			    	Track.count({}, function(err, count) {
				    	expect(tracks.length).to.eq(count);
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
		    .get('/tracks')
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
		    .get('/tracks/export')
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
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .get('/tracks/' + id)
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
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .put('/tracks/' + id)
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
			it("should not update the track", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .put('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Track.find({ _id: tracks[0]._id }, function(err, newTracks) {
				    	expect(newTracks[0].title).to.eq(tracks[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .delete('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the track", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .delete('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .end(function(err, res) {
			    	Track.count({ _id: tracks[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .post('/tracks')
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
			it("should not create a track", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .post('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", parent)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Track.count({}, function(err, count) {
				    	expect(tracks.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should return a 403 forbidden response", function(done) {
				chai.request(server)
		    .post('/tracks/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", parent)
		    .attach('file', 'test/test-data/test_track.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(403);
		    	expect(res.body.message).to.eq("Forbidden");
		    	done();
		    });
			});
			it("should not import a track", function(done) {
				Track.find({}, function(err, tracks) {
					chai.request(server)
			    .post('/tracks/import')
		    	.set("applicationToken", config.applicationToken)
		    	.set("token", parent)
		    	.attach('file', 'test/test-data/test_track.xlsx')
			    .end(function(err, res) {
			    	Track.count({}, function(err, count) {
				    	expect(tracks.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});

	});

	describe("as a payee user", function() {

		describe("/ GET", function() {
			it("should return all tracks associated with the payee", function(done) {
				chai.request(server)
		    .get('/tracks')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .end(function(err, res) {
		    	Track.count({ $and: [{ clientId: client._id }, { $or: [{ 'salesReturnsRights.contractId': { $in: contractIds } }, { 'costsRights.contractId': { $in: contractIds } }] }] }, function(err, count) {
		    		expect(res.status).to.eq(200);
			    	expect(res.body.tracks.length).to.eq(count);
			    	done();
		    	});
		    });
			});
		});
		describe("/export GET", function() {
			it("should return a file", function(done) {
				chai.request(server)
		    .get('/tracks/export')
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
				var newTrack = [ "ID", "Title", "Version", "Artist", "CatNo", "Barcode", "" ];
				createXlsx.createInTemplate([[newTrack]], appRootDir + config.exportTemplates.track, function(err, outputFile) { 
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
			describe("when track is associated with the payee", function() {
				it("should return the track", function(done) {
					Track.find({ 'salesReturnsRights.contractId': contractId }, function(err, tracks) {
						var id = tracks[0]._id;
						chai.request(server)
				    .get('/tracks/' + id)
				    .set("applicationToken", config.applicationToken)
				    .set("token", payee)
				    .end(function(err, res) {
				    	expect(res.status).to.eq(200);
				    	expect(res.body.title).to.eq(tracks[0].title);
				    	done();
				    });
					});
				});
			});
			describe("when the track is not associated with the payee", function() {
				it("should return a 403 forbidden response", function(done) {
					Track.find({}, function(err, tracks) {
						var id = tracks[0]._id;
						chai.request(server)
				    .get('/tracks/' + id)
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
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .put('/tracks/' + id)
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
			it("should not update the track", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .put('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Track.find({ _id: tracks[0]._id }, function(err, newTracks) {
				    	expect(newTracks[0].title).to.eq(tracks[0].title);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/:id DELETE", function() {
			it("should return a 403 forbidden response", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .delete('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	expect(res.status).to.eq(403);
			    	expect(res.body.message).to.eq('Forbidden');
			    	done();
			    });
				});
			});
			it("should not delete the track", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .delete('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .end(function(err, res) {
			    	Track.count({ _id: tracks[0]._id }, function(err, count) {
				    	expect(count).to.eq(1);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/ POST", function() {
			it("should return a 403 forbidden response", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .post('/tracks')
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
			it("should not create a track", function(done) {
				Track.find({}, function(err, tracks) {
					var id = tracks[0]._id;
					chai.request(server)
			    .post('/tracks/' + id)
			    .set("applicationToken", config.applicationToken)
			    .set("token", payee)
			    .send({ title: "Changed Title" })
			    .end(function(err, res) {
			    	Track.count({}, function(err, count) {
				    	expect(tracks.length).to.eq(count);
				    	done();
			    	});
			    });
				});
			});
		});
		describe("/import POST", function() {
			it("should import tracks from file", function(done) {
				chai.request(server)
		    .post('/tracks/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_track.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(200);
		    	expect(res.body.message).to.eq("All successfully imported");
		    	expect(res.body.tracks.length).to.eq(2);
		    	done();
		    });
			});
			it("should add the tracks in the file to the database", function(done) {
				chai.request(server)
		    .post('/tracks/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_track.xlsx')
		    .end(function(err, res) {
		    	Track.find({clientId: client._id, isrc: 'ISRC1'}, function(e, first) {
		    		expect(first.length).to.eq(1);
		    		Track.find({clientId: client._id, isrc: 'ISRC2'}, function(e, second) {
		    			expect(second.length).to.eq(1);		    		
		    			done();
		    		});
		    	});		    	
		    });
			});
			it("should return an error without a file in the request", function(done) {
				chai.request(server)
		    .post('/tracks/import')
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
		    .post('/tracks/import')
		    .set("applicationToken", config.applicationToken)
		    .set("token", payee)
		    .attach('file', 'test/test-data/test_null_track.xlsx')
		    .end(function(err, res) {
		    	expect(res.status).to.eq(400);
		    	expect(res.body.errors.length).to.above(0);
		    	done();
		    });
			});
		});

	});

});