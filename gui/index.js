var gui_opts = {
    width: 750,
    height: 250
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

function onready() {
    window.client = new jstorrent.Client;

    document.getElementById("torrentGrid").style.width = gui_opts.width;
    document.getElementById("torrentGrid").style.height = gui_opts.height;

    document.getElementById("url").value = example_url
    document.getElementById("add-form").addEventListener('submit', onadd)
    window.UI = new UI()
    onadd()
    bind_events()
}

formatters = {
    checkbox: function() {
	return "<input type='checkbox' />"
    }
}

var grid;
  var columns = [
//      {id: "selection", name: "", width: 25, formatter: formatters.checkbox },
      {id: "title", name: "Title", field: "title"},
      {id: "duration", name: "Duration", field: "duration"},
      {id: "%", name: "% Complete", field: "percentComplete"},
      {id: "start", name: "Start", field: "start"},
      {id: "finish", name: "Finish", field: "finish"},
      {id: "effort-driven", name: "Effort Driven", field: "effortDriven"}
  ];

var options = {
    enableCellNavigation: true,
    enableColumnReorder: false,
};

function create_grid() {
    var data = [];
    for (var i = 0; i < 4; i++) {
	data[i] = {
	    title: "Task " + i,
	    duration: "5 days",
	    percentComplete: Math.round(Math.random() * 100),
	    start: "01/01/2009",
	    finish: "01/05/2009",
	    effortDriven: (i % 5 == 0)
	};
    }

    grid = new Slick.Grid("#torrentGrid", data, columns, options);
    grid.setSelectionModel(new Slick.RowSelectionModel());

    grid.onSelectedRowsChanged.subscribe( function(evt, data) {
        var selected = data.rows;
	console.log('selection change',selected);

	UI.handle_selection_change(data.rows);

    });

    grid.onMouseEnter.subscribe(function (e) {
	var hash = {};
	var cols = grid.getColumns();

	hash[grid.getCellFromEvent(e).row] = {}
	for (var i = 0; i < cols.length; ++i) {
            hash[grid.getCellFromEvent(e).row][cols[i].id] = "hover";
	}
	grid.setCellCssStyles("hover", hash);
    });

    grid.onMouseLeave.subscribe(function (e) {
	grid.removeCellCssStyles("hover");
    });
    return grid
}

function click_detail(tab, evt) {
    console.log('click detail',tab,evt);
    $('#detail-tabs li').removeClass('active')
    UI.set_detail(tab)
    $('#detail-' + tab).parent().addClass('active')


}

function bind_events() {
    var tabs = ['info','files','peers','trackers','pieces','warning']
    tabs.forEach(function(tab) {
	document.getElementById('detail-' + tab).addEventListener('click', click_detail.bind(this, tab));
    });
}


function InfoView(opts) {
    this.torrent = opts.torrent
    console.log('init info detail view of torrent',this.torrent)
}



function UI() {
    // creates user interface

    this.grid = create_grid()
    this.detailview = null
    this.detailtype = null

}

UI.prototype = {
    set_detail: function(type) {
	this.detailtype = type
    },
    single_selection_context: function(evt) {
	var rows = this.grid.getSelectedRows();
	if (rows.length > 0) {
	    return this.grid.getDataItem(rows[0]);
	}
    },
    handle_selection_change: function(rows) {
	var data = this.single_selection_context();
	if (! this.detailview) {
	    new InfoView({torrent:data})
	}
    }
}