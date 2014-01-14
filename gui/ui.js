function UI(opts) {
    function fracToPercent(val) {
        if (val === undefined || val === null) { return '' }
        return (val * 100).toFixed(1) + '%';
    }
    function fileAction(val) {
        return '<a href="https://code.google.com/p/chromium/issues/detail?id=328803&thanks=328803&ts=1387186852" target="_blank">Open</a>'
    }

    this.client = opts.client

    this.detailtable = null
    var default_tab = 'peers'
    this.detailtype = default_tab

    this.coldefs = {
        'torrent': [
            {id: "name", name: "Name", width:400},
            {id: "state", name: "State"},
            {id: "bytes_received", name: "Bytes Received", formatVal: byteUnits, width:100},
            {id: "size", name: "Size", formatVal: byteUnits, width: 100},
            {id: "complete", name: "% Complete", formatVal: fracToPercent},
            {id: "numpeers", name: "Peers"},
            {id: "bytes_sent", name: "Bytes Sent", formatVal: byteUnits},
            {id: 'downloaded', formatVal:byteUnits},
            {id: "added"},
            {id: "numswarm", name: "Swarm"}
        ],
        'peers':[
            {name:"Address", id:"address", width:125},
            {name:"Client", id:'peerClientName', width:125},
            {id:"state", name: "State", width:90},
            {id:"complete", name: "% Complete", formatVal: fracToPercent},
            {id:"bytes_sent", name: "Bytes Sent"},
            {id:"bytes_received", name: "Bytes Received"},
            {id:'requests', name:"Req", width:50},
            {id:'responses', name:"Resp", width:50},
            {id:'outstanding', name:"Outstanding", width:50},
            {id:"last_message_sent", name: "Last Sent"},
            {id:"last_message_received", name: "Last Received", width:120},
            {id:'timeouts'},
            {id:"amChoked"},
            {id:"peerChoked"}
        ],
        'swarm':[
            {attr:"host", width:110},
            {attr:"port"},
            {id:"connected_ever", name: "Ever Connected"},
            {id:'connectionResult'}
        ],
        'trackers':[
            {attr:'url', name:"URL", width:200},
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
            {attr:'num', name:"Number"},
            {attr:'name', width:400},
            {attr:'size', name:"Size", formatVal:byteUnits, width:100},
            {id:'downloaded', name:"Downloaded", formatVal:byteUnits, width:100},
            {id:'complete', name:"Complete", formatVal: fracToPercent},
            {name:"Skip?", 
//             editor: Slick.Editors.YesNoSelect,
//             formatter: Slick.Formatters.YesNo
             editor: Slick.Editors.Checkbox,
//             formatter: Slick.Formatters.Checkmark
             formatter: function(row,cell,val) { return (val ? 'Skip' : '') }
            },
            {name:"Action" , displayFunc: fileAction}
        ],
        'pieces':[
            {attr:'num'},
            {attr:'size', formatVal:byteUnits},
            {attr:'haveData'},
            {id:'requests', name:"Req", width:50},
            {id:'responses', name:"Resp", width:50},
            {id:'timeouts'},
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
            if (torrent.getStorage()) {
                this.detailtable = new SlickCollectionTable({collection: torrent.getStorage().diskio,
                                                             domid: domid,
                                                             columns: this.coldefs[type]
                                                            });
            } else {
                // no storage...
            }
        } else {
            if (! torrent[type] || ! this.coldefs[type]) {
                console.warn('invalid table definition for type',type)
            } else {
                this.detailtable = new SlickCollectionTable({collection: torrent[type],
                                                             domid: domid,
                                                             columns: this.coldefs[type]
                                                            });

                if (this.detailtype == 'files') {
                    if (torrent.get('metadata') && ! torrent.infodict) {
                        torrent.loadMetadata(function(){}) // this should initialize the files
                    } else if (torrent.infodict) {
                        torrent.initializeFiles()
                    } else {
                        // XXX TODO -- make torrent list refresh once metadata is completed...
                        this.detailtable.grid.setData([])
                    }
                } else if (this.detailtype == 'peers') {
                    this.detailtable.grid.onDblClick.subscribe( _.bind(app.handle_dblclick, app, 'peers', torrent[type]) )
                }
            }
        }
    }
}
