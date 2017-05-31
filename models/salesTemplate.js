var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');

var salesTemplateSchema = new Schema({
	clientId: String,
	name: String,
	salesAccountName: String,
	salesAccountId: String,
	startingLine: Number,
	startingLeft: Number,
	fields: Array
}, { 
	timestamps: true 
});

salesTemplateSchema.plugin(mongoosePaginate);

salesTemplateSchema.methods.userForbidden = function(user) {
	if(user.clientId == this.clientId && !user.payeeId) {
		// Only available to a client
		return false;
	} else {
		return true;
	}
}

var SalesTemplate = mongoose.model('SalesTemplate', salesTemplateSchema);

module.exports = SalesTemplate;