// common stuff
window['jstorrent'] = window['jstorrent'] || {}
jstorrent.constants = {
    cws_jstorrent: "anhdpjpojoipgpmfanmedjghaligalgb",
    cws_jstorrent_lite: "abmohcnlldaiaodkpacnldcdnjjgldfh",
    cws_jstorrent_extension: "bnceafpojmnimbnhamaeedgomdcgnbjk",
    cws_jstorrent_extension_url: "https://chrome.google.com/webstore/detail/bnceafpojmnimbnhamaeedgomdcgnbjk",
    keyPresentInPreRewrite: 'blah',
    manifest: chrome.runtime.getManifest(),
    chunkRequestTimeoutInterval: 12000
}
jstorrent.strings = {
    NOTIFY_NO_DOWNLOAD_FOLDER: "No Download Folder selected. Click to select your Download Directory.",
    NOTIFY_HOW_TO_CHANGE_DOWNLOAD_DIR: "You can change the download directory in the Options page",
    NOTIFY_SET_DOWNLOAD_DIR: "Set default download location to "
}
jstorrent.getLocaleString = function(s) {
    if (arguments.length > 1) {
        // TODO %s handling etc
        for (var i=1; i<arguments.length; i++) {
            s += arguments[i]
        }
    }
    return s
}
jstorrent.options = {
    load_options_on_start: false,
    add_torrents_on_start: false,
    run_unit_tests: false,
    disable_trackers: false,
    manual_peer_connect_on_start: {
//        'b91ec066668f2ce8111349ae86cc81941ce48c69': ['184.75.214.170:15402']
//        'b91ec066668f2ce8111349ae86cc81941ce48c69': ['127.0.0.1:9090'],
//        '726ff42f84356c9aeb27dfa379678c89f0e62149': ['127.0.0.1:9090'],
    },
//    always_add_special_peer: '127.0.0.1:9090',
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
function ui82arr(arr, startOffset) {
    if (! startOffset) { startOffset = 0 }
    var length = arr.length - startOffset
    var outarr = []
    for (var i=0; i<length; i++) {
        outarr.push(arr[i + startOffset])
    }
    return outarr
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

function pad(s, padwith, len) {
    // pad the string s with padwith to length upto
    while (true) {
        if (s.length == len) {
            return s
        } else if (s.length < len) {
            s = padwith + s
        } else if (s.length > len) {
            console.assert(false)
            return
        }
    }
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

window.onerror = function(message, url, line) {
    // TODO -- report this to google analytics or something
    if (window.app) {
        if (url.toLowerCase().match('^chrome-extension://')) {
            var parts = url.split('/')
            parts.shift(); parts.shift(); parts.shift()
            url = parts.join('/')
        }
        window.app.createNotification({message:"Unexpected Error!",
                                       priority: 2,
                                       details: 'ver ' + jstorrent.constants.manifest.version+". In file " + url + " at line " + line + ', ' + message})

        window.app.analytics.tracker.sendEvent("window.onerror", url + "(" + line + ")", message)

    }
    console.log('window.onerror triggered',message,url,line)
}