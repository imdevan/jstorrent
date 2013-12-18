// this file should probably be in "gui"

// rather should have a better separation ...

function App() {
    //console.log('creating app')
    chrome.system.storage.onAttached.addListener( _.bind(this.external_storage_attached, this) )
    chrome.system.storage.onDetached.addListener( _.bind(this.external_storage_detached, this) )

    this.options_window = null
    this.help_window = null
    this.options = new jstorrent.Options({app:this}); // race condition, options not yet fetched...

    this.analytics = new jstorrent.Analytics({app:this})

    // need to store a bunch of notifications keyed by either torrents or other things...
    this.notificationCounter = 0
    this.notifications = new jstorrent.Collection({parent:this, shouldPersist: false})
    chrome.notifications.onClicked.addListener(_.bind(this.notificationClicked, this))
    chrome.notifications.onButtonClicked.addListener(_.bind(this.notificationButtonClicked, this))
    chrome.notifications.onClosed.addListener(_.bind(this.notificationClosed, this))

    this.popupwindowdialog = null // what it multiple are triggered? do we queue up the messages?
    // maybe use notifications instead... ( or in addition ... )
    this.UI = null
    //this.checkIsExtensionInstalled()

    this.freeTrialFreeDownloads = 10
    this.totalDownloads = 0

    if (this.isLite()) {
        this.updateRemainingDownloadsDisplay()
        $('#download-remain-container').show()
        $('#title-lite').show()
    } else {

    }
}

jstorrent.App = App

