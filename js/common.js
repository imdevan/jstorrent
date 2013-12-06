// common stuff
jstorrent = window.jstorrent || {}

jstorrent.options = {
    load_options_on_start: false,
    add_torrents_on_start: true,
    run_unit_tests: false
}
bind = Function.prototype.bind


function reload() {
    chrome.runtime.reload()
}

function ui82str(arr) {
    var length = arr.length
    var str = ""
    for (var i=0; i<length; i++) {
        str += String.fromCharCode(arr[i])
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
