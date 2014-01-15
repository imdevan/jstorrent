/*
useful parseUri regexp credit https://github.com/derek-watson/jsUri
*/

var parseUriRE = {uri_parser: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/}

function parseUri(str) {
    var parser = parseUriRE;
    var parserKeys = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
    var m = parser.exec(str || '');
    var parts = {};

    parserKeys.forEach(function(key, i) {
        parts[key] = m[i] || '';
    });

    return parts;
}

// we need to emulate XHR object because it doesn't let us set "unsafe" User-Agent header

function ChromeSocketXMLHttpRequest() {
    this.onload = null
    this.onerror = null
    this.opts = null

    this.timedOut = false
    this.timeout = 0
    this.timeoutId = null

    this.readBuffer = new jstorrent.Buffer
    this.writeBuffer = new jstorrent.Buffer

    this.connecting = false
    this.reading = false
    this.writing = false

    this.extraHeaders = {}
}

ChromeSocketXMLHttpRequest.prototype = {
    open: function(method, url, async) {
        this.opts = { method:method,
                      url:url,
                      async:true }
        this.uri = parseUri(this.opts.url)
        console.assert(this.uri.protocol == 'http') // https not supported for chrome.socket yet
    },
    setRequestHeader: function(key, val) {
        this.extraHeaders[key] = val
    },
    send: function(data) {
        console.assert( ! data ) // do not support sending request body yet
        chrome.socket.create('tcp', {}, _.bind(this.onCreate, this))
        if (this.timeout !== 0) {
            this.timeoutId = setTimeout( _.bind(this.checkTimeout, this), this.timeout )
        }
    },
    createRequestHeaders: function() {
        var lines = []
        var headers = {'Connection': 'close',
                       'User-Agent': 'uTorrent/330B(30235)(server)(30235)',
                       'Host': this.uri.host}
        _.extend(headers, this.extraHeaders)
        if (this.opts.method == 'GET') {
            headers['Content-Length'] == '0'
        } else {
            this.error('unsupported method')
        }

        lines.push(this.opts.method + ' ' + this.uri.relative + ' HTTP/1.1')
        for (var key in headers) {
            lines.push( key + ': ' + headers[key] )
        }
        return lines.join('\r\n') + '\r\n\r\n'
    },
    checkTimeout: function() {
    },
    error: function(data) {
        if (this.onerror) {
            this.onerror(data)
        }
    },
    onCreate: function(sockInfo) {
        this.sockInfo = sockInfo
        this.connecting = true
        chrome.socket.connect( sockInfo.socketId, this.getHost(), this.getPort(), _.bind(this.onConnect, this) )
    },
    onConnect: function(result) {
        this.connecting = false
        if (this.timedOut) {
            return
        } else if (result < 0) {
            this.error({error:'connection error',
                        code:result})
        } else {
            var headers = this.createRequestHeaders()
            this.writeBuffer.add( str2ab(headers) )
            this.writeFromBuffer()
            this.doRead()
        }
    },
    getHost: function() {
        return this.uri.host
    },
    getPort: function() {
        return parseInt(this.uri.port) || 80
    },
    writeFromBuffer: function() {
        console.assert(! this.writing)
        this.writing = true
        var data = this.writeBuffer.consume_any_max(jstorrent.protocol.socketWriteBufferMax)
debugger
        console.log('writing data',ui82str(data))
        chrome.socket.write( this.sockInfo.socketId, data, _.bind(this.onWrite,this) )
    },
    onWrite: function(result) {
        this.writing = false
        console.log('write to socket',result)
    },
    doRead: function() {
        console.assert(! this.reading)
        chrome.socket.read( this.sockInfo.socketId, jstorrent.protocol.socketReadBufferMax, _.bind(this.onRead,this) )
    },
    onRead: function(result) {
        this.reading = false
        if (result.data.byteLength == 0) {
            console.warn('remote closed connection!')
            // remote closed connection
        } else {
            console.log('chromexhr onread',new Uint8Array(result.data))
            this.readBuffer.add( result.data )
debugger
        }

    }
}

