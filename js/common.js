// common stuff
jstorrent = window.jstorrent || {}
bind = Function.prototype.bind
jspack = new JSPack


function Collection() {
    // collection of items, good for use with a slickgrid
    this.items = []
}

function reload() {
    chrome.runtime.reload()
}