var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
var async = require('async');
var Release = require('./release');
var Track = require('./track');
var Work = require('./work');

var campaignSchema = new Schema({
  clientId: String,
  contractId: String,
  title: String,
  artist: String,
  identifier: String,
  releaseIds: Array,
  trackIds: Array,
  workIds: Array
}, {
  timestamps: true
});

campaignSchema.plugin(mongoosePaginate);

campaignSchema.methods.userForbidden = function(user, readWrite) {
  if(user.clientId == this.clientId && !user.payeeId) {
    // Write only should be client only
    return false;
  } else if(readWrite == "read" && user.clientId == this.clientId && user.contractIds && user.contractIds.indexOf(this.contractId) != -1) {
    // Payee allowed to read
    return false;
  } else {
    return true;
  }
}

campaignSchema.methods.exportData = function(releaseId, trackId, workId) {
  return [
    this._id.toString(),
    this.title,
    this.artist,
    this.identifier,
    releaseId,
    trackId,
    workId
  ]
}

var Campaign = mongoose.model('Campaign', campaignSchema);


// Build data for Excel template
var multipleCampaignsForXlsx = function(campaigns, callback) {
  if(campaigns instanceof Array) {
    var convertedCampaigns = [];
    async.each(campaigns, function(campaign, cb) {
      if(campaign.releaseIds.length + campaign.trackIds.length + campaign.workIds.length == 0) {
        // Add Campaign if not associated IDs
      	convertedCampaigns.push(campaign.exportData());
      	cb();
      } else {
        // Should be one line for each releaseId, trackId and workId
        // Releases
        async.each(campaign.releaseIds, function(releaseId, releaseCb) {
          Release.findById(releaseId, function(err, release) {
            if(release) { convertedCampaigns.push(campaign.exportData(release.catNo, null, null)); }
            releaseCb();
          })
        }, function() {
          // Tracks
          async.each(campaign.trackIds, function(trackId, trackCb) {
            Track.findById(trackId, function(err, track) {
              if(track) { convertedCampaigns.push(campaign.exportData(null, track.isrc, null)); }
              trackCb();
            })
          }, function() {
            // Works
            async.each(campaign.workIds, function(workId, workCb) {
              Work.findById(workId, function(err, work) {
                if(work) { convertedCampaigns.push(campaign.exportData(null, null, work.identifier)); }
                workCb();
              })
            }, function() {
              cb();
            });
          });
        });
      }
    }, function(err) {
      if(err) {
        callback(err, null);
      } else {
        callback(null, convertedCampaigns);
      }
    });
  } else {
    callback("Must be passed an Array of Campaigns", null);
  }
}

var getReferenceData = function(obj, query, resultArr, cb) {
  obj.findOne(query, function(err, data) {
    if (data && resultArr.indexOf(data._id) < 0) {
      resultArr.push(data._id);
    }
    cb();
  });
}

var importCampaign = function(data, clientId, callback) {
  var query = null;
  if (!data) {
    return callback("Campaign must be passed", null);
  }
  if (data._id && data._id != '') {
    query = {_id: data._id};
  } else {
    if (data.identifier) {
      query = {clientId: clientId, identifier: data.identifier};
    } else {
      return callback("Identifier must be passed", null);
    }
  }
  Campaign.findOne(query, function(err, campaign) {
    if(err) {
      callback(err, null);
    }
    if (!campaign) {
      campaign = new Campaign({
        clientId: clientId,
        title: data.title,
        artist: data.artist,
        identifier: data.identifier,
        releaseIds: [],
        trackIds: [],
        workIds: []
      });
    } else {
      campaign.title = data.title;
      campaign.artist = data.artist;
    }

    var asyncArrs = [];
    if (data.releaseCatNo && data.releaseCatNo != '') {
      asyncArrs.push(function (cb) {
        getReferenceData(Release, {catNo: data.releaseCatNo, clientId: clientId}, campaign.releaseIds, cb);
      });
    }
    if (data.trackIsrc && data.trackIsrc != '') {
      asyncArrs.push(function (cb) {
        getReferenceData(Track, {isrc: data.trackIsrc, clientId: clientId}, campaign.trackIds, cb);
      });
    }
    if (data.workIdentifer && data.workIdentifer != '') {
      asyncArrs.push(function (cb) {
        getReferenceData(Work, {identifier: data.workIdentifer, clientId: clientId}, campaign.workIds, cb);
      });
    }
    async.parallel(asyncArrs, function(err, data) {
      campaign.save(function(err, campaign) {
        if(err) {
          callback(err, null);
        } else {
          callback(null, campaign);
        }
      });
    });
  });
}

var importCampaigns = function(campaigns, clientId, callback) {
  if(Object.prototype.toString.call( campaigns ) !== '[object Array]') {
    callback("Data must be an Array", null);
  } else if(!clientId) {
    callback("A Client ID must be passed", null);
  } else {
    var importedCampaigns = [], errors = [];
    campaigns.pop();
    async.forEachOf(campaigns, function(campaign, index, cb) {
      importCampaign(campaign, clientId, function(err, importedCampaign) {
        if(err) { errors.push(err); }
        if(importedCampaign) { importedCampaigns.push(importedCampaign); }
        cb();
      });
    }, function(err) {
      if(err) {
        callback(err, null);
      } else {
        callback(errors, importedCampaigns);
      }
    });
  }
}

module.exports = Campaign;
module.exports.multipleCampaignsForXlsx = multipleCampaignsForXlsx;
module.exports.importCampaigns = importCampaigns;
module.exports.importCampaign = importCampaign;
module.exports.getReferenceData = getReferenceData;