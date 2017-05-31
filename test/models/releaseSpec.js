process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var Release = require("../../models/release.js");
var Track = require("../../models/track.js");
var sinon = require('sinon');

require('../../models/db');

var contractId = "ContractID";
var fields = {
		clientId: "ClientId",
		campaignIds: [1, 2, 3],
		title: "title",
		version: "version",
		artist: "artist",
		catNo: "CATNO",
		barcode: "1234567890123",
		releaseDate: new Date,
		format: "Format",
		priceCategory: "Price Cat",
		dealerPrice: 123.456,
		mcpsId: "MCPSID",
		exemptFromMechanicals: true,
		salesReturnsRights: [1, 2, 3],
		costsRights: [4, 5, 6],
		alises: [7, 8, 9]
	}
var release = new Release(fields);

describe("Release", function() {
	// Fields
	describe("fields", function() {
		it("should have a clientId parameter", function() {
			expect(release).to.have.a.property("clientId", fields.clientId);
		});
		it("should have a campaignIds parameter", function() {
			expect(release.campaignIds).to.be.an('array');
		});
		it("should have a title parameter", function() {
			expect(release).to.have.a.property("title", fields.title);
		});
		it("should have a version parameter", function() {
			expect(release).to.have.a.property("version", fields.version);
		});
		it("should have a artist parameter", function() {
			expect(release).to.have.a.property("artist", fields.artist);
		});
		it("should have a catNo parameter", function() {
			expect(release).to.have.a.property("catNo", fields.catNo);
		});
		it("should have a barcode parameter", function() {
			expect(release).to.have.a.property("barcode", fields.barcode);
		});
		it("should have a releaseDate parameter", function() {
			expect(release).to.have.a.property("releaseDate", fields.releaseDate);
		});
		it("should have a format parameter", function() {
			expect(release).to.have.a.property("format", fields.format);
		});
		it("should have a priceCategory parameter", function() {
			expect(release).to.have.a.property("priceCategory", fields.priceCategory);
		});
		it("should have a dealerPrice parameter", function() {
			expect(release).to.have.a.property("dealerPrice", fields.dealerPrice);
		});
		it("should have a mcpsId parameter", function() {
			expect(release).to.have.a.property("mcpsId", fields.mcpsId);
		});
		it("should have a exemptFromMechanicals parameter", function() {
			expect(release).to.have.a.property("exemptFromMechanicals", fields.exemptFromMechanicals);
		});
		it("should have a salesReturnsRights parameter", function() {
			expect(release.salesReturnsRights).to.be.an('array');
		});
		it("should have a costsRights parameter", function() {
			expect(release.costsRights).to.be.an('array');
		});
		it("should have a aliases parameter", function() {
			expect(release.aliases).to.be.an('array');
		});
	});
});

describe("multipleReleasesForXlsx", function() {
    describe("when passed an array", function() {
      var releases = [release];
      before(function(done) {
        var track = new Track({ isrc: "ISRC" });
        track.save();
        release.trackIds = [track._id];
        release.save();
        done();
      });
      it("should not return an error", function(done) {
        Release.multipleReleasesForXlsx(releases, function(err, mappedData) {
          expect(err).to.eq(null);
          done();
        });
      });
      it("should return an array", function(done) {
        Release.multipleReleasesForXlsx(releases, function(err, mappedData) {
          expect(mappedData instanceof Array).to.be.true;
          done();
        });
      });
      it("should call exportData for each track data", function(done) {
        var spy = sinon.spy(release, "exportData");
        Release.multipleReleasesForXlsx(releases, function(err, mappedData) {
          expect(spy.callCount).to.eq(1);
          done();
        });
        after(function() {
          spy.restore();
        });
      });
      it("should add the returned value from exportData to the returned array", function(done) {
        Release.multipleReleasesForXlsx(releases, function(err, mappedData) {
          expect(mappedData.length).to.eq(release.trackIds.length);
          done();
        });
      });
    });
    describe("when not passed an array", function() {
      it("should return an error in the callback stating it must be passed an array", function(done) {
        Release.multipleReleasesForXlsx(null, function(err, mappedData) {
          expect(err).to.eq("Must be passed an Array of Releases");
          done();
        });
      });
    })
});

