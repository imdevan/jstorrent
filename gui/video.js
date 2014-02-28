

function onload() {
    console.log('loaded')

    if (window.location.search) {
        var s = window.location.search.slice(1,window.location.search.length)
        var parts = s.split('&')
        var d = {}
        for (var i=0; i<parts.length; i++) {
            var sp = parts[i].split('=')
            d[decodeURIComponent(sp[0])] = decodeURIComponent(sp[1])
        }

        console.log('args',d)
        var filenum = d.file
        if (d.file === undefined) { d.file = 0 }

        if (d.hash) {
            var streamurl = '/proxy?hash=' + d.hash + '&file=' + d.file
            var video = document.createElement('video')
            //video.preload = 'none'
            //video.preload = 'metadata'
            video.autoplay = 'true'
            video.controls = 'true'
            video.id = 'video'
            addevents(video)
            video.src = streamurl
            document.getElementById('container').appendChild(video)
        }
    }
}

document.addEventListener("DOMContentLoaded", function(){
    onload()
})

function reload() { window.location.reload() }
function addevents(video) {

    video.addEventListener("readystatechange", function(evt) { console.log('readystatechange'); } );
    video.addEventListener("stalled", function(evt) { console.log("stalled",evt); } );
    video.addEventListener("durationchange", function(evt) { console.log('durationchange',evt); } );
    video.addEventListener("loadstart", function(evt) { console.log("load start",evt); } );
    video.addEventListener("abort", function(evt) { console.log("abort",evt); } );
    video.addEventListener("loadedmetadata", function(evt) { console.log("got metadata",evt); } );
    video.addEventListener("error", function(evt) { console.log("got error",evt); 
                                                    console.log('video state: ',video.readyState);
                                                  } );
    video.addEventListener("canplay", function(evt) { console.log('canplay',evt); } );
    video.addEventListener("progress", function(evt) { console.log("progress"); } );
    video.addEventListener("seek", function(evt) { console.log('seek',evt); } );
    video.addEventListener("seeked", function(evt) { console.log('seeked',evt); } );
    video.addEventListener("ended", function(evt) { console.log('ended',evt); } );
    //video.addEventListener("timeupdate", function(evt) { console.log('timeupdate',evt); } );
    video.addEventListener("pause", function(evt) { console.log('pause',evt); } );
    video.addEventListener("play", function(evt) { console.log('play',evt); } );
    video.addEventListener("suspend", function(evt) {
        //            console.log('suspend event',evt);
    });


}