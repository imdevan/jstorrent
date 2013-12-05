function Item() {
    this._attributes = {}
    this._collections = []
    this._event_listeners = {}
}

jstorrent.Item = Item

Item.prototype = {
    trigger: function(k,newval,oldval) {
        console.log('item trigger',k,newval,oldval)
        if (this._event_listeners[k]) {
            if (k == 'change' && newval === oldval) {
                return
            }
            for (var i=0; i<this._event_listeners[k].length; i++) {
                this._event_listeners[event_type][i](this, newval, oldval)
            }
        }
        if (this._collections.length > 0) {
            for (var i=0; i<this._collections.length; i++) {
                this._collections[i].trigger(k, this, newval, oldval)
            }
        }
    },
    on: function(event_name, callback) {
        if (! this._event_listeners[event_name]) {
            this._event_listeners[event_name] = []
        }
        this.event_listeners[event_type].push(callback)        
    },
    set: function(k,v) {
        var oldval = this._attributes[k]
        this._attributes[k] = v
        this.trigger('change',k,v,oldval)
    },
    get: function(k) {
        return this._attributes[k]
    }
}