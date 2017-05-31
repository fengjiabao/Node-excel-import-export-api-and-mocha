var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
var async = require('async');

var rightsSchema = new Schema({
	contractId: String,
	percentage: Number
});

var trackSchema = new Schema({
	clientId: String,
	campaignIds: Array,
	title: String,
	version: String,
	artist: String,
	isrc: String,
	pLine: String,
	salesReturnsRights: [rightsSchema],
	costsRights: [rightsSchema],
	aliases: Array,
	releaseIds: Array,
	workIds: Array
}, { 
	timestamps: true 
});

trackSchema.plugin(mongoosePaginate);

trackSchema.methods.userForbidden = function(user, readWrite) {
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

trackSchema.methods.containsContractIds = function(passedContractIds, callback) {
	if(passedContractIds) {
		this.contractIds(function(trackContractIds) {
			var value = false;
			passedContractIds.forEach(function(passedContractId, cb) {
				if(trackContractIds.indexOf(passedContractId) != -1) { 
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

trackSchema.methods.contractIds = function(callback) {
	var array = [];
	this.salesReturnsRights.forEach(function(contractId) {
		array.push(contractId.contractId);
	});
	this.costsRights.forEach(function(contractId) {
		array.push(contractId.contractId);
	});
	callback(array);
}

trackSchema.methods.exportData = function(aliases) {
  return [
  	this._id.toString(),
    this.title,
    this.version,
    this.artist,
    this.isrc,
    this.pLine,
    aliases
  ]
}

var Track = mongoose.model('Track', trackSchema);


// Build data for Excel template
var convertTracksForXlsx = function(tracks, callback) {
  if(tracks instanceof Array) {
    var convertedTracks = [];
    async.each(tracks, function(track, cb) {
    	var aliases = '';
		if( track.aliases.length > 0 ) {
			track.aliases.forEach(function(temp){
				aliases += temp + ';';
			});
		}
		convertedTracks.push(track.exportData(aliases));
		cb();
    }, function(err) {
		if(err) {
			callback(err, null);
		} else {
			callback(null, convertedTracks);
		}
    });
  } else {
    callback("Must be passed an Array of Tracks", null);
  }
}

var importTrack = function(data, clientId, callback) {
  var query = null;
  if (!data) {
    return callback("Track must be passed", null);
  }
  if ( data.track_id && data.track_id != '' ) {
    query = {_id: data.track_id};
  } else if( data._id && data._id != '' ){
  	query = {_id: data._id};
  } else {
    if (data.track_isrc) {
      query = {clientId: clientId, isrc: data.track_isrc};
    } else if(data.isrc) {
    	query = {clientId: clientId, isrc: data.isrc};
    } else {
      return callback("Isrc must be passed", null);
    }
  }
  Track.findOne(query, function(err, track) {
    if(err) {
      callback(err, null);
    }
    var aliases = [];
    if( data.track_aliases && data.track_aliases != '' ){
    	aliases = data.track_aliases.split(";");
    } else if( data.aliases && data.aliases != '' ){
    	aliases = data.aliases.split(";");
    }

    if (!track) {
      track = new Track({
        clientId: clientId,
        title: (data.track_title != null ? data.track_title : data.title),
        version: (data.track_version != null ? data.track_version : data.version),
        artist: (data.track_artist != null ? data.track_artist : data.artist),
        isrc: (data.track_isrc != null ? data.track_isrc : data.isrc),
        pLine: (data.track_pLine != null ? data.track_pLine : data.pLine),
        salesReturnsRights: [],
        costsRights: [],
        aliases: aliases,
        releaseIds: [],
        workIds: []
      });
    } else {
      track.title = (data.track_title != null ? data.track_title : data.title);
      track.version = (data.track_version != null ? data.track_version : data.version);
      track.artist = (data.track_artist != null ? data.track_artist : data.artist);
      track.pLine = (data.track_artist != null ? data.track_artist : data.pLine);
      track.aliases = aliases;
    }

	track.save(function(err, track) {
		if(err) {
		  callback(err, null);
		} else {
		  callback(null, track);
		}
	});
  });
}

var importTracks = function(tracks, clientId, callback) {
  if(Object.prototype.toString.call( tracks ) !== '[object Array]') {
    callback("Data must be an Array", null);
  } else if(!clientId) {
    callback("A Client ID must be passed", null);
  } else {
    var importedTracks = [], errors = [];
    tracks.pop();
    async.forEachOf(tracks, function(track, index, cb) {
      importTrack(track, clientId, function(err, importedTrack) {
        if(err) { errors.push(err); }
        if(importedTrack) { importedTracks.push(importedTrack); }
        cb();
      });
    }, function(err) {
      if(err) {
        callback(err, null);
      } else {
        callback(errors, importedTracks);
      }
    });
  }
}

module.exports = Track;
module.exports.convertTracksForXlsx = convertTracksForXlsx;
module.exports.importTracks = importTracks;
module.exports.importTrack = importTrack;