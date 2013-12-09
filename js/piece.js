function Piece(opts) {
    jstorrent.Item.apply(this, arguments)
    this.torrent = opts.torrent
    this.num = opts.num
    this.size = this.torrent.getPieceSize(this.num)
    this.numChunks = Math.ceil(this.size / jstorrent.protocol.chunkSize)
    this.chunkRequests = {} // keep track of chunk requests
    this.chunkResponses = {}
    this.chunkResponsesChosen = null
    this.data = null
    this.haveData = false
    // haveData is not the same as having written the data to disk... ?
    this.haveDataPersisted = false
    // this means we actually successfully wrote it to disk
}
jstorrent.Piece = Piece
Piece.prototype = {
    get_key: function() {
        return this.num
    },
    registerChunkResponseFromPeer: function(peerconn, chunkOffset, data) {

        // TODO -- move this somewhere smarter...
        //this.torrent.unflushedPieceDataSize += data.byteLength
        //console.log('++increment unflushedPieceDataSize', this.torrent.unflushedPieceDataSize)


        var chunkNum = chunkOffset / jstorrent.protocol.chunkSize
        // received a chunk response from peer
        // decrements this peer connection's request counter

        //console.log("Chunk response from peer!", this.num, chunkNum)

        var handled = peerconn.registerChunkResponse(this.num, chunkNum, chunkOffset, data)
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
                this.checkChunkResponseHash( null, _.bind(function(valid) {
                    if (valid) {
                        // perhaps also place in disk cache?
                        this.data = new Uint8Array(this.size)
                        var curData, curOffset=0

                        for (var i=0; i<this.chunkResponsesChosen.length; i++) {
                            curData = this.chunkResponsesChosen[i].data
                            this.data.set(curData, curOffset)
                            curOffset += curData.length
                        }
                        this.data = this.data.buffer
                        this.haveData = true
                        this.torrent.persistPiece(this)
                    } else {
                        console.error('either unable to hash piece due to worker error, or hash mismatch')
                        // what to do, mark a peer as nasty, mark as suspect?
                        debugger
                    }
                },this))
            }
        } else {
            // request had timed out
        }
    },
    notifyPiecePersisted: function() {
        // maybe just do this for every peer instead of trying to be smart...

        // do some stuff
        this.haveDataPersisted = true

        var resps, resp, peerkey, peerconn
        for (var chunkNum in this.chunkResponses) {
            resps = this.chunkResponses[chunkNum]
            for (var i=0; i<resps.length; i++) {
                resp = resps[i]

                var peerconn = this.torrent.peers.get(resp.peerconn)
                if (peerconn) {
                    peerconn.notifyPiecePersisted(this)
                }
            }
        }
    },
    checkChunkResponseHash: function(preferredPeer, callback) {
        // TODO - allow this to prefer assembling from a specific peer

        // the actual digest happens in the thread

        var responses, curChoice
        //var digest = new Digest.SHA1()
        this.chunkResponsesChosen = []
        for (var i=0; i<this.numChunks; i++) {
            responses = this.chunkResponses[i]
            curChoice = responses[0]
            //digest.update(curChoice.data)
            this.chunkResponsesChosen.push( curChoice )
        }

        var worker = this.torrent.client.workerthread
        worker.send( { chunks: this.chunkResponsesChosen,
                       command: 'hashChunks' },
                     _.bind(function(result) {
                         if (result && result.hash) {

                             var responseHash = ui82str(result.hash)
                             if (responseHash == this.torrent.infodict.pieces.slice( this.num * 20, (this.num+1)*20 )) {
                                 console.log('%cGOOD PIECE RECEIVED!', 'background:#33f; color:#fff',this.num)
                                 callback(true)
                             } else {
                                 this.chunkResponsesChosen = null
                                 console.log('%cBAD PIECE RECEIVED!', 'background:#f33; color:#fff',this.num)
                                 callback(false)
                             }

                         } else {
                             console.error('error with sha1 hashing worker thread')
                             callback(false)
                         }

                     },this));

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
    unregisterAllRequestsForPeer: function(peerconn, requests) {
        // called when a peer disconnects
        debugger
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

        var startByte = this.torrent.pieceLength * this.num + offset
        var endByte = this.torrent.pieceLength * this.num + offset + size - 1

        var infos = []

        var idx = bisect_right(this.torrent.fileOffsets, startByte)
        var curFileNum = idx-1
        var curFileStartByte, curFileEndByte
        while (curFileNum < this.torrent.numFiles) {
            curFileStartByte = this.torrent.fileOffsets[curFileNum]

            if (curFileNum == this.torrent.numFiles - 1) {
                curFileEndByte = this.torrent.size - 1
            } else {
                curFileEndByte = this.torrent.fileOffsets[curFileNum + 1] - 1
            }
            var intersection = intersect( curFileStartByte, curFileEndByte,
                                          startByte, endByte )
            if (intersection) {
                var intersectionStart = intersection[0]
                var intersectionEnd = intersection[1]
                var info = {fileNum: curFileNum,
                             pieceOffset: intersectionStart - startByte,
                             fileOffset: intersectionStart - curFileStartByte,
                             size: intersectionEnd - intersectionStart + 1}
                //console.log(this.num, 'got spanning file info', info)
                infos.push( info )
                curFileNum++
            } else {
                break
            }
        }
        console.assert(infos.length > 0)
        return infos
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
