#!/usr/bin/env python2.7
import os
import cgi
import json
import pdata
import time
import re

CACHE_TIMEOUT = 3600


def app(environ, start_fn):
    committers = pdata.loadJson(pdata.COMMITTER_INFO)['people']
    project = environ.get('QUERY_STRING')
    user = environ.get('HTTP_X_AUTHENTICATED_USER')
    
    output = {'okay': False, 'error': 'Unknown user ID provided!'}
    
    dumps = {}
    groups = []
    if user:
        groups = pdata.getPMCs(user)
    if project and user and re.match(r"[-a-z0-9]+", project):
        groups = [project]
    
    for xproject in groups:
        
         # Try cache first? (max 6 hours old)
        wanted_file = "/tmp/pdata-%s.json" % xproject
        if xproject == project:
            wanted_file = "/tmp/pdata-kibbled-%s.json" % xproject
        if (os.path.exists(wanted_file) and os.path.getmtime(wanted_file) > (time.time() - CACHE_TIMEOUT)):
            mpdata = json.load(open(wanted_file, "r"))
        # If cache failed, generate fom scratch
        else:
            mpdata = pdata.generate(user, xproject, xproject == project)
            open(wanted_file, "w").write(json.dumps(mpdata))
        # Weave results into combined object, mindful of kibble data
        for k, v in mpdata.items():
            if k not in dumps:
                dumps[k] = {}
            if (k != 'kibble'):
                dumps[k][xproject] = v
            if k == 'kibble' and v:
                dumps['kibble'] =v
    
    # Set personalized vars, dump
    if dumps and user:
        ddata, allpmcs, health = pdata.getProjectData()
        dumps['you'] = committers[user]
        dumps['all'] = allpmcs
        dumps['pmcs'] = groups
        output = dumps
        
    start_fn('200 OK', [('Content-Type', 'application/json')])
    
    return [json.dumps(output, indent = 2).encode('ascii')]
