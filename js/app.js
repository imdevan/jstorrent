function App() {

    chrome.system.storage.onAttached.addListener( _.bind(this.external_storage_attached, this) )
    chrome.system.storage.onDetached.addListener( _.bind(this.external_storage_detached, this) )

    this.options_window = null
    this.options = new jstorrent.Options({app:this});
    this.download_location = null
}

jstorrent.App = App

App.prototype = {
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
    set_default_download_location: function(entry) {
        console.log("Set default download location to",entry)
        this.download_location = entry
    },
    notify: function(msg) {
        console.warn('notification:',msg);
    },
    initialize: function(callback) {
        this.options.load( _.bind(function() {
            callback()
            if (jstorrent.options.load_options_on_start) { this.focus_or_open_options() }
        },this))
    },
    get_client: function() {
        var client = new jstorrent.Client({app:this});
        return client
    }
}