(function() {
	//Helper function
	function resolveFilename(filename) {
		//Append .blade for filenames without an extension
		if(filename.split("/").pop().indexOf(".") < 0)
			filename += ".blade";
		return blade.Runtime.resolve(filename);
	}
	//Overwrite blade.Runtime.loadTemplate and include functions
	blade.Runtime.loadTemplate = function(baseDir, filename, compileOptions, cb) {
		filename = resolveFilename(filename);
		//Either pull from the cache or return an error
		if(blade._cachedViews[filename])
		{
			cb(null, blade._cachedViews[filename]);
			return true;
		}
		cb(new Error("Template '" + filename + "' could not be loaded.") );
		return false;
	};
	var oldInclude = blade.Runtime.include;
	blade.Runtime.include = function(relFilename, info) {
		//Save old info
		var oldIncludeInfo = blade._includeInfo,
			old = blade.Runtime._beforeInclude.apply(this, arguments),
			bufLength = info.length,
			branchLabel = info.filename + ":" + info.line + ":inc:" + relFilename;
		//expose `info` to the raw_func generated by `package.js`
		blade._includeInfo = info;
		//Get the name of the included Template
		var name = resolveFilename(info.rel + "/" + relFilename);
		//Remove directory prefix
		name = name.substr(name.lastIndexOf("/") + 1);
		//Remove .blade file extension
		if(name.substr(-6) == ".blade")
			name = name.substr(0, name.length - 6);
		//Render the child template to get the reactive HTML (and to populate `info`)
		var reactiveHTML = Spark.labelBranch(branchLabel, function() {
			return info.partials[name](info.locals);
		});
		//If no block definitions were found in the parent and child templates, we can use the reactive HTML
		if(!info.bd)
		{
			//Remove non-reactive HTML
			blade.Runtime.capture(info, bufLength);
			//Add reactive HTML
			info.push(reactiveHTML);
		}
		//else... just use whatever is in `info` (non-reactive HTML)
		blade._includeInfo = oldIncludeInfo;
		blade.Runtime._afterInclude(old, info);
	};
	
	//Use Spark as the live update engine
	for(var i in Spark)
		blade.LiveUpdate[i] = Spark[i];
})();
