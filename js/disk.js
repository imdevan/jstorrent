function Disk(opts) {
    jstorrent.Item.apply(this, arguments)

    this.diskio = new jstorrent.DiskIO({disk:this})

    if (opts.id) {
        // being restored, need to call restoreEntry
        this.key = opts.id
        chrome.fileSystem.restoreEntry(this.key, _.bind(function(entry) {
            console.assert(entry)
            if (!entry) {
                this.client.trigger('error','disk restore error')
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
