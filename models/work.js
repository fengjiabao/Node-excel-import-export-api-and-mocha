var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
var async = require('async');

var rightsSchema = new Schema({
	contractId: String,
	percentage: Number
});

var workSchema = new Schema({
	clientId: String,
	campaignIds: Array,
	title: String,
	composer: String,
	identifier: String,
	salesReturnsRights: [rightsSchema],
	costsRights: [rightsSchema],
	aliases: Array
}, { 
	timestamps: true 
});

workSchema.plugin(mongoosePaginate);

workSchema.methods.userForbidden = function(user, readWrite) {
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

workSchema.methods.containsContractIds = function(passedContractIds, callback) {
	if(passedContractIds) {
		this.contractIds(function(workContractIds) {
			var value = false;
			passedContractIds.forEach(function(passedContractId, cb) {
				if(workContractIds.indexOf(passedContractId) != -1) { 
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

workSchema.methods.contractIds = function(callback) {
	var array = [];
	this.salesReturnsRights.forEach(function(contractId) {
		array.push(contractId.contractId);
	});
	this.costsRights.forEach(function(contractId) {
		array.push(contractId.contractId);
	});
	callback(array);
}

workSchema.methods.exportData = function(aliases) {
  return [
  	this._id.toString(),
    this.title,
    this.composer,
    this.identifier,
    aliases
  ]
}

var Work = mongoose.model('Work', workSchema);

// Build data for Excel template
var convertWorksForXlsx = function(works, callback) {
  if(works instanceof Array) {
    var convertedWorks = [];
    async.each(works, function(work, cb) {
    	var aliases = '';
		if( work.aliases.length > 0 ) {
			work.aliases.forEach(function(temp){
				aliases += temp + ';';
			});
		}
		convertedWorks.push(work.exportData(aliases));
		cb();
    }, function(err) {
		if(err) {
			callback(err, null);
		} else {
			callback(null, convertedWorks);
		}
    });
  } else {
    callback("Must be passed an Array of Works", null);
  }
}

var importWork = function(data, clientId, callback) {
  var query = null;
  if (!data) {
    return callback("Work must be passed", null);
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
  Work.findOne(query, function(err, work) {
    if(err) {
      callback(err, null);
    }
    var aliases = [];
    if( data.aliases && data.aliases != '' ){
    	aliases = data.aliases.split(";");
    }

    if (!work) {
      work = new Work({
        clientId: clientId,
        title: data.title,
        composer: data.composer,
        identifier: data.identifier,
        salesReturnsRights: [],
        costsRights: [],
        aliases: aliases
      });
    } else {
      work.title = data.title;
      work.composer = data.composer;
      work.aliases = aliases;
    }

	work.save(function(err, work) {
		if(err) {
		  callback(err, null);
		} else {
		  callback(null, work);
		}
	});
  });
}

var importWorks = function(works, clientId, callback) {
  if(Object.prototype.toString.call( works ) !== '[object Array]') {
    callback("Data must be an Array", null);
  } else if(!clientId) {
    callback("A Client ID must be passed", null);
  } else {
    var importedWorks = [], errors = [];
    works.pop();
    async.forEachOf(works, function(work, index, cb) {
      importWork(work, clientId, function(err, importedWork) {
        if(err) { errors.push(err); }
        if(importedWork) { importedWorks.push(importedWork); }
        cb();
      });
    }, function(err) {
      if(err) {
        callback(err, null);
      } else {
        callback(errors, importedWorks);
      }
    });
  }
}

module.exports = Work;
module.exports.convertWorksForXlsx = convertWorksForXlsx;
module.exports.importWorks = importWorks;
module.exports.importWork = importWork;