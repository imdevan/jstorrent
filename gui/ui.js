function UI(opts) {
    function fracToPercent(val) {
        if (val === undefined) { return '' }
        return (val * 100).toFixed(1) + '%';
    }

    this.client = opts.client

    this.detailtable = null
    this.detailtype = 'trackers'

    this.coldefs = {
        'torrent': [
            {id: "name", name: "Name", width:400},
            {id: "size", name: "Size", formatVal: byteUnits},
            {id: "state", name: "State"},
            {id: "complete", name: "% Complete", formatVal: fracToPercent},
            {id: "numpeers", name: "Peers"},
            {id: "numswarm", name: "Swarm"}
        ],
        'peers':[
            {attr:"host"},
            {attr:"port"},
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
            {attr:"host"},
            {attr:"port"},
            {id:"connected_ever", name: "Ever Connected"},
            {id:'connectionResult'},
            {id:"state", name: "State"},
            {id:"percent", name: "Percent"},
            {id:"bytes_sent", name: "Bytes Sent"},
            {id:"bytes_received", name: "Bytes Received"},
        ],
        'trackers':[
            {attr:'url'},
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
            {attr:'name', width:400},
            {attr:'size', formatVal:byteUnits},
            {attr:'complete', formatVal: fracToPercent},
        ],
        'pieces':[
            {attr:'num'},
            {attr:'size', formatVal:byteUnits},
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
        var torrent
        for (var i=0; i<rows.length; i++) {
            torrent = this.client.torrents.get_at(rows[i])
            torrents.push( torrent )
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

                if (this.detailtype == 'files') {
                    if (torrent.infodict) {
                        torrent.initializeFiles()
                    } else {
                        this.detailtable.grid.setData(['No metadata yet...'])
                    }
                }
            }
        }
    }
}
