var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');
var ObjectId = Schema.ObjectId;
var Parent = require('./parent');

var clientSchema = new Schema({
	parentId: String,
	name: String,
	paymentTier: String,
	companyName: String,
	address: String,
	phone: String,
	email: String,
	formats: Array,
	priceCategories: Array
}, { 
	timestamps: true
});

clientSchema.plugin(mongoosePaginate);

clientSchema.methods.userForbidden = function(user) {
	if(user.internal) {
		// Internal User
		return false;
	} else if(this.parentId && user.parentId == this.parentId) {
		// Parent User of Client
		return false;
	} else if(user.clientId == this._id && !user.payeeId) {
		// Client itself
		return false;
	} else {
		return true;
	}
}

clientSchema.methods.parent = function() {
	if(this.parentId) {
		Parent.findOne({ _id: this.parentId }, function(err, parent) {
			return parent;
		})
	} else {
		return {};
	}
}

var Client = mongoose.model('Client', clientSchema);

module.exports = Client;