process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var Track = require("../../models/track.js");
var sinon = require('sinon');

require('../../models/db');

var contractId = "ContractId";
var fields = {
	clientId: "ClientID",
	title: "Title",
	version: "Version",
	artist: "Artist",
	isrc: "ISRC",
	pLine: "P Line",
	salesReturnsRights: [],
	costsRights: [],
	aliases: ["alises"],
	releaseIds: ["releaseIDs"],
	workIds: ["workIDs"],
	campaignIds: ["campaignIDs"]
}
var track = new Track(fields);

describe("Track", function() {
	// Fields
	describe("fields", function() {
		it("should have a clientId parameter", function() {
			expect(track).to.have.a.property("clientId", fields.clientId);
		});
		it("should have a title parameter", function() {
			expect(track).to.have.a.property("title", fields.title);
		});
		it("should have a version parameter", function() {
			expect(track).to.have.a.property("version", fields.version);
		});
		it("should have a artist parameter", function() {
			expect(track).to.have.a.property("artist", fields.artist);
		});
		it("should have a isrc parameter", function() {
			expect(track).to.have.a.property("isrc", fields.isrc);
		});
		it("should have a pLine parameter", function() {
			expect(track).to.have.a.property("pLine", fields.pLine);
		});
		it("should have a salesReturnsRights parameter", function() {
			expect(track.salesReturnsRights).to.be.an('array');
		});
		it("should have a costsRights parameter", function() {
			expect(track.costsRights).to.be.an('array');
		});
		it("should have a aliases parameter", function() {
			expect(track.aliases).to.be.an('array');
		});
		it("should have a releaseIds parameter", function() {
			expect(track.releaseIds).to.be.an('array');
		});
		it("should have a workIds parameter", function() {
			expect(track.workIds).to.be.an('array');
		});
		it("should have a campaignIds parameter", function() {
			expect(track.campaignIds).to.be.an('array');
		});
	});
});

describe("convertTracksForXlsx", function() {
    describe("when passed an array", function() {
      	var tracks = [track];
		before(function() {
			track.save();
		});
		it("should not return an error", function(done) {
			Track.convertTracksForXlsx(tracks, function(err, mappedData) {
			  expect(err).to.eq(null);
			  done();
			});
		});
		it("should return an array", function(done) {
			Track.convertTracksForXlsx(tracks, function(err, mappedData) {
			 	expect(mappedData instanceof Array).to.be.true;
			  	done();
			});
		});
		it("should call exportData for aliases", function(done) {
			var spy = sinon.spy(track, "exportData");
			Track.convertTracksForXlsx(tracks, function(err, mappedData) {
			  	expect(spy.callCount).to.eq(1);
			  	done();
			});
			after(function() {
			  	spy.restore();
			});
		});
		it("should add the returned value from exportData to the returned array", function(done) {
			Track.convertTracksForXlsx(tracks, function(err, mappedData) {
				expect(mappedData.length).to.eq(1);
				done();
			});
		});
    });
  	describe("when not passed an array", function() {
		it("should return an error in the callback stating it must be passed an array", function(done) {
			Track.convertTracksForXlsx(null, function(err, mappedData) {
				expect(err).to.eq("Must be passed an Array of Tracks");
				done();
			});
		});
    });
});

