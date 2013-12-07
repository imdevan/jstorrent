jstorrent.protocol = {
    protocolName: 'BitTorrent protocol',
    reportedClientName: 'JSTorrent 2.0.0',
    pieceSize: 16384,
    maxPacketSize: 32768,
    handshakeLength: 68,
    extensionMessages: { ut_metadata: 2,
                         ut_pex: 3},
    extensionMessageHandshakeCode: 0,
    extensionMessageCodes: {}, // populated just below
    messages: [
        'CHOKE',
        'UNCHOKE',
        'INTERESTED',
        'NOT_INTERESTED',
        'HAVE',
        'BITFIELD',
        'REQUEST',
        'PIECE',
        'CANCEL',
        'PORT',
        'WANT_METAINFO',
        'METAINFO',
        'SUSPECT_PIECE',
        'SUGGEST_PIECE',
        'HAVE_ALL',
        'HAVE_NONE',
        'REJECT_REQUEST',
        'ALLOWED_FAST',
        'HOLE_PUNCH',
        '-',
        'UTORRENT_MSG'
    ],
    messageNames: {}, // populated just below
    messageCodes: {} // populated just below
}
for (var i=0; i<jstorrent.protocol.messages.length; i++) {
    jstorrent.protocol.messageCodes[i] = jstorrent.protocol.messages[i]
    jstorrent.protocol.messageNames[jstorrent.protocol.messages[i]] = i
}
for (var key in jstorrent.protocol.extensionMessages) {
    jstorrent.protocol.extensionMessageCodes[jstorrent.protocol.extensionMessages[key]] = key
}
jstorrent.protocol.parseHandshake = function(buf) {
    var toret = {}
    sofar = 0;
    var v = new DataView(buf, 0, 1)
    sofar += 1
    if (v.getUint8(0) == jstorrent.protocol.protocolName.length) {
        if (ui82str( new Uint8Array(buf, 1, jstorrent.protocol.protocolName.length) ) == jstorrent.protocol.protocolName) {

            sofar += jstorrent.protocol.protocolName.length

            toret.reserved = new Uint8Array(buf,sofar,8) // reserved bytes
            sofar += 8
            toret.infohash = new Uint8Array(buf,sofar,20) // infohash
            sofar += 20
            toret.peerid = new Uint8Array(buf,sofar,20) // peer id

            return toret
        }
    }
}


function test_handshake() {
    var resp = new Uint8Array([19, 66, 105, 116, 84, 111, 114, 114, 101, 110, 116, 32, 112, 114, 111, 116, 111, 99, 111, 108, 0, 0, 0, 0, 0, 16, 0, 5, 185, 30, 192, 102, 102, 143, 44, 232, 17, 19, 73, 174, 134, 204, 129, 148, 28, 228, 140, 105, 45, 85, 84, 51, 51, 48, 48, 45, 185, 115, 26, 147, 25, 81, 77, 51, 69, 214, 85, 90]).buffer
    var parsed = jstorrent.protocol.parseHandshake(resp)
    console.assert(parsed.peerid && parsed.infohash)
}

if (jstorrent.options.run_unit_tests) {
    test_handshake()
}