console.log('background page loaded')

// the browser extension that adds a context menu
var extensionId = "bnceafpojmnimbnhamaeedgomdcgnbjk"

function app() {
    return chrome.app.window.get('mainWindow').contentWindow.app
}

function WindowManager() {
    // TODO -- if we add "id" to this, then chrome.app.window.create
    // won't create it twice.  plus, then its size and positioning
    // will be remembered. so put it in.
    this.mainWindowOpts = {
        width: 865,
        height: 610,
        resizable: true,
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
        var app = this.mainWindow.contentWindow.app

        if (app.options_window) {
            app.options_window.close()
        }
        if (app.help_window) {
            app.help_window.close()
        }
        // app cannot close the notificationts, but we can grab data from it beforehand
        // cannot do anything async on main window javascript context at this point
        for (var key in app.notifications.keyeditems) {
            chrome.notifications.clear(key, function(){})
        }
        this.mainWindow = null
    }
}

var windowManager = new WindowManager
// if background page reloads, we lose reference to windowmanager main window...
window.ctr = 0
function ensureAlive() {
    // attempt to make this page not suspend, because that causes our retained directoryentry to become invalid
    if (! window.ensureAliveTimeout) {
        window.ensureAliveTimeout = setTimeout( function() {
            window.ensureAliveTimeout = null;
            window.ctr++
            //console.log('ensured alive')
            ensureAlive()
        }, 60000 )
    }
}


chrome.app.runtime.onLaunched.addListener(function(launchData) {
    ensureAlive()
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
        if (mainWindow.focus) {
            mainWindow.focus()
        } else {
            // WTF chrome.app.window.get doesnt even exist at this point
            // crash
            chrome.runtime.reload()
        }

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

chrome.runtime.onInstalled.addListener(function(details) {
    var sk = 'onInstalledInfo'
    chrome.storage.sync.get(sk, function(resp) {
        console.log('got previous install info',resp.sk)

        details.date = new Date().getTime()
        details.cur = chrome.runtime.getManifest().version

        if (resp.sk) {
            resp.sk.push(details)
        } else {
            resp.sk = [details]
        }

        if (resp.sk.length > 30) {
            // purge really old entries
            resp.sk.splice(0,1)
        }

        chrome.storage.sync.set(resp, function(){console.log('persisted onInstalled info')})
    })
    
    console.log('onInstalled',details.reason, details)
    //details.reason // install, update, chrome_update
    //details.previousVersion // only if update
})

chrome.runtime.onUpdateAvailable.addListener( function(details) {
    // notify that there's a new version? click to restart? nah...
    console.log('a new version is available:',details.version,details)
})

/*
// detect if extension is installed... -- moved to js/app.js
chrome.runtime.sendMessage(extensionId, {running:true}, function(response) {
    console.log('got msg from extension',response, chrome.runtime.lastError)
})
*/

if (chrome.runtime.onMessageExternal) {
chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
    console.log('onMessageExternal',request,sender)
    if (request && request.command == 'checkInstalled') {
        sendResponse( {handled:true,
                       installed: true,
                       id: chrome.runtime.id,
                       version: chrome.runtime.getManifest().version})
        return
    } else if (request && request.command == 'add-url') {
        // External messages come from a browser Extension that adds a right click
        // context menu so that this App can handle magnet links.
        var info = {type:'onMessageExternal',
                    request: request,
                    sender: sender,
                    sendResponse: sendResponse}
        onAppLaunchMessage(info)

        sendResponse({ handled: true, 
                       id: chrome.runtime.id, 
                       version: chrome.runtime.getManifest().version
                     })
    } else {
        sendResponse({ handled: false,
                       id: chrome.runtime.id, 
                       version: chrome.runtime.getManifest().version,
                       message: 'unknown command' })
    }
});
}

if (chrome.runtime.onConnectExternal) {
    chrome.runtime.onConnectExternal.addListener( function(port) {
        if (port.sender.url.startsWith('http://127.0.0.1:' + app().webapp.port)) {
            console.log('received authorized port',port)
            window.mediaPort = port
            port.onMessage.addListener( function(msg) {
                app().client.handleExternalMessage(msg, port)
                console.log('external onmessage',msg)
            })
            port.onDisconnect.addListener( function(msg) {
                console.log('external ondisconnect',msg)
            })
            port.postMessage({text:"OK"})
        } else {
            console.error('unauthorized port',port)
        }
    })
}

chrome.runtime.onStartup.addListener( function(evt) {
    console.log('onStartup',evt)
})
chrome.runtime.onSuspend.addListener( function(evt) {
    app().runtimeMessage('onSuspend')
    console.log('onSuspend',evt)
})
chrome.runtime.onSuspendCanceled.addListener( function(evt) {
    app().runtimeMessage('onSuspendCanceled')
    console.log('onSuspendCanceled',evt)
})
chrome.app.runtime.onRestarted.addListener( function(evt) {
    console.log('app onRestarted',evt)
})