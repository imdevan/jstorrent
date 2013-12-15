function Disk(opts) {
    jstorrent.Item.apply(this, arguments)

    this.diskio = new jstorrent.DiskIO({disk:this})
    this.client = opts.client

    if (opts.id) {
        // being restored, need to call restoreEntry
        this.key = opts.id
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
