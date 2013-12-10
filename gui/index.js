var gui_opts = {
    torrentGrid_width: 800,
    torrentGrid_height: 150,
    detailGrid_width: 800,
    detailGrid_height: 300
}

document.addEventListener("DOMContentLoaded", onready);

function onaddkeydown(evt) {
    if (evt && evt.keyCode == 13) {
	client.add_from_url(url);
    }
}

function onadd(evt) {
    var url = document.getElementById("url").value;
    client.add_from_url(url);
    document.getElementById("url").value = ''
    if (evt) evt.preventDefault()
}

function onappready() {
    window.client = app.get_client()

    if (window.example_url_2) {
        document.getElementById("url").value = example_url_2
    }

    document.getElementById("torrentGrid").style.width = gui_opts.torrentGrid_width;
    document.getElementById("torrentGrid").style.height = gui_opts.torrentGrid_height;

    document.getElementById("detailGrid").style.width = gui_opts.detailGrid_width;
    document.getElementById("detailGrid").style.height = gui_opts.detailGrid_height;

    document.getElementById("add-form").addEventListener('submit', onadd)

    window.UI = new UI({client:client})
    window.app.set_ui(UI)

    bind_events()

    if (jstorrent.options.add_torrents_on_start) {

        setTimeout( function() {
            //client.add_from_url( window.example_url_betas )
            client.add_from_url( window.example_url_southpark )
        }, 1000);

        //client.add_from_url( example_url )
        //client.add_from_url( example_url_2 )
        if (jstorrent.options.manual_infohash_on_start) {

            setTimeout( function() {
                client.add_from_url( 'magnet:?xt=urn:btih:' + jstorrent.options.manual_infohash_on_start[0] )
            }, 1000);
        }
    }
}

function onready() {
    window.app = new jstorrent.App;
    app.initialize( onappready )
}

function click_detail(tab, evt) {
    //console.log('click detail',tab,evt);
    $('#detail-tabs li').removeClass('active')
    var torrent = UI.get_selected_torrent()
    if (torrent) {
        UI.set_detail(tab, torrent)
        $('#detail-' + tab).parent().addClass('active')
    } else {
        console.warn('no torrent selected')
    }
}

function bind_events() {
    var tabs = ['info','files','peers','swarm','trackers','pieces','warning', 'diskio']
    tabs.forEach(function(tab) {
	document.getElementById('detail-' + tab).addEventListener('click', click_detail.bind(this, tab));
    });
    $('#button-options').click( function(evt) {
        app.focus_or_open_options();
    })
    $('#button-stop').click( function(evt) {
        app.toolbar_stop()
    })
    $('#button-start').click( function(evt) {
        app.toolbar_start()
    })
    $('#button-remove').click( function(evt) {
        app.toolbar_remove()
    })

    $('#button-help').click( function(evt) {
        app.focus_or_open_help()
    })

    // apparently for drop to work everywhere, you have to prevent default for enter/over/leave
    // but we lose the cool icon hmm -- tried dropEffect "copy" everywhere, seems to work
    // http://www.quirksmode.org/blog/archives/2009/09/the_html5_drag.html
    document.body.addEventListener("dragover", dragOver, false);
    document.body.addEventListener("dragleave", dragLeave, false);
    document.body.addEventListener("dragenter", dragEnter, false);
    document.body.addEventListener("drop", drop, false);
}

function dragOver(evt) {
    //console.log(arguments.callee.name)
    evt.dataTransfer.dropEffect = 'copy'
    evt.preventDefault();
    return false;
}
function dragLeave(evt) {
    //console.log(arguments.callee.name)
    evt.dataTransfer.dropEffect = 'copy'
    evt.preventDefault();
    return false;
}
function dragEnter(evt) {
    //console.log(arguments.callee.name)
    evt.dataTransfer.dropEffect = 'copy'
    evt.preventDefault();
    return false;
}
function drop(evt) {
    console.log(arguments.callee.name)
    evt.dataTransfer.dropEffect = 'copy'
    evt.preventDefault();
    app.handleDrop(evt)
    return false;
}

function InfoView(opts) {
    this.torrent = opts.torrent
    console.log('init info detail view of torrent',this.torrent)
}



