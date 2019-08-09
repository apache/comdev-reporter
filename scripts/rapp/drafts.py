#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
""" script for working with drafts """
import os
import sys
import time
import json
import re
import pdata
import committee_info
import rapp.whimsy

DRAFTS_DIR = '/tmp/rapp-drafts'
EDITOR_TYPE = 'unified'

if not os.path.isdir(DRAFTS_DIR):
    os.makedirs(DRAFTS_DIR, exist_ok = True)

def has_access(user, project):
    member = pdata.isASFMember(user)
    pmc = project in pdata.getPMCs(user)
    return (member or pmc)

def index(environ, user):
    """ Listy currently existing drafts for a project """
    project = environ.get('QUERY_STRING')
    drafts = {}
    
    if has_access(user, project):
        whence = int(time.time() - (60*86400)) # Max 2 months ago!
        for filename in [x for x in os.listdir(DRAFTS_DIR) if x.startswith(EDITOR_TYPE) and x.endswith('.draft')]:
            e, p, t, u = filename.split('-', 3)
            t = int(t)
            # If a file is way old, try deleting it.
            if t < whence:
                try:
                    os.unlink("%s/%s" % (DRAFTS_DIR, filename))
                except:
                    pass
            elif p == project and t >= whence:
                u = u.replace('.draft', '')
                drafts[t] = {'filename': filename, 'creator': u, 'yours': user == u}
    
    return { 'drafts': drafts }

def fetch(environ, user):
    """ Fetch a draft if access is right... """
    filename = environ.get('QUERY_STRING')
    m =  re.match(r"[^-./]+-([^-./]+)-\d+-[^-./]+\.draft$", filename)
    if not m:
        return {'error': "Invalid filename!"}
    if os.path.exists(os.path.join(DRAFTS_DIR, filename)):
        project = m.group(1)
        if has_access(user, project):
            report = open(os.path.join(DRAFTS_DIR, filename), "r").read()
            return {'report': report}
    return {}

def delete(environ, user):
    """ Delete a draft if access is right... """
    filename = environ.get('QUERY_STRING')
    m =  re.match(r"[^-./]+-[^-./]+-\d+-([^-/]+)\.draft$", filename)
    if not m:
        return {'error': "Invalid filename!"}
    if os.path.exists(os.path.join(DRAFTS_DIR, filename)):
        u = m.group(1)
        if user == u:
            try:
                os.unlink(os.path.join(DRAFTS_DIR, filename))
                return {'message': 'Draft deleted'}
            except:
                pass
    return {'error': "Could not delete draft!"}

def save(environ, user):
    """ Save a draft """
    try:
        request_body_size = int(environ.get('CONTENT_LENGTH', 0))
    except (ValueError):
        request_body_size = 0
    if request_body_size:
        request_body = environ['wsgi.input'].read(request_body_size)
        try:
            js = json.loads(request_body.decode('utf-8'))
        except:
            js = {}
    if js:
        project = js.get('project')
        if has_access(user, project):
            report = js.get('report')
            now = int(time.time())
            filename = '%s-%s-%s-%s.draft' % (EDITOR_TYPE, project, now, user)
            try:
                with open(os.path.join(DRAFTS_DIR, filename), "w") as f:
                    f.write(report)
                    f.close()
                return {
                    'okay': True,
                    'filename': filename,
                }
            except:
                return {
                    'okay': False,
                    'error': 'Could not save draft (permission issue?? disk full?)',
                }
        else:
            return {
                'okay': False,
                'error': 'You do not have access to this project',
            }
    else:
        return {
            'okay': False,
            'error': "Invalid data!",
        }



def forgotten(environ, user):
    """ Query for which TLP reports have drafts but haven't filed to agenda yet """
    agenda, cached = rapp.whimsy.get_whimsy(rapp.whimsy.WHIMSY_AGENDA, environ)
    drafts = sorted([x for x in os.listdir(DRAFTS_DIR) if x.startswith(EDITOR_TYPE) and x.endswith('.draft')])
    lost = {}
    for entry in agenda:
        ml = entry.get('mail_list') # mailing list id, usually correct
        rid = entry.get('roster', '').replace('https://whimsy.apache.org/roster/committee/', '') # ldap id per roster
        if ml and rid and 'report' in entry and entry.get('attach') >= 'A': # If standard TLP report entry...
            
            if entry.get('report'):
                lost[rid] = {
                    'filed': True,
                    'attach': entry['attach']
                }
            else:
                applicables = []
                last_report  = ""
                last_author = None
                has_draft = False
                ts = 0
                for filename in drafts:
                    e, p, t, u = filename.split('-', 3)
                    t = int(t)
                    if p == rid and t > (time.time() - 45*86400):
                        applicables.append(filename)
                if has_access(user, rid) and applicables:
                    has_draft = True
                    last_report = open(os.path.join(DRAFTS_DIR, applicables[-1]), "r").read()
                    e, p, t, u = applicables[-1].split('-', 3)
                    ts = int(t)
                    last_author = u.replace('.draft', '')
                lost[rid] = {
                    'filed': False,
                    'has_draft': has_draft,
                    'last_draft': last_report,
                    'last_author': last_author,
                    'draft_timestamp': ts,
                    'attach': entry['attach']
                }
            
    return { 'report_status': lost }
