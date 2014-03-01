
function showranges(canvas, vid) {
    // from http://jsfiddle.net/AbdiasSoftware/Drw6M/
    var ctx = canvas.getContext('2d');

    canvas.onclick = function (e) {
        var vl = vid.duration,
        w = canvas.width,
        x = e.clientX - 5;

        vid.currentTime = x / w * vl;
    }
    loop();

    function loop() {

        var b = vid.buffered,
        i = b.length,
        w = canvas.width,
        h = canvas.height,
        vl = vid.duration,
        x1, x2;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#d00';

        while (i--) {
            x1 = b.start(i) / vl * w;
            x2 = b.end(i) / vl * w;
            ctx.fillRect(x1, 0, x2 - x1, h);
        }
        ctx.fillStyle = '#fff';

        x1 = vid.currentTime / vl * w;
        //ctx.textBaseline = 'top';
        //ctx.textAlign = 'left';

        //ctx.fillText(vid.currentTime.toFixed(1), 4, 4);

        //ctx.textAlign = 'right';
        //ctx.fillText(vl.toFixed(1), w - 4, 4);

        ctx.beginPath();
        ctx.arc(x1, h * 0.5, 7, 0, 2 * Math.PI);
        ctx.fill();

        setTimeout(loop, 29);
    }
    document.getElementById('play').addEventListener('click', function () {
        vid.play()
    }, false);
    document.getElementById('pause').addEventListener('click', function () {
        vid.pause()
    }, false);
}


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
            var streamurl = '/stream?hash=' + d.hash + '&file=' + d.file
            var video = document.createElement('video')
            //video.preload = 'none'
            //video.preload = 'metadata'
            video.autoplay = 'true'
            video.controls = 'true'
            video.id = 'video'
            addevents(video)
            video.src = streamurl
            document.getElementById('container').appendChild(video)

            var canvas = document.getElementById('canvas')
            showranges(canvas, video)

        } else {

            document.getElementById('container').innerText = 'invalid URL'

        }

        window.token = d.token
        window.port = chrome.runtime.connect(d.id)
        port.onMessage.addListener( function(msg) {
            console.log('onmessage',msg)
        })
        port.onDisconnect.addListener( function(msg) {
            console.log('ondisconnect',msg)
        })
        port.postMessage({token:token, command:'hello'})
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