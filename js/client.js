// torrent client !

function Client(opts) {
    this.app = opts.app

    this.torrents = new jstorrent.Collection({client:this, itemClass: jstorrent.Torrent})

    // has methods for writing and reading to disk
    this.diskio = new jstorrent.DiskIO({client:this})

    // able to retreive piece data from a cache
    this.diskcache = new jstorrent.DiskCache({client:this})

    this.peeridbytes = []
    for (var i=0; i<20; i++) {
        this.peeridbytes.push( 
            Math.floor( Math.random() * 256 )
        )
    }
    this.interval = setInterval( _.bind(this.frame,this), 1000 )
}

Client.prototype = {
    stop: function() {
        clearInterval( this.interval )
    },
    set_ui: function(ui) {
        this.ui = ui
    },
    add_from_url: function(url) {
        // adds a torrent from a text input url

        // parse url
        console.log('client add by url',url)

        // valid url?
        var torrent = new jstorrent.Torrent({url:url, client:this})

        if (torrent.invalid) {
            app.notify('torrent url invalid');
        } else if (this.torrents.contains(torrent)) {
            console.warn('already have this torrent!')
            // we already had this torrent, maybe add the trackers to it...
        } else {
            this.torrents.add( torrent )
            if (this.app.options.get('new_torrents_auto_start')) {
                torrent.start()
            }
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