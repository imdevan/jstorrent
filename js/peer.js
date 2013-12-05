function PeerConnections(opts) {
    jstorrent.Collection.apply(this, arguments)
}
jstorrent.PeerConnections = PeerConnections
PeerConnections.prototype = {
}
for (var method in jstorrent.Collection.prototype) {
    jstorrent.PeerConnections.prototype[method] = jstorrent.Collection.prototype[method]
}




function Peer(opts) {
    jstorrent.Item.apply(this, arguments)

    this.torrent = opts.torrent
    this.host = opts.host // not necessarily an IP!
    this.port = opts.port

    // inefficient that we create this for everybody in the swarm... (not actual peer objects)
    // but whatever, good enough for now
    this.connect_timeout_delay = 6000
    this.connect_timeout_callback = null
    this.connecting = false
    this.connect_timeouts = 0

    this.writing = false
    this.writing_length = 0
}

jstorrent.Peer = Peer;

Peer.prototype = {
    get_key: function() {
        return this.host + ':' + this.port
    },
    on_connect_timeout: function() {
        console.error('connect timeout!')
        this.connecting = false;
        this.connect_timeouts++;
        chrome.socket.destroy( this.sockInfo.socketId )
        this.sockInfo = null
        this.trigger('connect_timeout')
    },
    close: function(reason) {
        this.log('closing',reason)
        chrome.socket.disconnect(this.sockInfo.socketId)
        chrome.socket.destroy(this.sockInfo.socketId)
        this.sockInfo = null
        this.trigger('disconnect')
    },
    connect: function() {
        console.log('peer connect!')
        console.assert( ! this.connecting )
        this.connecting = true;
        chrome.socket.create('tcp', {}, _.bind(this.oncreate, this))
    },
    oncreate: function(sockInfo) {
        this.sockInfo = sockInfo;
        this.log('peer oncreate')
        this.connect_timeout_callback = setTimeout( _.bind(this.on_connect_timeout, this), this.connect_timeout_delay )
        chrome.socket.connect( sockInfo.socketId, this.host, this.port, _.bind(this.onconnect, this) )
    },
    onconnect: function(connectInfo) {
        if (! this.sockInfo) {
            console.log('onconnect, but we already timed out')
        }
        this.log('peer onconnect',connectInfo);

        if (this.connect_timeout_callback) {
            clearTimeout( this.connect_timeout_callback )
            this.connect_timeout_callback = null
            this.connecting = false
        }

        chrome.socket.read( this.sockInfo.socketId, 4096, _.bind(this.on_peer_data,this) )
        this.send_handshake()
    },
    send_handshake: function() {
        var bytes = []
        bytes.push( jstorrent.protocol.protocolName.length )
        for (var i=0; i<jstorrent.protocol.protocolName.length; i++) {
            bytes.push( jstorrent.protocol.protocolName.charCodeAt(i) )
        }
        // handshake flags, null for now
        bytes = bytes.concat( [0,0,0,0,0,0,0,0] )
        bytes = bytes.concat( this.torrent.hashbytes )
        bytes = bytes.concat( this.torrent.client.peeridbytes )
        console.assert( bytes.length == 68 )
        this.write( new Uint8Array( bytes ).buffer )
    },
    write: function(data) {
        this.log('write',data.byteLength)
        this.writing = true
        this.writing_length = data.byteLength
        chrome.socket.write( this.sockInfo.socketId, data, _.bind(this.onwrite,this) )
    },
    log: function() {
        var args = [this.sockInfo.socketId]
        for (var i=0; i<arguments.length; i++) {
            args.push(arguments[i])
        }
        console.log.apply(console, args)
    },
    error: function(msg) {
        this.log(msg)
        chrome.socket.disconnect(this.sockInfo.socketId)
        chrome.socket.destroy(this.sockInfo.socketId)
        this.trigger('error')
    },
    onwrite: function(writeResult) {
        if (! this.sockInfo) {
            console.error('onwrite for socket forcibly or otherwise closed')
            return
        }

        this.log('onwrite', writeResult)
        // probably only need to worry about partial writes with really large buffers
        if(writeResult.bytesWritten != this.writing_length) {
            console.error('bytes written does not match!')
            chrome.socket.getInfo( this.sockInfo.socketId, function(socketStatus) {
                console.log('socket info -',socketStatus)
            })
            this.error('did not write everything')
        } else {
            this.writing = false
            this.writing_length = 0
        }
    },
    on_peer_data: function(readResult) {
        if (! this.sockInfo) {
            console.error('onwrite for socket forcibly or otherwise closed')
            return
        }

        this.log('on_peer_data',readResult,readResult.data.byteLength)
        this.close('no real reason')
    }
}


for (var method in jstorrent.Item.prototype) {
    jstorrent.Peer.prototype[method] = jstorrent.Item.prototype[method]
}
