function Torrent(opts) {
    jstorrent.Item.apply(this, arguments)
    this.__name__ == arguments.callee.name
    this.client = opts.client || opts.parent.parent
    console.assert(this.client)
    this.hashhexlower = null
    this.hashbytes = null
    this.magnet_info = null

    this.invalid = false;
    this.started = false; // get('state') ? 
    this.starting = false

    this.metadata = {}
    this.infodict = null
    this.infodict_buffer = null

    this.unflushedPieceDataSize = 0

    this.pieceLength = null
    this.multifile = null
    this.fileOffsets = []
    this.size = null
    this.numPieces = null
    this.numFiles = null
    // this._attributes.bitfield = null // use _attributes.bitfield for convenience for now...
    this.bitfieldFirstMissing = null // first index where a piece is missing

    this.settings = new jstorrent.TorrentSettings({torrent:this})

    // want to persist trackers too as torrent attribute...
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

    this.think_interval = null

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
            this.initializeTrackers()
        }

        this.hashhexlower = this.magnet_info.hashhexlower

    } else if (opts.id) {
        this.hashhexlower = opts.id
    } else if (opts.entry) {
        // initialize from filesystem entry!
        console.assert(opts.callback)
        this.initializeFromEntry(opts.entry, opts.callback)
    } else {
        console.error('unsupported torrent initializer')
        debugger
    }

    if (opts.entry) {
        console.log('inited torrent without hash known yet!')
    } else {
        console.assert(this.hashhexlower)
        this.hashbytes = []
        for (var i=0; i<20; i++) {
            this.hashbytes.push(
                parseInt(this.hashhexlower.slice(i*2, i*2 + 2), 16)
            )
        }
        //console.log('inited torrent',this.hashhexlower)
    }
}
jstorrent.Torrent = Torrent

//Torrent.persistAttributes = ['bitfield']
Torrent.attributeSerializers = {
    bitfield: {
        serialize: function(v) {
            return v.join('')
        },
        deserialize: function(v) {
            var arr = [], len = v.length
            for (var i=0; i<len; i++) {
                arr.push(parseInt(v[i]))
            }
            return arr
        }
    },
    added: {
        serialize: function(v) {
            return v.getTime()
        },
        deserialize: function(v) {
            return new Date(v)
        }
    }
}

