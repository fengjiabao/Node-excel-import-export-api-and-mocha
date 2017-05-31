var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
var async = require('async');
var Track = require('./track');

var rightsSchema = new Schema({
	contractId: String,
	percentage: Number
});

var releaseSchema = new Schema({
	clientId: String,
	campaignIds: Array,
	title: String,
	version: String,
	artist: String,
	catNo: String,
	barcode: String,
	releaseDate: Date,
	format: String,
	priceCategory: String,
	dealerPrice: Number,
	mcpsId: String,
	exemptFromMechanicals: Boolean,
	salesReturnsRights: [rightsSchema],
	costsRights: [rightsSchema],
	aliases: Array,
	trackIds: Array
}, { 
	timestamps: true 
});

releaseSchema.plugin(mongoosePaginate);

releaseSchema.methods.userForbidden = function(user, readWrite) {
	var containsContractIds = false;
	this.containsContractIds(user.contractIds, function(contains) {
		containsContractIds = contains;
	});
	if(user.clientId == this.clientId && !user.payeeId) {
		// Write only should be client only
		return false;
	} else if(readWrite == "read" && user.clientId == this.clientId && user.payeeId && containsContractIds) {
		// Payee allowed to read
		return false;
	} else {
		return true;
	}
}

releaseSchema.methods.containsContractIds = function(passedContractIds, callback) {
	if(passedContractIds) {
		this.contractIds(function(releaseContractIds) {
			var value = false;
			passedContractIds.forEach(function(passedContractId, cb) {
				if(releaseContractIds.indexOf(passedContractId) != -1) { 
					value = true;
				}
				if(passedContractId == passedContractIds[passedContractIds.length - 1]) { 
					callback(value);
				}
			});
		});
	} else {
		callback(false);
	}
}

releaseSchema.methods.contractIds = function(callback) {
	var array = [];
	this.salesReturnsRights.forEach(function(contractId) {
		array.push(contractId.contractId);
	});
	this.costsRights.forEach(function(contractId) {
		array.push(contractId.contractId);
	});
	callback(array);
}

releaseSchema.methods.exportData = function(exemptFromMechanicals, aliases, track_id, track_title, track_version, track_artist, track_isrc, track_pLine, track_aliases) {
  return [
    this._id.toString(),
    this.title,
    this.version,
    this.artist,
    this.catNo,
    this.barcode,
    this.releaseDate,
    this.format,
    this.priceCategory,    
    Number(this.dealerPrice),
    this.mcpsId,
    exemptFromMechanicals,
    aliases,
    track_id.toString(),
    track_title,
    track_version,
    track_artist,
    track_isrc,
    track_pLine,
    track_aliases
  ]
}

var Release = mongoose.model('Release', releaseSchema);

// Build data for Excel template
var multipleReleasesForXlsx = function(releases, callback) {
  if(releases instanceof Array) {
    var convertedReleases = [];
    async.each(releases, function(release, cb) {
      var exemptFromMechanicals = 'FALSE';
      if( release.exemptFromMechanicals == true ) {
        exemptFromMechanicals = 'TRUE';
      }
      var aliases = '';
      if( release.aliases.length > 0 ) {
        release.aliases.forEach(function(temp){
          aliases += temp + ';';
        });
      }
      if(release.trackIds.length < 0) {
        // Add Rlease if not associated IDs
      	convertedReleases.push(release.exportData(exemptFromMechanicals, aliases, '', '', '', '', '', '', ''));
      	cb();
      } else {
        // Should be one line for each trackId
        async.each(release.trackIds, function(trackId, trackCb) {
          Track.findById(trackId, function(err, track) {
            if(track) {
              var track_aliases = '';
              if( track.aliases.length > 0 ) {
                track.aliases.forEach(function(temp){
                  track_aliases += temp + ';';
                });
              }
              convertedReleases.push(release.exportData(exemptFromMechanicals, aliases, track._id, track.title, track.version, track.artist, track.isrc, track.pLine, track_aliases)); 
            }
            trackCb();
          })
        }, function() {
          cb();
        });
      }
    }, function(err) {
      if(err) {
        callback(err, null);
      } else {
        callback(null, convertedReleases);
      }
    });
  } else {
    callback("Must be passed an Array of Releases", null);
  }
}

var importRelease = function(data, clientId, callback) {
  var query = null;
  if (!data) {
    return callback("Release must be passed", null);
  }
  if (data._id && data._id != '') {
    query = {_id: data._id};
  } else {
    if (data.catNo) {
      query = {clientId: clientId, catNo: data.catNo};
    } else {
      return callback("CatNo must be passed", null);
    }
  }
  Release.findOne(query, function(err, release) {
    if(err) {
      callback(err, null);
    }
    var aliases = [];
    if( data.aliases && data.aliases != '' ){
      aliases = data.aliases.split(";");
    }
    var exemptFromMechanicals = false;
    if( data.exemptFromMechanicals && data.exemptFromMechanicals != '' && data.exemptFromMechanicals == 'TRUE' ) {
      exemptFromMechanicals = true;
    }
    if (!release) {
      release = new Release({
        clientId: clientId,
        title: data.title,
        version: data.version,
        artist: data.artist,
        catNo: data.catNo,
        barcode: data.barcode,
        releaseDate: data.releaseDate,
        format: data.format,
        priceCategory: data.priceCategory,
        dealerPrice: Number(data.dealerPrice),
        mcpsId: data.mcpsId,
        exemptFromMechanicals: exemptFromMechanicals,
        aliases: aliases,
        trackIds: []
      });
    } else {
      release.title = data.title;
      release.version = data.version;
      release.artist = data.artist;
      release.barcode = data.barcode;
      release.releaseDate = data.releaseDate;
      release.format = data.format;
      release.priceCategory = data.priceCategory;
      release.dealerPrice = Number(data.dealerPrice);
      release.mcpsId = data.mcpsId;
      release.exemptFromMechanicals = exemptFromMechanicals;
      release.aliases = aliases;
    }

    if (data.track_isrc && data.track_isrc != '') {
      Track.importTrack(data, clientId, function(err, importedTrack) {
        if(err) { 
          callback(err, null);
        } else {
          if (importedTrack._id && release.trackIds.indexOf(importedTrack._id) < 0) {
            release.trackIds.push(importedTrack._id);
console.log(release);
            release.save(function(err, release) {
              if(err) {
                callback(err, null);
              } else {
                callback(null, release);
              }
            });
          } else {
            callback(null, release);
          }
        }
      });
    }
  });
}

var importReleases = function(releases, clientId, callback) {
  if(Object.prototype.toString.call( releases ) !== '[object Array]') {
    callback("Data must be an Array", null);
  } else if(!clientId) {
    callback("A Client ID must be passed", null);
  } else {
    var importedReleases = [], errors = [];
    releases.pop();
    async.forEachOf(releases, function(release, index, cb) {
      importRelease(release, clientId, function(err, importedRelease) {
        if(err) { errors.push(err); }
        if(importedRelease) { importedReleases.push(importedRelease); }
        cb();
      });
    }, function(err) {
      if(err) {
        callback(err, null);
      } else {
        callback(errors, importedReleases);
      }
    });
  }
}

module.exports = Release;
module.exports.multipleReleasesForXlsx = multipleReleasesForXlsx;
module.exports.importReleases = importReleases;
module.exports.importRelease = importRelease;