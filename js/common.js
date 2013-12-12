// common stuff
jstorrent = window.jstorrent || {}

jstorrent.options = {
    load_options_on_start: false,
    add_torrents_on_start: false,
    run_unit_tests: true,
    disable_trackers: true,
    manual_peer_connect_on_start: {
//        'b91ec066668f2ce8111349ae86cc81941ce48c69': ['184.75.214.170:15402']
//        'b91ec066668f2ce8111349ae86cc81941ce48c69': ['127.0.0.1:9090'],
//        '726ff42f84356c9aeb27dfa379678c89f0e62149': ['127.0.0.1:9090'],
    },
    always_add_special_peer: '127.0.0.1:9090',
//    manual_infohash_on_start: ['726ff42f84356c9aeb27dfa379678c89f0e62149']
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

// from python land, assumes arr is sorted
function bisect_left(arr, x, lo, hi) {
    var mid
    if (lo === undefined) { lo=0 }
    if (hi === undefined) { hi=arr.length }
    while (lo < hi) {
        mid = Math.floor((lo+hi)/2)
        if (arr[mid] < x) { lo = mid+1 }
        else { hi = mid }
    }
    return lo
}

function bisect_right(arr, x, lo, hi) {
    var mid
    if (lo === undefined) { lo=0 }
    if (hi === undefined) { hi=arr.length }
    while (lo < hi) {
        mid = Math.floor((lo+hi)/2)
        if (x < arr[mid]) { hi = mid }
        else { lo = mid+1 }
    }
    return lo
}

function intersect(a,b, c,d) {
    // intersects intervals [a,b], and [c,d]
    if (b < c || d < a) { return null }
    else { return [Math.max(a,c), Math.min(b,d)] }
}

(function() {
    var units = ['B','kB','MB','GB','TB']
    var idxmax = units.length - 1

    function byteUnits(val) {
        // TODO - this is dumb, dont divide, just do comparison. more efficient
        if (val === undefined) { return '' }
        var idx = 0
        while (val >= 1024 && idx < idxmax) {
            val = val/1024
            idx++
        }
        var round = (idx==0) ? 0 : 2
        return val.toFixed(round) + ' ' + units[idx]
    }
    window.byteUnits = byteUnits
})()

// not working?
window.onerror = function(message, url, line) {
    console.log('window.onerror triggered',message,url,line)
}