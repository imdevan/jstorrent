// common stuff
jstorrent = window.jstorrent || {}

jstorrent.options = {
    load_options_on_start: false,
    add_torrents_on_start: true,
    run_unit_tests: false,
    disable_trackers: true,
    manual_peer_connect_on_start: {
//        'b91ec066668f2ce8111349ae86cc81941ce48c69': ['184.75.214.170:15402']
//        'b91ec066668f2ce8111349ae86cc81941ce48c69': ['127.0.0.1:9090'],
        '726ff42f84356c9aeb27dfa379678c89f0e62149': ['127.0.0.1:9090']
    },
    manual_infohash_on_start: ['726ff42f84356c9aeb27dfa379678c89f0e62149']
}
bind = Function.prototype.bind


function reload() {
    chrome.runtime.reload()
}

function ui82str(arr, startOffset) {
    if (! startOffset) { startOffset = 0 }
    var length = arr.length - startOffset
    var str = ""
    for (var i=0; i<length; i++) {
        str += String.fromCharCode(arr[i + startOffset])
    }
    return str
}

function parse_magnet(url) {
    var uri = url.slice(url.indexOf(':')+2)
    var parts = uri.split('&');
    var kv, k, v
    var d = {};
    for (var i=0; i<parts.length; i++) {
        kv = parts[i].split('=');
        k = decodeURIComponent(kv[0]);
        v = decodeURIComponent(kv[1]);
        if (! d[k]) d[k] = []
        d[k].push(v);
    }
    if (! d.xt) { return }
    var xt = d.xt[0].split(':');
    var hash = xt[xt.length-1];
    d['hashhexlower'] = hash.toLowerCase()
    return d;
}
