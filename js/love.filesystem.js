var gFilesystemPrefix = "unnamed-";
var gFilesystemEnumerateList;
var gFilesystemEnumerateIsDirectory = {};
var gFilesystemEnumerateIsFile = {};


function LoveFSNormalizePath (path) {
	if (path.length >= 2 && path.substring(0,2) == "./") path = path.substring(2);
	if (path.length >= 1 && path.substring(0,1) == "/") path = path.substring(1);
	if (path.length >= 1 && path.substring(path.length-1) == "/") path = path.substring(0,path.length-1);
	return path;
}

/// call LoveFileList('filelist.txt') in index.html body onload to enable love.filesystem.enumerate
/// newline separated file paths, e.g. linux commandline "find . > filelist.txt"
function LoveFileList (url) {
	MainPrint("LoveFileList",url);
	UtilAjaxGet(url, function (contents) {
		if (contents) {
			gFilesystemEnumerateList = {};
			var paths = contents.split("\n");
			for (var i in paths) {
				var path = LoveFSNormalizePath(paths[i]);
				if (path == "" || path == "." || path == "..") continue;
				var parts = path.split("/");
				var basename = parts.pop();
				var parentpath = parts.join("/");
				var pathlist = gFilesystemEnumerateList[parentpath];
				if (!pathlist) { pathlist = []; gFilesystemEnumerateList[parentpath] = pathlist; }
				pathlist.push(basename);
				gFilesystemEnumerateIsFile[path] = true; MainPrint("IsFile",path);
				gFilesystemEnumerateIsDirectory[parentpath] = true;
				gFilesystemEnumerateIsFile[parentpath] = false;
			}
		}
	}, true);
}

// Returns a table with the names of files and subdirectories in the directory in an undefined order. 
// example: "dira" contains 1 file (a.txt) and 2 subdirs (diraa,dirab) :   love.filesystem.enumerate("dira") (="dira/") = {"a.txt","diraa","dirab"}
function LoveFilesystemEnumerate (path) {
	if (!gFilesystemEnumerateList) return NotImplemented(pre+'enumerate (try index.html body onload : LoveFileList("filelist.txt") from "find . > filelist.txt")');
	var res = lua_newtable();
	if (path.substring(path.length - 1) == "/") path = path.substring(0,path.length - 1); // remove trailing /
	path = LoveFSNormalizePath(path);
	// TODO : evaluate ./ and ../ , js-regex ? 
	var pathlist = gFilesystemEnumerateList[path];
	if (pathlist) for (var i in pathlist) res.uints[parseInt(i)+1] = pathlist[i]; 
	return [res];
}

function LoveFS_isDir (path) {
	var res = gFilesystemEnumerateIsDirectory[LoveFSNormalizePath(path)] || (localStorage && (path.substr(path.length-1) == "/")); // Directory name
	return res == true;
}

function LoveFS_isFile (path) {
	var res = gFilesystemEnumerateIsFile[LoveFSNormalizePath(path)] || (localStorage && localStorage[gFilesystemPrefix+path] != undefined);
	return res == true;
}

function LoveFS_readFile (path) {
	var file;
	if (localStorage) { file = localStorage[gFilesystemPrefix+path]; if (file) return file; }
	UtilAjaxGet(path, function (contents) { file = contents; }, true);
	return file;
}

/// init lua api
function Love_Filesystem_CreateTable (G) {
	var t = lua_newtable();
	var pre = "love.filesystem.";

	G.str['love'].str['filesystem'] = t;
	
	t.str['enumerate']				= function (path) { return LoveFilesystemEnumerate(path); }
	
	t.str['exists']					= function (path) { return [LoveFS_isFile(path) || LoveFS_isDir(path)]; }
	t.str['isDirectory']			= function (path) { return [LoveFS_isDir(path)]; }
	t.str['isFile']					= function (path) { return [LoveFS_isFile(path)]; }
	
	t.str['getAppdataDirectory']	= function () { return NotImplemented(pre+'getAppdataDirectory'); }
	t.str['getLastModified']		= function () { return NotImplemented(pre+'getLastModified'); }
	t.str['getSaveDirectory']		= function () { return NotImplemented(pre+'getSaveDirectory'); }
	t.str['getUserDirectory']		= function () { return NotImplemented(pre+'getUserDirectory'); }
	t.str['getWorkingDirectory']	= function () { return NotImplemented(pre+'getWorkingDirectory'); }
	t.str['init']					= function () { }
	t.str['lines']					= function () { return NotImplemented(pre+'lines'); }
	t.str['load']					= function (path) { return [function () { return RunLuaFromPath(path); }]; } // quick&dirty
	t.str['mkdir']					= function () { return NotImplemented(pre+'mkdir'); }
	t.str['newFile']				= function () { return NotImplemented(pre+'newFile'); }
	t.str['newFileData']			= function () { return NotImplemented(pre+'newFileData'); }
	t.str['read']					= function () { return NotImplemented(pre+'read (no LocalStorage)'); }
	t.str['remove']					= function () { return NotImplemented(pre+'remove (no LocalStorage)'); }
	t.str['setIdentity']			= function () { return NotImplemented(pre+'setIdentity (no LocalStorage)'); }
	t.str['setSource']				= function () { return NotImplemented(pre+'setSource'); }
	t.str['write']					= function (filename, data) { return NotImplemented(pre+"write (no LocalStorage)"); }
	
	
	if (localStorage)
	{
		t.str['write']					= function (filename, data)
		{
			localStorage[gFilesystemPrefix+filename] = data;
		}
		t.str['read']                                   = function (filename)
		{
			return [LoveFS_readFile(filename)];
		}
		t.str['setIdentity']                            = function (identity)
		{
			if (identity)
				gFilesystemPrefix = identity + "-";
		}
		t.str['remove']                                 = function (name)
		{
			localStorage.removeItem(gFilesystemPrefix+name);
		}
		t.str['load']                                   = function (name)
		{
			var file = LoveFS_readFile(name);
			if (file)
			{
				try
				{
					return [lua_load(file, name)];
				}
				catch (e)
				{
					return [null, e.message];
				}
			}
		}
	}
}
