
function Collection(opts) {
    // collection of items, good for use with a slickgrid
    this.__name__ = opts.__name__ || arguments.callee.name

    this.opts = opts

    this.itemClass = opts.itemClass
    this.items = []
    this.length = 0
    this.keyeditems = {}
    this.event_listeners = {}

    this._attributes = {} // collection can have attributes too that
                          // can also be persisted
}

jstorrent.Collection = Collection

Collection.prototype = {
    getAttribute: function(k) {
        return this._attributes[k]
    },
    setAttribute: function(k,v) {
        var oldval = this._attributes[k]
        this._attributes[k] = v
        this.trigger('change',k,v,oldval)
    },
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
        console.assert(! this.contains(v))
        this.setItem(v.get_key(), v)
    },
    setItem: function(k,v) {
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
        this.items.splice(idx, 1) // why was this commented out?

        //console.log('items now',this.items)
        //console.log('keyeditems now', this.keyeditems)
        this.length--
        console.assert(this.length>=0)
        this.trigger('remove')
    },
    get: function(k) {
        return this.items[this.keyeditems[k]]
    },
    get_at: function(idx) {
        return this.items[idx]
    },
    getParent: function() {
        return this.client || this.opts.client || this.opts.parent
    },
    getParentId: function() {
        if (this.client) {
            return this.client.id
        } else if (this.opts && this.opts.client) {
            return this.opts.client.id
        } else if (this.opts && this.opts.parent) {
            return this.opts.parent.id
        }
    },
    save: function() {
        var data = this.getSaveData()
        var obj = {}
        obj[data[0]] = data[1]
        if (typeof data[i] == 'string') {
            chrome.storage.local.set(obj)
        } else {
            var jsonified = JSON.stringify(obj)
            console.assert(jsonified.length < chrome.storage.local.QUOTA_BYTES)
            console.log('cannot save non string types', obj, 'pct of possible size', Math.floor(100 * jsonified.length / chrome.storage.local.QUOTA_BYTES))
        }
    },
    getSaveData: function() {
        // save the collection so that it can be restored on next app restart
        // also save our attributes!
        var parentId = this.getParentId()
        var key = parentId + ':' + this.__name__
        var item
        var subKey
        var subData
        var storeAttrs

        // this is the most fucked up looking serialization code ever. :-(
        var tostore = {attributes:this._attributes, items:{}}
        for (var i=0; i<this.items.length; i++) {
            item = this.items[i]
            storeAttrs = _.clone(item._attributes)

            if (item._persistAttributes) {
                for (var j=0; j<item._persistAttributes.length; j++) {
                    // persist certain special attributes
                    pAttrKey = item._persistAttributes[j]
                    storeAttrs[pAttrKey] = item[pAttrKey]
                }
            }

            if (item._subcollections.length > 0) {
                for (var j=0; j<item._subcollections.length; j++) {
                    subKey = item._subcollections[j]
                    subData = item[subKey].getSaveData() // recurse!
                    storeAttrs['_' + subKey] = subData[1]
                    // TODO
                }
            }

            tostore.items[ item.get_key() ] = storeAttrs
        }
        return [key, tostore]
    },
    fetch: function(callback) {
        // loads data
        var parent = this.getParent()
        var parentId = this.getParentId()
        console.assert(parentId)
        var storeKey = parentId + ':' + this.__name__
        chrome.storage.local.get(storeKey, _.bind(function(result) {
            console.log('storage retreive',storeKey,'result',result)
            if (! result) {
                console.warn('could not restore collection, no data stored with key',storeKey)
            } else {
                var item, itemAttributes
                if (result[storeKey]) {
                    if (result[storeKey].attributes) {
                        this._attributes = result[storeKey].attributes
                    }
                    if (result[storeKey].items) {
                        for (var itemKey in result[storeKey].items) {
                            itemAttributes = result[storeKey].items[itemKey]
                            item = new this.itemClass({id: itemKey, parent: parent, attributes:itemAttributes})
                            if (item.onRestore) { item.onRestore() }
                            console.assert(item.get_key() == itemKey)
                            this.add(item)
                        }
                    }
                }
            }
            if (callback) { callback() }
        },this))

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