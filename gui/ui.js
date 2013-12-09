function UI(opts) {
    this.client = opts.client

    this.detailtable = null
    this.detailtype = 'trackers'

    this.coldefs = {
        'torrent': [
            {id: "name", name: "Name", width:400},
            {id: "size", name: "Size"},
            {id: "state", name: "State"},
            {id: "complete", name: "% Complete"},
            {id: "numpeers", name: "Peers"},
            {id: "numswarm", name: "Swarm"}
        ],
        'peers':[
            {id:"address", name: "Address"},
            {id:'peerClientName'},
            {id:"state", name: "State", width:150},
            {id:"percent", name: "Percent"},
            {id:"amChoked"},
            {id:"bytes_sent", name: "Bytes Sent"},
            {id:"bytes_received", name: "Bytes Received"},
            {id:"last_message_sent", name: "Last Sent"},
            {id:"last_message_received", name: "Last Received"}
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
            {id:'type'},
            {id:'state'},
            {id:'torrent'},
            {id:'fileNum'},
            {id:'fileOffset'},
            {id:'size'},
            {id:'jobId'},
            {id:'jobGroup'}
        ],
        'files':[
            {attr:'num'},
            {attr:'name'}
        ],
        'pieces':[
            {attr:'num'},
            {attr:'size'},
            {attr:'haveData'},
            {attr:'haveDataPersisted'},
            {attr:'numChunks'}
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
	//console.log('selection change',selected);

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
        //console.log('set detail',type,torrent)
        this.detailtype = type

        if (this.detailtable) {
            this.detailtable.destroy()
            this.detailtable = null
        }

        var domid = 'detailGrid'

        if (type == 'diskio') {
            this.detailtable = new SlickCollectionTable({collection: torrent.getStorage().diskio,
                                                         domid: domid,
                                                         columns: this.coldefs[type]
                                                        });
        } else {
            if (! torrent[type] || ! this.coldefs[type]) {
                console.warn('invalid table definition for type',type)
            } else {
                this.detailtable = new SlickCollectionTable({collection: torrent[type],
                                                             domid: domid,
                                                             columns: this.coldefs[type]
                                                            });
            }
        }
    }
}
