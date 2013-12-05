jstorrent.protocol = {
    protocolName: 'BitTorrent protocol',
    pieceSize: 16384,
    maxPacketSize: 32768,
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
    ]
}