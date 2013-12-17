//console.log('extension loaded')
var jstorrent_id = "anhdpjpojoipgpmfanmedjghaligalgb"
var jstorrent_lite_id = "abmohcnlldaiaodkpacnldcdnjjgldfh"
// TODO -- add jstorrent lite
var createProps = {
    title:"Add to JSTorrent",
    contexts:["link"],
    onclick: function(info, tab) {
        console.log(info, tab)
        
        chrome.runtime.sendMessage(jstorrent_id, {url:info.linkUrl, pageUrl:info.pageUrl}, function(result) {
            console.log('result of message from full',result)
            // if no result, then try jstorrent lite ?
        })

        chrome.runtime.sendMessage(jstorrent_lite_id, {url:info.linkUrl, pageUrl:info.pageUrl}, function(result) {
            console.log('result of message from lite',result)
            // if no result, then try jstorrent lite
        })


    },
    targetUrlPatterns: ["magnet:*","*://*/*.torrent"]
    
}
chrome.contextMenus.create(createProps, function() {
    //console.log('created contextMenu')
})


