function Torrent(opts) {
    jstorrent.Item.apply(this, arguments)

    this.client = opts.client;
    this.hashhexlower = null
    this.hashbytes = null
    this.magnet_info = null

    this.invalid = false;
    this.started = false;

    this.metadata = null
    this.infodict = null
    this.infodict_buffer = null

    this.unflushedPieceDataSize = 0

    this.pieceLength = null
    this.multifile = null
    this.fileOffsets = []
    this.size = null
    this.numPieces = null
    this.numFiles = null
    this.bitfield = null
    this.bitfieldFirstMissing = null // first index where a piece is missing

    this.settings = new jstorrent.TorrentSettings({torrent:this})

    this.trackers = new jstorrent.Collection({torrent:this, itemClass:jstorrent.Tracker})
    this.swarm = new jstorrent.Collection({torrent:this, itemClass:jstorrent.Peer})
    this.peers = new jstorrent.PeerConnections({torrent:this, itemClass:jstorrent.PeerConnection})
    this.pieces = new jstorrent.Collection({torrent:this, itemClass:jstorrent.Piece})
    this.files = new jstorrent.Collection({torrent:this, itemClass:jstorrent.File})

    this.connectionsServingInfodict = [] // maybe use a collection class for this instead
    this.connectionsServingInfodictLimit = 3 // only request concurrently infodict from 3 peers

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

        if (this.magnet_info.tr) {
	    // initialize my trackers
	    this.initialize_trackers()
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
    getFile: function(num) {
        var file
        if (this.files.get(num)) {
            file = this.files.get(num)
        } else {
            file = new jstorrent.File({torrent:this, num:num})
            this.files.add(file)
        }
        return file
    },
    getPieceSize: function(num) {
        if (num == this.numPieces - 1) {
            return this.size - this.pieceLength * num
        } else {
            return this.pieceLength
            //return this.infodict['piece length']
        }
    },
    getPiece: function(num) {
        var piece
        if (this.pieces.get(num)) {
            piece = this.pieces.get(num)
        } else {
            piece = new jstorrent.Piece({torrent:this, num:num})
            this.pieces.add(piece)
        }
        return piece
    },
    metadataPresentInitialize: function() {
        // call this when infodict is newly available
        this.numPieces = this.infodict.pieces.length/20
        this.bitfield = new Uint8Array(this.numPieces)
        this.bitfieldFirstMissing = 0
        this.pieceLength = this.infodict['piece length']
        if (this.infodict.files) {
            this.multifile = true
            this.numFiles = this.infodict.files.length
            this.size = 0
            for (var i=0; i<this.numFiles; i++) {
                this.fileOffsets.push(this.size)
                this.size += this.infodict.files[i].length
            }
        } else {
            this.fileOffsets = [0]
            this.numFiles = 1
            this.multifile = false
            this.size = this.infodict.length
        }
        this.recheckData()
    },
    getPieceData: function(pieceNum, offset, size, callback) {
        // used for serving PIECE requests

        var cachehit = this.client.diskcache.checkHave(pieceNum, offset, size)
        if (cachehit) {
            var data = this.client.diskcache.retreiveFromCache(pieceNum, offset, size)
            callback(data)
        } else {
            var piece = this.getPiece(pieceNum)


            piece.getSpanningFilesData(offset, size, function(spanningFilesData) {
                // more useful function :-)
            })

            // create diskIO jobs for each file
            
        }

        
    },
    persistPieceResult: function(result) {
        if (result.error) {
            console.error('persist piece result',result)
        } else {
            console.log('persisted piece!')
            this.unflushedPieceDataSize -= result.piece.size
            //console.log('--decrement unflushedPieceDataSize', this.unflushedPieceDataSize)
            this.bitfield[result.piece.num] = 1

            var foundmissing = false
            for (var i=this.bitfieldFirstMissing; i<this.bitfield.length; i++) {
                if (this.bitfield[i] == 0) {
                    this.bitfieldFirstMissing = i
                    foundmissing = true
                    break
                }
            }
            if (! foundmissing) {
                console.log('%cTORRENT DONE?','color:#f0f')

                // send everybody NOT_INTERESTED!
                for (var i=0; i<this.peers.items.length; i++) {
                    this.peers.items[i].sendMessage("NOT_INTERESTED")
                }


            }
            // send HAVE message to all connected peers
            var payload,v
            for (var i=0; i<this.peers.items.length; i++) {
                payload = new Uint8Array(4)
                v = new DataView(payload.buffer)
                v.setUint32(0,result.piece.num)
                this.peers.items[i].sendMessage("HAVE", [payload.buffer])
            }
        }
    },
    persistPiece: function(piece) {
        // saves this piece to disk, and update our bitfield.
        var storage = this.getStorage()
        if (storage) {
            storage.diskio.writePiece(piece, _.bind(this.persistPieceResult,this))
        } else {
            this.error('Storage missing')
        }
    },
    getStorage: function() {
        var disk = this.get('disk')
        if (! disk) {
            var disk = this.client.disks.getAttribute('default')
        }

        var storage = this.client.disks.get(disk)
        if (storage) { return storage }
    },
    recheckData: function() {
        // checks registered or default torrent download location for
        // torrent data
        console.log('Re-check data')
    },
    on_peer_connect_timeout: function(peer) {
        // TODO -- fix this up so it doesn't get triggered unneccesarily
        //console.log('peer connect timeout...')
        if (!this.peers.contains(peer)) {
            //console.warn('peer wasnt in list')
        } else {
            this.peers.remove(peer)
        }
    },
    has_infodict: function() {
        return this.infodict ? true : false
    },
    error: function(msg) {
        this.set('state','error')
        this.lasterror = msg
        console.error('torrent error:',msg)
        this.started = false
    },
    on_peer_error: function(peer) {
        //console.log('on_peer error')
        if (!this.peers.contains(peer)) {
            //console.warn('peer wasnt in list')
        } else {
            this.peers.remove(peer)
        }
    },
    on_peer_disconnect: function(peer) {
        //console.log('peer disconnect...')
        if (!this.peers.contains(peer)) {
            //console.warn('peer wasnt in list')
        } else {
            this.peers.remove(peer)
        }
    },
    initialize_trackers: function() {
	var url, tracker
	if (this.magnet_info && this.magnet_info.tr) {
	    for (var i=0; i<this.magnet_info.tr.length; i++) {
		url = this.magnet_info.tr[i];
		if (url.toLowerCase().match('^udp')) {
                    tracker = new jstorrent.UDPTracker( {url:url, torrent: this} )
		} else {
                    tracker = new jstorrent.HTTPTracker( {url:url, torrent: this} )
		}
		this.trackers.add( tracker )
	    }
	}
    },
    start: function() {
        if (! this.getStorage()) {
            this.error('Disk Missing')
            return
        }
        this.set('state','started')
        this.started = true
	console.log('torrent start')

        // todo // check if should re-announce, etc etc
	//this.trackers.get_at(4).announce(); 
	//return;

        if (! jstorrent.options.disable_trackers) {
	    for (var i=0; i<this.trackers.length; i++) {
	        this.trackers.get_at(i).announce()
	    }
        }
        if (jstorrent.options.manual_peer_connect_on_start) {
            var hosts = jstorrent.options.manual_peer_connect_on_start[this.hashhexlower]
            if (hosts) {
                for (var i=0; i<hosts.length; i++) {
                    var host = hosts[i]
                    var peer = new jstorrent.Peer({torrent: this, host:host.split(':')[0], port:parseInt(host.split(':')[1])})
                    this.swarm.add(peer)
                }
            }
        }
    },
    stop: function() {
        this.set('state','stopped')
        this.started = false
    },
    remove: function() {
        this.stop()
        this.client.torrents.remove(this)
    },
    frame: function() {
        if (! this.started) { return }
        //console.log('torrent frame!')

        if (this.should_add_peers() && this.swarm.length > 0) {
            var idx = Math.floor( Math.random() * this.swarm.length )
            var peer = this.swarm.get_at(idx)

            var peerconn = new jstorrent.PeerConnection({peer:peer})
            //console.log('should add peer!', idx, peer)
            if (! this.peers.contains(peerconn)) {
                if (peer.get('only_connect_once')) { return }
                this.peers.add( peerconn )
                peerconn.connect()
            }
            peer.set('only_connect_once',true)
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
