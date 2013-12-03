// torrent client !

function Client(opts) {
    this.torrents = {}

    this.peeridbytes = []
    for (var i=0; i<20; i++) {
        this.peeridbytes.push( 
            Math.floor( Math.random() * 256 )
        )
    }
}

Client.prototype = {
    add_from_url: function(url) {
	// adds a torrent from a text input url

	// parse url
	console.log('client add by url',url)

	var torrent = new jstorrent.Torrent({url:url, client:this})

	if (this.has_torrent(torrent)) {
	    // we already had this torrent, maybe add the trackers to it...
	} else {
	    this.add_torrent( torrent )
	    torrent.start()
	}
    },
    check: function(torrent) {
	console.assert(torrent.hashhex.toLowerCase() == torrent.hashhex)
    },
    has_torrent: function(torrent) {
	this.check(torrent)
	return this.torrents[this.hashhex] !== undefined
    },
    add_torrent: function(torrent) {
	this.check(torrent)
	this.torrents[ torrent.hashhex ] = torrent
    }
}

jstorrent.Client = Client