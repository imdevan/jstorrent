function parse_magnet(url) {
    var uri = url.slice(url.indexOf(':')+2)
    var parts = uri.split('&');
    var kv, k, v
    var d = {};
    for (var i=0; i<parts.length; i++) {
        kv = parts[i].split('=');
        k = decodeURIComponent(kv[0]);
        v = decodeURIComponent(kv[1]);
        if (! d[k]) d[k] = []
        d[k].push(v);
    }
    var xt = d.xt[0].split(':');
    var hash = xt[xt.length-1];
    d['hashhex'] = hash.toLowerCase()
    return d;
}


function Torrent(opts) {
    this.client = opts.client;
    this.hashhex = null
    this.hashbytes = null
    this.magnet_info = null
    this.trackers = null
    this.swarm = new Swarm({torrent:this});
    

    if (opts.url) {
	// initialize torrent from a URL...

	// parse trackers

	this.magnet_info = parse_magnet(opts.url);
	this.hashhex = this.magnet_info.hashhex

        this.hashbytes = []
        for (var i=0; i<20; i++) {
            this.hashbytes.push(
                parseInt(this.hashhex.slice(i*2, i*2 + 2), 16)
            )
        }
    }
    console.log('inited torrent',this)
}
jstorrent.Torrent = Torrent

Torrent.prototype = {
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
	console.log('torrent start')
	if (! this.trackers) {
	    // initialize my trackers
	    this.initialize_trackers()
	}

	this.trackers[0].announce(); 
	return;

	for (var i=0; i<this.trackers.length; i++) {
	    this.trackers[i].announce()
	}
    }
}
