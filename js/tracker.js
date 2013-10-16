function TrackerClient(opts) {
    this.torrent = opts.torrent
    this.url = opts.url
    console.log("INIT TRACKER CLIENT W OPTS",opts)
}
jstorrent.TrackerClient = TrackerClient;

TrackerClient.prototype = {
    announce: function() {
    }
}

function HTTPTrackerClient() {
    TrackerClient.apply(this, arguments)
}

jstorrent.HTTPTrackerClient = HTTPTrackerClient;