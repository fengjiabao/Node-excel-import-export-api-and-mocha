process.env.NODE_ENV = 'test';
var expect = require("chai").expect;
var Campaign = require("../../models/campaign.js");
var Release = require("../../models/release.js");
var Track = require("../../models/track.js");
var Work = require("../../models/work.js");
var sinon = require('sinon');

require('../../models/db');

var contractId = "ContractID";
var fields = {
  clientId: "ClientID",
  contractId: contractId,
  title: "Title",
  artist: "Artist",
  identifier: "ID",
  releaseIds: [1, 2, 3],
  trackIds: [4, 5, 6],
  workIds: [7, 8, 9]
}
var campaign = new Campaign(fields);
campaign.save();
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
fields = {
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
  campaignIds: ["campaignIDs"],
}
var track = new Track(fields);

fields = {
  clientId: "ClientID",
  title: "Title",
  composer: "Composer",
  identifier: "identifier",
  salesReturnsRights: ["Sales Rights"],
  costsRights: ["Costs"],
  aliases: ["Aliases"],
  campaignIds: ["Campaigns"]
}
var work = new Work(fields);

describe("Campaign", function() {

  // Fields
  describe("fields", function() {
    it("should have a clientId parameter", function() {
      expect(campaign).to.have.a.property("clientId", "ClientID");
    });
    it("should have a contractId parameter", function() {
      expect(campaign).to.have.a.property("contractId", "ContractID");
    });
    it("should have a title parameter", function() {
      expect(campaign).to.have.a.property("title", "Title");
    });
    it("should have an artist parameter", function() {
      expect(campaign).to.have.a.property("artist", "Artist");
    });
    it("should have an identifier parameter", function() {
      expect(campaign).to.have.a.property("identifier", "ID");
    });
    it("should have a releaseIds parameter", function() {
      expect(campaign.releaseIds).to.be.an('array');
    });
    it("should have a trackIds parameter", function() {
      expect(campaign.trackIds).to.be.an('array');
    });
    it("should have a workIds parameter", function() {
      expect(campaign.workIds).to.be.an('array');
    });
  });

  describe("multipleCampaignsForXlsx", function() {
    describe("when passed an array", function() {
      var campaigns = [campaign];
      before(function(done) {
        var release = new Release({ catNo: "123" });
        release.save();
        var track = new Track({ isrc: "ISRC" });
        track.save();
        var work = new Work({ identifier: "ID" });
        work.save();
        campaign.releaseIds = [release._id];
        campaign.trackIds = [track._id];
        campaign.workIds = [work._id];
        campaign.save();
        done();
      });
      it("should not return an error", function(done) {
        console.log(campaigns);
        Campaign.multipleCampaignsForXlsx(campaigns, function(err, mappedData) {
          expect(err).to.eq(null);
          done();
        });
      });
      it("should return an array", function(done) {
        Campaign.multipleCampaignsForXlsx(campaigns, function(err, mappedData) {
          expect(mappedData instanceof Array).to.be.true;
          done();
        });
      });
      it("should call exportData for each releaseId, trackId and workId", function(done) {
        var spy = sinon.spy(campaign, "exportData");
        Campaign.multipleCampaignsForXlsx(campaigns, function(err, mappedData) {
          expect(spy.callCount).to.eq(3);
          done();
        });
        after(function() {
          spy.restore();
        });
      });
      it("should add the returned value from exportData to the returned array", function(done) {
        Campaign.multipleCampaignsForXlsx(campaigns, function(err, mappedData) {
          expect(mappedData.length).to.eq(campaign.releaseIds.length + campaign.trackIds.length + campaign.workIds.length);
          done();
        });
      });
      it("should add a single line if the campaign has no associated releases, tracks or works", function(done) {
        var newCampaign = new Campaign({ title: "Campaign" });
        Campaign.multipleCampaignsForXlsx([newCampaign], function(err, mappedData) {
          expect(mappedData.length).to.eq(1);
          done();
        });
      });
    });
    describe("when not passed an array", function() {
      it("should return an error in the callback stating it must be passed an array", function(done) {
        Campaign.multipleCampaignsForXlsx(null, function(err, mappedData) {
          expect(err).to.eq("Must be passed an Array of Campaigns");
          done();
        });
      });
    })
  });
});

