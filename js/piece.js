function Piece(opts) {
    jstorrent.Item.apply(this, arguments)
    this.torrent = opts.torrent
    this.num = opts.num
    this.size = this.torrent.getPieceSize(this.num)
    this.numChunks = Math.ceil(this.size / jstorrent.protocol.chunkSize)
    this.chunkRequests = {} // keep track of chunk requests
    this.chunkResponses = {}

    this.haveData = false
    // haveData is not the same as having written the data to disk...
    this.haveDataPersisted = false
    // this means we actually successfully wrote it to disk
}
jstorrent.Piece = Piece
Piece.prototype = {
    get_key: function() {
        return this.num
    },
    registerChunkResponseFromPeer: function(peerconn, chunkOffset, data) {
        var chunkNum = chunkOffset / jstorrent.protocol.chunkSize
        // received a chunk response from peer
        // decrements this peer connection's request counter

        console.log("Chunk response from peer!", this.num, chunkNum)

        var handled = peerconn.registerChunkResponse(this.num, chunkOffset, data)
        if (handled) {
            if (! this.chunkResponses[chunkNum]) {
                // able to store multiple copies of chunk responses,
                // per each peer this serves endgame mode. we can
                // attempt to hash-check a complete piece that is not
                // homogenous in a single peer, but rather contains
                // data from multiple peers.
                this.chunkResponses[chunkNum] = []
            }
            this.chunkResponses[chunkNum].push( {data:data,
                                                 peerconn:peerconn.get_key()} )
            var filled = this.checkChunkResponsesFilled();

            if (filled) {
                var valid = this.checkChunkResponseHash()
                if (valid) {
                    // perhaps also place in disk cache?
                    this.torrent.persistPiece(this)
                } else {
                    // what to do, mark a peer as nasty, mark as suspect?
                    debugger
                }
            }
        } else {
            // request had timed out
        }
    },
    checkChunkResponseHash: function(preferredPeer) {
        // TODO - allow this to prefer assembling from a specific peer
        var responses
        var digest = new Digest.SHA1()
        for (var i=0; i<this.numChunks; i++) {
            responses = this.chunkResponses[i]
            digest.update(responses[0].data)
        }
        var responseHash = ui82str(new Uint8Array(digest.finalize()))
        if (responseHash == this.torrent.infodict.pieces.slice( this.num * 20, (this.num+1)*20 )) {
            console.log('%c GOOD PIECE RECEIVED!', 'background:#33f; color:#fff')
            return true
        } else {
            console.log('%c BAD PIECE RECEIVED!', 'background:#f33; color:#fff')
            return false
        }
    },
    checkChunkResponsesFilled: function() {
        for (var i=0; i<this.numChunks; i++) {
            if (! this.chunkResponses[i] ||
                this.chunkResponses[i].length == 0)
            {
                return false
            }
        }
        return true
    },
    registerChunkRequestForPeer: function(peerconn, chunkNum, chunkOffset, chunkSize) {
        peerconn.registerChunkRequest(this.num, chunkNum, chunkOffset, chunkSize)
        if (this.chunkRequests[chunkNum] === undefined) {
            this.chunkRequests[chunkNum] = 0
        }
        this.chunkRequests[chunkNum]++
    },
    getChunkRequestsForPeer: function(howmany, peerconn) {
        // returns up to howmany chunk requests
        // need special handling for very last piece of a torrent
        //console.log('getChunkRequestsForPeer')

        var chunkNum = 0
        var chunkOffset = 0
        var chunkSize = jstorrent.protocol.chunkSize
        var registered = 0
        var payload, v
        var payloads = []

        while (chunkOffset < this.size && registered < howmany) {
            // TODO -- make this loop more efficient
            //console.log('inwhile',this.num,chunkNum,chunkOffset,registered,payloads)
            if (chunkNum == this.numChunks - 1 &&
                this.num == this.torrent.numPieces - 1) {
                // this is the very last chunk of them all!
                chunkSize = this.size - chunkNum * chunkSize
            }

            if (peerconn.pieceChunkRequests[this.num] &&
                peerconn.pieceChunkRequests[this.num][chunkNum]) {
                // continues below, updating state
            } else if (this.chunkRequests[chunkNum]) {
                // hmm, why do we have these two cases... confusing!
            } else {
                registered++
                this.registerChunkRequestForPeer(peerconn, chunkNum, chunkOffset, chunkSize)
                payload = new Uint8Array(12)
                v = new DataView(payload.buffer)
                v.setUint32(0, this.num)
                v.setUint32(4, chunkOffset)
                v.setUint32(8, chunkSize)
                payloads.push( payload.buffer )
            }

            chunkNum++
            chunkOffset += jstorrent.protocol.chunkSize
        }
        return payloads
    },
    getSpanningFilesInfo: function(offset, size) {
        // returns a list of [fileNum, fileOffset, size]
        if (offset === undefined) { offset = 0 }
        if (size === undefined) { size = this.size }


        
    },
    getSpanningFilesData: function(offset, size, callback) {
        // spawns diskIO for retreiving actual data from the disk

        var filesSpanInfo = this.getSpanningFilesInfo()
        // create a bunch of diskio jobs

        this.torrent.diskio.readPiece(this, offset, size, function(data) {
            debugger
        })

    }
}
for (var method in jstorrent.Item.prototype) {
    jstorrent.Piece.prototype[method] = jstorrent.Item.prototype[method]
}