describe("importTrack", function() {
	// Find using the ID or ISRC
  	describe("when passed an object", function() {
  		var spy = sinon.spy(Track, "findOne");
    	describe("when _id is present", function() {
      		it("should call find with the passed _id and clientId", function() {
	        	Track.importTrack(track, track.clientId, function(err, result) {
	          		expect(spy.called).to.be.true;
	          		spy.restore();
	        	});
    		});
    	});
    	describe("when _id is not present", function() {
      		describe("when isrc is present", function() {
		        it("should call find with the passed isrc and clientId", function() {
					var newTrack = { _id: "", clientId: "ClientID", title: "Track 2", version: "Version 2", artist: "Artist 2", isrc: "ISRC", pLine: "P Line 2", aliases: "Aliases" };
					Track.importTrack(newTrack, track.clientId, function(err, result) {
						expect(spy.called).to.be.true;
						spy.restore();
					});
		        });
		        describe("when a track is found by the isrc", function() {
		        	it("should update the found track with the passed fields", function() {
			            var newTrack = { _id: "", clientId: "ClientID", title: "Track 2", version: "Version 2", artist: "Artist 2", isrc: "ISRC", pLine: "P Line 2", aliases: "Aliases" };
			            Track.importTrack(newTrack, track.clientId, function(err, result) {
			            	expect(result.title).to.eq('Track 2');
			            	expect(result.artist).to.eq('Artist 2');
			            });
		        	});
		        });
	        	describe("when a track is not found by the isrc", function() {
	        		it("should create a new track", function() {
	            		var newTrack = { _id: "", clientId: "ClientID", title: "Track 3", version: "Version 3", artist: "Artist 3", isrc: "ISRC 3", pLine: "P Line 3", aliases: "Aliases" };
	            		Track.importTrack(newTrack, track.clientId, function(err, result) {
			            	expect(result.title).to.eq('Track 3');
			            	expect(result.artist).to.eq('Artist 3');
			            	expect(result.isrc).to.eq('ISRC 3');
			            });
	          		});
	        	});
		        it("should set the passed fields to the Track", function() {
		          	var newTrack = { _id: "", clientId: "ClientID", title: "Track 4", version: "Version 4", artist: "Artist 4", isrc: "ISRC 4", pLine: "P Line 4", aliases: "Aliases" };
		          	Track.importTrack(newTrack, track.clientId, function(err, result) {
		            	expect(result.title).to.eq("Track 4")
		            	expect(result.artist).to.eq("Artist 4")
		            	expect(result.isrc).to.eq("ISRC 4")
		          	});
		        });
    		});
	      	describe("when isrc is not present", function() {
		      	it("should return an error to the callback stating that an isrc is required", function() {
		        	var newTrack = { _id: "", clientId: "ClientID", title: "Track 1", version: "Version 1", artist: "Artist 1", pLine: "P Line 1", aliases: "Aliases" };
		        	Track.importTrack(newTrack, track.clientId, function(err, result) {
		            	expect(err).to.eq("Isrc must be passed")
		          	});
		        });
		      	it("should not create a new Track", function() {
		        	var newTrack = { _id: "", clientId: "ClientID", title: "Track 1", version: "Version 1", artist: "Artist 1", pLine: "P Line 1", aliases: "Aliases" };
		          	Track.importTrack(newTrack, track.clientId, function(err, result) {
		            	expect(err).to.eq("Isrc must be passed")
		          	});
		        });
      		});
    	});
	});
	describe("when not passed an object", function() {
    	it("should return an error in the callback stating it must be passed an object", function() {
	      	Track.importTrack(null, track.clientId, function(err, result) {
	        	expect(err).to.eq("Track must be passed")
	      	});
    	});
  	});
});

describe("importTracks", function() {
  	describe("when passed an array", function() {
	    var tracks = [
	      { _id: "", title: "Track 1", version: "Version 1", artist: "Artist 1", isrc: "ISRC1" },
	      {_id: ""}
	    ]
	    it("should call importTrack for each track passed", function() {
	      	Track.importTracks(tracks, track.clientId, function(err, result) {
	        	expect(err).to.eq(null);
	      	});
	    });
	    var tracks = [
	      { _id: "", title: "Track 1", version: "Version 1", artist: "Artist 1", isrc: "ISRC1" },
	      { _id: "", title: "Track 1", version: "Version 1", artist: "Artist 1" },
	      {_id: ""}
	    ]
	    it("should add each returned error from importTrack to the errors array", function() {
	      	Track.importTracks(tracks, track.clientId, function(err, result) {
	        	expect(err.length).to.eq(1);
	      	});
	    });
	    it("should add each returned track from importTrack to the imported array", function() {
	      	Track.importTracks(tracks, track.clientId, function(err, result) {
	        	expect(result.length).to.eq(tracks.length);
	      	});
	    });
  	});
  	describe("when not passed an array", function() {
    	var tracks = { _id: "123", title: "Track 1", version: "Version 1", artist: "Artist 1", isrc: "ISRC1" };    	
	    it("should return an error in the callback stating it must be passed an array", function() {
	      	Track.importTracks(tracks, track.clientId, function(err, result) {
	        	expect(err).to.eq("Data must be an Array");
	      	});
	    });
  	});
  	describe("when not passed a clientId", function() {
	    var tracks = [
	      { _id: "123", title: "Track 1", version: "Version 1", artist: "Artist 1", isrc: "ISRC1" },
	      { _id: "123", title: "Track 1", version: "Version 1", artist: "Artist 1", isrc: "ISRC1" },
	      { _id: "123", title: "Track 1", version: "Version 1", artist: "Artist 1", isrc: "ISRC1" },
	      {_id: ""}
	    ]
	    it("should return an error in the callback stating it must be passed a client ID", function() {
	      	Track.importTracks(tracks, null, function(err, result) {
	        	expect(err).to.eq("A Client ID must be passed");
	      	});
	    });
  	});
});

