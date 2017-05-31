var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongoosePaginate = require('mongoose-paginate');

var parentSchema = new Schema({
	clientIds: Array,
	name: String
}, { 
	timestamps: true 
});

parentSchema.plugin(mongoosePaginate);

parentSchema.methods.userForbidden = function(user) {
	if(user.internal || user.parentId == this._id) {
		// Internal User or Parent User of Parent
		return false;
	} else {
		return true;
	}
}

var Parent = mongoose.model('Parent', parentSchema);

module.exports = Parent;