describe.only("importRelease", function() {
  // Find using the ID or catNo
  describe("when passed an object", function() {
    describe("when _id is present", function() {
      it("should call find with the passed _id and clientId", function() {
        var spy = sinon.spy(Release, "findOne");
        Release.importRelease(release, release.clientId, function(err, result) {
          expect(spy.called).to.be.true;
          spy.restore();
        });
      });
      describe("when a release is found", function() {
        it("should update the release with the passed fields", function() {
          var newRelease = { _id: "", clientId: "ClientID", title: "Release 1", artist: "Artist 1", catNo: "ID" };
          Release.importRelease(newRelease, release.clientId, function(err, result) {
            expect(result.title).to.eq('Release 1');
            expect(result.artist).to.eq('Artist 1');
          });
        });
      });
      describe("when a release is not found", function() {
        it("should create a new release", function() {
          var newRelease = { _id: "", clientId: "ClientID", title: "Release 1", artist: "Artist 1", catNo: "ID 1" };
          Release.importRelease(newRelease, release.clientId, function(err, result) {
            expect(result.catNo).to.eq("ID 1");
            expect(result.clientId).to.eq("ClientID");
            expect(result.title).to.eq("Release 1");
            expect(result.artist).to.eq("Artist 1");
          });
        });
      });
    });
    describe("when _id is not present", function() {
      describe("when catNo is present", function() {
        it("should call find with the passed catNo and clientId", function() {
          var newRelease = { _id: "", clientId: "ClientID", title: "Release 2", artist: "Artist 2", catNo: "ID" };
          Release.importRelease(newRelease, release.clientId, function(err, result) {
            expect(spy.called).to.be.true;
            spy.restore();
          });
        });
        describe("when a release is found by the catNo", function() {
        	it("should update the found release with the passed fields", function() {
            var newRelease = { _id: "", clientId: "ClientID", title: "Release 2", artist: "Artist 2", catNo: "ID" };
            Release.importRelease(newRelease, release.clientId, function(err, result) {
              expect(result.title).to.eq('Release 2');
              expect(result.artist).to.eq('Artist 2');
            });
          });
        });
        describe("when a release is not found by the catNo", function() {
        	it("should create a new release", function() {
            var newRelease = { _id: "", clientId: "ClientID", title: "Release 3", artist: "Artist 3", catNo: "ID 3" };
            Release.importRelease(newRelease, release.clientId, function(err, result) {
              expect(result.title).to.eq('Release 3');
              expect(result.artist).to.eq('Artist 3');
              expect(result.catNo).to.eq('ID 3');
            });
          });
        });
        it("should set the passed fields to the Release", function() {
          var newRelease = { _id: "", clientId: "ClientID", title: "Release 4", artist: "Artist 4", catNo: "ID 4" };
          Release.importRelease(newRelease, release.clientId, function(err, result) {
            expect(result.title).to.eq("Release 4")
            expect(result.artist).to.eq("Artist 4")
            expect(result.catNo).to.eq("ID 4")
          });
        });
      });
      describe("when catNo is not present", function() {
      	it("should return an error to the callback stating that an catNo is required", function() {
          var newRelease = { _id: "", title: "Release 1", artist: "Artist 1"};
           Release.importRelease(newRelease, release.clientId, function(err, result) {
            expect(err).to.eq("CatNo must be passed")
          });
        });
      	it("should not create a new Release", function() {
          var newRelease = { _id: "", title: "Release 1", artist: "Artist 1"};
           Release.importRelease(newRelease, release.clientId, function(err, result) {
            expect(err).to.eq("CatNo must be passed")
          });
        });
      })
    });
  });
  describe("when not passed an object", function() {
    it("should return an error in the callback stating it must be passed an object", function() {
      Release.importRelease(null, release.clientId, function(err, result) {
        expect(err).to.eq("Release must be passed")
      });
    });
  });
});

describe("importReleases", function() {
  describe("when passed an array", function() {
    var releases = [
      { _id: "", title: "Release 1", artist: "Artist 1", catNo: "ID1" },
      {_id: ""}
    ]
    it("should call importRelease for each release passed", function() {
      Release.importReleases(releases, release.clientId, function(err, result) {
        expect(err).to.eq(null);
      });
    });
    var releases = [
      { _id: "", title: "Release 1", artist: "Artist 1", catNo: "ID1" },
      { _id: "", title: "Release 1", artist: "Artist 1"},
      {_id: ""}
    ]
    it("should add each returned error from importRelease to the errors array", function() {
      Release.importReleases(releases, release.clientId, function(err, result) {
        expect(err.length).to.eq(1);
      });
    });
    it("should add each returned release from importRelease to the imported array", function() {
      Release.importReleases(releases, release.clientId, function(err, result) {
        expect(result.length).to.eq(releases.length);
      });
    });;
  });
  describe("when not passed an array", function() {
    var releases = { _id: "123", title: "Release 1", artist: "Artist 1", catNo: "ID1" };
    it("should return an error in the callback stating it must be passed an array", function() {
      Release.importReleases(releases, release.clientId, function(err, result) {
        expect(err).to.eq("Data must be an Array");
      });
    });
  });
  describe("when not passed a clientId", function() {
    var releases = [
      { _id: "123", title: "Release 1", artist: "Artist 1", catNo: "ID1" },
      { _id: "123", title: "Release 1", artist: "Artist 1", catNo: "ID1" },
      { _id: "123", title: "Release 1", artist: "Artist 1", catNo: "ID1" },
      {_id: ""}
    ]
    it("should return an error in the callback stating it must be passed a client ID", function() {
      Release.importReleases(releases, null, function(err, result) {
        expect(err).to.eq("A Client ID must be passed");
      });
    });
  });
});