describe("track", function() {
	before(function() {
		track.save();
	});
	describe("#userForbidden", function() {
		describe("when action is read", function() {
			var action = "read";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds math", function() {
					var user = { internal: false, parentId: null, clientId: track.clientId, payeeId: null };
					expect(track.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(track.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has a clientId and a payeeId (is a payee user)", function() {
				it("should return false when contractIds match", function() {
					var user = { internal: false, parentId: null, clientId: track.clientId, payeeId: "123", contractIds: [contractId, "12345678"] };
					track.salesReturnsRights = [{ contractId: contractId }];
					expect(track.userForbidden(user, action)).to.be.false;
				});
				it("should return true when contractIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: track.clientId, payeeId: "123", contractIds: ["12345678"] };
					expect(track.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(track.userForbidden(user, action)).to.be.true;
				});
			});
		});
		describe("when action is write", function() {
			var action = "write";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds math", function() {
					var user = { internal: false, parentId: null, clientId: track.clientId, payeeId: null };
					expect(track.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(track.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when uesr has a clientId and a payeeId (is a payee user)", function() {
				it("should return true when contractIds match", function() {
					var user = { internal: false, parentId: null, clientId: track.clientId, payeeId: "123", contractIds: [contractId, "12345678"] };
					expect(track.userForbidden(user, action)).to.be.true;
				});
				it("should return true when contractIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: track.clientId, payeeId: "123", contractIds: ["12345678"] };
					expect(track.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(track.userForbidden(user, action)).to.be.true;
				});
			});
		});
	});
	describe("#containsContractIds", function() {
		describe("when passed an array", function() {
			var contractId = "ContractId";
			var contractIds = [contractId, "somethingElse"];
			describe("when track has contractId within salesReturnsRights", function() {
				it("should return true", function(done) {
					track.salesReturnsRights = [{ contractId: contractId }];
					track.costsRights = [];
					track.containsContractIds(contractIds, function(val) {
						expect(val).to.be.true;
						done();
					});
				});
			});
			describe("when track has contractId within costsRights", function() {
				it("should return true", function(done) {
					track.salesReturnsRights = [];
					track.costsRights = [{ contractId: contractId }];;
					track.containsContractIds(contractIds, function(val) {
						expect(val).to.be.true;
						done();
					});
				});
			});
			describe("when track does not have contractId within either salesReturnsRights or costsRights", function() {
				it("should return false", function(done) {
					track.salesReturnsRights = [];
					track.costsRights = [];
					track.containsContractIds(contractIds, function(val) {
						expect(val).to.be.false;
						done();
					});
				});
			});
		});
		describe("when not passed an array", function() {
			it("should return false", function(done) {
				track.salesReturnsRights = [];
				track.costsRights = [];
				track.containsContractIds(null, function(val) {
					expect(val).to.be.false;
					done();
				});
			});
		});
	});
	describe("#contractIds", function() {
		it("should return an array", function(done) {
			track.contractIds(function(ids) {
				expect(ids).to.be.an('array');
				done();
			});
		});
		describe("when track has salesReturnsRights", function() {
			it("should include the contractId from each object in salesReturnsRights", function(done) {
				track.salesReturnsRights = [{ contractId: contractId }];
				track.costsRights = [];
				track.contractIds(function(ids) {
					expect(ids).to.deep.eq([contractId]);
					done();
				});
			});
		});
		describe("when track has costsRights", function() {
			it("should include the contractId from each object in costsRights", function(done) {
				track.salesReturnsRights = [];
				track.costsRights = [{ contractId: contractId }];
				track.contractIds(function(ids) {
					expect(ids).to.deep.eq([contractId]);
					done();
				});
			});
		});
		describe("when track has neither salesReturnsRights or costsRights", function() {
			it("should return a blank array", function(done) {
				track.salesReturnsRights = [];
				track.costsRights = [];
				track.contractIds(function(ids) {
					expect(ids).to.be.an('array');
					done();
				});
			});
		});
	});
});