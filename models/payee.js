var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
var async = require('async');

var payeeSchema = new Schema({
	clientId: String,
	name: String,
	address: String,
	country: String,
	vatNo: String,
	bankName: String,
	bankAddress: String,
	accountNo: String,
	sortCode: String,
	iban: String
}, { 
	timestamps: true 
});

payeeSchema.plugin(mongoosePaginate);

payeeSchema.methods.userForbidden = function(user, readWrite) {
	if(user.clientId == this.clientId && !user.payeeId) {
		// Write only should be client only
		return false;
	} else if(readWrite == "read" && user.clientId == this.clientId && this._id == user.payeeId) {
		// Payee allowed to read
		return false;
	} else {
		return true;
	}
}

payeeSchema.methods.exportData = function() {
  return [
  	this._id.toString(),
    this.name,
    this.address,
    this.country,
    this.vatNo,
    this.bankName,
    this.bankAddress,
    this.accountNo,
    this.sortCode,
    this.iban
  ]
}

var Payee = mongoose.model('Payee', payeeSchema);

// Build data for Excel template
var convertPayeesForXlsx = function(payees, callback) {
  if(payees instanceof Array) {
    var convertedPayees = [];
    async.each(payees, function(payee, cb) {
		convertedPayees.push(payee.exportData());
		cb();
    }, function(err) {
		if(err) {
			callback(err, null);
		} else {
			callback(null, convertedPayees);
		}
    });
  } else {
    callback("Must be passed an Array of Payees", null);
  }
}

var importPayee = function(data, clientId, callback) {
  var query = null;
  if (!data) {
    return callback("Payee must be passed", null);
  }
  if (data._id && data._id != '') {
    query = {_id: data._id};
  } else {
    if (data.vatNo) {
      query = {clientId: clientId, vatNo: data.vatNo};
    } else {
      return callback("VatNo must be passed", null);
    }
  }
  Payee.findOne(query, function(err, payee) {
    if(err) {
      callback(err, null);
    }
    
    if (!payee) {
      payee = new Payee({
        clientId: clientId,
        name: data.name,
        address: data.address,
        country: data.country,
        vatNo: data.vatNo,
        bankName: data.bankName,
        bankAddress: data.bankAddress,
        accountNo: data.accountNo,
        sortCode: data.sortCode,
        iban: data.iban
      });
    } else {
      payee.name = data.name;
      payee.address = data.address;
      payee.country = data.country;
      payee.vatNo = data.vatNo;
      payee.bankName = data.bankName;
      payee.bankAddress = data.bankAddress;
      payee.accountNo = data.accountNo;
      payee.sortCode = data.sortCode;
      payee.iban = data.iban;
    }

	payee.save(function(err, payee) {
		if(err) {
		  callback(err, null);
		} else {
		  callback(null, payee);
		}
	});
  });
}

var importPayees = function(payees, clientId, callback) {
  if(Object.prototype.toString.call( payees ) !== '[object Array]') {
    callback("Data must be an Array", null);
  } else if(!clientId) {
    callback("A Client ID must be passed", null);
  } else {
    var importedPayees = [], errors = [];
    payees.pop();
    async.forEachOf(payees, function(payee, index, cb) {
      importPayee(payee, clientId, function(err, importedPayee) {
        if(err) { errors.push(err); }
        if(importedPayee) { importedPayees.push(importedPayee); }
        cb();
      });
    }, function(err) {
      if(err) {
        callback(err, null);
      } else {
        callback(errors, importedPayees);
      }
    });
  }
}

module.exports = Payee;
module.exports.convertPayeesForXlsx = convertPayeesForXlsx;
module.exports.importPayees = importPayees;
module.exports.importPayee = importPayee;