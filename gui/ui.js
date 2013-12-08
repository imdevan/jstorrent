function UI(opts) {
    this.client = opts.client

    this.detailtable = null
    this.detailtype = null

    this.coldefs = {
        'torrent': [
        //      {id: "selection", name: "", width: 25, formatter: formatters.checkbox },
            {id: "name", name: "Name", width:400},
            {id: "size", name: "Size"},
            {id: "state", name: "State"},
            {id: "percent", name: "% Complete"},
            {id: "numpeers", name: "Peers"},
            {id: "numswarm", name: "Swarm"}
        ],
        'peers':[
                {id:"address", name: "Address"},
                {id:"state", name: "State"},
                {id:"percent", name: "Percent"},
                {id:"bytes_sent", name: "Bytes Sent"},
                {id:"bytes_received", name: "Bytes Received"},
                {id:"last_message", name: "Last Message"},
        ],
        'swarm':[
                {id:"address", name: "Address"},
                {id:"connected_ever", name: "Ever Connected"},
                {id:"state", name: "State"},
                {id:"percent", name: "Percent"},
                {id:"bytes_sent", name: "Bytes Sent"},
                {id:"bytes_received", name: "Bytes Received"},
                {id:"last_message", name: "Last Message"},
        ],
        'trackers':[
            {id:'url'},
            {id:'announces'},
            {id:'errors'},
            {id:'timeouts'},
            {id:'seeders'},
            {id:'leechers'}
        ],
        'diskio':[
            {id:'torrent'},
            {id:'filename'},
            {id:'offset'},
            {id:'size'},
            {id:'jobgroup'},
            {id:'state'}
        ]
    }

    this.torrenttable = new SlickCollectionTable( { collection: this.client.torrents,
                                                    domid: 'torrentGrid',
                                                    columns: this.coldefs.torrent
                                                  } )
    this.torrenttable.grid.onSelectedRowsChanged.subscribe( _.bind(this.handle_torrent_selection_change,this))


}

UI.prototype = {
    get_selected_torrents: function() {
        var rows = this.torrenttable.grid.getSelectedRows()
        var torrents = []
        for (var i=0; i<rows.length; i++) {
            torrents.push( this.client.torrents.get_at(i) )
        }
        return torrents
    },
    handle_torrent_selection_change: function(evt, data) {
        var selected = data.rows;
	console.log('selection change',selected);

        if (selected.length > 0) {
            var torrent = this.client.torrents.get_at(selected[0])
            this.set_detail(this.detailtype, torrent)
        } else {
            if (this.detailtable) {
                this.detailtable.destroy()
                this.detailtable = null
            }
        }
        
    },
    get_selected_torrent: function() {
        var idx = this.torrenttable.grid.getSelectedRows()[0]
        var torrent = this.client.torrents.get_at(idx)
        return torrent
    },
    set_detail: function(type, torrent) {
        console.log('set detail',type,torrent)
        this.detailtype = type

        if (this.detailtable) {
            this.detailtable.destroy()
            this.detailtable = null
        }

        var domid = 'detailGrid'

        if (type == 'peers') {
            this.detailtable = new SlickCollectionTable({collection: torrent.peers,
                                                         domid: domid,
                                                         columns: this.coldefs.peers
                                                        });
        } else if (type == 'swarm') {
            this.detailtable = new SlickCollectionTable({collection: torrent.swarm,
                                                         domid: domid,
                                                         columns: this.coldefs.swarm
                                                        });
        } else if (type == 'trackers') {
            this.detailtable = new SlickCollectionTable({collection: torrent.trackers,
                                                         domid: domid,
                                                         columns: this.coldefs.trackers
                                                        });
        }
    }
}