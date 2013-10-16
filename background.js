var jstorrent_extension_id = "bnceafpojmnimbnhamaeedgomdcgnbjk"
var window_opts = {
    width: 800,
    height: 600
};

chrome.app.runtime.onLaunched.addListener(function(launchData) {


    if (launchData && launchData.items && launchData.items[0].entry) {
        var entry = launchData.items[0];
        if (entry.isFile) {
	    console.log('app was launched with file entry',entry)
	}
    }


    chrome.app.window.create('gui/index.html',
			     window_opts,
			     function() {}
			    );


    chrome.runtime.onMessageExternal.addListener( function(request, sender, sendResponse) {
        console.log('onconnectexternal message', request, sender)
        if (sender.id == jstorrent_extension_id) {
	    console.log('receive message from partner extension')
	}

});