Torrent.prototype = {
    bytesToHashhex: function(arr) {
        console.assert(arr.length == 20)
        var s = ''
        for (var i=0; i<arr.length; i++) {
            s += pad(arr[i].toString(16), '0', 2)
        }
        console.assert(s.length == 40)
        return s
    },
    initializeFromEntry: function(entry, callback) {
        // should we save this as a "disk" ? no... that would be kind of silly. just read out the metadata.
        var _this = this
        var reader = new FileReader;
        reader.onload = _.bind(function(evt) {
            //console.log('read torrent data',evt)

            function onHashResult(result) {
                var hash = result.hash
                if (hash) {
                    //console.log('hashed input torrent file to',hash)
                    _this.hashbytes = ui82arr(hash)
                    _this.hashhexlower = _this.bytesToHashhex(_this.hashbytes).toLowerCase()
                    console.assert(_this.hashhexlower.length == 40)
                    callback({torrent:_this})
                } else {
                    callback({error:'hasher error'})
                }
            }
            try {
                this.metadata = bdecode(ui82str(new Uint8Array(evt.target.result)))
            } catch(e) {
                callback({error:"Invalid torrent file"})
                return
            }
            this.infodict = this.metadata.info
            this.infodict_buffer = new Uint8Array(bencode(this.metadata.info)).buffer
            this.initializeTrackers()
            this.metadataPresentInitialize()
            var chunkData = this.infodict_buffer
            this.client.workerthread.send( { command: 'hashChunks',
                                             chunks: [chunkData] }, onHashResult )
        },this)
        reader.onerror = _.bind(function(evt) {
            // TODO -- maybe cause a notification, with level
            console.error('error reading handleLaunchWithItem',evt)
            callback({error:'FileReader error'})
        },this)
        entry.file( function(file) {
            reader.readAsArrayBuffer(file)
        })
    },
    onRestore: function() {
        // called when item is loaded on app restart

/* done in initializer now
        if (this.parent) {
            this.client = this.parent.parent
        }
*/

        if (this.get('state' ) == 'started') {
            this.start()
        }
    },
    getPiece: function(num) {
        var piece = this.pieces.get(num)
        if (! piece) {
            piece = new jstorrent.Piece({torrent:this, shouldPersist:false, num:num})
            this.pieces.add(piece)
        }
        return piece
    },
    getFile: function(num) {
        var file = this.files.get(num)
        if (! file) {
            file = new jstorrent.File({torrent:this, shouldPersist:false, num:num})
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
    metadataPresentInitialize: function() { // i.e. postMetadataReceived
        // call this when infodict is newly available
        this.connectionsServingInfodict = []

        this.numPieces = this.infodict.pieces.length/20
        if (! this._attributes.bitfield) {
            this._attributes.bitfield = ui82arr(new Uint8Array(this.numPieces))
        } else {
            console.assert( this._attributes.bitfield.length == this.numPieces )
        }
        this.bitfieldFirstMissing = 0 // should fix this/set this correctly, but itll fix itself
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
        this.set('name', this.infodict.name)
        this.set('size',this.size)

        for (var i=0; i<this.peers.items.length; i++) {
            // send new extension handshake to everybody, because now it has ut_metadata...
            this.peers.items[i].sendExtensionHandshake()
            this.peers.items[i].newStateThink() // in case we dont send them extension handshake because they dont advertise the bit
        }
        this.set('metadata',true)
        this.save()
        this.saveMetadata() // trackers maybe not initialized so they arent being saved...
        this.recheckData()
    },
    getMetadataFilename: function() {
        return this.get('name') + '.torrent'
    },
    loadMetadataEntry: function(callback) {
        var storage = this.getStorage()
        if (! storage) {
            callback({error:'disk missing'})
        } else {
            storage.entry.getFile( this.getMetadataFilename(), null, function(entry) {
                if (entry) {
                    callback({success:true, entry:entry})
                } else {
                    callback({error:'file missing'})
                }
            })
        }
    },
    saveMetadata: function(callback) {
        var filename = this.getMetadataFilename()
        // save metadata (i.e. .torrent file) to disk
        var storage = this.getStorage()
        var _this = this
        if (! storage) {
            this.error('disk missing')
            if (callback) {
                callback({error:'disk missing'})
            }
        } else {
            storage.entry.getFile( filename, {create:true}, function(entry) {
                entry.createWriter(function(writer) {
                    writer.onwrite = function(evt) {
                        //console.log('wrote torrent metadata')
                        if (callback){ callback({wrote:true}) }
                    }
                    writer.onerror = function(evt) {
                        console.error('error writing torrent metadata')
                        if (callback){ callback({error:true}) }
                    }
                    var data = new Uint8Array(bencode(_this.metadata))
                    writer.write(new Blob([data]))
                })
            })
        }
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
    getPercentComplete: function() {
        var count = 0
        for (var i=0; i<this._attributes.bitfield.length; i++) {
            count += this._attributes.bitfield[i]
        }
        var val = count / this.numPieces
        return val
    },
    persistPieceResult: function(result) {
        if (result.error) {
            console.error('persist piece result',result)
            this.error('error persisting piece: ' + result.error)
        } else {
            // clean up all registered chunk requests
            result.piece.notifyPiecePersisted()
            //console.log('persisted piece!')
            this.unflushedPieceDataSize -= result.piece.size
            //console.log('--decrement unflushedPieceDataSize', this.unflushedPieceDataSize)
            this._attributes.bitfield[result.piece.num] = 1

            var foundmissing = false
            for (var i=this.bitfieldFirstMissing; i<this._attributes.bitfield.length; i++) {
                if (this._attributes.bitfield[i] == 0) {
                    this.bitfieldFirstMissing = i
                    foundmissing = true
                    break
                }
            }
            if (! foundmissing) {
                console.log('%cTORRENT DONE?','color:#f0f')

                // TODO -- turn this into progress notification type
                this.client.app.createNotification({details:"Torrent finished! " + this.get('name')})

                // send everybody NOT_INTERESTED!
                for (var i=0; i<this.peers.items.length; i++) {
                    this.peers.items[i].sendMessage("NOT_INTERESTED")
                }
            }
            // send HAVE message to all connected peers
            payload = new Uint8Array(4)
            var v = new DataView(payload.buffer)
            v.setUint32(0,result.piece.num)

            for (var i=0; i<this.peers.items.length; i++) {
                if (this.peers.items[i].peerHandshake) {
                    this.peers.items[i].sendMessage("HAVE", [payload.buffer])
                }

            }
        }
        this.set('complete', this.getPercentComplete())
        this.trigger('progress')
        this.save()
    },
    checkPieceChunkTimeouts: function(pieceNum, chunkNums) {
        // XXX this timeout will get called even if this torrent was removed and its data .reset()'d

        //console.log('checkPieceChunkTimeouts',pieceNum,chunkNums)
        if (this._attributes.bitfield[pieceNum]) { return }
        if (this.pieces.keyeditems[pieceNum]) {
            this.getPiece(pieceNum).checkChunkTimeouts(chunkNums)
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
        if (storage) { 
            if (! this.get('disk')) {
                this.set('disk',storage.get_key())
                this.save()
            }
            return storage
        }
    },
    recheckData: function() {
        // checks registered or default torrent download location for
        // torrent data
        // this.set('complete',0)
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
    initializeFiles: function() {
        var file
        if (this.infodict) {
            for (var i=0; i<this.numFiles; i++) {
                if (! this.files.items[i]) {
                    file = this.getFile(i)
                }
            }
        }
    },
    has_infodict: function() {
        return this.infodict ? true : false
    },
    error: function(msg) {
        this.set('state','error')
        this.lasterror = msg
        console.error('torrent error:',msg)
        this.client.app.notifyNeedDownloadDirectory()
        this.started = false
        this.starting = false
        this.save()
    },
    on_peer_error: function(peer) {
        //console.log('on_peer error')
        if (!this.peers.contains(peer)) {
            //console.warn('peer wasnt in list')
        } else {
            this.peers.remove(peer)
            this.set('numpeers',this.peers.items.length)
        }
    },
    on_peer_disconnect: function(peer) {
        // called by .close()
        // later onWrites may call on_peer_error, also
        //console.log('peer disconnect...')

        // XXX - for some reason .close() on the peer is not triggering this?

        if (!this.peers.contains(peer)) {
            //console.warn('peer wasnt in list')
        } else {
            this.peers.remove(peer)
            this.set('numpeers',this.peers.items.length)
        }
    },
    initializeTrackers: function() {
        var url, tracker
        var announce_list = []
        if (this.magnet_info && this.magnet_info.tr) {
            for (var i=0; i<this.magnet_info.tr.length; i++) {
                url = this.magnet_info.tr[i];
                if (url.toLowerCase().match('^udp')) {
                    tracker = new jstorrent.UDPTracker( {url:url, torrent: this} )
                } else {
                    tracker = new jstorrent.HTTPTracker( {url:url, torrent: this} )
                }
                announce_list.push( url )
                this.trackers.add( tracker )
            }
            // trackers are stored in "tiers", whatever. magnet links
            // dont support that. put all in first tier.
            this.metadata['announce-list'] = [announce_list]
        }

        var urls = []
        var url
        if (this.metadata) {
            if (this.metadata.announce) {
                url = this.metadata.announce
                urls.push(url)
            } else if (this.metadata['announce-list']) {
                for (var tier in this.metadata['announce-list']) {
                    for (var i=0; i<this.metadata['announce-list'][tier].length; i++) {
                        urls.push( this.metadata['announce-list'][tier][i] )
                    }
                }
            }

            for (var i=0; i<urls.length; i++) {
                url = urls[i]
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
        if (this.started || this.starting) { return }
        this.starting = true
        this.think_interval = setInterval( _.bind(this.newStateThink, this), 1000 )
        if (! this.getStorage()) {
            this.error('Disk Missing')
            return
        }

        if (this.get('metadata') && ! this.infodict) {
            this.loadMetadataEntry( _.bind(function(result) {
                //console.log('metadataentry',result)
                if (result && result.entry) {
                    this.initializeFromEntry(result.entry, _.bind(function(initResult) {
                        if (initResult.error) {
                            this.error(initResult.error)
                        } else {
                            this.readyToStart()
                        }
                    },this))
                } else {
                    this.error('unable to load metadata')
                }
            },this))
        } else {
            this.readyToStart()
        }
    },
    readyToStart: function() {
        this.set('state','started')
        this.started = true
        this.starting = false
        this.save()

        // todo // check if should re-announce, etc etc
        //this.trackers.get_at(4).announce(); 
        //return;

        if (jstorrent.options.always_add_special_peer) {
            var host = jstorrent.options.always_add_special_peer
            var peer = new jstorrent.Peer({torrent: this, host:host.split(':')[0], port:parseInt(host.split(':')[1])})
            if (! this.swarm.contains(peer)) {
                this.swarm.add(peer)
            }
        }

        setTimeout( _.bind(function(){
            // HACK delay this a little so manual peers kick in first, before frame
            if (! jstorrent.options.disable_trackers) {
                for (var i=0; i<this.trackers.length; i++) {
                    this.trackers.get_at(i).announce()
                }
            }
        },this), 1000)
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
        this.trigger('start')
        this.newStateThink()
    },
    stop: function() {
        this.starting = false
        if (this.think_interval) { 
            clearInterval(this.think_interval)
            this.think_interval = null
        }
        // prevent newStateThink from reconnecting us
        _.defer( _.bind(function() {
        for (var i=0; i<this.peers.items.length; i++) {
            this.peers.items[i].close('torrent stopped')
        }
        for (var i=0; i<this.pieces.items.length; i++) {
            this.pieces.items[i].resetData()
        }
        },this))
        // TODO -- move these into some kind of resetState function?
        this.pieces.clear()
        this.unflushedPieceDataSize = 0

        this.set('state','stopped')
        this.save()
        this.started = false
    },
    remove: function() {
        this.stop()
        this.set('state','removing')

        // maybe do some other async stuff? clean socket shutdown? what?
        setTimeout( _.bind(function(){
            this.set('state','stopped')
            this.save() // TODO -- clear the entry from storage? nah, just put it in a trash bin
            this.client.torrents.remove(this)
        },this), 200)
    },
    newStateThink: function() {
        /* 

           how does piece requesting work? good question...  each peer
           connection calls newStateThink() whenever some state
           changes.

           the trouble is, it makes sense to store information
           regarding requests for piece chunks on the piece
           object. however, the piece object itself has requests to a
           set of peer connections.

           when a peer disconnects, we need to update the state for
           each piece that has data registered for that peer..

           when a piece is complete, we need to notify each peer
           connection that we no longer need their data.

           so really i should think about all the different use cases
           that need to be satisfied and then determine where it makes
           most sense to store the states.

           hmmm.

        */


        /*

          it seems there are three main cases

          - peer disconnect
          - peer chokes us (more nuanced)
          - piece completed

         */

        if (! this.started) { return }
        //console.log('torrent frame!')

        var idx, peer, peerconn
        if (this.should_add_peers() && this.swarm.length > 0) {
            idx = Math.floor( Math.random() * this.swarm.length )
            peer = this.swarm.get_at(idx)
            peerconn = new jstorrent.PeerConnection({peer:peer})
            //console.log('should add peer!', idx, peer)
            if (! this.peers.contains(peerconn)) {
                if (peer.get('only_connect_once')) { return }
                this.peers.add( peerconn )
                this.set('numpeers',this.peers.items.length)
                peerconn.connect()
            }
            // peer.set('only_connect_once',true) // huh?
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