App.prototype = {
    closeNotifications: function() {
        this.notifications.each( function(n) {
            n.close()
        })
    },
    initialize_client: function() {
        this.client = new jstorrent.Client({app:this, id:'client01'});
        this.client.torrents.on('start', _.bind(this.onTorrentStart, this))
        this.client.torrents.on('havemetadata', _.bind(this.onTorrentHaveMetadata, this))
        this.client.torrents.on('stop', _.bind(this.onTorrentStop, this))
        this.client.torrents.on('progress', _.bind(this.onTorrentProgress, this))
        this.client.torrents.on('complete', _.bind(this.onTorrentComplete, this))
        this.client.on('error', _.bind(this.onClientError, this))
    },
    reinstall: function() {
        chrome.storage.local.clear(function() {
            reload()
        })
    },
    upgrade: function() {
        // used to test "upgrade" from previous jstorrent (pre-rewrite) version.
        chrome.storage.local.clear(function() {
            var obj = {}
            obj[jstorrent.constants.keyPresentInPreRewrite] = true
            chrome.storage.local.set(obj, function(){
                reload()
            })
        })
    },

    notifyNoDownloadsLeft: function() {
        function onclick(idx) {
            console.log('notification clicked',idx)
            if (idx == 1) {
                this.open_upsell_page()
            } else {
                window.open(jstorrent.constants.cws_jstorrent_url,'_blank')
            }
        }
        this.createNotification({ details:"Sorry, this is the free trial version, and you have used all your free downloads",
                                  buttons: [ 
                                      {title:"Get JSTorrent Full Version", iconUrl:"/cws_32.png"},
                                      {title:"Why do I have to pay?"},
                                  ],
                                  id:'no-downloads-left',
                                  priority:2,
                                  onButtonClick: _.bind(onclick,this),
                                  onClick: _.bind(onclick,this) })
    },
    notifyNeedDownloadDirectory: function() {
        this.createNotification({details:jstorrent.strings.NOTIFY_NO_DOWNLOAD_FOLDER,
                                 priority:2,
                                 id: 'notifyneeddownload',
                                 onClick: _.bind(function() {
                                     chrome.fileSystem.chooseEntry({type:'openDirectory'},
                                                                   _.bind(this.set_default_download_location,this)
                                                                  )
                                     
                                 },this)})
    },
    checkIsExtensionInstalled: function(callback) {
        chrome.runtime.sendMessage(jstorrent.constants.cws_jstorrent_extension, {command:'checkInstalled'}, function(response) {
            console.log('checked if extension installed:',response,chrome.runtime.lastError)
            var present = false
            if (response && response.installed) {
                present = true
            }
            if (callback){callback(present)}
        })
    },
    registerLaunchData: function(launchData) {
        if (this.client.ready) {
            this.client.handleLaunchData(launchData)
        } else {
            this.client.on('ready', _.bind(function() {
                this.client.handleLaunchData(launchData)
            },this))
        }
    },
    notificationClosed: function(id, byUser) {
        //console.log('closed notification with id',id)
        var notification = this.notifications.get(id)
        if (notification) {
            this.notifications.remove(notification)
        }
    },
    notificationClicked: function(id) {
        //console.log('clicked on notification with id',id)
        var notification = this.notifications.get(id)
        notification.handleClick()
    },
    notificationButtonClicked: function(id, idx) {
        //console.log('clicked on notification with id',id)
        var notification = this.notifications.get(id)
        notification.handleButtonClick(idx)
    },
    createNotification: function(opts) {
        opts.id = opts.id || ('notification' + this.notificationCounter++)
        opts.parent = this
        if (! this.notifications.containsKey(opts.id)) {
            var notification = new jstorrent.Notification(opts)
            this.notifications.add(notification)
        }
    },
    showPopupWindowDialog: function(details) {
        this.createNotification({details:details})
    },
    onTorrentHaveMetadata: function(torrent) {
        if (this.UI.get_selected_torrent() == torrent) {
            // reset the detail view
            this.UI.set_detail(this.UI.detailtype, torrent)
        }
    },
    onTorrentComplete: function(torrent) {
        var id = torrent.hashhexlower
        if (this.notifications.get(id)) {
            chrome.notifications.update(id,
                                        {progress: Math.floor(100 * torrent.get('complete')),
                                         message: torrent.get('name') + " finished downloading!"},
                                        function(){})
        }

        // increment total downloads ...

        this.incrementTotalDownloads( _.bind(function() {
            this.updateRemainingDownloadsDisplay()
        },this))
    },
    updateRemainingDownloadsDisplay: function() {
        this.getTotalDownloads( _.bind(function(val) {
            this.totalDownloads = val
            $('#download-remain').text(this.freeTrialFreeDownloads - val)
        },this))
    },
    canDownload: function() {
        return false
        if (! this.isLite()) { return true }
        return this.totalDownloads < this.freeTrialFreeDownloads
    },
    getTotalDownloads: function(callback) {
        chrome.storage.sync.get('totalDownloads', _.bind(function(resp) {
            callback( resp['totalDownloads'] || 0 )
        },this))
    },
    incrementTotalDownloads: function(callback) {
        chrome.storage.sync.get('totalDownloads', _.bind(function(resp) {
            var obj = {}
            obj['totalDownloads'] = resp['totalDownloads'] + 1
            chrome.storage.sync.set( obj, callback)
        },this))
    },
    isLite: function() {
        return chrome.runtime.id == "abmohcnlldaiaodkpacnldcdnjjgldfh"
    },
    onTorrentProgress: function(torrent) {
        var id = torrent.hashhexlower
        if (this.notifications.get(id)) {
            chrome.notifications.update(id,
                                        {progress: Math.floor(100 * torrent.get('complete'))},
                                        function(){})
        }
    },
    onTorrentStop: function(torrent) {
        var id = torrent.hashhexlower
        if (this.notifications.get(id)) {
            chrome.notifications.clear(id, function(){})
        }
    },
    onTorrentStart: function(torrent) {
        if (torrent.get('complete') == 1) { return }
        var id = torrent.hashhexlower
        if (this.notifications.get(id)) {
            // already had this notification... hrmmm
        } else {
            var opts = {type: 'progress',
                        progress: Math.floor(100*torrent.get('complete')),
                        details: 'Downloading ' + torrent.get('name'),
                        id: id}
            this.createNotification(opts)
        }
    },
    onClientError: function(evt, e) {
        // display a popup window with the error information
        this.createNotification({details:e, onClick: function() {
            console.log('onClientError notification onClick')
        }})
    },
    set_ui: function(UI) {
        this.UI = UI
    },
    handleDrop: function(evt) {
        console.log('handleDrop')
        //app.analytics.sendEvent("MainWindow", "Drop")
        // handle drop in file event
        var files = evt.dataTransfer.files, file, item
        
        if (files) {
            for (var i=0; i<files.length; i++) {
                file = files[i]
                console.log('drop found file',file)
                // check if ends in .torrent, etc...
            }
        }
        var items = evt.dataTransfer.items
        if (items) {
            for (var i=0; i<items.length; i++) {
                item = items[i]
                //console.log('drop found item',item)
                if (item.kind == 'file') {
                    var entry = item.webkitGetAsEntry()
                    console.log('was able to extract entry.',entry)
                    if (item.type == 'application/x-bittorrent') {
                        app.analytics.sendEvent("MainWindow", "Drop", "Torrent")
                        this.client.handleLaunchWithItem({entry:entry,
                                                          type:item.type})

                    } else {
                        app.analytics.sendEvent("MainWindow", "Drop", "Entry")
                        this.createNotification({details:"Sorry. Creating torrents is not yet supported."})
                    }
                    // cool, now I can call chrome.fileSystem.retainEntry ...
                } else {
                    //console.log('extracted entry as...',item.webkitGetAsEntry()) // returns null
                }
            }
        }
    },
    suspend: function() {
        this.client.stop()
    },
    open_share_window: function() {
        var torrent = this.UI.get_selected_torrent()
        if (torrent) {
            window.open('http://jstorrent.com/share#hash=' + torrent.hashhexlower + '&dn=' + encodeURIComponent(torrent.get('name')), '_blank')
        }
    },
    toolbar_resetstate: function() {
        app.analytics.sendEvent("Toolbar", "Click", "ResetState")
        var torrents = this.UI.get_selected_torrents()
        for (var i=0; i<torrents.length; i++) {
            torrents[i].resetState()
        }
    },
    toolbar_recheck: function() {
        app.analytics.sendEvent("Toolbar", "Click", "Recheck")
        var torrents = this.UI.get_selected_torrents()
        for (var i=0; i<torrents.length; i++) {
            console.log('recheck',i)
            torrents[i].recheckData()
        }
    },
    toolbar_start: function() {
        app.analytics.sendEvent("Toolbar", "Click", "Start")
        var torrents = this.UI.get_selected_torrents()
        for (var i=0; i<torrents.length; i++) {
            torrents[i].start()
        }
    },
    toolbar_stop: function() {
        app.analytics.sendEvent("Toolbar", "Click", "Stop")
        var torrents = this.UI.get_selected_torrents()
        for (var i=0; i<torrents.length; i++) {
            torrents[i].stop()
        }
    },
    toolbar_remove: function() {
        app.analytics.sendEvent("Toolbar", "Click", "Remove")
        var torrents = this.UI.get_selected_torrents()
        this.UI.torrenttable.grid.setSelectedRows([])
        for (var i=0; i<torrents.length; i++) {
            torrents[i].remove()
        }
    },
    add_from_url: function(url) {
        if (! this.canDownload()) {
            this.notifyNoDownloadsLeft()
            return
        }
        // show notification

        this.checkIsExtensionInstalled( _.bind(function(isInstalled) {
            if (! isInstalled) {
                this.createNotification({id:"extension",
                                         buttons: [ 
                                             {title:"Install the Extension", iconUrl:"/cws_32.png"},
                                             {title:"Don't show this message again"}
                                                  ],
                                         onButtonClick: _.bind(function(idx) {
                                             console.log('button clicked',idx)
                                             if (idx == 0) {
                                                 window.open(jstorrent.constants.cws_jstorrent_extension_url,'_blank')
                                             } else {
                                                 this.options.set('dont_show_extension_help',true)
                                             }
                                         },this),
                                         details:"Did you know there is a browser extension that adds a Right Click (context) Menu to make adding torrents from the Web easier?"})

            }
        },this))
        client.add_from_url(url)
    },
    external_storage_attached: function(storageInfo) {
        console.log('external storage attached',storageInfo)
    },
    external_storage_detached: function(storageInfo) {
        console.log('external storage detached',storageInfo)
    },
    focus_or_open_options: function() {
        if (this.options_window) { 
            this.options_window.focus();
            console.log('options already open'); return;
        }

        this.options_window_opening = true
        chrome.app.window.create( 'gui/options.html', 
                                  { width: 400,
                                    id: "options",
                                    height: 400 },
                                  _.bind(this.options_window_opened, this)
                                );
    },
    options_window_opened: function(optionsWindow) {
        app.analytics.sendAppView("OptionsView")
        this.options_window_opening = false
        this.options_window = optionsWindow
        optionsWindow.contentWindow.mainAppWindow = window;
        optionsWindow.onClosed.addListener( _.bind(this.options_window_closed, this) )
    },
    options_window_closed: function() {
        this.options_window = null
    },
    open_upsell_page: function() {
        if (this.upsell_window) {
            this.upsell_window.focus()
        }
        chrome.app.window.create( 'gui/upsell.html', 
                                  { width: 520,
                                    id:"upsell",
                                    height: 480 },
                                  _.bind(this.upsell_window_opened, this)
                                );
    },
    upsell_window_opened: function(upsellWindow) {
        app.analytics.sendAppView("UpsellView")
        this.upsell_window = upsellWindow
        upsellWindow.contentWindow.mainAppWindow = window;
        upsellWindow.onClosed.addListener( _.bind(this.upsell_window_closed, this) )
    },
    upsell_window_closed: function() {
        this.upsell_window = null
    },
    focus_or_open_help: function() {
        if (this.help_window) { 
            this.help_window.focus();
            console.log('help already open'); return;
        }

        this.help_window_opening = true
        chrome.app.window.create( 'gui/help.html', 
                                  { width: 520,
                                    id:"help",
                                    height: 480 },
                                  _.bind(this.help_window_opened, this)
                                );
    },
    help_window_opened: function(helpWindow) {
        app.analytics.sendAppView("HelpView")
        this.help_window_opening = false
        this.help_window = helpWindow
        helpWindow.contentWindow.mainAppWindow = window;
        helpWindow.onClosed.addListener( _.bind(this.help_window_closed, this) )
    },
    help_window_closed: function() {
        this.help_window = null
    },
    set_default_download_location: function(entry) {
        if (! entry) {
            this.createNotification({details:jstorrent.strings.NOTIFY_HOW_TO_CHANGE_DOWNLOAD_DIR})
            return
        }
        //console.log("Set default download location to",entry)
        var s = jstorrent.getLocaleString(jstorrent.strings.NOTIFY_SET_DOWNLOAD_DIR, entry.name)
        this.createNotification({details:s, priority:0})
        var disk = new jstorrent.Disk({entry:entry, parent: this.client.disks})
        this.client.disks.add(disk)
        this.client.disks.setAttribute('default',disk.get_key())
        this.client.disks.save()
    },
    notify: function(msg) {
        this.createNotification({details:msg, priority:0})
        console.warn('notification:',msg);
    },
    initialize: function(callback) {
        this.options.load( _.bind(function() {
            this.initialize_client()
            this.client.on('ready', function() {
                callback()
            })
            if (jstorrent.options.load_options_on_start) { this.focus_or_open_options() }
        },this))
    }
}