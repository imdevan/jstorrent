// todo -- extend collection

function Swarm(opts) {
    this.torrent = opts.torrent;
    this.peers = {}
    this._count = 0
}

jstorrent.Swarm = Swarm;

Swarm.prototype = {
    count: function() { return this._count },
    get_hashkey: function(info) {
        return info.ip + ':' + info.port;
    },
    add_peer: function(info) {
        this.peers[ this.get_hashkey(info) ] = info
        this._count ++
    }
}