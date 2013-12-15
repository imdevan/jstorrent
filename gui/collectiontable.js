function SlickCollectionTable(opts) {
    this.collection = opts.collection
    this.domid = opts.domid
    this.columns = opts.columns
    this.formatters = opts.formatters

    var makeFormatter = {
        getFormatter: function(column) {
            return function(row,cell,val,col,data) {
                //console.log('called render on data',data, column.name)
                var val

                if (column.id) {
                    val = data.get(column.id)
                } else if (column.func) {
                    val =  func(data,column)
                } else if (column.attr) {
                    val = data[column.attr]
                }
                if (column.formatVal) {
                    return column.formatVal(val)
                } else {
                    return val
                }
            }
        }
    }

    var options = {
        enableCellNavigation: true,
        enableColumnReorder: false,
        formatterFactory: makeFormatter,
        rowHeight: 22
        
    };

    var collectiondata = this.collection.data()

    this.columnNumberByAttribute = {}

    for (var i=0; i<this.columns.length; i++) {
        if (! this.columns[i].name) {
            // set column title to just be the ID if no name is given
            this.columns[i].name = this.columns[i].id || this.columns[i].attr

        }
        this.columnNumberByAttribute[this.columns[i].id || this.columns[i].attr] = i
    }






    grid = new Slick.Grid("#" + this.domid, collectiondata, this.columns, options);
    grid.setSelectionModel(new Slick.RowSelectionModel());

    grid.onDblClick.subscribe( _.bind(function(evt, data) {
        //this.handleDoubleClick(evt.row, evt.cell)
        //console.log('dblclick',evt,data)
    },this))

    grid.onSelectedRowsChanged.subscribe( _.bind(function(evt, data) {
        var selected = data.rows;
	//console.log('selection change',selected);
	//this.handle_selection_change(data.rows);
    },this));

    grid.onMouseEnter.subscribe(function (e) {
        return // not wortking correctly in tandem with dnd
	var hash = {};
	var cols = grid.getColumns();

        var cell = grid.getCellFromEvent(e)
        if (cell) {
	    hash[cell.row] = {}
	    for (var i = 0; i < cols.length; ++i) {
                hash[grid.getCellFromEvent(e).row][cols[i].id] = "hover";
	    }
	    grid.setCellCssStyles("hover", hash);
        } else {
            //console.warn('unable to get cell from hover event')
        }
    });

    grid.onMouseLeave.subscribe(function (e) {
	grid.removeCellCssStyles("hover");
    });
    this.grid = grid

    this.collection.on('add', _.bind(this.on_add, this))
    this.collection.on('remove', _.bind(this.on_remove, this))
    this.collection.on('change', _.bind(this.on_change, this))
}

SlickCollectionTable.prototype = {
    destroy: function() {
        // destroy
        this.grid.destroy()
        $("#"+this.domid).empty()
    },
    on_change: function(item, attr, p1,p2,p3) {
        //console.log('collection item change',item,attr,p1,p2,p3)
        var idx = this.collection.indexOf( item.get_key() )
        //console.log('change at row',idx)
        this.grid.updateCell(idx, this.columnNumberByAttribute[attr])
    },
    on_add: function(item) {
        //console.log('collection onadd')
        this.grid.updateRowCount()
        this.grid.invalidateAllRows()
        this.grid.render()
    },
    on_remove: function(item) {
        if (this.collection.items.length > 0) {
            // Fixes the infamous "unable to select the first column" bug
            // only happens when existing row gets replaced with new item
            // need to perhaps clear selection

            // XXX - THIS BREAKS KEEPING ITEM SELECTED THOUGH! SO RESTORE SELECTION after we do this...
            if (this.collection.itemClass == jstorrent.Torrent) {
                // maybe only do this on the torrent table, where it isn't so important, since torrents only get removed when user clicks somewhere else
                this.grid.setActiveCell(0,0)
                this.grid.setActiveCell(0,1)
                this.grid.setSelectedRows([]) // this alone didn't work, but with the previous two lines does :-) yay!
            }
        }

        this.grid.updateRowCount()
        this.grid.invalidateAllRows()
        this.grid.render()
    }
}