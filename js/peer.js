function Peer(opts) {
    jstorrent.Item.apply(this, arguments)
    this.torrent = opts.torrent
    this.host = opts.host
    this.port = opts.port
}
jstorrent.Peer = Peer
Peer.prototype = {
    get_key: function() {
        return this.host + ':' + this.port
    }
}
for (var method in jstorrent.Item.prototype) {
    jstorrent.Peer.prototype[method] = jstorrent.Item.prototype[method]
}


function PeerConnections(opts) {
    jstorrent.Collection.apply(this, arguments)
}
jstorrent.PeerConnections = PeerConnections
PeerConnections.prototype = {
}
for (var method in jstorrent.Collection.prototype) {
    jstorrent.PeerConnections.prototype[method] = jstorrent.Collection.prototype[method]
}


