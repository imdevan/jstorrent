
function Collection(opts) {
    // collection of items, good for use with a slickgrid
    this.opts = opts

    this.itemClass = opts.itemClass
    this.items = []
    this.length = 0
    this.keyeditems = {}
    this.event_listeners = {}
}

jstorrent.Collection = Collection

Collection.prototype = {
    data: function() {
        return this.items;
    },
    on: function(event_type, callback) {
        if (! this.event_listeners[event_type]) {
            this.event_listeners[event_type] = []
        }
        this.event_listeners[event_type].push(callback)
    },
    indexOf: function(key) {
        // quick lookup of item
        return this.keyeditems[key]
    },
    trigger: function(event_type, param1, param2, param3) {
        if (this.event_listeners[event_type]) {
            for (var i=0; i<this.event_listeners[event_type].length; i++) {
                this.event_listeners[event_type][i](param1, param2, param3)
            }
        }
    },
    add: function(v) {
        this.set(v.get_key(), v)
    },
    set: function(k,v) {
        console.assert( ! this.keyeditems[k] )
        v._collections.push(this)
        this.items.push(v)
        this.keyeditems[k] = this.length
        this.length++
        this.trigger('add',v)
    },
    contains: function(v) {
        var key = v.get_key()
        var idx = this.keyeditems[key]
        if (idx === undefined) { return false }
        return true
    },
    remove: function(v) {
        var key = v.get_key()
        var idx = this.keyeditems[key]
        console.assert(idx >= 0)
        //console.log('removing',v,key,idx)
        //console.log('items now',this.items)
        // update all the indicies on the other items!        
        for (var k in this.keyeditems) {
            if (this.keyeditems[k] > idx) {
                this.keyeditems[k] = this.keyeditems[k] - 1
            }
        }
        delete this.keyeditems[key]
        //this.items.splice(idx, 1)
        //console.log('items now',this.items)
        //console.log('keyeditems now', this.keyeditems)
        this.length--
        console.assert(this.length>=0)
    },
    delete: function(k) {
        // TODO
        this.trigger('remove')
    },
    get: function(k) {
        return this.items[this.keyeditems[k]]
    },
    get_at: function(idx) {
        return this.items[idx]
    },
    each: function(iterfunc) {

        for (var i=0; i<this.items.length; i++) {
            iterfunc( this.items[i] )
        }

/*        for (var key in this.keyeditems) {
            iterfunc( key, this.items[this.keyeditems[key]] )
        }*/
    }
}