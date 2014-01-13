
var options = new Options;

document.addEventListener("DOMContentLoaded", onready);

function bind_events() {
    $('#button-choose-download').click( function(evt) {
        var opts = {'type':'openDirectory'}

        chrome.fileSystem.chooseEntry(opts,
                                      _.bind(options.on_choose_download_directory, options)
                                     )
        evt.preventDefault()
        evt.stopPropagation()
    })

    $('#request-identity').click( function(evt) {
        console.log(chrome.runtime.lastError)
        chrome.permissions.request({permissions:['identity']},
                                   function(result){console.log('grant result',result)
                                                    console.log(chrome.runtime.lastError)
                                                    chrome.identity.getAuthToken({interactive:true}, function(idresult) {
                                                        console.log('id result',idresult)
                                                    })
                                                   })
        console.log(chrome.runtime.lastError)
        
    })
}

function onready() {
    console.log("This is Options window")

    if (chrome.runtime.id == jstorrent.constants.jstorrent_lite) {
        $("#full_version_upsell").show()
    }

    bind_events()
    options.load( function() {} );
}
