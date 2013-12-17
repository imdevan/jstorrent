// torrent client !

function Client(opts) {
    jstorrent.Item.apply(this, arguments)
    /* 
       initializing the client does several async things
       - fetch several local storage items)
       - calls retainEntry for each disk

       want a callback for when all that is done
    */

    this.ready = false
    this.app = opts.app
    this.id = opts.id

    this.torrents = new jstorrent.Collection({__name__: 'Torrents', parent:this, client:this, itemClass: jstorrent.Torrent})
    this.torrents.on('add', _.bind(this.onTorrentAdd, this))

    this.disks = new jstorrent.Collection({__name__: 'Disks', parent:this, client:this, itemClass: jstorrent.Disk})
    //console.log('fetching disks')
    this.disks.fetch(_.bind(function() {
        if (this.disks.items.length == 0) {
            this.app.notifyNeedDownloadDirectory()
        }
        this.torrents.fetch(_.bind(function() {
            this.ready = true
            this.trigger('ready')
        },this))
    },this))

    // workerthread is used for SHA1 hashing data chunks so that it
    // doesn't cause the UI to be laggy. If UI is already in its own
    // thread, we probably still want to do this anyway, because it is
    // more paralellizable (though it is causing lots of ArrayBuffer
    // copies... hmm). Perhaps do some performance tests on this.
    this.workerthread = new jstorrent.WorkerThread({client:this});

    this.peeridbytes = []
    for (var i=0; i<20; i++) {
        this.peeridbytes.push( 
            Math.floor( Math.random() * 256 )
        )
    }
    //this.interval = setInterval( _.bind(this.frame,this), 1000 ) // try to only to edge triggered so that background page can go to slep

    this.on('error', _.bind(this.onError, this))
    this.on('ready', _.bind(this.onReady, this))
}

Client.prototype = {
    onBatchTimeout: function(keys) {
        // TODO -- implement
        console.log('onBatchTimeout',keys)
    },
    onTorrentAdd: function(torrent) {
        if (this.app.options.get('new_torrents_auto_start')) { // only for NEW torrents, dummy
            if (torrent._opts.initializedBy != 'collection.fetch') {
                torrent.start()
            }
        }
    },
    onReady: function() {
        var item
        if (window.jstorrent_launchData) {
            while (true) {
                item = window.jstorrent_launchData.pop()
                if (! item) { break }
                this.handleLaunchData(item)
            }
        }
    },
    handleLaunchData: function(launchData) {
        var item
        // check if client is ready for this, even...
        //console.log('handle launch data',launchData)
        if (launchData.type == 'onMessageExternal') {
            var request = launchData.request
            this.add_from_url(request.url)
        } else if (launchData.type == 'onLaunched') {
            if (launchData.launchData.items && launchData.launchData.items.length > 0) {
                for (var i=0; i<launchData.launchData.items.length; i++) {
                    item = launchData.launchData.items[i]
                    console.log('APP HANDLE LAUNCH ENTRY',item)
                    this.handleLaunchWithItem(item)
                }
            }
        } else if (launchData.type == 'drop') {
            this.handleLaunchWithItem(item)
        } else {
            debugger
        }
    },
    handleLaunchWithItem: function(item) {
        if (item.type == "application/x-bittorrent") {
            console.log('have a bittorrent file... hrm whattodo',item.entry)

            var entry = item.entry
            
            var torrent = new jstorrent.Torrent({entry:item.entry,
                                                 itemClass:jstorrent.Torrent,
                                                 parent:this.torrents,
                                                 attributes: {added: new Date()},
                                                 callback: _.bind(function(result) {
                                                     if (result.torrent) {
                                                         if (! this.torrents.containsKey(result.torrent.hashhexlower)) {
                                                             this.torrents.add(result.torrent)
                                                             result.torrent.save()
                                                             this.torrents.save()
                                                         } else {
                                                             this.trigger('error','already had this torrent')
                                                         }
                                                     } else {
                                                         console.error('error initializing torrent from entry', result)
                                                         this.trigger('error',result)
                                                     }
                                                 },this)
                                                })
            

        }
    },
    error: function(msg) {
        this.trigger('error',msg)
    },
    onError: function(e) {
        console.error('client error',e)
        // app binds to our error and shows notification
    },
    stop: function() {
        clearInterval( this.interval )
    },
    set_ui: function(ui) {
        this.ui = ui
    },
    add_from_url_response: function(data) {
        if (data.torrent) {
            if (! this.torrents.containsKey(data.torrent.hashhexlower)) {
                this.torrents.add( data.torrent )
                this.torrents.save()


            }
        } else {
            console.error('add url response',data)
        }
    },
    add_from_url: function(url) {
        // adds a torrent from a text input url
        app.analytics.tracker.sendEvent("Torrent", "Add", "URL")
        // parse url
        console.log('client add by url',url)

        // valid url?
        var torrent = new jstorrent.Torrent({url:url,
                                             itemClass: jstorrent.Torrent,
                                             attributes:{added:new Date()},
                                             callback: _.bind(this.add_from_url_response,this),
                                             parent:this.torrents})

        if (torrent.invalid) {
            app.notify('torrent url invalid');
        } else if (! torrent.magnet_info) {
            //app.notify("Downloading Torrent...")
        } else if (this.torrents.contains(torrent)) {
            console.warn('already have this torrent!')
            // we already had this torrent, maybe add the trackers to it...
        } else {
            this.torrents.add( torrent )
            this.torrents.save()
            //torrent.save()
        }
    },
    frame: function() {
        // TODO -- only do a frame when there is at least one started torrent
        this.torrents.each( function(torrent) {
            torrent.frame()
        })
    }
}

jstorrent.Client = Client

for (var method in jstorrent.Item.prototype) {
    jstorrent.Client.prototype[method] = jstorrent.Item.prototype[method]
}
