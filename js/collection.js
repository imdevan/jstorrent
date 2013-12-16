
function Collection(opts) {
    // collection of items, good for use with a slickgrid
    this.__name__ = opts.__name__ || arguments.callee.name

    this.opts = opts
    this.parent = opts.parent
    if (opts.shouldPersist === undefined) {
        this.shouldPersist = true
    } else {
        this.shouldPersist = opts.shouldPersist
    }

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
    clear: function() {
        var items = _.clone(this.items)
        
        for (var i=0;i<items.length;i++) {
            this.remove(items[i])
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
    containsKey: function(k) {
        // xXX - we had a typo "key" here instead of k but didnt get referenceerror. check why window.key is set to "ut_pex"
        return this.keyeditems[k] !== undefined
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
        if (this.shouldPersist) {
            this.save()
        }
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
        // save lets you put in objects and it JSON stringifys them
        // for you, but this is dangerous, because if it turns out to
        // have a uint8array in it, then it corrupts your storage.
        var data = this.getSaveData()
        var obj = {}
        obj[data[0]] = data[1]
        chrome.storage.local.set(obj)
/*
        if (typeof data[i] == 'string') {
            chrome.storage.local.set(obj)
        } else {
            var jsonified = JSON.stringify(obj)
            console.assert(jsonified.length < chrome.storage.local.QUOTA_BYTES)
            console.log('cannot save non string types', obj, 'pct of possible size', Math.floor(100 * jsonified.length / chrome.storage.local.QUOTA_BYTES))
        }
*/
    },
    getStoreKey: function() {
        var parentList = this.getParentIdList()
        var key = parentList.join('/')
        return key
    },
    getParentIdList: function() {
        var myKey = [this.id || (this.opts && this.opts.id) || this.__name__]
        var parent = (this.opts && this.opts.parent) || this.parent
        if (parent) {
            return parent.getParentIdList().concat(myKey)
        } else {
            return myKey
        }
    },
    getSaveData: function() {
        // recursively get parent collections or parent items
        var key = this.getStoreKey()
        var items = []
        for (var i=0; i<this.items.length; i++) {
            items.push(this.items[i].get_key())
        }
        var toStore = {attributes:this._attributes, items:items}
        return [key, toStore]
    },
    fetch: function(callback) {
        var collectionKey = this.getStoreKey()
        chrome.storage.local.get( collectionKey, _.bind(function(result) {
            if (! result || ! result[collectionKey] || ! result[collectionKey].items) {
                console.warn('could not restore collection, no data stored with key',collectionKey)
                if (callback){callback()}
            } else {

                var fullItemKeys = []
                var itemKeys = []

                for (var i=0; i<result[collectionKey].items.length; i++) {
                    var itemKey = result[collectionKey].items[i]
                    itemKeys.push(itemKey)
                    fullItemKeys.push(collectionKey + '/' + itemKey)
                }

                // have a list of all the items we need to now fetch from storage
                var item, itemData

                this._attributes = result[collectionKey].attributes

                chrome.storage.local.get(fullItemKeys, _.bind(function(itemsResult) {
                    for (var i=0; i<itemKeys.length; i++) {
                        itemData = itemsResult[ fullItemKeys[i] ]
                        if (! itemData) {
                            //console.log('fetch itemData for key',fullItemKeys[i],'was empty. did you .save() it?')
                        }
                        item = new this.itemClass({id: itemKeys[i],
                                                   parent: this,
                                                   itemClass: this.itemClass,
                                                   initializedBy: 'collection.fetch',
                                                   attributes:itemData})
                        if (item.onRestore) { item.onRestore() }
                        console.assert(item.get_key() == itemKeys[i])
                        this.add(item)
                    }
                    if (callback) { callback() }
                },this))
            }
        },this))
    },
    each: function(iterfunc) {
        var items = []

        for (var i=0; i<this.items.length; i++) {
            // if we calliterfunc here, it might modify this.items...
            items.push(this.items[i])
        }

        for (var i=0; i<items.length; i++) {
            iterfunc(items[i])
        }

/*        for (var key in this.keyeditems) {
            iterfunc( key, this.items[this.keyeditems[key]] )
        }*/
    }
}