describe("getReferenceData", function() {
  it("should add the value to array if it's not in the array", function(done) {
    Campaign.getReferenceData(Campaign, {clientId: campaign.clientId}, campaign.releaseIds, function(err, result){
      expect(campaign.releaseIds.length).to.above(3);
      done();
    });
  });
});

describe("importCampaign", function() {
  // Find using the ID or identifier
  describe("when passed an object", function() {
    describe("when _id is present", function() {
      it("should call find with the passed _id and clientId", function() {
        var spy = sinon.spy(Campaign, "findOne");
        Campaign.importCampaign(campaign, campaign.clientId, function(err, result) {
          expect(spy.called).to.be.true;
          spy.restore();
        });
      });
      describe("when a campaign is found", function() {
        it("should update the campaign with the passed fields", function() {
          var newCampaign = { _id: "", clientId: "ClientID", title: "Campaign 1", artist: "Artist 1", identifier: "ID" };
          Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
            expect(result.title).to.eq('Campaign 1');
            expect(result.artist).to.eq('Artist 1');
          });
        });
      });
      describe("when a campaign is not found", function() {
        it("should create a new campaign", function() {
          var newCampaign = { _id: "", clientId: "ClientID", title: "Campaign 1", artist: "Artist 1", identifier: "ID 1" };
          Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
            expect(result.identifier).to.eq("ID 1");
            expect(result.clientId).to.eq("ClientID");
            expect(result.title).to.eq("Campaign 1");
            expect(result.artist).to.eq("Artist 1");
          });
        });
      });
    });
    describe("when _id is not present", function() {
      describe("when identifier is present", function() {
        it("should call find with the passed identifier and clientId", function() {
          var newCampaign = { _id: "", clientId: "ClientID", title: "Campaign 2", artist: "Artist 2", identifier: "ID" };
          var spy = sinon.spy(Campaign, "findOne");
          Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
            expect(spy.called).to.be.true;
            spy.restore();
          });
        });
        describe("when a campaign is found by the identifier", function() {
        	it("should update the found campaign with the passed fields", function() {
            var newCampaign = { _id: "", clientId: "ClientID", title: "Campaign 2", artist: "Artist 2", identifier: "ID" };
            Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
              expect(result.title).to.eq('Campaign 2');
              expect(result.artist).to.eq('Artist 2');
            });
          });
        });
        describe("when a campaign is not found by the identifier", function() {
        	it("should create a new campaign", function() {
            var newCampaign = { _id: "", clientId: "ClientID", title: "Campaign 3", artist: "Artist 3", identifier: "ID 3" };
            Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
              expect(result.title).to.eq('Campaign 3');
              expect(result.artist).to.eq('Artist 3');
              expect(result.identifier).to.eq('ID 3');
            });
          });
        });
        it("should set the passed fields to the Campaign", function() {
          var newCampaign = { _id: "", clientId: "ClientID", title: "Campaign 4", artist: "Artist 4", identifier: "ID 4" };
          Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
            expect(result.title).to.eq("Campaign 4")
            expect(result.artist).to.eq("Artist 4")
            expect(result.identifier).to.eq("ID 4")
          });
        });
        describe("when a releaseCatNo is present", function() {
          var spy
          before(function () {
            spy = sinon.spy(Campaign, "getReferenceData");
          });
          after(function () {
            spy.restore();
          });
          it("should call getReferenceData with the passed releaseCatNo and clientId", function() {
            var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", releaseCatNo: "CATNO" };
            Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
              expect(spy.callCount).to.eq(1);
            });
          });
          it("should call Release.find with the passed releaseCatNo and clientId", function() {
            var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", releaseCatNo: "CATNO" };
            var spy = sinon.spy(Release, "findOne");
            Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
              expect(spy.callCount).to.eq(1);
            });
          });
          describe("when a release is found", function() {
            it("should add the release's ID to campaign.releaseIds", function() {
              var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", releaseCatNo: "CATNO" };
              Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
                expect(result.releaseIds.length).to.eq(1)
              });
            });
          });
          describe("when a release is not found", function() {
            it("should do nothing", function() {
              var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", releaseCatNo: "CATNO1" };
              Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
                expect(result.releaseIds.length).to.eq(0)
              });
            });
          });
        });
        describe("when a trackIsrd is present", function() {
          var spy
          before(function () {
            spy = sinon.spy(Campaign, "getReferenceData");
          });
          after(function () {
            spy.restore();
          });
          it("should call getReferenceData with the passed trackIsrd and clientId", function() {
            var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", trackIsrc: "ISRC" };
            Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
              expect(spy.callCount).to.eq(1);
            });
          });
          it("should call Track.find with the passed trackIsrd and clientId", function() {
            var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", trackIsrc: "ISRC" };
            var spy = sinon.spy(Track, "findOne");
            Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
              expect(spy.callCount).to.eq(1);
            });
          });
          describe("when a track is found", function() {
            it("should add the track's ID to campaign.trackIds", function() {
              var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", trackIsrc: "ISRC" };
              Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
                expect(result.trackIds.length).to.eq(1)
              });
            });
          });
          describe("when a track is not found", function() {
            it("should do nothing", function() {
              var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", trackIsrc: "ISRC0" };
              Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
                expect(result.trackIds.length).to.eq(0)
              });
            });
          });
        });
        describe("when a workIdentifier is present", function() {
          var spy
          before(function () {
            spy = sinon.spy(Campaign, "getReferenceData");
          });
          after(function () {
            spy.restore();
          });
          it("should call getReferenceData with the passed workIdentifier and clientId", function() {
            var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", workIdentifer: "identifier" };
            Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
              expect(spy.callCount).to.eq(1);
            });
          });
          it("should call Work.find with the passed workIdentifier and clientId", function() {
            var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", workIdentifer: "identifier" };
            var spy = sinon.spy(Work, "findOne");
            Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
              expect(spy.callCount).to.eq(1);
            });
          });
          describe("when a work is found", function() {
            it("should add the work's ID to campaign.workIds", function() {
              var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", workIdentifer: "identifier" };
              Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
                expect(result.workIds.length).to.eq(1)
              });
            });
          });
          describe("when a work is not found", function() {
            it("should do nothing", function() {
              var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1", workIdentifer: "identifier1" };
              Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
                expect(result.workIds.length).to.eq(0)
              });
            });
          });
        });
      });
      describe("when identifier is not present", function() {
      	it("should return an error to the callback stating that an identifier is required", function() {
          var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1"};
          Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
            expect(err).to.eq("Identifier must be passed")
          });
        });
      	it("should not create a new Campaign", function() {
          var newCampaign = { _id: "", title: "Campaign 1", artist: "Artist 1"};
          Campaign.importCampaign(newCampaign, campaign.clientId, function(err, result) {
            expect(err).to.eq("Identifier must be passed")
          });
        });
      })
    });
  });
  describe("when not passed an object", function() {
    it("should return an error in the callback stating it must be passed an object", function() {
      Campaign.importCampaign(null, campaign.clientId, function(err, result) {
        expect(err).to.eq("Campaign must be passed")
      });
    });
  });
});

