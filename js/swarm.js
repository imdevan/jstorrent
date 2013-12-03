function Swarm(opts) {
    this.torrent = opts.torrent;
    this.peers = {}
}

jstorrent.Swarm = Swarm;

Swarm.prototype = {
    get_hashkey: function(info) {
        return info.ip + ':' + info.port;
    }

    add_peer: function(info) {
        this.peers[ this.get_hashkey(info) ] = info
    }
}