function Piece(opts) {
    jstorrent.Item.apply(this, arguments)
    this.torrent = opts.torrent
    this.num = opts.num
    this.size = this.torrent.getPieceSize(this.num)
    this.numChunks = Math.ceil(this.size / jstorrent.protocol.chunkSize)
    this.set('requests', 0)
    this.set('responses', 0)
    this.set('timeouts', 0)
    this.timeoutIds = []
    this.checkingHash = false
    this.checkingChunkResponseHash = false
    this.firstInit = true
    this.resetData()
    this.wasReset = false
}
jstorrent.Piece = Piece

Piece.getSpanningFilesInfo = function(this_torrent, this_num, this_size, offset, size) {
    if (offset === undefined) { offset = 0 }
    if (size === undefined) { size = this_size }

    var startByte = this_torrent.pieceLength * this_num + offset
    var endByte = this_torrent.pieceLength * this_num + offset + size - 1

    var infos = []

    var idx = bisect_right(this_torrent.fileOffsets, startByte)
    var curFileNum = idx-1
    var curFileStartByte, curFileEndByte
    while (curFileNum < this_torrent.numFiles) {
        curFileStartByte = this_torrent.fileOffsets[curFileNum]

        if (curFileNum == this_torrent.numFiles - 1) {
            curFileEndByte = this_torrent.size - 1
        } else {
            curFileEndByte = this_torrent.fileOffsets[curFileNum + 1] - 1
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
            infos.push( info )
            curFileNum++
        } else {
            break
        }
    }
    console.assert(infos.length > 0)
    return infos
}

