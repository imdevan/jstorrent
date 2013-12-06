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


function PeerConnection(opts) {
    jstorrent.Item.apply(this, arguments)

    this.peer = opts.peer

    this.peerHandshake = null

    this.set('address', this.peer.get_key())
    this.set('bytes_sent', 0)
    this.set('bytes_received', 0)

    // inefficient that we create this for everybody in the swarm... (not actual peer objects)
    // but whatever, good enough for now
    this.connect_timeout_delay = 10000
    this.connect_timeout_callback = null
    this.connecting = false
    this.connect_timeouts = 0

    this.writing = false
    this.writing_length = 0

    this.reading = false

    this.readBuffer = new jstorrent.Buffer
    this.writeBuffer = new jstorrent.Buffer
}

jstorrent.PeerConnection = PeerConnection;

PeerConnection.prototype = {
    get_key: function() {
        return this.peer.host + ':' + this.peer.port
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
        this.set('state','connecting')
        chrome.socket.create('tcp', {}, _.bind(this.oncreate, this))
    },
    oncreate: function(sockInfo) {
        this.sockInfo = sockInfo;
        this.log('peer oncreate')
        this.connect_timeout_callback = setTimeout( _.bind(this.on_connect_timeout, this), this.connect_timeout_delay )
        chrome.socket.connect( sockInfo.socketId, this.peer.host, this.peer.port, _.bind(this.onconnect, this) )
    },
    onconnect: function(connectInfo) {
        if (! this.sockInfo) {
            console.log('onconnect, but we already timed out')
        }
        this.log('peer onconnect',connectInfo);
        this.set('state','connected')
        this.peer.set('connected_ever',true)
        if (this.connect_timeout_callback) {
            clearTimeout( this.connect_timeout_callback )
            this.connect_timeout_callback = null
            this.connecting = false
        }
        this.doRead()
        this.sendHandshake()
        this.sendExtensionHandshake()
    },
    doRead: function() {
        console.assert(! this.reading)
        this.reading = true
        chrome.socket.read( this.sockInfo.socketId, 4096, _.bind(this.on_peer_data,this) )
    },
    sendExtensionHandshake: function() {
        var data = {v: jstorrent.protocol.reportedClientName,
                    m: jstorrent.protocol.extensionMessages}
        if (this.peer.torrent.has_infodict()) {
            data.metadata_size = this.torrent.infodict_buffer.byteLength
        }
        var arr = new Uint8Array(bencode( data )).buffer;
        this.sendMessage('UTORRENT_MSG', [new Uint8Array([0]).buffer, arr])
    },
    sendMessage: function(type, payloads) {
        console.assert(jstorrent.protocol.messageNames[type] !== undefined)
        var payloadsz = 0
        for (var i=0; i<payloads.length; i++) {
            console.assert(payloads[i] instanceof ArrayBuffer)
            payloadsz += payloads[i].byteLength
        }

        var b = new Uint8Array(payloadsz + 5)
        var v = new DataView(b.buffer, 5)
        v.setUint32(0, payloadsz)
        v.setUint8(4, jstorrent.protocol.messageCodes[type])

        var idx = 0
        for (var i=0; i<payloads.length; i++) {
            b.set( new Uint8Array(payloads[i]), idx )
            idx += payloads[i].byteLength
        }
        
        this.write(b)
    },
    sendHandshake: function() {
        var bytes = []
        bytes.push( jstorrent.protocol.protocolName.length )
        for (var i=0; i<jstorrent.protocol.protocolName.length; i++) {
            bytes.push( jstorrent.protocol.protocolName.charCodeAt(i) )
        }
        // handshake flags, null for now
        bytes = bytes.concat( [0,0,0,0,0,0,0,0] )
        bytes = bytes.concat( this.peer.torrent.hashbytes )
        bytes = bytes.concat( this.peer.torrent.client.peeridbytes )
        console.assert( bytes.length == jstorrent.protocol.handshakeLength )
        this.write( new Uint8Array( bytes ).buffer )
    },
    write: function(data) {
        console.assert(data.byteLength > 0)
        this.writeBuffer.add(data)
        if (! this.writing) {
            this.writeFromBuffer()
        }
    },
    writeFromBuffer: function() {
        console.assert(! this.writing)
        var data = this.writeBuffer.consume_any_max(4096)
        this.log('write',data.byteLength)
        this.writing = true
        this.writing_length = data.byteLength
        chrome.socket.write( this.sockInfo.socketId, data, _.bind(this.onWrite,this) )
    },
    onWrite: function(writeResult) {
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
            this.set('bytes_sent', this.get('bytes_sent') + this.writing_length)
            this.writing = false
            this.writing_length = 0
            // continue writing out write buffer
            if (this.writeBuffer.size() > 0) {
                this.writeFromBuffer()
            }
        }
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
    on_peer_data: function(readResult) {
        this.reading = false
        if (! this.sockInfo) {
            console.error('onwrite for socket forcibly or otherwise closed')
            return
        }
        if (readResult.data.byteLength == 0) {
            this.close('peer closed socket')
            return
        } else {
            this.set('bytes_received', this.get('bytes_received') + readResult.data.byteLength)
            this.log('on_peer_data',readResult,readResult.data.byteLength)
            this.readBuffer.add( readResult.data )
            this.checkBuffer()
            this.doRead() // TODO -- only if we are actually interested right now...
        }
        //this.close('no real reason')
    },
    checkBuffer: function() {
        // checks if there are messages
        if (! this.peerHandshake) {
            if (this.readBuffer.size() >= jstorrent.protocol.handshakeLength) {
                var buf = this.readBuffer.consume(jstorrent.protocol.handshakeLength)
                this.peerHandshake = jstorrent.protocol.parseHandshake(buf)
                if (! this.peerHandshake) {
                    this.close('invalid handshake')
                }
                this.checkBuffer()
            }
        } else {
            // have peer handshake!
            var curbufsz = this.readBuffer.size()
            if (curbufsz >= 4) {
                var msgsize = new DataView(this.readBuffer.consume(4,true)).getUint32(0)
                if (msgsize > jstorrent.protocol.maxPacketSize) {
                    this.close('message too large')
                } else {
                    if (curbufsz >= msgsize + 4) {
                        var msgbuf = this.readBuffer.consume(msgsize + 4)
                        this.handleMessage(msgbuf)
                    }
                }
            }
        }
    },
    handleMessage: function(buf) {
        var data = {}
        console.log('handling bittorrent message', new Uint8Array(buf))
        var msgsz = new DataView(buf, 0, 4).getUint32(0)
        if (msgsz == 0) {
            data.type = 'keepalive'
            // keepalive message
        } else {
            data.code = new Uint8Array(buf, 4, 1)[0]
            var messageString = jstorrent.protocol.messageCodes[data.code]
            data.type = messageString
            data.payload = buf
        }

        console.log('handling message',data)
        debugger

    }
}

for (var method in jstorrent.Item.prototype) {
    jstorrent.PeerConnection.prototype[method] = jstorrent.Item.prototype[method]
}
