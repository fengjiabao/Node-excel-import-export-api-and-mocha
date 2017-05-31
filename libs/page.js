var valueOrDefault = function(queryPage, def) {
	if(queryPage) { 
		return parseInt(queryPage);
	} else {
		return def;
	}
}
var sortOrDefault = function(querySortBy, querySortDir) {
	var sortString = '';
	if( querySortBy && querySortBy != '' ){
		if( querySortDir && querySortDir == 'desc' ) {
			sortString = '-'+querySortBy;
		} else {
			sortString = querySortBy;
		}
	}
	return sortString;
}

module.exports.valueOrDefault = valueOrDefault;
module.exports.sortOrDefault = sortOrDefault;