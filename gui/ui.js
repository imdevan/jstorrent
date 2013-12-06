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
//                                                    formatters: formatters,
                                                    columns: columns
                                                  } )

    this.detailtable = null
    this.detailtype = null


    this.coldefs = {
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
            ]
    }
}

UI.prototype = {
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
        }

    }
}