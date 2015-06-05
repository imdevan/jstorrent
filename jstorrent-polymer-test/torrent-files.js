(function() {

    Polymer('torrent-files', {
        addIdx: 0,
        deleteIdx: 0,
        count: 200,
        multi: false,
        ready: function() {
            this.data = []
            window.flist = this.$.list;
        },
        byteUnits: byteUnits,
        byteUnitsSec: byteUnitsSec,
        onSelect: function(event, object) {
            console.log('onselect',object)
            if (object.item.classList.contains("selected")) {
            }
        }
    });
})();
