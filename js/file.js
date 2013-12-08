function File(opts) {
    jstorrent.Item.apply(this, arguments)
    this.torrent = opts.torrent
    this.num = opts.num

    this.set('name', this.torrent.infodict.files[this.num].path.join('/'))
}
jstorrent.File = File
File.prototype = {
    get_key: function() {
        return this.num
    },
    getEntry: function() {
        // gets file entry, recursively creating directories as needed...
        var filesystem = this.torrent.getStorage().entry
        filesystem.getFile( 'blah.txt', {},
                            function(result) {
                                console.log('success result',result)
debugger
                            },
                            function(result) {
                                console.log('error result',result)
debugger
                            })
    },
}
for (var method in jstorrent.Item.prototype) {
    jstorrent.File.prototype[method] = jstorrent.Item.prototype[method]
}
