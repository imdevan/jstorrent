function DiskIOJob(opts) {
    this.client = opts.client
    jstorrent.Item.apply(this, arguments)
}
jstorrent.DiskIOJob = DiskIOJob

DiskIOJob.prototype = {
}

for (var method in jstorrent.Item.prototype) {
    jstorrent.DiskIOJob.prototype[method] = jstorrent.Item.prototype[method]
}


function DiskIO(opts) {
    this.client = opts.client

    jstorrent.Collection.apply(this, arguments)
}
jstorrent.DiskIO = DiskIO

DiskIO.prototype = {
    readPiece: function(piece, offset, size, callback) {
        // reads a bunch of piece data from all the spanning files

        var filesSpanInfo = piece.getSpanningFilesInfo(offset, size)
    },
    writePiece: function(piece, callback) {
        // writes piece to disk

        var filesSpanInfo = piece.getSpanningFilesInfo()
    }
}

for (var method in jstorrent.Collection.prototype) {
    jstorrent.DiskIO.prototype[method] = jstorrent.Collection.prototype[method]
}
