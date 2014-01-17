if (self.jstorrent) {
    // this means we are in the main UI context

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
            //console.log('receive message back from worker',msg)
            var id = msg._id
            delete msg._id
            var callback = this.callbacks[id]
            delete this.callbacks[id]
            callback(msg)
        },
        send: function(msg, callback) {
            //console.log('compute hash')
            var transfers = []
            if (msg.chunks && jstorrent.options.transferable_objects) {
                for (var i=0; i<msg.chunks.length; i++) {
                    // msg.chunks[i] is actually a uint8array with
                    // offset, but with a standard 13 bytes extra at
                    // the beginning, so the sha1 hasher needs to know
                    // this
                    if (msg.chunks[i].buffer.byteLength == 0) {
                        console.warn('tried to send data to be hashed that had byteLength 0, likely already sent this piece to worker')
                        callback({error:"data already transfered"})
                        return
                    }
                    transfers.push( msg.chunks[i].buffer )
                }
            }
            this.busy = true
            var id = this.messageCounter++
            msg._id = id
            msg.transferable = jstorrent.options.transferable_objects
            this.callbacks[id] = callback

            if (transfers.length > 0) {
                //console.log('sending with transfers',transfers)
                this.worker.postMessage(msg, transfers)
            } else {
                this.worker.postMessage(msg)
            }
        },
    }

} else {
    // otherwise we are in the worker thread
    importScripts('deps/digest.js')

    self.addEventListener('message', function(evt) {
        var msg = evt.data
        var id = msg._id
        var transferable = msg.transferable
        var returnchunks = []

        if (msg.command == 'hashChunks') {
            var digest = new Digest.SHA1()
            for (var i=0; i<msg.chunks.length; i++) {
                digest.update( msg.chunks[i] )
                if (transferable) {
                    // this seems to have helped, creating a new uint8array on it...?
                    returnchunks.push( new Uint8Array(msg.chunks[i]).buffer )
                }
            }
            var responseHash = new Uint8Array(digest.finalize())
            if (transferable) {
                self.postMessage({hash:responseHash, _id:id, chunks:msg.chunks}, returnchunks)
            } else {
                self.postMessage({hash:responseHash, _id:id})
            }
        } else {
            self.postMessage({error:'unhandled command', _id:id})
        }
    })
}