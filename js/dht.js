/*
84.24.104.51 30173
173.183.177.235 23472
173.183.19.10 60555
74.211.59.135 53498
79.107.54.54 17104
124.170.229.29 46063
124.149.46.42 59323
78.148.0.83 53660
83.109.47.59 41993
184.148.30.116 16330
67.140.145.148 29254
74.12.117.42 50017
75.157.157.95 35579
112.162.134.194 56392
173.183.177.235 23472
14.200.254.180 10009
216.58.124.104 26415
98.148.217.33 12617
72.130.149.107 44548
190.83.178.56 57396
198.53.232.243 27396
187.56.51.15 43101
24.216.115.69 30137
107.16.52.102 41638
73.32.17.170 15898
212.13.58.124 64651
94.1.178.27 45682
91.155.88.150 16415
186.137.70.171 51165
213.114.140.234 47602
75.156.141.63 43548
92.45.166.218 17310
5.15.176.0 46236
92.45.166.218 17310
122.108.87.107 24788
178.32.55.251 49209
79.178.154.109 53162
174.45.1.115 55114
24.224.208.5 21677
173.183.19.10 60555
76.90.157.1 31876
66.222.230.82 24290
71.239.213.38 32736
174.45.1.115 55114
86.174.75.32 63912
142.105.209.81 31227
98.214.68.181 11662
*/


function dht_tid() {
    return String.fromCharCode( Math.floor(Math.random() * 256) ) +
        String.fromCharCode( Math.floor(Math.random() * 256) )
}

dhtSockMap = {}

function DHT() {

    this.id = ''
    for (i=0; i<20; i++) {
        this.id += String.fromCharCode( Math.floor(Math.random() * 256) )
    }
}

DHT.prototype = {
    test_dht: function(ip, port) {
        var tid = dht_tid()
        var msg = { t: tid,
                    y: "q",
                    q: "ping",
                    a: {id: this.id}
                  }

        var buf = new Uint8Array(bencode( msg, null, {utf8:false} )).buffer;

        //msg.a.id = '01234567890123456789'

        console.log('test_dht',ip,port,msg,buf.byteLength)

        chrome.sockets.udp.create( function(createInfo) {

            dhtSockMap[createInfo.socketId] = function(data) {
                var decoded = bdecode(ui82str(new Uint8Array(data.data)),{utf8:false})
                console.log('DHT RECV',data,decoded)
            }

            chrome.sockets.udp.bind( createInfo.socketId, '0.0.0.0', 0, function() {
                chrome.sockets.udp.send( createInfo.socketId,
                                         buf,
                                         ip,
                                         port,
                                         function(sendInfo) {
                                             //chrome.sockets.udp.close( createInfo.socketId, function(){} )



                                         })

            })
        })
    }
}

jstorrent.DHT = DHT