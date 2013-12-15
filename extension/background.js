//console.log('extension loaded')
var jstorrent_id = "anhdpjpojoipgpmfanmedjghaligalgb"
// TODO -- add jstorrent lite
var createProps = {
    title:"Add to JSTorrent",
    contexts:["link"],
    onclick: function(info, tab) {
        console.log(info, tab)
        
        chrome.runtime.sendMessage(jstorrent_id, {url:info.linkUrl, pageUrl:info.pageUrl}, function(result) {
            console.log('result of message',result)
            // if no result, then try jstorrent lite
        })
    },
    targetUrlPatterns: ["magnet:*","*://*/*.torrent"]
    
}
chrome.contextMenus.create(createProps, function() {
    //console.log('created contextMenu')
})


