function File(opts) {
    jstorrent.Item.apply(this, arguments)
    this.torrent = opts.torrent
    this.num = opts.num

    if (this.torrent.multifile) {
        // should we prepend torrent name?
        var path = this.torrent.infodict.files[this.num].path;
        this.path = path
        this.name = path[path.length-1]
    } else {
        this.path = [this.torrent.infodict.name]
        this.name = this.torrent.infodict.name
    }

}
jstorrent.File = File
File.prototype = {
    get_key: function() {
        return this.num
    },
    getEntry: function(callback) {
        // gets file entry, recursively creating directories as needed...
        var filesystem = this.torrent.getStorage().entry
        var path = this.path.slice()

        function recurse(e) {
            if (path.length == 0) {
                if (e.isFile) {
                    callback(e)
                } else {
                    callback({error:'file exists'})
                }
            } else if (e.isDirectory) {
                if (path.length > 1) {
                    e.getDirectory(path.shift(), {create:true}, recurse, recurse)
                } else {
                    e.getFile(path.shift(), {create:true}, recurse, recurse)
                }
            } else {
                callback({error:'file exists'})
            }
        }
        recurse(filesystem)
    }
}
for (var method in jstorrent.Item.prototype) {
    jstorrent.File.prototype[method] = jstorrent.Item.prototype[method]
}
