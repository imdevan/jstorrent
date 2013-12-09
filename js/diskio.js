function DiskIOJob(opts) {
    this.client = opts.client
    this.jobId = opts.jobId
    this.opts = opts

    jstorrent.Item.apply(this, arguments)

    this.set('type',opts.type)
    this.set('torrent',opts.torrent)
    this.set('fileNum',opts.fileNum)
    this.set('fileOffset',opts.fileOffset)
    this.set('size',opts.size)
    this.set('jobId',opts.jobId)
    this.set('jobGroup',opts.jobgroup)
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


function DiskIO(opts) {
    this.client = opts.client
    this.filesystem = opts.filesystem

    this.jobIdCounter = 0
    this.jobGroupCounter = 0
    this.jobGroupCallbacks = {}
    this.jobsLeftInGroup = {}

    this.diskActive = false

    jstorrent.Collection.apply(this, arguments)
}
jstorrent.DiskIO = DiskIO

DiskIO.prototype = {
    readPiece: function(piece, offset, size, callback) {
        // reads a bunch of piece data from all the spanning files
        var filesSpanInfo = piece.getSpanningFilesInfo(offset, size)
        var job,fileSpanInfo
        var jobs = []
        var jobGroup = this.jobGroupCounter++
        this.jobsLeftInGroup[jobGroup] = 0
        this.jobGroupCallbacks[jobGroup] = callback
        
        for (var i=0; i<filesSpanInfo.length; i++) {
            fileSpanInfo = filesSpanInfo[i]
            job = new jstorrent.DiskIOJob( {type: 'read',
                                            piece: piece,
                                            jobId: this.jobIdCounter++,
                                            torrent: piece.torrent.hashhexlower,
                                            fileNum: fileSpanInfo.fileNum,
                                            fileOffset: fileSpanInfo.fileOffset,
                                            size: fileSpanInfo.size,
                                            jobGroup: jobGroup} )
            this.add(job)
            this.jobsLeftInGroup[jobGroup]++
        }

        this.thinkNewState()
    },
    thinkNewState: function() {
        if (! this.diskActive) {
            // pop off a job and do it!
            if (this.items.length > 0) {
                this.diskActive = true
                this.doJob()
            }
        }
    },
    jobDone: function(job, evt) {
        job.set('state','idle')
        console.log(job.opts.jobId,'jobDone')
        this.diskActive = false
        this.remove(job)
        this.jobsLeftInGroup[job.opts.jobGroup]--

        if (this.jobsLeftInGroup[job.opts.jobGroup] == 0) {
            var callback = this.jobGroupCallbacks[job.opts.jobGroup]
            delete this.jobGroupCallbacks[job.opts.jobGroup]
            callback({piece:job.opts.piece})
        }
        this.thinkNewState()
    },
    jobError: function(job, evt) {
        job.set('state','error')
        this.diskActive = false
        var callback = this.jobGroupCallbacks[job.opts.jobGroup]
        delete this.jobGroupCallbacks[job.opts.jobGroup]
        callback({error:evt})
    },
    doJobReadyToWrite: function(entry, job) {
        console.log(job.opts.jobId, 'doJobReadyToWrite')
        var _this = this

        entry.createWriter( function(writer) {
            console.log('createdWriter')
            writer.onwrite = function(evt) {
                console.log('diskio wrote',evt.loaded,'/',evt.total,writer)
                _this.jobDone(job, evt)
            }
            writer.onerror = function(evt) {
                _this.jobError(job, evt)
            }
            writer.seek(job.opts.fileOffset)
            writer.write(new Blob([job.opts.data]))
        })
    },
    doJob: function() {
        var _this = this
        var job = this.get_at(0)
        console.log('%cdoing job id','color:#0ff',job.opts.jobId, 'group',job.opts.jobGroup)
        job.set('state','active')
        var file = job.opts.piece.torrent.getFile(job.opts.fileNum)

        file.getEntry( function(entry){
            if (entry.isFile) {
                if (job.opts.type == 'write') {
                    entry.getMetadata( function(metaData) {
                        console.log(job.opts.jobId, 'doJob.getMetadata')
                        if (job.opts.fileOffset <= metaData.size) {
                            _this.doJobReadyToWrite(entry, job)
                        } else {
                            padZeroes
                            debugger

                        }
                    })
                } else {
                    // just assume the file actually is the right size etc
                    entry.createReader( function(reader) {
                        var jobData = job.opts // 
                        debugger
                    })
                }
            } else {
                console.error('fatal diskio processing job')
            }
        })
    },
    writePiece: function(piece, callback) {
        // writes piece to disk

        var filesSpanInfo = piece.getSpanningFilesInfo()
        var job,fileSpanInfo
        var jobs = []
        var jobGroup = this.jobGroupCounter++
        this.jobsLeftInGroup[jobGroup] = 0
        this.jobGroupCallbacks[jobGroup] = callback
        
        for (var i=0; i<filesSpanInfo.length; i++) {
            fileSpanInfo = filesSpanInfo[i]

            // need to slice off the data from the piece here...
            var buf = new Uint8Array(piece.data, fileSpanInfo.pieceOffset, fileSpanInfo.size).buffer
            job = new jstorrent.DiskIOJob( {type: 'write',
                                            data: buf,
                                            piece: piece,
                                            jobId: this.jobIdCounter++,
                                            torrent: piece.torrent.hashhexlower,
                                            fileNum: fileSpanInfo.fileNum,
                                            fileOffset: fileSpanInfo.fileOffset,
                                            size: fileSpanInfo.size,
                                            jobGroup: jobGroup} )
            this.add(job)
            this.jobsLeftInGroup[jobGroup]++
        }
        this.thinkNewState()
    }
}

for (var method in jstorrent.Collection.prototype) {
    jstorrent.DiskIO.prototype[method] = jstorrent.Collection.prototype[method]
}
