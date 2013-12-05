function UI(opts) {
    this.client = opts.client

    var formatters = {
        checkbox: function() {
	    return "<input type='checkbox' />"
        }
    }
    var columns = [
        //      {id: "selection", name: "", width: 25, formatter: formatters.checkbox },

        {id: "name", name: "Name"},
        {id: "size", name: "Size"},
        {id: "state", name: "State"},
        {id: "percent", name: "% Complete"},
        {id: "numpeers", name: "Peers", width:400},
        {id: "numswarm", name: "Swarm"}
    ];
    this.torrenttable = new SlickCollectionTable( { collection: this.client.torrents,
                                                    domid: 'torrentGrid',
                                                    formatters: formatters,
                                                    columns: columns
                                                  } )

    this.detailview = null
    this.detailtype = null
}

UI.prototype = {
    set_detail: function(type) {
	this.detailtype = type
    }
}