function Disk(opts) {
    jstorrent.Item.apply(this, arguments)

    this.diskio = new jstorrent.DiskIO({disk:this})
    this.client = opts.client || opts.parent.parent

    this.think_interval = null
    this.client.on('activeTorrentsChange', _.bind(function(){
        _.delay(function() {
            var numActive = this.client.get('numActiveTorrents')

            if (numActive == 0) {
                console.log('disk, stop tick interval')
                if (this.think_interval) { 
                    clearInterval(this.think_interval)
                    this.think_interval = null
                }
            } else {
                console.log('disk, start tick interval')
                if (! this.think_interval) {
                    this.think_interval = setInterval( this.checkBroken.bind(this), 35000 )
                }
            }

        }.bind(this))

    },this))

    if (opts.key && opts.key == 'HTML5:persistent') {
        function ondir(result) {
            this.entry = result
            this.trigger('ready')            
        }

        function onreq(result) {
            result.root.getDirectory("Download",{create:true},_.bind(ondir,this),_.bind(ondir,this))
        }
        var req = window.webkitRequestFileSystem || window.requestFileSystem
        req(window.PERSISTENT, 0, _.bind(onreq,this), _.bind(onreq,this))
        this.key = opts.key
    } else if (opts.id) {
        // being restored, need to call restoreEntry
        this.key = opts.id

        if (! this.key) {
            this.error = true
        }
        //console.log('restoring disk with id',this.key)
        chrome.fileSystem.restoreEntry(this.key, _.bind(function(entry) {
            // remove this.
            if (!entry) {
                console.error('unable to restore entry - (was the folder removed?)', opts.id)
                var parts = opts.id.split(':')
                parts.shift()
                var folderName = parts.join(':')
                var collection = this.getCollection()
                collection.opts.client.trigger('error','Unable to load Download Directory: '+ folderName)
                // now loop over torrents using this download directory and set their error state
                var torrents = collection.opts.client.torrents
                for (var i=0; i<torrents.items.length; i++) {
                    if (torrents.items[i].get('disk') == opts.id) {
                        torrents.items[i].stop()
                        torrents.items[i].invalidDisk = true
                        torrents.items[i].set('state','error')
                        
                    }
                }
                
                collection.remove(this)
                collection.save()
            } else {
                //console.log('successfully restored entry')
                this.entry = entry
            }
        },this))

    } else {
        this.entry = opts.entry
        this.key = null
    }
}
jstorrent.Disk = Disk
Disk.prototype = {
    checkBroken: function(callback) {
        console.log('checkBroken')
        var _this = this
        if (this.checkingBroken) { console.log('alreadycheckingbroken');return }
        this.checkingBroken = true

        this.checkBrokenTimeout = setTimeout( function(){
            this.checkingBroken = false
            this.concurrentBroken++
            console.error('disk seems definitely broken. needs restart?',this.concurrentBroken)
            if (this.concurrentBroken > 1) {
                console.error('disk broken concurrently...',this.concurrentBroken)
                app.notify("FATAL ERROR. Please restart the app",2)
            }
            if (callback) { callback(true) }
        }.bind(this),30000)

        this.entry.getMetadata(function(info) {
            this.checkingBroken = false
            this.concurrentBroken = 0
            clearTimeout(this.checkBrokenTimeout)
            console.log('notbroken')
            //console.log('disk getMetadata',info)
        }.bind(this),
                               function(err) {
                                   this.checkingBroken = false
                                   clearTimeout(this.checkBrokenTimeout)
                                   debugger
                                   console.log('disk getMetadata err',err)
                               }.bind(this)
                              )
    },
    cancelTorrentJobs: function(torrent) {
        this.diskio.cancelTorrentJobs(torrent)
    },
    get_key: function() {
        if (! this.key) { 
            this.key = chrome.fileSystem.retainEntry(this.entry)
        }
        return this.key
    }
}

for (var method in jstorrent.Item.prototype) {
    jstorrent.Disk.prototype[method] = jstorrent.Item.prototype[method]
}
