function Disk(opts) {
    jstorrent.Item.apply(this, arguments)

    this.diskio = new jstorrent.DiskIO({disk:this})
    this.client = opts.client

    if (opts.id) {
        // being restored, need to call restoreEntry
        this.key = opts.id
        console.log('restoring disk with id',this.key)
        chrome.fileSystem.restoreEntry(this.key, _.bind(function(entry) {
            console.error('unable to restore entry -- perhaps re-install')
            if (!entry) {
                this.getCollection().opts.client.trigger('error','disk restore error')
            } else {
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
