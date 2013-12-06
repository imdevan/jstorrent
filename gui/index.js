var gui_opts = {
    torrentGrid_width: 750,
    torrentGrid_height: 150,
    detailGrid_width: 750,
    detailGrid_height: 350
}

var example_url = "magnet:?xt=urn:btih:3cbe169fea1c5e43b5a0a045d8e27017cd97c157&dn=How+to+Instantly+Connect+with+Anyone%3A+96+All-New+Little+Tricks+f&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337"

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


    document.getElementById("url").value = example_url
    document.getElementById("add-form").addEventListener('submit', onadd)

    window.UI = new UI({client:client})

    onadd()
    bind_events()
}

function onready() {
    window.app = new jstorrent.App;
    app.initialize( onappready )
}

function click_detail(tab, evt) {
    console.log('click detail',tab,evt);
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
    var tabs = ['info','files','peers','swarm','trackers','pieces','warning']
    tabs.forEach(function(tab) {
	document.getElementById('detail-' + tab).addEventListener('click', click_detail.bind(this, tab));
    });
    $('#button-options').click( function(evt) {
        app.focus_or_open_options();
    })
}


function InfoView(opts) {
    this.torrent = opts.torrent
    console.log('init info detail view of torrent',this.torrent)
}



