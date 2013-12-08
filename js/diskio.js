function DiskIOJob(opts) {
    this.client = opts.client
    this.jobId = opts.jobId

    jstorrent.Item.apply(this, arguments)

    this.set('type',this.opts.type)
    this.set('torrent',this.opts.torrent)
    this.set('filename',this.opts.filename)
    this.set('offset',this.opts.offset)
    this.set('size',this.opts.size)
    this.set('jobgroup',this.opts.jobgroup)

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
                                            jobId: this.jobIdCounter++,
                                            torrent: piece.torrent.hashhexlower,
                                            filename: fileSpanInfo.fileNum,
                                            offset: fileSpanInfo.offset,
                                            size: fileSpanInfo.size,
                                            jobgroup: jobGroup} )
            this.add(job)
            this.jobsLeftInGroup[jobGroup]++
        }
        this.thinkNewState()
    },
    thinkNewState: function() {
        if (! this.diskActive) {
            // pop off a job and do it!
            
        }
    },
    jobDone: function(job, data) {
        // called when a single read job is done
        
    },
    writePiece: function(piece, callback) {
        // writes piece to disk

        var filesSpanInfo = piece.getSpanningFilesInfo()
    }
}

for (var method in jstorrent.Collection.prototype) {
    jstorrent.DiskIO.prototype[method] = jstorrent.Collection.prototype[method]
}
