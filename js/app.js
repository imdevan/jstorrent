// this file should probably be in "gui"

// rather should have a better separation ...

function App() {

    chrome.system.storage.onAttached.addListener( _.bind(this.external_storage_attached, this) )
    chrome.system.storage.onDetached.addListener( _.bind(this.external_storage_detached, this) )

    this.options_window = null
    this.options = new jstorrent.Options({app:this});
    this.download_location = null
    this.client = new jstorrent.Client({app:this, id:'client01'});
    this.client.on('error', _.bind(this.onClientError, this))

    this.popupwindowdialog = null // what it multiple are triggered? do we queue up the messages?
    // maybe use notifications instead... ( or in addition ... )

    chrome.notifications.onClicked.addListener(_.bind(this.notificationClicked, this))

    this.UI = null
}

jstorrent.App = App

App.prototype = {
    registerExtensionMessageRequest: function(request) {
        // check if client is ready for this, even...
        console.log('got request from contextmenu extension',request)
        this.client.addFromContextMenuExtension(request)
    },
    notificationClicked: function(notificationId) {
        console.log('clicked on notification with id',notificationId)
    },
    showPopupWindowDialog: function(message, details) {
        var opts = {
            type: "basic",
            title: message,
            message: details,
            iconUrl: "/icon48.png"
        }
        chrome.notifications.create('myid', opts, function(notificationId) {
            console.log('created notification with id',notificationId)
        })
    },
    onClientError: function(evt, e) {
        // display a popup window with the error information
        this.showPopupWindowDialog('JSTorrent Error', e)
    },
    set_ui: function(UI) {
        this.UI = UI
    },
    handleDrop: function(evt) {
        console.log('handleDrop')
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
    toolbar_start: function() {
        var torrents = this.UI.get_selected_torrents()
        for (var i=0; i<torrents.length; i++) {
            torrents[i].start()
        }
    },
    toolbar_stop: function() {
        var torrents = this.UI.get_selected_torrents()
        for (var i=0; i<torrents.length; i++) {
            torrents[i].stop()
        }
    },
    toolbar_remove: function() {
        var torrents = this.UI.get_selected_torrents()
        this.UI.torrenttable.grid.setSelectedRows([])
        for (var i=0; i<torrents.length; i++) {
            torrents[i].remove()
        }
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
                                    height: 400 },
                                  _.bind(this.options_window_opened, this)
                                );
    },
    options_window_opened: function(optionsWindow) {
        this.options_window_opening = false
        this.options_window = optionsWindow
        optionsWindow.contentWindow.mainAppWindow = window;
        optionsWindow.onClosed.addListener( _.bind(this.options_window_closed, this) )
    },
    options_window_closed: function() {
        this.options_window = null
    },
    focus_or_open_help: function() {
        if (this.help_window) { 
            this.help_window.focus();
            console.log('help already open'); return;
        }

        this.help_window_opening = true
        chrome.app.window.create( 'gui/help.html', 
                                  { width: 520,
                                    height: 480 },
                                  _.bind(this.help_window_opened, this)
                                );
    },
    help_window_opened: function(helpWindow) {
        this.help_window_opening = false
        this.help_window = helpWindow
        helpWindow.contentWindow.mainAppWindow = window;
        helpWindow.onClosed.addListener( _.bind(this.help_window_closed, this) )
    },
    help_window_closed: function() {
        this.help_window = null
    },
    set_default_download_location: function(entry) {
        console.log("Set default download location to",entry)
        var disk = new jstorrent.Disk({entry:entry})
        this.client.disks.add(disk)
        this.client.disks.setAttribute('default',disk.get_key())
        this.client.disks.save()
        //this.download_location = entry
    },
    notify: function(msg) {
        console.warn('notification:',msg);
    },
    initialize: function(callback) {
        this.options.load( _.bind(function() {
            callback()
            if (jstorrent.options.load_options_on_start) { this.focus_or_open_options() }
        },this))
    }
}