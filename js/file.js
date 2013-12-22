function File(opts) {
    jstorrent.Item.apply(this, arguments)
    this.torrent = opts.torrent
    this.num = opts.num

    if (this.torrent.multifile) {
        // should we prepend torrent name? Yes.
        var path = [this.torrent.get('name')].concat( this.torrent.infodict.files[this.num].path )
        this.path = path
        this.name = path[path.length-1]

        if (this.num == this.torrent.numFiles - 1) {
            this.size = this.torrent.size - this.torrent.fileOffsets[this.num]
        } else {
            this.size = this.torrent.fileOffsets[this.num+1] - this.torrent.fileOffsets[this.num]
        }
    } else {
        this.path = [this.torrent.infodict.name]
        this.name = this.torrent.infodict.name
        this.size = this.torrent.size
    }


    this.startByte = this.torrent.fileOffsets[this.num]
    if (this.num == this.torrent.numFiles - 1) {
        this.endByte = this.torrent.size - 1
    } else {
        this.endByte = this.torrent.fileOffsets[this.num + 1] - 1
    }

    this.set('downloaded',this.getDownloaded()) // not zero! need to get our spanning pieces and add up the components...
    this.set('complete',this.get('downloaded')/this.size)

}
jstorrent.File = File
File.prototype = {
    getSpanningPiecesInfo: function() { // similar to piece.getSpanningFilesInfo
        var leftPiece = Math.floor(this.startByte / this.torrent.pieceLength)
        var rightPiece = Math.ceil(this.endByte / this.torrent.pieceLength)

        var allInfos = []
        var curInfos

        var curPiece
        for (var i=leftPiece; i<rightPiece; i++) {
            //curPiece = this.torrent.getPiece(i)
            curInfos = Piece.getSpanningFilesInfo(this.torrent, i, this.torrent.getPieceSize(i))
            for (var j=0; j<curInfos.length; j++) {
                if (curInfos[j].fileNum == this.num) {
                    curInfos[j].pieceNum = i
                    allInfos.push(curInfos[j])
                }
            }
        }
        return allInfos
    },
    getDownloaded: function() {
        var pieceSpans = this.getSpanningPiecesInfo()
        var pieceSpan
        var downloaded = 0
        for (var i=0; i<pieceSpans.length; i++) {
            pieceSpan = pieceSpans[i]
            if (this.torrent._attributes.bitfield[pieceSpan.pieceNum]) {
                downloaded += pieceSpan.size
            }
        }
        return downloaded
    },
    get_key: function() {
        return this.num
    },
    getEntry: function(callback) {
        // XXX this is not calling callback in some cases!

        // gets file entry, recursively creating directories as needed...
        var filesystem = this.torrent.getStorage().entry
        var path = this.path.slice()

        function recurse(e) {
            if (path.length == 0) {
                if (e.isFile) {
                    callback(e)
                } else {
                    callback({error:'file exists'})
                }
            } else if (e.isDirectory) {
                if (path.length > 1) {
                    // this is not calling error callback, simply timing out!!!
                    e.getDirectory(path.shift(), {create:true}, recurse, recurse)
                } else {
                    e.getFile(path.shift(), {create:true}, recurse, recurse)
                }
            } else {
                callback({error:'file exists'})
            }
        }
        recurse(filesystem)
    }
}
for (var method in jstorrent.Item.prototype) {
    jstorrent.File.prototype[method] = jstorrent.Item.prototype[method]
}
