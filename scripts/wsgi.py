#!/usr/bin/env python2.7
import json
import time
import base64
import re

CACHE_TIMEOUT = 14400

import rapp.overview
import rapp.whimsy
import rapp.drafts

webmap = {
    '/api/overview': rapp.overview.run,
    '/api/whimsy/comments': rapp.whimsy.comments,
    '/api/whimsy/agenda': rapp.whimsy.agenda,
    '/api/whimsy/agenda/refresh': rapp.whimsy.agenda_forced,
    '/api/whimsy/publish': rapp.whimsy.publish,
    '/api/drafts/index': rapp.drafts.index,
    '/api/drafts/save': rapp.drafts.save,
    '/api/drafts/fetch': rapp.drafts.fetch,
    '/api/drafts/delete': rapp.drafts.delete,
}

def app(environ, start_fn):
    now = time.time()
    bauth = re.match(r"Basic (.+)", environ.get('HTTP_AUTHORIZATION', 'foo'))
    if bauth:
        bdec = base64.b64decode(bauth.group(1)).decode('utf-8')
        m = re.match("^(.+?):(.+)$", bdec)
        if m:
            user = m.group(1)
    uri = environ.get('PATH_INFO', '/')
    if uri in webmap:
        output = webmap[uri](environ, user)
    else:
        output = {'okay': False, 'message': 'Unknown URI %s' % uri}
    
    output['took'] = int((time.time() - now) * 1000)
    out = json.dumps(output, indent = 2, sort_keys = True).encode('ascii')
    start_fn('200 OK', [('Content-Type', 'application/json'), ('Content-Length', str(len(out)))])
    return [out]
