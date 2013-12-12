console.log('background page loaded')
var jstorrent_extension_id = "bnceafpojmnimbnhamaeedgomdcgnbjk"

function WindowManager() {
    this.mainWindowOpts = {
        width: 800,
        height: 600
    }

    this.mainWindow = null
}

WindowManager.prototype = {
    getMainWindow: function(callback) {
        // gets main window or creates if needed
        var _this = this
        if (this.mainWindow) {
            callback(_this.mainWindow)
        } else {
            this.createMainWindow( function() {
                callback(_this.mainWindow)
            })
        }
    },
    createMainWindow: function(callback) {
        if (this.mainWindow) { 
            console.log('not creating main window, it already exists')
            return
        }

        var _this = this;
        console.log('creating main window')
        chrome.app.window.create('gui/index.html',
                                 this.mainWindowOpts,
                                 function(mainWindow) {
                                     _this.mainWindow = mainWindow
                                     mainWindow.onClosed.addListener( function() {
                                         _this.onClosedMainWindow()
                                     })
                                     callback()
                                 }
			        );
    },
    onClosedMainWindow: function() {
        console.log('main window closed')
        this.mainWindow = null
    }
}

var windowManager = new WindowManager




chrome.app.runtime.onLaunched.addListener(function(launchData) {

    if (launchData && launchData.items && launchData.items[0].entry) {
        var entry = launchData.items[0];
        if (entry.isFile) {
	    console.log('app was launched with file entry',entry)
	}
    }

    windowManager.createMainWindow( function() {
        
    })
});

chrome.runtime.onMessageExternal.addListener( function(request, sender, sendResponse) {
    if (sender.id == jstorrent_extension_id) {
        var link = request.url
        var page = request.pageUrl

        function onMainWindow(mainWindow) {
            mainWindow.contentWindow.app.registerExtensionMessageRequest(request)
        }
        function onMainWindowSpecial(mainWindow) {
            // the app object has not been initialized
            if (! mainWindow.contentWindow.jstorrent_launchData) {
                mainWindow.contentWindow.jstorrent_launchData = []
            }
            mainWindow.contentWindow.jstorrent_launchData.push( { type: 'registerExtensionMessageRequest',
                                                                  payload: request } )
        }

        if (windowManager.mainWindow) {
            windowManager.mainWindow.focus()
            onMainWindow(windowManager.mainWindow)
        } else {
            windowManager.getMainWindow( function(mainWindow) {
                if (mainWindow.contentWindow.app) {
                    onMainWindow(mainWindow)
                } else {
                    onMainWindowSpecial(mainWindow)
                }
            })
        }
    }
});
