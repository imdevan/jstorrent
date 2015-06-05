//document.addEventListener("DOMContentLoaded", onready);
document.addEventListener('WebComponentsReady', onready);


function destroyChildren(d) {
    while (d.firstNode) { d.removeChild(d.firstNode) }
}

function DetailController() {
    this.torrent = null
    this.view = null
}
_.extend(DetailController.prototype, {
    setContext: function(torrent) {
        this.torrent = torrent
        torrent.ensureLoaded( function() {
            torrent.initializeFiles()
            //this.view = document.querySelector('torrent-files').$.list = torrent.files.items
            //console.log('setcontext',torrent.hashhexlower,torrent.files.items)
            flist.data = torrent.files.items
        })
    }
})

window.views = {
    detailController: new DetailController
}

function client_ready() {
    console.log('client ready')

    plist.data = client.torrents.items

}

function JSTorrentPolymerApp() {
    this.options = new jstorrent.Options({app:this})
    this.fileMetadataCache = new jstorrent.FileMetadataCache
    this.entryCache = new jstorrent.EntryCache
}
_.extend(JSTorrentPolymerApp.prototype, {
    canDownload: function() { return true },
    analytics: { sendEvent: function(){} }
})

function options_ready(app) {
    console.log('options loaded... creating client')
    window.client = new jstorrent.Client({app:app, id:'client01'});
    app.client = client
    client.on('ready', client_ready)    
}

function onready() {
    //window.app = new jstorrent.App({tab:true}); // tied into UI too much
    var app = new JSTorrentPolymerApp
    window.app = app
    app.options.load( options_ready.bind(this, app) )

}
