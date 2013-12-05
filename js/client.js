// torrent client !

function Client(opts) {
    this.torrents = new jstorrent.Collection({client:this, itemClass: jstorrent.Torrent})
    this.app = opts.app

    this.peeridbytes = []
    for (var i=0; i<20; i++) {
        this.peeridbytes.push( 
            Math.floor( Math.random() * 256 )
        )
    }
    setInterval( _.bind(this.frame,this), 1000 )
}

Client.prototype = {
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
        } else if (this.has_torrent(torrent)) {
	    // we already had this torrent, maybe add the trackers to it...
	} else {
	    this.add_torrent( torrent )
	    torrent.start()
	}
    },
    has_torrent: function(torrent) {
	return this.torrents.get(this.hashhexlower) !== undefined
    },
    add_torrent: function(torrent) {
	this.torrents.set( torrent.hashhexlower, torrent )
    },
    frame: function() {
        // TODO -- only do a frame when there is at least one started torrent
        this.torrents.each( function(torrent) {
            torrent.frame()
        })
    }
}

jstorrent.Client = Client