describe("importCampaigns", function() {
  describe("when passed an array", function() {
    var campaigns = [
      { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1" },
      {_id: ""}
    ]
    it("should call importCampaign for each campaign passed", function() {
      Campaign.importCampaigns(campaigns, campaign.clientId, function(err, result) {
        expect(err).to.eq(null);
      });
    });
    var campaigns = [
      { _id: "", title: "Campaign 1", artist: "Artist 1", identifier: "ID1" },
      { _id: "", title: "Campaign 1", artist: "Artist 1"},
      {_id: ""}
    ]
    it("should add each returned error from importCampaign to the errors array", function() {
      Campaign.importCampaigns(campaigns, campaign.clientId, function(err, result) {
        expect(err.length).to.eq(1);
      });
    });
    it("should add each returned campaign from importCampaign to the imported array", function() {
      Campaign.importCampaigns(campaigns, campaign.clientId, function(err, result) {
        expect(result.length).to.eq(campaigns.length);
      });
    });;
  });
  describe("when not passed an array", function() {
    var campaigns = { _id: "123", title: "Campaign 1", artist: "Artist 1", identifier: "ID1" };
    it("should return an error in the callback stating it must be passed an array", function() {
      Campaign.importCampaigns(campaigns, campaign.clientId, function(err, result) {
        expect(err).to.eq("Data must be an Array");
      });
    });
  });
  describe("when not passed a clientId", function() {
    var campaigns = [
      { _id: "123", title: "Campaign 1", artist: "Artist 1", identifier: "ID1" },
      { _id: "123", title: "Campaign 1", artist: "Artist 1", identifier: "ID1" },
      { _id: "123", title: "Campaign 1", artist: "Artist 1", identifier: "ID1" },
      {_id: ""}
    ]
    it("should return an error in the callback stating it must be passed a client ID", function() {
      Campaign.importCampaigns(campaigns, null, function(err, result) {
        expect(err).to.eq("A Client ID must be passed");
      });
    });
  });
});

describe("campaign", function() {
  before(function() {
    campaign.save();
  });
  describe("#userForbidden", function() {
    describe("when action is read", function() {
      var action = "read";
      describe("when user has a clientId but not a payeeId (is a client user)", function() {
        it("should return false when clientIds math", function() {
          var user = { internal: false, parentId: null, clientId: campaign.clientId, payeeId: null };
          expect(campaign.userForbidden(user, action)).to.be.false;
        });
        it("should return true when clientIds do not match", function() {
          var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
          expect(campaign.userForbidden(user, action)).to.be.true;
        });
      });
      describe("when user has a clientId and a payeeId (is a payee user)", function() {
        it("should return false when contractIds match", function() {
          var user = { internal: false, parentId: null, clientId: campaign.clientId, payeeId: "123", contractIds: [contractId, "12345678"] };
          expect(campaign.userForbidden(user, action)).to.be.false;
        });
        it("should return true when contractIds do not match", function() {
          var user = { internal: false, parentId: null, clientId: campaign.clientId, payeeId: "123", contractIds: ["12345678"] };
          expect(campaign.userForbidden(user, action)).to.be.true;
        });
      });
      describe("when user has no clientId", function() {
        it("should return true when clientIds do not match", function() {
          var user = { internal: true, parentId: null, clientId: null, payeeId: null };
          expect(campaign.userForbidden(user, action)).to.be.true;
        });
      });
    });
    describe("when action is write", function() {
      var action = "write";
      describe("when user has a clientId but not a payeeId (is a client user)", function() {
        it("should return false when clientIds math", function() {
          var user = { internal: false, parentId: null, clientId: campaign.clientId, payeeId: null };
          expect(campaign.userForbidden(user, action)).to.be.false;
        });
        it("should return true when clientIds do not match", function() {
          var user = { internal: false, parentId: null, clientId: "anything else", payeeId: null };
          expect(campaign.userForbidden(user, action)).to.be.true;
        });
      });
      describe("when uesr has a clientId and a payeeId (is a payee user)", function() {
        it("should return true when contractIds match", function() {
          var user = { internal: false, parentId: null, clientId: campaign.clientId, payeeId: "123", contractIds: [contractId, "12345678"] };
          expect(campaign.userForbidden(user, action)).to.be.true;
        });
        it("should return true when contractIds do not match", function() {
          var user = { internal: false, parentId: null, clientId: campaign.clientId, payeeId: "123", contractIds: ["12345678"] };
          expect(campaign.userForbidden(user, action)).to.be.true;
        });
      });
      describe("when user has no clientId", function() {
        it("should return true when clientIds do not match", function() {
          var user = { internal: true, parentId: null, clientId: null, payeeId: null };
          expect(campaign.userForbidden(user, action)).to.be.true;
        });
      });
    });
  });

  describe("#exportData", function() {
    it("should return an array", function() {
      expect(campaign.exportData() instanceof Array).to.be.true;
    });
    it("should include specified values", function() {
      var releaseId = "release",
        trackId = "track",
        workId = "work";
      expect(campaign.exportData(releaseId, trackId, workId)).to.eql([campaign._id.toString(), campaign.title, campaign.artist, campaign.identifier, releaseId, trackId, workId]);
    });
  });
});
