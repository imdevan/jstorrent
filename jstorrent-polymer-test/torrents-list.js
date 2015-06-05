(function() {

    Polymer('torrents-list', {
        addIdx: 0,
        deleteIdx: 0,
        count: 200,
        multi: false,
        ready: function() {
            this.initArrayEmpty();
            window.plist = this.$.list;
        },
        byteUnits: byteUnits,
        byteUnitsSec: byteUnitsSec,
        onSelect: function(event, object) {
            console.log('onselect',object)
            if (object.item.classList.contains("selected")) {
                views.detailController.setContext(object.data)
            }
        },
        addRecord: function() {
            this.data.splice(this.addIdx, 0, {
                id: ++this.count,
                name: namegen.generateName(4, 8),
                details: strings[this.count % 3],
                image: this.count % 4,
                value: 0,
                type: 0,
                checked: false
            });
        },
        deleteRecord: function() {
            this.data.splice(this.deleteIdx, 1);
        },
        deleteSelection: function() {
            var i, idx;
            if (this.multi) {
                if (this.selection.length) {
                    for (i=0; i<this.selection.length; i++) {
                        idx = this.data.indexOf(this.selection[i]);
                        this.data.splice(idx, 1);
                    }
                }
            } else {
                idx = this.data.indexOf(this.selection);
                this.data.splice(idx, 1);
            }
        },
        clearSelection: function() {
            this.$.list.clearSelection();
        },
        deleteAll: function() {
            this.data.splice(0,this.data.length);
            // this.data.length = 0;
        },
        deleteArray: function() {
            this.data = null;
        },
        initArrayEmpty: function() {
            this.data = [];
        }
    });
})();
