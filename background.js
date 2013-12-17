console.log('background page loaded')

function WindowManager() {
    // TODO -- if we add "id" to this, then chrome.app.window.create
    // won't create it twice.  plus, then its size and positioning
    // will be remembered. so put it in.
    this.mainWindowOpts = {
        width: 800,
        height: 600,
        resizable: false,
        id: 'mainWindow'
    }

    this.creatingMainWindow = false
    this.createMainWindowCallbacks = []
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

        if (this.creatingMainWindow) {
            // this can happen when we select multiple "torrent" files
            // in the files app and launch with JSTorrent.
            this.createMainWindowCallbacks.push(callback)
            return
        }

        var _this = this;
        console.log('creating main window')
        this.creatingMainWindow = true
        chrome.app.window.create('gui/index.html',
                                 this.mainWindowOpts,
                                 function(mainWindow) {

                                     _this.mainWindow = mainWindow
                                     _this.creatingMainWindow = false

                                     mainWindow.onClosed.addListener( function() {
                                         _this.onClosedMainWindow()
                                     })
                                     callback()

                                     var cb
                                     while (_this.createMainWindowCallbacks.length > 0) {
                                         cb = _this.createMainWindowCallbacks.pop()
                                         cb()
                                     }

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
    console.log('onLaunched with launchdata',launchData)
    var info = {type:'onLaunched',
                launchData: launchData}
    onAppLaunchMessage(info)
});

function onAppLaunchMessage(launchData) {
    // launchData, request, sender, sendRepsonse

    function onMainWindow(mainWindow) {
        mainWindow.contentWindow.app.registerLaunchData(launchData)
    }
    function onMainWindowSpecial(mainWindow) {
        // the app object has not been initialized
        if (! mainWindow.contentWindow.jstorrent_launchData) {
            mainWindow.contentWindow.jstorrent_launchData = []
        }
        mainWindow.contentWindow.jstorrent_launchData.push( launchData )
    }

    windowManager.getMainWindow( function(mainWindow) {
        // if window already existed...
        mainWindow.focus()

        if (mainWindow.contentWindow.app) {
            onMainWindow(mainWindow)
        } else {
            onMainWindowSpecial(mainWindow)
        }
    })


}

if (chrome.runtime.setUninstallUrl) {
    chrome.runtime.setUninstallUrl('http://jstorrent.com/uninstall?version=' + 
                                   encodeURIComponent(chrome.runtime.getManifest().version)
                                  )
}

chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
    console.log('onMessageExternal',request,sender)
    // External messages come from a browser Extension that adds a right click
    // context menu so that this App can handle magnet links.
    var info = {type:'onMessageExternal',
                request: request,
                sender: sender,
                sendResponse: sendResponse}
    onAppLaunchMessage(info)
    sendResponse({handled: true, id: chrome.runtime.id})
});
