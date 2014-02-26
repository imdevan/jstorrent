(function() {
/*

  we were using diskiosync.js but realized there is no FileWriterSync


  instead we are going to keep using the async interfaces, but be strict and require that all disk access goes through the DiskIO object.

*/

/*

  maybe instead create a shim around the api to make sure we dont get deadlocks...

*/

    zeroCache = {} // store a cache of "zero" arrays, see if it improves speed
    for (var i=14; i<=20; i++) {
        zeroCache[ Math.pow(2,i) ] = new Uint8Array(Math.pow(2,i))
    }

function recursiveGetEntryReadOnly(filesystem, path, callback) {
    var state = {e:filesystem}

    function recurse(e) {
        if (path.length == 0) {
            if (e.name == 'TypeMismatchError') {
                state.e.getDirectory(state.path, {create:false}, recurse, recurse)
            } else if (e.name == 'NotFoundError') {
                callback({error:e})
            } else if (e.isFile) {
                callback(e)
            } else if (e.isDirectory) {
                callback(e)
            } else {
                callback({error:'path not found'})
            }
        } else if (e.isDirectory) {
            if (path.length > 1) {
                // this is not calling error callback, simply timing out!!!
                e.getDirectory(path.shift(), {create:false}, recurse, recurse)
            } else {
                state.e = e
                state.path = _.clone(path)
                e.getFile(path.shift(), {create:false}, recurse, recurse)
            }
        } else {
            if (e.name == 'NotFoundError') {
                callback({error:e})
            } else {
                callback({error:e,mymsg:'file exists'})
            }
        }
    }
    recurse(filesystem)
}

    function recursiveGetEntryWrite(filesystem, path, callback) {
        function recurse(e) {
            if (path.length == 0) {
                if (e.isFile) {
                    callback(e)
                } else {
                    callback({error:'file exists'})
                }
            } else if (e.isDirectory) {
                if (path.length > 1) {
                    // this is not calling error callback, simply timing out!!!
                    e.getDirectory(path.shift(), {create:true}, recurse, recurse)
                } else {
                    e.getFile(path.shift(), {create:true}, recurse, recurse)
                }
            } else {
                callback({error:'file exists'})
            }
        }
        recurse(filesystem)
    }

    function BasicJob(opts) {
        jstorrent.Item.apply(this, arguments)
        this.opts = opts

        this.set('state','idle')
        this.set('type',opts.type)
        this.set('jobId', DiskIO.jobctr++)

        for (var key in opts) {
            this.set(key, opts[key])
        }
    }

    BasicJobProto = {
        get_key: function() { return this.key }
    }
    _.extend(BasicJob.prototype, BasicJobProto, jstorrent.Item.prototype)

    function PieceReadJob(opts, callback) {
        this.piece = opts.piece
        jstorrent.Item.apply(this, arguments)
        this.onfinished = callback

        this.readData = {}
        this.opts = opts
        this.set('type','PieceReadJob')
        this.set('state','idle')
        this.set('size', opts.size)
        this.set('pieceOffset', opts.pieceOffset)
        this.set('pieceNum', opts.piece.num)
        this.set('torrent',opts.piece.torrent.hashhexlower)
        this.set('jobId', DiskIO.jobctr++)

        this.filesSpanInfo = opts.piece.getSpanningFilesInfo(opts.pieceOffset, opts.size)
    }
    var PieceReadJobProto = {
        assembleReadData: function() {
            var fileKeys = _.keys(this.readData)
            _.map(fileKeys, function(d){ return parseInt(d,10) })
            fileKeys.sort()
            var toret = []
            for (var i=0; i<fileKeys.length; i++) {
                toret.push( this.readData[fileKeys[i]] )
            }
            return toret
        },
        get_key: function() { return this.key },
        getSubjobs: function() {
            var jobs = []
            for (var i=0; i<this.filesSpanInfo.length; i++) {
                var info = this.filesSpanInfo[i]
                var cur = new BasicJob({type:'doGetContentRange',
                                        readJob: this,
                                        size:info.size,
                                        fileNum: info.fileNum,
                                        fileOffset:info.fileOffset,
                                        pieceOffset:info.pieceOffset,
                                        pieceNum:this.piece.num,
                                        piece: this.piece,
                                        torrent: this.piece.torrent.hashhexlower})
                jobs.push( cur )
            }
            return jobs
        }
    }
    _.extend(PieceReadJob.prototype, 
             PieceReadJobProto,
             jstorrent.Item.prototype)

    function PieceWriteJob(opts, callback) {
        var piece = opts.piece
        this.piece = piece
        jstorrent.Item.apply(this, arguments)
        this.opts = opts
        this.onfinished = callback
        this.oncollected = null
        this.set('type','PieceWriteJob')
        this.set('state','idle')
        this.set('pieceNum', piece.num)
        this.set('torrent',piece.torrent.hashhexlower)
        this.set('jobId', DiskIO.jobctr++)
        this.filesSpanInfo = piece.getSpanningFilesInfo()

        this.filesMetadataLength = 0
        this.filesMetadata = {}
        this.filesZeroInfo = {}
    }
    var PieceWriteJobProto = {
        get_key: function() { return this.key },
        getSubjobs: function() {
            // 1. return all "collect metadata" jobs
            // check if have more jobs after this
            var jobs = []
            for (var i=0; i<this.filesSpanInfo.length; i++) {
                var info = this.filesSpanInfo[i]
                var cur = new BasicJob({type:'doGetMetadata', 
                                        writeJob: this,
                                        fileNum: info.fileNum,
                                        pieceNum:this.piece.num,
                                        piece: this.piece,
                                        torrent: this.piece.torrent.hashhexlower,
                                        callback:_.bind(this.onFileMetadata, this, info.fileNum)})
                jobs.push( cur )
            }
            return jobs
        },
        onFileMetadata: function(fileNum, result) {
            this.filesMetadata[fileNum] = result
            this.filesMetadataLength++
            if (this.filesMetadataLength == this.filesSpanInfo.length) {
                this.set('state','collected')
                this.oncollected()
            }
        },
        wroteFileZeroes: function(fileNum, iter, total) {
        }
    }
    _.extend(PieceWriteJob.prototype, 
             PieceWriteJobProto,
             jstorrent.Item.prototype)

    function DiskIO(opts) {
        this.disk = opts.disk
        jstorrent.BasicCollection.apply(this, arguments)
    }
    DiskIO.jobctr = 0
    DiskIO.debugtimeout = 1

    var DiskIOProto = {
        doQueue: function() {
            if (this.queueActive || this.items.length == 0) {
                return
            }
            //console.log('doQueue')
            this.queueActive = true

            if (this.items.length > 2) {
                // see if we should maybe re-order to minimize zero writes
            }

            var job = this.get_at(0)

            if (job instanceof PieceWriteJob) {
                job.set('state','done')
                job.onfinished({piece:job.piece})
                this.shift()
                this.queueActive = false
                this.doQueue()
            } else if (job instanceof PieceReadJob) {
                job.set('state','done')
                job.onfinished({data:job.assembleReadData()})
                this.shift()
                this.queueActive = false
                this.doQueue()
            } else {
                var type = job.opts.type
                var args = [job.opts, job.opts.callback, job]
                //Array.prototype.push.call(args, job)
                job.set('state','starting')
                this[type].apply(this, args)
            }
        },
        addToQueue: function() {
            var opts = arguments[1][0]
            opts.type = arguments[0]
            if (opts.piece) {
                opts.pieceNum = opts.piece.num
                opts.torrent = opts.piece.torrent.hashhexlower
            }
            if (arguments[1][1]) {
                opts.callback = arguments[1][1]
            }

            var job = new BasicJob(opts)
            this.addAt(job)
            this.doQueue()
        },
        getFileEntryWriteable: function(path, callback) {
            var fn = recursiveGetEntryWrite
            fn(this.disk.entry, path, function(entry) {
                console.assert(entry)
                if (entry.error) {
                    callback(entry)
                } else {
                    callback(entry)
                }
            })
        },
        getMetadata: function() {
            this.addToQueue('doGetMetadata',arguments)
        },
        doGetMetadata: function(opts, callback, job) {
            var path = opts.piece.torrent.getFile(opts.fileNum).path.slice()
            var oncallback = _.bind(this.wrapCallback,this,callback,job)
            job.set('state','getentry')
            recursiveGetEntryReadOnly(this.disk.entry, path, function(entry) {
                if (entry.error) {
                    if (entry.error.name == 'NotFoundError') {
                        oncallback({size:0,exists:false})
                    } else {
                        oncallback(entry)
                        debugger
                    }
                } else {
                    function onMetadata(result) {
                        if (result.err) { // XXX correct signature?
                            oncallback({error:result.err})
                            debugger
                        } else {
                            oncallback(result)
                        }
                    }
                    job.set('state','getmetadata')
                    entry.getMetadata(onMetadata, onMetadata)
                }
            })
        },
        writeWholeContents: function() {
            this.addToQueue('doWriteWholeContents',arguments)
        },
        doWriteWholeContents: function(opts, callback, job) {
            var oncallback = _.bind(this.wrapCallback,this,callback,job)
            var path = opts.path.slice()
            job.set('state','getentry')

            this.getFileEntryWriteable( path, function(entry) {
                job.set('state','createwriter')
                entry.createWriter( function(writer) {
                    writer.onwrite = function(evt) {
                        job.set('state','createwriter2')
                        entry.createWriter( function(writer2) {
                            writer2.onwrite = function(evt2) {
                                oncallback(evt2)
                            }
                            writer2.onerror = function(evt2) {
                                console.error('writer error',evt2)
                                debugger
                                oncallback({error:evt2})
                            }
                            job.set('state','writing')
                            setTimeout( function() {
                                writer2.write(new Blob([opts.data]))
                            }, DiskIO.debugtimeout)
                        })
                    }
                    writer.onerror = function(evt) {
                        console.error('truncate error',evt)
                        debugger
                        oncallback({error:evt})
                    }
                    //console.log('writer.Write')
                    job.set('state','truncating')
                    setTimeout( function() {
                        writer.truncate(0)
                    }, DiskIO.debugtimeout )
                }.bind(this))
            }.bind(this))

        },
        getWholeContents: function() {
            this.addToQueue('doGetWholeContents',arguments)
        },
        wrapCallback: function(callback, job) {
            job.set('state','done')

            var cargs = Array.prototype.slice.call(arguments,2)

            setTimeout( function() {
                this.shift()
                if (callback){callback.apply(this,cargs)}
                this.queueActive = false
                this.doQueue()
            }.bind(this), DiskIO.debugtimeout )
        },
        doGetContentRange: function(opts, callback, job) {
            var oncallback = _.bind(this.wrapCallback,this,callback,job)
            var path = opts.piece.torrent.getFile(opts.fileNum).path.slice()
            job.set('state','getentry')
            recursiveGetEntryReadOnly(this.disk.entry, path, function(entry) {
                if (entry.error) {
                    oncallback(entry)
                } else {
                    function onFile(result) {
                        if (result.err) {
                            oncallback({error:result.err,evt:result})
                        } else {
                            var file = result
                            function onRead(evt) {
                                if (evt.target.result) {
                                    job.opts.readJob.readData[opts.fileNum] = evt.target.result
                                    oncallback(evt.target.result)
                                } else {
                                    console.error('reader error',evt)
                                    debugger
                                    oncallback({error:'error on read',evt:evt})
                                }
                            }
                            var fr = new FileReader
                            fr.onload = onRead
                            fr.onerror = onRead
                            var blobSlice = file.slice(opts.fileOffset, opts.fileOffset + opts.size)
                            job.set('state','reading')
                            setTimeout( function() {
                                fr.readAsArrayBuffer(blobSlice)
                            }, DiskIO.debugtimeout)
                        }
                    }
                    job.set('state','getfile')
                    entry.file(onFile, onFile)
                }
            })
        },
        doGetWholeContents: function(opts, callback, job) {
            // gets whole contents for a file
            var oncallback = _.bind(this.wrapCallback,this,callback,job)
            var path = opts.path
            job.set('state','getentry')
            recursiveGetEntryReadOnly(this.disk.entry, path, function(entry) {
                if (entry.error) {
                    oncallback(entry)
                } else {
                    function onFile(result) {
                        if (result.err) {
                            oncallback({error:result.err,evt:result})
                        } else {
                            function onRead(evt) {
                                if (evt.target.result) {
                                    oncallback(evt.target.result)
                                } else {
                                    console.error('reader error',evt)
                                    debugger
                                    oncallback({error:'error on read',evt:evt})
                                }
                            }
                            var fr = new FileReader
                            fr.onload = onRead
                            fr.onerror = onRead
                            job.set('state','reading')
                            setTimeout( function() {
                                fr.readAsArrayBuffer(result)
                            }, DiskIO.debugtimeout)
                        }
                    }
                    job.set('state','getfile')
                    entry.file(onFile, onFile)
                }
            })
        },
        writePiece: function() {
            // find a better place to insert this
            var others = _.filter(this.items, function(v) { return v.get('type') == 'doWritePiece' })
            if (others.length > 0) {
                console.log('do smarter insert to reduce zero writing...')
                // find the right place to insert it.
            }

            var thisPieceNum = arguments[0].piece.num

            this.addToQueue('doWritePiece',arguments)
        },
        readPiece: function() {
            // reads piece data from disk
            this.addToQueue('doReadPiece',arguments)
        },
        checkTorrentStopped: function(job) {
            if (app.client.torrents.get(job.opts.torrent).get('state') != 'started') {
                return true
            }
            return false
        },
        doTruncate: function(opts, callback, job) {
            if (this.checkTorrentStopped(job)) return
            var oncallback = _.bind(this.wrapCallback,this,callback,job)
            var piece = opts.piece
            var writeJob = opts.writeJob
            var fileNum = opts.fileNum
            var size = opts.size
            var path = piece.torrent.getFile(opts.fileNum).path.slice()
            job.set('state','getentry')
            this.getFileEntryWriteable( path, function(entry) {
                job.set('state','createwriter')
                entry.createWriter( function(writer) {
                    writer.onwrite = function(evt) {
                        oncallback(evt)
                    }
                    writer.onerror = function(evt) {
                        console.error('writer error',evt)
                        debugger
                        oncallback({error:evt})
                    }
                    //console.log('writer.Write')
                    job.set('state','truncating')
                    setTimeout( function() {
                        writer.truncate(opts.size)
                    }, DiskIO.debugtimeout)
                }.bind(this))
            }.bind(this))
        },
        doWriteZeroes: function(opts, callback, job) {
            if (this.checkTorrentStopped(job)) return
            job.set('state','preparebuffer')
            var writeJob = opts.writeJob
            var fileNum = opts.fileNum
            var offset = opts.fileOffset
            var size = opts.size

            var oncallback = _.bind(this.wrapCallback,this,callback,job)

            // do we have cached entry ready?
            if (zeroCache[size]) {
                var buftowrite = zeroCache[size]
            } else {
                var buftowrite = new Uint8Array(size)
            }
            var path = writeJob.piece.torrent.getFile(fileNum).path.slice()
            job.set('state','getentry')
            this.getFileEntryWriteable( path, function(entry) {
                job.set('state','createwriter')
                entry.createWriter( function(writer) {
                    writer.onwrite = function(evt) {
                        oncallback(evt)
                    }
                    writer.onerror = function(evt) {
                        console.error('writer error',evt)
                        debugger

                        oncallback({error:evt})
                    }
                    writer.seek(offset)
                    //console.log('writer.Write')
                    job.set('state','writing')
                    setTimeout( function() {
                        writer.write(new Blob([buftowrite]))
                    }, DiskIO.debugtimeout)
                }.bind(this))
            }.bind(this))
        },
        doReadPiece: function(opts, callback, job) {
            if (this.checkTorrentStopped(job)) return
            var piece = opts.piece
            var readJob = new PieceReadJob(opts, callback)
            var subjobs = readJob.getSubjobs()
            this.shift()
            var subjobs = readJob.getSubjobs()
            var cur
            this.unshift(readJob)
            while( cur = subjobs.pop() ) {
                this.unshift(cur)
            }
            this.queueActive = false
            this.doQueue()
        },
        doWritePiece: function(opts, callback, job) {
            if (this.checkTorrentStopped(job)) return
            var piece = opts.piece
            // 1. collect metadat info for all the files (sizes etc)
            // 2. create all the jobs, including zero pad jobs
            // 3. put this job after all those jobs
            var writeJob = new PieceWriteJob({piece:piece,
                                              torrent:piece.torrent.hashhexlower
                                             }, 
                                             callback)
            writeJob.oncollected = _.bind(this.onWritePieceCollected, this, writeJob)
            this.shift() // remove the "basic job"
            // move this to the end
            var subjobs = writeJob.getSubjobs()
            var cur
            this.unshift(writeJob)
            while( cur = subjobs.pop() ) {
                this.unshift(cur)
            }

            //this.items = subjobs.concat(this.items)
/*            for (var i=0; i<subjobs.length; i++) {
                this.addAt(subjobs[i])
            }*/
            //this.addAt(writeJob)

            this.queueActive = false
            this.doQueue()
        },
        doWriteFileData: function(opts, callback, job) {
            if (this.checkTorrentStopped(job)) return
            job.set('state','preparebuffer')
            var writeJob = opts.writeJob
            var fileNum = opts.fileNum
            var fileOffset = opts.fileOffset
            var pieceOffset = opts.pieceOffset
            var size = opts.size

            var oncallback = _.bind(this.wrapCallback,this,callback,job)

            var piece = writeJob.piece

            var bufslice = new Uint8Array(piece.data, pieceOffset, size)

            if (pieceOffset == 0 && size == piece.data.byteLength) {
                // TODO -- more efficient if piece fully contained in this file (dont have to do this copy)
                var buftowrite = bufslice
            } else {
                var buftowrite = new Uint8Array(size)
                buftowrite.set(bufslice, 0)
            }

            var path = piece.torrent.getFile(fileNum).path.slice()
            job.set('state','getentry')
            this.getFileEntryWriteable( path, function(entry) {
                job.set('state','createwriter')
                entry.createWriter( function(writer) {
                    writer.onwrite = function(evt) {
                        oncallback(evt)
                    }
                    writer.onerror = function(evt) {
                        console.error('writer error',evt)
                        debugger
                        oncallback({error:evt})
                    }
                    writer.seek(fileOffset)
                    //console.log('writer.Write')
                    job.set('state','writing')
                    setTimeout( function() {
                        writer.write(new Blob([buftowrite]))
                    }, DiskIO.debugtimeout )
                }.bind(this))
            }.bind(this))
        },
        onWritePieceCollected: function(writeJob) {
            if (this.checkTorrentStopped(writeJob)) return
            // create a bunch of zero pad jobs if needed
            // and then create a bunch of small file write jobs
            var newjobs = []

            for (var i=0; i<writeJob.filesSpanInfo.length; i++) {

                var job = writeJob.filesSpanInfo[i]
                var metaData = writeJob.filesMetadata[job.fileNum]

                if (job.fileOffset > metaData.size) {
                    var useTruncate = true
                    if (useTruncate) {
                        var doWriteFileJob = new BasicJob({type:'doTruncate',
                                                           writeJob:writeJob,
                                                           piece:writeJob.piece,
                                                           pieceNum:writeJob.piece.num,
                                                           torrent:writeJob.piece.torrent.hashhexlower,
                                                           fileNum:job.fileNum,
                                                           size:job.fileOffset,
                                                           callback:null})
                        newjobs.push(doWriteFileJob)

                    } else {

                        // CALL TRUNCATE!!!!!!!

                        // create a bunch of extra small pad jobs
                        var numZeroes = job.fileOffset - metaData.size

                        var writtenSoFar = 0
                        var limitPerStep = 1048576 // only allow writing a certain number of zeros at a time
                        //var limitPerStep = Math.pow(2,15)

                        var zeroJobData = []

                        while (writtenSoFar < numZeroes) {
                            var curZeroes = Math.min(limitPerStep, (numZeroes - writtenSoFar))
                            zeroJobData.push( {type:'doWriteZeroes',
                                               writeJob:writeJob,
                                               torrent:writeJob.piece.torrent.hashhexlower,
                                               pieceNum:writeJob.piece.num,
                                               fileNum:job.fileNum,
                                               fileOffset:metaData.size + writtenSoFar,
                                               size:curZeroes} )
                            writtenSoFar += curZeroes
                        }


                        writeJob.filesZeroInfo[job.fileNum] = { done:0,
                                                                total:zeroJobData.length }

                        for (var j=0; j<zeroJobData.length; j++) {
                            var zeroJob = zeroJobData[j]
                            /*                        var cb = _.bind(writeJob.wroteFileZeroes,
                                                      writeJob,
                                                      job.fileNum,
                                                      j,
                                                      zeroJobData.length) 
                                                      zeroJob.callback = cb
                            */
                            var zeroJobObj = new BasicJob(zeroJob)
                            newjobs.push(zeroJobObj)
                        }
                    }
                }
                // at this point we added the zero pad jobs to newjobs, so we can proceed to write the piece data
                var doWriteFileJob = new BasicJob({type:'doWriteFileData',
                                                   writeJob:writeJob,
                                                   pieceNum:writeJob.piece.num,
                                                   torrent:writeJob.piece.torrent.hashhexlower,
                                                   fileNum:job.fileNum,
                                                   fileOffset:job.fileOffset,
                                                   pieceOffset:job.pieceOffset,
                                                   size:job.size,
                                                   callback:null})
                newjobs.push(doWriteFileJob)
            }
            // newjobs all finished
            var cur
            while( cur = newjobs.pop() ) {
                this.unshift(cur)
            }

            //this.items = newjobs.concat( this.items )
            this.doQueue()
        },
        cancelTorrentJobs: function(torrent, callback) {
            console.warn('cancelTorrentJobs')
            // cancel all active jobs for a give torrent
            var toremove = []
            for (var i=0; i<this.items.length; i++) {
                var job = this.items[i]
                console.assert(job.opts.torrent)
                if (job.get('state') == 'idle') {
                    toremove.push(job)
                }
            }
            var cur
            while (cur = toremove.pop()) {
                this.items.splice(this.items.indexOf(cur),1)
            }
            this.trigger('remove')
        },
    }

    _.extend(DiskIO.prototype, 
             DiskIOProto,
             jstorrent.BasicCollection.prototype)


    jstorrent.DiskIO = DiskIO

})()