describe("release", function() {
	before(function() {
		release.save();
	});
	describe("#userForbidden", function() {
		describe("when action is read", function() {
			var action = "read";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds math", function() {
					var user = { internal: false, parentId: null, clientId: release.clientId, payeeId: null };
					expect(release.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(release.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has a clientId and a payeeId (is a payee user)", function() {
				it("should return false when contractIds match", function() {
					var user = { internal: false, parentId: null, clientId: release.clientId, payeeId: "123", contractIds: [contractId, "12345678"] };
					release.salesReturnsRights = [{ contractId: contractId }];
					expect(release.userForbidden(user, action)).to.be.false;
				});
				it("should return true when contractIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: release.clientId, payeeId: "123", contractIds: ["12345678"] };
					expect(release.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(release.userForbidden(user, action)).to.be.true;
				});
			});
		});
		describe("when action is write", function() {
			var action = "write";
			describe("when user has a clientId but not a payeeId (is a client user)", function() {
				it("should return false when clientIds math", function() {
					var user = { internal: false, parentId: null, clientId: release.clientId, payeeId: null };
					expect(release.userForbidden(user, action)).to.be.false;
				});
				it("should return true when clientIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
					expect(release.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when uesr has a clientId and a payeeId (is a payee user)", function() {
				it("should return true when contractIds match", function() {
					var user = { internal: false, parentId: null, clientId: release.clientId, payeeId: "123", contractIds: [contractId, "12345678"] };
					expect(release.userForbidden(user, action)).to.be.true;
				});
				it("should return true when contractIds do not match", function() {
					var user = { internal: false, parentId: null, clientId: release.clientId, payeeId: "123", contractIds: ["12345678"] };
					expect(release.userForbidden(user, action)).to.be.true;
				});
			});
			describe("when user has no clientId", function() {
				it("should return true when clientIds do not match", function() {
					var user = { internal: true, parentId: null, clientId: null, payeeId: null };
					expect(release.userForbidden(user, action)).to.be.true;
				});
			});
		});
	});
	describe("#containsContractIds", function() {
		describe("when passed an array", function() {
			var contractId = "ContractId";
			var contractIds = [contractId, "somethingElse"];
			describe("when release has contractId within salesReturnsRights", function() {
				it("should return true", function(done) {
					release.salesReturnsRights = [{ contractId: contractId }];
					release.costsRights = [];
					release.containsContractIds(contractIds, function(val) {
						expect(val).to.be.true;
						done();
					});
				});
			});
			describe("when release has contractId within costsRights", function() {
				it("should return true", function(done) {
					release.salesReturnsRights = [];
					release.costsRights = [{ contractId: contractId }];;
					release.containsContractIds(contractIds, function(val) {
						expect(val).to.be.true;
						done();
					});
				});
			});
			describe("when release does not have contractId within either salesReturnsRights or costsRights", function() {
				it("should return false", function(done) {
					release.salesReturnsRights = [];
					release.costsRights = [];
					release.containsContractIds(contractIds, function(val) {
						expect(val).to.be.false;
						done();
					});
				});
			});
		});
		describe("when not passed an array", function() {
			it("should return false", function(done) {
				release.salesReturnsRights = [];
				release.costsRights = [];
				release.containsContractIds(null, function(val) {
					expect(val).to.be.false;
					done();
				});
			});
		});
	});
	describe("#contractIds", function() {
		it("should return an array", function(done) {
			release.contractIds(function(ids) {
				expect(ids).to.be.an('array');
				done();
			});
		});
		describe("when release has salesReturnsRights", function() {
			it("should include the contractId from each object in salesReturnsRights", function(done) {
				release.salesReturnsRights = [{ contractId: contractId }];
				release.costsRights = [];
				release.contractIds(function(ids) {
					expect(ids).to.deep.eq([contractId]);
					done();
				});
			});
		});
		describe("when release has costsRights", function() {
			it("should include the contractId from each object in costsRights", function(done) {
				release.salesReturnsRights = [];
				release.costsRights = [{ contractId: contractId }];
				release.contractIds(function(ids) {
					expect(ids).to.deep.eq([contractId]);
					done();
				});
			});
		});
		describe("when release has neither salesReturnsRights or costsRights", function() {
			it("should return a blank array", function(done) {
				release.salesReturnsRights = [];
				release.costsRights = [];
				release.contractIds(function(ids) {
					expect(ids).to.be.an('array');
					done();
				});
			});
		});
	});
});