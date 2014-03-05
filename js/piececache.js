(function() {

    function PieceCache(opts) {
        this.torrent = opts.torrent
        this.cache = {}
    }

    var PieceCacheprototype = {
        add: function(piece) {
            // adds valid piece data to cache
            console.assert(piece.haveData && piece.data)
            this.cache[piece.num] = piece.data
        },
        get: function(num) {
            return this.cache[num]
        },
        remove: function(num) {
            delete this.cache[num]
        }
    }
    
    _.extend(PieceCache.prototype, PieceCacheprototype)

    jstorrent.PieceCache = PieceCache

})()