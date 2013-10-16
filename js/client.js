// torrent client !

function Client(opts) {
}

Client.prototype = {
    add_from_url: function(url) {
	// adds a torrent from a text input url


	// parse url
	console.log('client add by url',url)

	var tracker = new jstorrent.HTTPTrackerClient({torrent:torrent, url:url})
	var torrent = new jstorrent.Torrent({tracker:tracker})

    }
}

jstorrent.Client = Client