Piece.prototype = {
    resetData: function() {
        //console.assert(! this.checkingHash) // XXX put this assert back in!
        // this is dangerous to call, it can mean we get more responses than recorded requests...
        if (! this.firstInit) {
            // console.log(this.num,'resetData')
        }
        this.firstInit = false

        // able to store multiple copies of chunk responses,
        // per each peer this serves endgame mode. we can
        // attempt to hash-check a complete piece that is not
        // homogenous in a single peer, but rather contains
        // data from multiple peers.
        this.wasReset = true
        if (this.timeoutIds.length > 0) {
            for (var i=0; i<this.timeoutIds.length; i++) {
                clearTimeout(this.timeoutIds[i])
            }
        }
        this.timeoutIds = []
        this.chunkRequests = {} // keep track of chunk requests
        this.chunkResponses = {}
        this.chunkResponsesChosen = null
        this.chunkResponsesChosenPlain = null

        this.checkingChunkResponseHash = false
        this.checkingHash = false

        this.data = null
        this.haveData = false
        this.haveValidData = false
        // haveData is not the same as having written the data to disk... ?
        this.haveDataPersisted = false
        // this means we actually successfully wrote it to disk
    },
    get_key: function() {
        return this.num
    },
    registerChunkResponseFromPeer: function(peerconn, chunkOffset, data) {
        // at this point ,have not checked whether this piece was requested
        console.assert(! this.haveDataPersisted)
        this.set('responses', this.get('responses')+1)
        var chunkNum = chunkOffset / jstorrent.protocol.chunkSize
        // received a chunk response from peer
        // decrements this peer connection's request counter

        //console.log("Chunk response from peer!", this.num, chunkNum)
        var handled = false

        // there are TWO places we register the requests, on the peer
        // connection, as well as on the piece! confusing, i know!

        if (this.chunkRequests[chunkNum]) {
            for (var i=0; i<this.chunkRequests[chunkNum].length; i++) {
                if (this.chunkRequests[chunkNum][i].peerconn == peerconn) {
                    handled = true
                    break
                }
            }
        }

        if (! handled) {
            if (peerconn.requestedPieceChunk(this.num, chunkNum)) {
                console.warn('chunk response found no corresponding request, however it was in peer connection request list')
            }
        }

        if (handled) {
            peerconn.outstandingPieceChunkRequestCount--
            peerconn.set('outstanding',peerconn.get('outstanding')-1)

            // clearing these out creates lots of problems, because we keep making more requests to the same shit...
/*
            this.chunkRequests[chunkNum].splice(i,1)
            if (this.chunkRequests[chunkNum].length == 0) {
                delete this.chunkRequests[chunkNum]
            }
*/
            if (! this.chunkResponses[chunkNum]) {
                this.chunkResponses[chunkNum] = []
            }

            this.chunkResponses[chunkNum].push( {data:data,
                                                 peerconn:peerconn} )
            var filled = this.checkChunkResponsesFilled();

            if (filled) {
                this.checkingChunkResponseHash = true
                this.checkChunkResponseHash( null, _.bind(function(valid) {

                    if (this.wasReset) {
                        console.warn('this piece was reset while it was being hash checked... why?',this.num)
                        return
                    }

                    if (valid && false) {
                        if (this.torrent.get('state') != 'started') { return }

                        //console.log('hashchecked valid piece',this.num)
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
                        console.warn('resetting piece data, not punishing peers...')
                        this.resetData()
                        this._opts.torrent.notifyInvalidPiece(this)
                        this._opts.torrent.pieces.remove(this)

                        // first of all, throw away this piece's data entirely...

                        // what to do, mark a peer as nasty, mark as suspect?

                    }
                },this))
            }
        } else {
            //console.log(this.num,'got unexpected chunk',peerconn.get('address'), chunkNum) // likely timeout
            // request had timed out
        }
    },
    notifyPiecePersisted: function() {
        // maybe do some other stuff, like send CANCEL message to any other peers
        // now destroy my data
        this.resetData()

        this.checkingChunkResponseHash = false

        this.haveDataPersisted = true
        if (this.torrent.pieces.contains(this)) {
            // might not contain it if we stopped the torrent and the data still was persisted
            this.torrent.pieces.remove(this)
        }
    },
    checkChunkResponseHash: function(preferredPeer, callback) {
        // TODO - allow this to prefer assembling from a specific peer
        // the actual digest happens in the thread
        var responses, curChoice
        //var digest = new Digest.SHA1()
        this.chunkResponsesChosen = []
        this.chunkResponsesChosenPlain = [] // without peer
        for (var i=0; i<this.numChunks; i++) {
            responses = this.chunkResponses[i]
            if (responses.length > 1) {
                //console.log('made non canonical choice for chunk response',responses)
            }
            curChoice = responses[0] // for now just grab the first response for this chunk received
            //digest.update(curChoice.data)
            this.chunkResponsesChosen.push( curChoice )
            this.chunkResponsesChosenPlain.push( curChoice.data )
        }
        var chunks = this.chunkResponsesChosenPlain
        this.checkHashMatch( chunks, callback )
    },
    checkHashMatch: function(chunks, callback) {
        var worker = this.torrent.client.workerthread
        if (worker.busy) {
            console.warn('worker busy indicates we should have more than one thread')
            // TODO -- # worker threads, perhaps show a warning, and
            // in the options page, optional permission to get CPU
            // info and adjust number of workers debugger

            // this can happen randomly because serendipidously we get
            // two chunks in at nearly the same time and they complete
            // a chunk. only if this error occurs VERY frequently does
            // it actually slow down our download rate. and that's
            // only if the unflushed data pipeline limit is set rather
            // low.
        }
        if ( this.checkingHash) {
            // need to defer this to later...
            console.warn('not checking hash match because a check is already in progress... callback lost')
            return
        }
        console.assert(! this.checkingHash)
        this.checkingHash = true
        worker.send( { chunks: chunks,
                       command: 'hashChunks' },
                     _.bind(function(result) {
                         this.checkingHash = false // XXX why are we hashChunks in two places?
                         if (result && result.hash) {
                             var responseHash = ui82str(result.hash)
                             if (responseHash == this.torrent.infodict.pieces.slice( this.num * 20, (this.num+1)*20 )) {
                                 //console.log('%cGOOD PIECE RECEIVED!', 'background:#33f; color:#fff',this.num)
                                 callback(true)
                             } else {
                                 this.chunkResponsesChosenPlain = null
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
    unregisterAllRequestsForPeer: function(peerconn) {
        // is anyone calling this? if not, why not?
        debugger

        for (var chunkNum in this.chunkRequests) {
            //requests = this.chunkRequests[chunkNum]
            this.chunkRequests[chunkNum] = _.filter(this.chunkRequests[chunkNum], function(v) { return v.peerconn != peerconn })
            for (var i=0; i<requests.length; i++) {
debugger
            }
            
        }
    },
    checkChunkTimeouts: function(chunkNums) {
        // XXX not removing from peerconn.pieceChunkRequests
        // XXX not updating peerconn.outstandingPieceRequestCount

        // XXX BUG here when request was made to a peer that's no longer in our peer list... ?
        if (this.haveData || this.haveDataPersisted) { return }
        //console.log('piece',this.num,'checkChunkTimeouts',chunkNums)
        var chunksWithoutResponses = []
        var chunkNum, requests, responses, requestData, responseData, foundResponse
        //var curTime = new Date()
        for (var i=0; i<chunkNums.length; i++) {
            chunkNum = chunkNums[i]
            if (this.chunkRequests[chunkNum]) {
                requests = this.chunkRequests[chunkNum]
                responses = this.chunkResponses[chunkNum]

                for (var j=0; j<requests.length; j++) {
                    requestData = requests[j]

                    // TODO - if there is only ONE request, and it is
                    // to a peer that is disconnected, then time it
                    // out...  if (requestData.peerconn.hasClosed) ...
                    // however, this should be done when peer
                    // disconnects, so don't put special logic here,
                    // instead make sure to keep
                    // peerconn.pieceChunkRequests updated and use it
                    // when disconnecting from that peer
                    foundResponse = false
                    if (responses) {
                        for (var k=0; k<responses.length; k++) {
                            responseData = responses[k]
                            if (requestData.peerconn == responseData.peerconn) {
                                foundResponse = true
                                break
                            }
                        }
                    }

                    if (! foundResponse) {
                        //console.log('piece timed out...',this.num,chunkNum)

                        this.set('timeouts',this.get('timeouts')+1)
                        requestData.peerconn.registerPieceChunkTimeout(this.num, chunkNum)
                        if (this.torrent.isEndgame) {
                            //console.log('endgame timeout before',this.chunkRequests[chunkNum])
                        }
                        var foundRequest = false
                        for (var k=0; k<this.chunkRequests[chunkNum].length; k++) {
                            if (this.chunkRequests[chunkNum][k].peerconn == requestData.peerconn) {
                                this.chunkRequests[chunkNum].splice(k,1)
                                foundRequest = true
                                break
                            }
                        }
                        console.assert(foundRequest)
                    }
                }
            }
        }
    },
    registerChunkRequestForPeer: function(peerconn, chunkNum, chunkOffset, chunkSize) {
        this.set('requests', this.get('requests')+1)
        peerconn.registerPieceChunkRequest(this.num, chunkNum, chunkOffset, chunkSize)
        if (this.chunkRequests[chunkNum] === undefined) {
            this.chunkRequests[chunkNum] = []
        }
        this.chunkRequests[chunkNum].push( {time: new Date(), peerconn:peerconn} )
    },
    getChunkRequestsForPeer: function(howmany, peerconn) {
        // BUG when torrent stopped?


        // returns up to howmany chunk requests
        // need special handling for very last piece of a torrent
        //console.log('getChunkRequestsForPeer')

        var chunkNum = 0
        var chunkOffset = 0
        var chunkSize = jstorrent.protocol.chunkSize
        var obtained = 0
        var payload, v
        var payloads = []
        var chunkNums = []

        while (chunkOffset < this.size && obtained < howmany) {
            // TODO -- make this loop more efficient
            //console.log('inwhile',this.num,chunkNum,chunkOffset,obtained,payloads)
            if (chunkNum == this.numChunks - 1 &&
                this.num == this.torrent.numPieces - 1) {
                // very last chunk of torrent has special size
                chunkSize = this.size - chunkNum * chunkSize
            }

            var willRequestThisChunk = false
            if (! this.chunkRequests[chunkNum] || this.chunkRequests[chunkNum].length == 0) {
                willRequestThisChunk = true
            } else if (this.chunkResponses[chunkNum] && this.chunkResponses[chunkNum].length > 0) {
                // already have a response, continue
            } else if (this.torrent.isEndgame) {
                // only make the request if we arent the same peer
                if (this.chunkRequests[chunkNum].length < jstorrent.constants.endgameDuplicateRequests) {

                    // (and also, only if chunkRequests is "saturated"
                    var isSaturated = true
                    for (var i=0; i<this.numChunks; i++) {
                        if (! this.chunkRequests[i] || this.chunkRequests[i].length == 0) {
                            isSaturated = false
                            break
                        }
                    }
                    if (isSaturated) {
                        var foundThisPeer = false
                        for (var i=0; i<this.chunkRequests[chunkNum]; i++) {
                            if (this.chunkRequests[chunkNum][i].peerconn = peerconn) {
                                foundThisPeer = true
                                break
                            }
                        }

                        if (! foundThisPeer) {
                            console.log('making special endgame request!',this.num,chunkNum)
                            willRequestThisChunk = true
                        }
                    }
                }
                //if (this.chunkResponses[chunkNum] && this.chunkResponses[chunkNum].length > 0) {
                // if ENDGAME, analyze further.
            }

            if (willRequestThisChunk) {
                obtained++
                this.registerChunkRequestForPeer(peerconn, chunkNum, chunkOffset, chunkSize)
                chunkNums.push(chunkNum)
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
        if (payloads.length > 0) {
            // some kind of subtle bugs here with torrent start/stop. but let's just clear out everything on torrent stop.? no?
            var timeoutInterval = jstorrent.constants.chunkRequestTimeoutInterval

            if (this.torrent.isEndgame) {
                // speed things up
                timeoutInterval = timeoutInterval / 2
            }
            var id = setTimeout( _.bind(this.torrent.checkPieceChunkTimeouts,
                                        this.torrent,
                                        this.num,
                                        chunkNums),
                                 timeoutInterval )
            //this.timeoutIds.push(id) // why are we putting these in a list?
        } else {
            //console.log('could not make requests :-( should we have endgame on?')
        }
        return payloads
    },
    getData: function(offset, size, callback) {
        //var filesSpan = this.getSpanningFilesInfo(offset, size)
        this.torrent.getStorage().diskio.readPiece(this, offset, size, function(result) {
            callback(result.data)
        })
    },
    getSpanningFilesInfo: function(offset, size) {
        return Piece.getSpanningFilesInfo(this.torrent, this.num, this.size, offset, size)
    }
}
for (var method in jstorrent.Item.prototype) {
    jstorrent.Piece.prototype[method] = jstorrent.Item.prototype[method]
}
