var app_options = {
    'sync_torrents': {
        'default': false,
        'enabled':false,
        'type':'bool',
        'description': 'your list of torrents will be synchronized across your devices'
    },

    'show_notifications': {
        'default':true,
        'type':'bool'
    },

    'default_download_location': {
        'default':null,
        'type':'JSON',
        'description':'where torrents download to'
    },

    'new_torrent_show_dialog': {
        'default': true,
        'type':'bool',
        'description':'whether to show a dialog when adding a new torrent'
    },

    'maxconns': {
        'default': 12,
        'type':'int'
    },

    'new_torrents_auto_start': {
        'default': true,
        'type': 'bool'
    },

    'max_unflushed_piece_data': {
//        'default': 16384 * 20, // needs to be much larger, or else we will get "stuck" a lot...
        'default': 4, // needs to be much larger, or else we will get "stuck" a lot...
        // i.e. store up to 4 complete pieces in RAM
        // this actually needs to be a multiple of each piece chunk size..
        'type': 'int'
    }
    
}


function Options(opts) {
    // TODO -- refactor this to be a collection and each option an item...
    this.data = null
    this.app = opts && opts.app
}

jstorrent.Options = Options

Options.prototype = {
    get: function(k) {
        // gets from cached copy, so synchronous
        var val = this.data[k]
        if (val === undefined && app_options[k] && app_options[k]['default']) {
            return app_options[k]['default']
        }
    },
    set: function(k,v) {
        this.data[k] = v
        var obj = {}
        obj[k]=v;
        chrome.storage.local.set(obj)
    },
    load: function(callback) {
        chrome.storage.local.get('options', _.bind(this.options_loaded, this, callback))
    },
    options_loaded: function(callback, data) {
        //console.log('options loaded',data);
        this.data = data
        callback()
    },
    on_choose_download_directory: function(entry) {
        var retain_string = chrome.fileSystem.retainEntry(entry);
        console.log('user choose download directory',entry, 'retain string:',retain_string)
/*
        this.set('default_download_location',
                        {retainEntryId: retain_string,
                         name: entry.name,
                         fullPath: entry.fullPath}
                       )
*/
        if (this.app) {

        } else {
            //mainAppWindow.app.download_location = entry
            mainAppWindow.app.set_default_download_location(entry);
        }
    }
}


