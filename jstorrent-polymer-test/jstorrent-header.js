(function(){
    Polymer('jstorrent-header', {
        toggle: function() {
            console.log('toggle!')
            if (!this.dropdown) {
                this.dropdown = this.querySelector('core-dropdown');
            }
            this.dropdown && this.dropdown.toggle();
        },
        btnStop: function() {
            console.log('stop button')
            plist.selection.stop()
        },
        btnDelete: function() {
            console.log('delete button')
            plist.selection.remove()
        },
        btnPlay: function() {
            console.log('play button')
            plist.selection.start()
        },
        ready: function() {
            window.jstorrentheader = this
        }
    });
})();
