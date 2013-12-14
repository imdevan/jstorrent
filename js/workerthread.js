
if (self.jstorrent) {

    function WorkerThread(opts) {
        this.client = opts.client
        this.worker = new Worker('../js/workerthread.js')
        this.worker.addEventListener('message',_.bind(this.onMessage,this))
        this.worker.addEventListener('error',_.bind(this.onError,this))
        this.busy = false
        this.callbacks = {}
        this.messageCounter = 0
    }
    jstorrent.WorkerThread = WorkerThread

    WorkerThread.prototype = {
        onError: function(evt) {
            console.error('worker sent error',evt)
            debugger
        },
        onMessage: function(evt) {
            this.busy = false
            var msg = evt.data
            var id = msg._id
            delete msg._id
            var callback = this.callbacks[id]
            delete this.callbacks[id]
            callback(msg)
        },
        send: function(msg, callback) {
            this.busy = true
            var id = this.messageCounter++
            msg._id = id
            this.callbacks[id] = callback
            this.worker.postMessage(msg)
        },
    }

} else {
    importScripts('deps/digest.js')

    self.addEventListener('message', function(evt) {
        var msg = evt.data
        var id = msg._id

        if (msg.command == 'hashChunks') {
            var digest = new Digest.SHA1()
            for (var i=0; i<msg.chunks.length; i++) {
                digest.update( msg.chunks[i] )
            }
            var responseHash = new Uint8Array(digest.finalize())
            self.postMessage({hash:responseHash, _id:id})
        } else {
            self.postMessage({error:'unhandled command', _id:id})
        }
    })
}