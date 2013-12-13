function Notification(opts) {
    jstorrent.Item.apply(this, arguments)
    this.id = opts.id
    this.onClick = opts.onClick || this.defaultOnClick
    this.data = opts.data
    this.closeOnClick = true
    var message = opts.message || jstorrent.constants.manifest.name
    if (typeof message != 'string') {
        message = JSON.stringify(message)
    }
    if (typeof opts.details != 'string') {
        opts.details = JSON.stringify(opts.details)
    }

    this.type = opts.type || 'basic'
    this.notificationOpts = {
        type: this.type,
        title: message,
        priority: opts.priority || 0,
        message: opts.details,
        iconUrl: "/icon48.png"
    }

    this.show()
}
jstorrent.Notification = Notification

Notification.prototype = {
    defaultOnClick: function() {
        //this._collection each blah.remove(this) // onClosed event gets triggered, which does this
        chrome.notifications.clear(this.id, function(id) {
            console.log('cleared notification with id',id)
            // hopefully onClosed gets triggered... ?
        })
    },
    get_key: function() {
        return this.id
    },
    show: function() {
        chrome.notifications.create(this.id, this.notificationOpts, function(id) {
            console.log('created notification with id',id)
        })
    },
    handleClick: function() {
        this.onClick()
        if (this.closeOnClick) {
            this.defaultOnClick()
        }
    }
}

for (var method in jstorrent.Item.prototype) {
    jstorrent.Notification.prototype[method] = jstorrent.Item.prototype[method]
}
