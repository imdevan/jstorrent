
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
}

function onready() {
    console.log("This is Options window")
    bind_events()
    options.load( function() {} );
}
