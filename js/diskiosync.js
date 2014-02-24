if (self.jstorrent) {
    // this means we are in the main UI context

    function DiskIO(opts) {
        this.client = opts.client
        this.worker = new Worker('../js/diskiosync.js')
        this.worker.addEventListener('message',_.bind(this.onMessage,this))
        this.worker.addEventListener('error',_.bind(this.onError,this))
        this.busy = false
        this.callbacks = {}
        this.messageCounter = 0


    this.jobIdCounter = 0
    this.jobGroupCounter = 0
    this.jobGroupCallbacks = {}
    this.jobsLeftInGroup = {}

        jstorrent.Collection.apply(this, arguments)
    }
    jstorrent.DiskIO = DiskIO

    DiskIO.prototype = {
        onError: function(evt) {
            console.error('worker sent error',evt)
            debugger
        },
        onMessage: function(evt) {
            this.busy = false
            var msg = evt.data
            //console.log('receive message back from worker',msg)
            var id = msg._id
            delete msg._id
            var callback = this.callbacks[id]
            delete this.callbacks[id]
            if (callback) {callback(msg)}
        },
        send: function(msg, callback, opts) {
            opts = opts || {transferable:jstorrent.options.transferable_objects}
            //console.log('compute hash')
            var transfers = []
            if (msg.chunks && jstorrent.options.transferable_objects) {
                for (var i=0; i<msg.chunks.length; i++) {
                    // msg.chunks[i] is actually a uint8array with
                    // offset, but with a standard 13 bytes extra at
                    // the beginning, so the sha1 hasher needs to know
                    // this
                    if (msg.chunks[i].buffer.byteLength == 0) {
                        console.warn('tried to send data to be hashed that had byteLength 0, likely already sent this piece to worker')
                        callback({error:"data already transfered"})
                        return
                    }
                    transfers.push( msg.chunks[i].buffer )
                }
            }
            this.busy = true
            var id = this.messageCounter++
            msg._id = id
            msg.transferable = opts.transferable
            this.callbacks[id] = callback

            if (transfers.length > 0 && opts.transferable) {
                //console.log('sending with transfers',transfers)
                this.worker.postMessage(msg, transfers)
            } else {
                this.worker.postMessage(msg)
            }
        },
        writePiece: function(piece, callback) {
            var filesSpanInfo = piece.getSpanningFilesInfo()
debugger
            this.send({command:'writePiece'}, callback)
        },
        readPiece: function(piece, offset, size, callback) {
            // collect


            var filesSpanInfo = piece.getSpanningFilesInfo(offset, size)
            var jobGroup = this.jobGroupCounter++

            //var fp = {}
            var fe = {}

            // XXX what happens when we call getEntry/.file concurrently?

            var collectstate={collected:0,total:filesSpanInfo.length}

            for (var i=0; i<filesSpanInfo.length; i++) {
                var info = filesSpanInfo[i]
                var fileSpanInfo = info

                job = new jstorrent.DiskIOJob( {type: 'read',
                                                piece: piece,
                                                jobId: this.jobIdCounter++,
                                                torrent: piece.torrent.hashhexlower,
                                                fileNum: fileSpanInfo.fileNum,
                                                fileOffset: fileSpanInfo.fileOffset,
                                                size: fileSpanInfo.size,
                                                jobGroup: jobGroup} )
                job.set('state','collecting')
                this.add(job)

                var fileNum = info.fileNum
                var file = piece.torrent.getFile(fileNum)
                fe[fileNum] = {}
                file.getEntry( _.bind(function(fileNum,job,entry) {
                    fe[fileNum].metadata = { fullPath:entry.fullPath,
                                       name:entry.name }
                    entry.file( _.bind(function(fileNum,job,f) {
                        //console.log('collected file',fileNum,f)
                        fe[fileNum].metadata.lastModifiedDate = f.lastModifiedDate
                        fe[fileNum].metadata.size = f.size
                        fe[fileNum].metadata.type = f.type

                        fe[fileNum].file = f
                        collectstate.collected++

                        if (collectstate.collected == collectstate.total) {
                            job.set('state','collected')
                            this.onCollected(piece, filesSpanInfo, fe, jobGroup, callback)
                        }
                    },this,fileNum,job));
                }, this,fileNum,job) )
            }
        },
        onCollected: function(piece, filesSpanInfo, fe, jobGroup, callback) {
            // all jobs in group -- set to sent
            // job.set('state','sent')
            for (var i=0; i<this.items.length; i++) {
                var job = this.items[i]
                if (job.opts.jobGroup == jobGroup) {
                    job.set('state','sent')
                }
            }

            this.send({command:'readPiece', 
                       piece:piece.num, 
                       files:fe,
                       filesSpanInfo:filesSpanInfo}, 
                      this.onResponse.bind(this, callback, jobGroup))
        },
        onResponse: function(callback, jobGroup, result) {
            for (var i=0; i<this.items.length; i++) {
                var job = this.items[i]
                if (job.opts.jobGroup == jobGroup) {
                    job.set('state','done')
                }
            }

            callback(result)
        },
        cancelTorrentJobs: function(torrent, callback) {
            this.send({command:'cancelTorrentJobs',hash:torrent.hashhexlower}, callback)
        },
    }

for (var method in jstorrent.Collection.prototype) {
    jstorrent.DiskIO.prototype[method] = jstorrent.Collection.prototype[method]
}


function DiskIOJob(opts) {
    this.jobId = opts.jobId
    this.opts = opts

    jstorrent.Item.apply(this, arguments)
    this.neededPad = false

    this.set('type',opts.type)
    this.set('torrent',opts.torrent)
    this.set('fileNum',opts.fileNum)
    this.set('fileOffset',opts.fileOffset)
    this.set('size',opts.size)
    this.set('jobId',opts.jobId)
    this.set('jobGroup',opts.jobGroup)
    this.set('state','idle')
}
jstorrent.DiskIOJob = DiskIOJob

DiskIOJob.prototype = {
    get_key: function() {
        return this.jobId
    }
}

for (var method in jstorrent.Item.prototype) {
    jstorrent.DiskIOJob.prototype[method] = jstorrent.Item.prototype[method]
}


} else {


    function doReadPiece(msg) {

        var results = []

        debugger
        for (var i=0; i<msg.filesSpanInfo.length; i++) {
            var fr = new FileReaderSync()

            var job = msg.filesSpanInfo[i]
            var filemeta = msg.files[job.fileNum].metadata
            var file = msg.files[job.fileNum].file
            var blobSlice = file.slice(job.fileOffset, job.fileOffset + job.size)
            var data = fr.readAsArrayBuffer(blobSlice)
            results.push(data)
        }

        return results
    }

    // otherwise we are in the worker thread
    self.addEventListener('message', function(evt) {
        var msg = evt.data
        var id = msg._id
        var transferable = msg.transferable
        var returnchunks = []

        if (msg.command == 'readPiece') {
            var results = doReadPiece(msg)
            if (transferable) {
                self.postMessage({data:results, _id:id}, results)
            } else {
                self.postMessage({data:results, _id:id})
            }
        } else if (msg.command == 'hashChunks') {
            var digest = new Digest.SHA1()
            for (var i=0; i<msg.chunks.length; i++) {
                digest.update( msg.chunks[i] )
                if (transferable) {
                    // this seems to have helped, creating a new uint8array on it...?
                    returnchunks.push( new Uint8Array(msg.chunks[i]).buffer )
                }
            }
            var responseHash = new Uint8Array(digest.finalize())
            if (transferable) {
                self.postMessage({hash:responseHash, _id:id, chunks:msg.chunks}, returnchunks)
            } else {
                self.postMessage({hash:responseHash, _id:id})
            }
        } else {
            self.postMessage({error:'unhandled command', _id:id})
        }
    })
}