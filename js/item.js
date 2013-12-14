function Item(opts) {
    this.__name__ = arguments.callee.name
    this.parent = opts.parent
    this.itemClass = opts.itemClass
    this._opts = opts
    this._attributes = (opts && opts.attributes) ||  {}
    if (opts.initializedBy == 'collection.fetch') {
        if (opts.itemClass.attributeSerializers) {
            for (var key in this._attributes) {
                if (opts.itemClass.attributeSerializers[key]) {
                    this._attributes[key] = opts.itemClass.attributeSerializers[key].deserialize(this._attributes[key])
                }
            }
        }
    }
    this._collections = []
    this._event_listeners = {}
    this._subcollections = []
    this._persistAttributes = null // child class overrides this... HMMM
}

jstorrent.Item = Item

Item.prototype = {
    getParentIdList: function() {
        var myKey = [this.id || (this.opts && this.opts.id) || this.get_key()]
        var parent = (this.opts && this.opts.parent) || this.parent
        if (parent) {
            return parent.getParentIdList().concat(myKey)
        } else {
            return myKey
        }
    },
    getStoreKey: function() {
        return this.getParentIdList().join('/')
    },
    getCollection: function() {
        console.assert(this._collections.length == 1)
        return this._collections[0]
    },
    trigger: function(k,newval,oldval) {
        //console.log('item trigger',k,newval,oldval)
        if (this._event_listeners[k]) {
            if (k == 'change') {
                if (newval === oldval) {

                } else {
                    for (var i=0; i<this._event_listeners[k].length; i++) {
                        this._event_listeners[k][i](this, newval, oldval)
                    }
                }
            } else {
                for (var i=0; i<this._event_listeners[k].length; i++) {
                    this._event_listeners[k][i].apply(this, arguments)
                }
            }
        }
        if (this._collections.length > 0) {
            for (var i=0; i<this._collections.length; i++) {
                this._collections[i].trigger(k, this, newval, oldval)
            }
        }
    },
    getSaveData: function() {
        // if we have item attribute serializers, use those
        var attrs, key

        if (this.itemClass.persistAttributes) {
            attrs = _.clone(this._attributes)
            for (var i=0; i<this.itemClass.persistAttributes.length; i++) {
                key = this.itemClass.persistAttributes[i]
                // TODO work in tandem with serializer...
                attrs[key] = this[key]
            }
        }

        if (this.itemClass.attributeSerializers) {
            attrs = _.clone(this._attributes)
            for (var key in this._attributes) {
                if (this.itemClass.attributeSerializers[key]) {
                    attrs[key] = this.itemClass.attributeSerializers[key].serialize( attrs[key] )
                }
            }
        }

        if (! attrs) {
            attrs = this._attributes
        }

        return attrs
    },
    save: function(callback) {
        var obj = {}
        var key = this.getStoreKey()
        obj[key] = this.getSaveData()
        //console.log('saving item',obj)
        chrome.storage.local.set(obj, callback)
    },
    on: function(event_name, callback) {
        if (! this._event_listeners[event_name]) {
            this._event_listeners[event_name] = []
        }
        this._event_listeners[event_name].push(callback)
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