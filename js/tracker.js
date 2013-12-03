function Tracker(opts) {
    this.torrent = opts.torrent
    this.url = opts.url
    console.log("INIT TRACKER CLIENT W OPTS",opts)
    var parts = this.url.split('/')[2].split(':');
    this.scheme = this.url.split('/')[0].split(':')[0].toLowerCase();
    this.host = parts[0];
    this.port = parseInt(parts[1]);

    this.connection = null;

}
jstorrent.Tracker = Tracker;

Tracker.prototype = {
    announce: function() {
	console.log('tracker announce!', this.scheme, this.host, this.port)

	if (! this.connection) {
	    this.get_connection( _.bind(function(connectionInfo, err) {
                console.log('tracker got connection',connectionInfo.connectionId)

                var announceRequest = this.get_announce_payload( connectionInfo.connectionId );

                chrome.socket.write( connectionInfo.socketId, announceRequest.payload, _.bind( function(writeResult) {
                    // check error condition?
                    chrome.socket.read( connectionInfo.socketId, null, _.bind(this.on_announce_response, this, connectionInfo, announceRequest ) )
                }, this))



	    },this) );
	}
    },
    on_announce_response: function(connectionInfo, announceRequest, readResponse) {
        var v = new DataView(readResponse.data);
        var resp = v.getUint32(4*0)
        var respTransactionId = v.getUint32(4*1);
        var respInterval = v.getUint32(4*2);
        var leechers = v.getUint32(4*3);
        var seeders = v.getUint32(4*4);

        console.assert( respTransactionId == announceRequest.transactionId )

        var countPeers = (readResponse.data.byteLength - 20)/6
        console.log('announce sayz leechers',leechers,',seeders',seeders,',interval',respInterval)
        console.log('got',countPeers,'peers');

        for (var i=0; i<countPeers; i++) {
            var ipbytes = [v.getUint8( 20 + (i*6) ),
                      v.getUint8( 20 + (i*6) + 1),
                      v.getUint8( 20 + (i*6) + 2),
                      v.getUint8( 20 + (i*6) + 3)]
            var port = v.getUint16( 20 + (i*6) + 4 )
            var ip = ipbytes.join('.')
            console.log('got peer',ip,port)
        }
    }
}

function HTTPTracker() {
    Tracker.apply(this, arguments)
}

jstorrent.HTTPTracker = HTTPTracker;
for (var method in Tracker.prototype) {
    jstorrent.HTTPTracker.prototype[method] = Tracker.prototype[method]
}

function UDPTracker() {
    Tracker.apply(this, arguments)
}



UDPTracker.prototype = {
    get_announce_payload: function(connectionId) {
        var transactionId = Math.floor(Math.random() * Math.pow(2,32))
        var payload = new Uint8Array([
            0,0,0,0, 0,0,0,0, /* connection id */
            0,0,0,1, /* action */
            0,0,0,0, /* transaction id */
            0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0, /* infohash */
            0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0, /* peer id */
            0,0,0,0,0,0,0,0, /* downloaded */
            0,0,0,0,0,0,0,0, /* left */
            0,0,0,0,0,0,0,0, /* uploaded */
            0,0,0,0, /* event */
            0,0,0,0, /* ip */
            0,0,0,0, /* key */
            255,255,255,255, /* numwant */
            2,0, /* port */
            0,0, /* extensions */
        ]);

        var v = new DataView( payload.buffer );
        v.setUint32( 0, connectionId[0] )
        v.setUint32( 4, connectionId[1] )
        v.setUint32( 12, transactionId )
        for (var i=0; i<20; i++) {
            v.setInt8(16+i, this.torrent.hashbytes[i])
        }
        for (var i=0; i<20; i++) {
            v.setInt8(16+i, this.torrent.hashbytes[i])
        }
        for (var i=0; i<20; i++) {
            v.setInt8(36+i, this.torrent.client.peeridbytes[i])
        }
        return {payload: payload.buffer, transactionId: transactionId};
    },
    get_connection_data: function() {
	// bittorrent udp protocol connection header info
        var protocol_id = [0, 0, 4, 23, 39, 16, 25, 128]
        var action = 0
        var transaction_id = Math.floor(Math.random() * Math.pow(2,32))
        var packed = jspack.Pack(">II", [action, transaction_id])
        var payload = new Uint8Array(protocol_id.concat(packed)).buffer
        return {payload:payload, transaction_id:transaction_id}
    },
    get_connection: function(callback) {
        chrome.socket.create('udp', {}, _.bind(function(sockInfo) {
            var sockId = sockInfo.socketId
            chrome.socket.connect( sockId, this.host, this.port, _.bind( function(sockConnectResult) {

                var connRequest = this.get_connection_data();
                chrome.socket.write( sockId, connRequest.payload, _.bind( function(sockWriteResult) {

                    chrome.socket.read( sockId, null, _.bind( function(sockReadResult) {

                        console.log('udp get connection response',sockReadResult)

                        var resp = new DataView( sockReadResult.data );
                        var respAction = resp.getUint32(0);
                        var respTransactionId = resp.getUint32(4)
                        var connectionId = [resp.getUint32(8), resp.getUint32(12)]

                        console.assert( connRequest.transaction_id == respTransactionId );
                        callback( {connectionId:connectionId, socketId:sockInfo.socketId}, null )

                    }, this));

                }, this));

            }, this));
        },this));
    }
}



jstorrent.UDPTracker = UDPTracker;
for (var method in Tracker.prototype) {
    jstorrent.UDPTracker.prototype[method] = Tracker.prototype[method]
}

