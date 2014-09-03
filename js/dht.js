(function(){

function dht_tid() {
    return String.fromCharCode( Math.floor(Math.random() * 256) ) +
        String.fromCharCode( Math.floor(Math.random() * 256) )
}

var udp = chrome.sockets.udp
window.dhtSockMap = {}

function DHT() {

    this.id = ''
    for (i=0; i<20; i++) {
        this.id += String.fromCharCode( Math.floor(Math.random() * 256) )
    }

    this.queryTimeouts = {}
    this.activeSockets = {}
}

DHT.prototype = {
    ping: function(ip, port) {
        var msg = {
                    y: "q",
                    q: "ping",
                    a: {id: this.id}
                  }
        this.query(ip, port, msg, 8000, function(data) {
            console.log('ping response',data)
        })
    },
    query: function(ip, port, msg, timeout, callback) {
        // query ip/port and get response

        // use only a single udp socket? not sure...

        udp.create( function(createInfo) {
            var socketId = createInfo.socketId
            this.activeSockets[socketId] = true

            dhtSockMap[socketId] = this.on_query_response.bind(this, socketId, msg, callback)
            if (timeout) {
                var t = setTimeout( this.on_query_response_timeout.bind(this, socketId, msg, callback),
                                    timeout )
                this.queryTimeouts[socketId] = [t, new Date]
            }

            msg.t = dht_tid()

            var buf = new Uint8Array(bencode( msg, null, {utf8:false} )).buffer;

            udp.bind( createInfo.socketId, '0.0.0.0', 0, function() {
                udp.send( createInfo.socketId,
                          buf,
                          ip,
                          port,
                          function(sendInfo) {
                          })
            })
        }.bind(this))
    },
    close_socket: function(socketId) {
        delete this.activeSockets[socketId]
        udp.close( socketId, function(){} )
    },
    on_query_response: function(socketId, msg, callback, data) {
        var timeoutInfo = this.queryTimeouts[socketId]
        delete this.queryTimeouts[socketId]
        clearTimeout(timeoutInfo[0])
        var decoded = bdecode(ui82str(new Uint8Array(data.data)),{utf8:false})
        //console.log('on query response',data,decoded)
        this.close_socket(socketId)
        callback(decoded, data)
    },
    on_query_response_timeout: function(socketId, msg, callback) {
        var timeoutInfo = this.queryTimeouts[socketId]
        delete this.queryTimeouts[socketId]
        clearTimeout(timeoutInfo[0])
        this.close_socket(socketId)
        callback({error:true,timeout:true,after:(new Date - timeoutInfo[1])})
    }
}

jstorrent.DHT = DHT

})()