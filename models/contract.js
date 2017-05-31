var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
var async = require('async');

var contractSchema = new Schema({
	clientId: String,
	payeeId: String,
	name: String,
	type: String,
	accountingPeriod: String,
	minPayout: Number,
	salesTerms: Array,
	returnsTerms: Array,
	costsTerms: Array,
	mechanicalTerms: Array,
	reserves: Array
}, { 
	timestamps: true 
});

contractSchema.plugin(mongoosePaginate);

contractSchema.methods.userForbidden = function(user, readWrite) {
	if(user.clientId == this.clientId && !user.payeeId) {
		// Write only should be client only
		return false;
	} else if(readWrite == "read" && user.clientId == this.clientId && this.payeeId == user.payeeId) {
		// Payee allowed to read
		return false;
	} else {
		return true;
	}
}

contractSchema.methods.exportData = function() {
  return [
    this._id.toString(),
    this.name,
    this.accountingPeriod,
    this.type,
    this.minPayout,
    this.payeeId
  ]
}

var Contract = mongoose.model('Contract', contractSchema);

// Build data for Excel template
var multipleContractsForXlsx = function(contracts, callback) {
  if(contracts instanceof Array) {
    var convertedContracts = [];
    var convertedSales = [];
    var convertedReturns = [];
    var convertedCosts = [];
    var convertedMechanicals = [];
    var convertedReserves = [];

    async.each(contracts, function(contract, cb) {
    	contract.salesTerms.forEach(function(sale){
    		convertedSales.push([sale.contractName, sale.territory, sale.channel, sale.configration, sale.priceCategory, sale.type, sale.rate, sale.unitDeduction, sale.reserve]);
    	});
    	contract.returnsTerms.forEach(function(return_v){
    		convertedReturns.push([return_v.contractName, return_v.territory, return_v.channel, return_v.configration, return_v.priceCategory, return_v.type, return_v.rate, return_v.unitDeduction, return_v.reserve]);
    	});
    	contract.costsTerms.forEach(function(cost){
    		convertedCosts.push([cost.contractName, cost.territory, cost.type, cost.rate]);
    	});
    	contract.mechanicalTerms.forEach(function(mechanical){
    		convertedMechanicals.push([mechanical.contractName, mechanical.territory, mechanical.rate]);
    	});
    	contract.reserves.forEach(function(reserve){
    		convertedReserves.push([reserve.contractName, reserve.rate]);
    	});
    	
    	convertedContracts.push(contract.exportData());
    	cb();
    }, function(err) {
      if(err) {
        callback(err, null);
      } else {
        callback(null, [convertedContracts,convertedSales,convertedReturns,convertedCosts,convertedMechanicals,convertedReserves]);
      }
    });
  } else {
    callback("Must be passed an Array of Contracts", null);
  }
}

var importContract = function(data, otherMapData, clientId, callback) {
  var query = null;
  if (!data) {
    return callback("Contract must be passed", null);
  }
  if (data._id && data._id != '') {
    query = {_id: data._id};
  } else {
    if (data.name) {
      query = {clientId: clientId, name: data.name};
    } else {
      return callback("Name must be passed", null);
    }
  }
  Contract.findOne(query, function(err, contract) {
    if(err) {
      callback(err, null);
    }

    if (!contract) {
      contract = new Contract({
        clientId: clientId,
        payeeId: data.payeeId,
        name: data.name,
        type: data.type,
        accountingPeriod: data.accountingPeriod,
        minPayout: Number(data.minPayout),
        salesTerms: [],
        returnsTerms: [],
        costsTerms: [],
        mechanicalTerms: [],
        reserves: []
      });
    } else {
    	contract.payeeId = data.payeeId;
      	contract.name = data.name;
      	contract.type = data.type;
      	contract.accountingPeriod = data.accountingPeriod;
      	contract.minPayout = Number(data.minPayout);
    }

    if (otherMapData.sales) {
      	otherMapData.sales.forEach(function (sale) {
      		if( sale.contractName == contract.name ){
      			contract.salesTerms.push(sale);
      		}		  
		});
    }
    if (otherMapData.returns) {
      	otherMapData.returns.forEach(function (return_v) {
      		if( return_v.contractName == contract.name ){
      			contract.returnsTerms.push(return_v);
      		}		  
		});
    }
    if (otherMapData.costs) {
      	otherMapData.costs.forEach(function (cost) {
      		if( cost.contractName == contract.name ){
      			contract.costsTerms.push(cost);
      		}		  
		});
    }
    if (otherMapData.mechanicals) {
      	otherMapData.mechanicals.forEach(function (mechanical) {
      		if( mechanical.contractName == contract.name ){
      			contract.mechanicalTerms.push(mechanical);
      		}		  
		});
    }
    if (otherMapData.reserves) {
      	otherMapData.reserves.forEach(function (reserve) {
      		if( reserve.contractName == contract.name ){
      			contract.reserves.push(reserve);
      		}		  
		});
    }

	contract.save(function(err, contract) {
		if(err) {
		  callback(err, null);
		} else {
		  callback(null, contract);
		}
	});
  });
}

var importContracts = function(contracts, otherMapData, clientId, callback) {
  if(Object.prototype.toString.call( contracts ) !== '[object Array]') {
    callback("Data must be an Array", null);
  } else if(!clientId) {
    callback("A Client ID must be passed", null);
  } else {
    var importedContracts = [], errors = [];
    contracts.pop();
    async.forEachOf(contracts, function(contract, index, cb) {
      importContract(contract, otherMapData, clientId, function(err, importedContract) {
        if(err) { errors.push(err); }
        if(importedContract) { importedContracts.push(importedContract); }
        cb();
      });
    }, function(err) {
      if(err) {
        callback(err, null);
      } else {
        callback(errors, importedContracts);
      }
    });
  }
}

module.exports = Contract;
module.exports.multipleContractsForXlsx = multipleContractsForXlsx;
module.exports.importContracts = importContracts;
module.exports.importContract = importContract;