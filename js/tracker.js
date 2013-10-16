function Tracker(opts) {
    this.torrent = opts.torrent
    this.url = opts.url
    console.log("INIT TRACKER CLIENT W OPTS",opts)
    var parts = this.url.split('/')[2].split(':');
    this.host = parts[0];
    this.port = parseInt(parts[1]);
}
jstorrent.Tracker = Tracker;

Tracker.prototype = {
    announce: function() {
	console.log('tracker announce!')
    }
}

function HTTPTracker() {
    Tracker.apply(this, arguments)
}

jstorrent.HTTPTracker = HTTPTracker;
for (var method in Tracker.prototype) {
    jstorrent.HTTPTracker.prototype[method] = Tracker.prototype[method]
}
function UDPTracker() {
    Tracker.apply(this, arguments)
}
jstorrent.UDPTracker = UDPTracker;
for (var method in Tracker.prototype) {
    jstorrent.UDPTracker.prototype[method] = Tracker.prototype[method]
}