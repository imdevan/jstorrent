
function Torrent(opts) {
    jstorrent.Item.apply(this, arguments)

    this.client = opts.client;
    this.hashhexlower = null
    this.hashbytes = null
    this.magnet_info = null
    this.trackers = null
    this.invalid = false;
    this.started = false;

    // attributes ...
    // this.size = null
    // this.percent = null

    //this.numpeers = null // derived attribute
    //this.numswarm = null // derived attribute
    this.settings = new jstorrent.TorrentSettings({torrent:this})

    this.swarm = new jstorrent.Collection({torrent:this, itemClass:jstorrent.Peer})
    this.peers = new jstorrent.PeerConnections({torrent:this, itemClass:jstorrent.Peer})
    this.peers.on('connect_timeout', _.bind(this.on_peer_connect_timeout,this))
    this.peers.on('error', _.bind(this.on_peer_error,this))
    this.peers.on('disconnect', _.bind(this.on_peer_disconnect,this))

    if (opts.url) {
	// initialize torrent from a URL...

	// parse trackers

	this.magnet_info = parse_magnet(opts.url);
        if (! this.magnet_info) {
            this.invalid = true;
            return
        }

        if (this.magnet_info.dn) {
            this.set('name', this.magnet_info.dn[0])
        }

	this.hashhexlower = this.magnet_info.hashhexlower

        this.hashbytes = []
        for (var i=0; i<20; i++) {
            this.hashbytes.push(
                parseInt(this.hashhexlower.slice(i*2, i*2 + 2), 16)
            )
        }
    }
    console.log('inited torrent',this)
}
jstorrent.Torrent = Torrent

Torrent.prototype = {
    on_peer_connect_timeout: function(peer) {
        console.log('peer connect timeout...')
        if (!this.peers.contains(peer)) {
            console.warn('peer wasnt in list')
        } else {
            this.peers.remove(peer)
        }
    },
    on_peer_error: function(peer) {
        console.log('peer error...')
        if (!this.peers.contains(peer)) {
            console.warn('peer wasnt in list')
        } else {
            this.peers.remove(peer)
        }
    },
    on_peer_disconnect: function(peer) {
        console.log('peer disconnect...')
        if (!this.peers.contains(peer)) {
            console.warn('peer wasnt in list')
        } else {
            this.peers.remove(peer)
        }
    },
    initialize_trackers: function() {
	this.trackers = []
	var url
	if (this.magnet_info && this.magnet_info.tr) {
	    for (var i=0; i<this.magnet_info.tr.length; i++) {
		url = this.magnet_info.tr[i];
		if (url.toLowerCase().match('^udp')) {
		    this.trackers.push( new jstorrent.UDPTracker( {url:url, torrent: this} ) )
		} else {
		    this.trackers.push( new jstorrent.HTTPTracker( {url:url, torrent: this} ) )
		}

	    }
	}
    },
    start: function() {
        this.set('state','started')
        this.started = true
	console.log('torrent start')
	if (! this.trackers) {
	    // initialize my trackers
	    this.initialize_trackers()
	}

        // todo // check if should re-announce, etc etc
	this.trackers[4].announce(); 
	return;

	for (var i=0; i<this.trackers.length; i++) {
	    this.trackers[i].announce()
	}
    },
    frame: function() {
        if (! this.started) { return }
        //console.log('torrent frame!')

        if (this.should_add_peers() && this.swarm.length > 0) {
            var idx = Math.floor( Math.random() * this.swarm.length )
            var peer = this.swarm.get_at(idx)
            console.log('should add peer!', idx, peer)
            if (! this.peers.contains(peer)) {
                this.peers.add( peer )
                peer.connect()
            }

        }

    },
    should_add_peers: function() {
        if (this.started) {
            var maxconns = this.get('maxconns') || this.client.app.options.get('maxconns')
            if (this.peers.length < maxconns) {
                return true
            }
        }
    },
    get_key: function() {
        return this.hashhexlower
    }
}

for (var method in jstorrent.Item.prototype) {
    jstorrent.Torrent.prototype[method] = jstorrent.Item.prototype[method]
}
