#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
""" script for publishing a report to whimsy """
import os
import sys
import time
import json
import requests
import re
import pdata
import committee_info

WHIMSY_SUBMIT = 'https://whimsy.apache.org/board/agenda/json/post'
WHIMSY_AGENDA_IP = 'https://whimsy.apache.org/board/agenda/%s.json'
WHIMSY_AGENDA_RE = r'https://whimsy\.apache\.org/board/agenda/(latest|\d+-\d+-\d+)\.json'

WHIMSY_COMMENTS = 'https://whimsy.apache.org/board/agenda/json/historical-comments'
WHIMSY_CALENDAR = 'https://whimsy.apache.org/board/agenda/calendar.json'

def get_whimsy(url, env, ttl = 14400):
    cached = True
    xurl = re.sub(r"[^a-z0-9]+", "-", url.replace('.json', ''))
    wanted_file = '/tmp/%s.json' % xurl
    if pdata.has_cache(wanted_file, ttl = ttl):
        js = json.load(open(wanted_file))
    else:
        try:
            print("Fetching %s => %s..." % (url, wanted_file))
            rv = requests.get(url, headers = {'Authorization': env.get('HTTP_AUTHORIZATION')}, timeout = 5)
            js = rv.json()
            
            # If we get a partial response (206), we need to weave the partial
            # into the full object in cache.
            if re.match(WHIMSY_AGENDA_RE, url) and (len(js) < 50 or rv.status_code == 206):
                print("Got partial response, weaving!!")
                try:
                    ojs = json.load(open(wanted_file))
                except:
                    ojs = []
                xjs = []
                for attachment in js:
                    aa = attachment.get('attach')
                    at = attachment.get('title')
                    found = False
                    for old_attachment in ojs:
                        ba = old_attachment.get('attach')
                        bt = old_attachment.get('title')
                        if (aa and ba and aa == ba) and (at and bt and at == bt) and attachment.get('digest'):
                            #print("Weaved %s into old.." % ba)
                            old_attachment['digest'] = attachment['digest']
                            old_attachment['report'] = attachment['report']
                            found = True
                            break
                    if not found:
                        ojs.append(attachment)
                    
                js = ojs
            
            # Extend old cache if needed
            elif url == WHIMSY_COMMENTS and rv.status_code == 206:
                try:
                    ojs = json.load(open(wanted_file))
                except:
                    ojs = {}
                for key, comments in js.items():
                    ojs[key] = comments
                js = ojs
                
                        
            with open(wanted_file, "w") as f:
                json.dump(js, f)
                f.close()
                cached = False
        except: # fall back to cache on failure!
            js = json.load(open(wanted_file))
    
    return js, cached

def latest_agenda(environ):
    calendar, cached = get_whimsy(WHIMSY_CALENDAR, environ)
    latest = calendar['agendas'][-1]
    ymd = re.match(r"board_agenda_(\d\d\d\d_\d\d_\d\d)\.txt", latest)
    if ymd:
        return latest, WHIMSY_AGENDA_IP % ymd.group(1).replace('_', '-')
    else:
        return latest, WHIMSY_AGENDA_IP % 'latest'

def has_access(user, project):
    member = pdata.isASFMember(user)
    pmc = project in pdata.getPMCs(user)
    return (member or pmc)

def guess_title(project):
    """ Guess the whimsy name of a project """
    pmcSummary = committee_info.PMCsummary()
    
    # Figure out the name as written in whimsy..
    pname = project
    if project in pmcSummary:
        pname = pmcSummary[project]['name'].replace('Apache ', '')
    
    return pname

def agenda_forced(environ, user):
    """ Force whimsy agenda refresh... """
    txtfile, url = latest_agenda(environ)
    get_whimsy(url, environ, ttl = 0)
    return agenda(environ, user)

def agenda(environ, user):
    """ Returns data on the board report for a project, IF present and/or filed in the current agenda """
    project = environ.get('QUERY_STRING')
    report = None
    txtfile, url = latest_agenda(environ)
    if has_access(user, project):
        agenda, cached = get_whimsy(url, environ, ttl = 3600)
        for entry in agenda:
            ml = entry.get('mail_list') # mailing list id, usually correct
            rid = entry.get('roster', '').replace('https://whimsy.apache.org/roster/committee/', '') # ldap id per roster
            if ml and (ml == project or rid == project):
                report = entry
                break
        
        comments, cached = get_whimsy(WHIMSY_COMMENTS, environ)
        title = report and report.get('title') or guess_title(project)
        if title in comments:
            comments = comments[title]
        else:
            comments = {}
        
        return {
            'can_access': True,
            'found': report and True or False,
            'filed': report and report.get('report') and True or False,
            'report': report,
            'comments': comments,
            }
    
    return {
        'can_access': False,
        'found': False,
        }
    
    
    comments, cached = get_whimsy(WHIMSY_COMMENTS, environ)

def comments(environ, user):
    """ Display board feedback from previous reports ... """
    project = environ.get('QUERY_STRING')
    comments, cached = get_whimsy(WHIMSY_COMMENTS, environ)
    
    pmcSummary = committee_info.PMCsummary()
    
    # Figure out the name as written in whimsy..
    pname = project
    if project in pmcSummary:
        pname = pmcSummary[project]['name'].replace('Apache ', '')
    cmt = {}
    
    # If we can access, fetch comments
    if comments and pname in comments and has_access(user, project):
        comments = comments[pname]
    else:
        comments = {}

    js = {
        "pid": project,
        "pname": pname,
        "comments": comments,
        "used_cache": cached,
    }
    return js


def publish(environ, user):
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
        agenda = js.get('agenda')
        project = js.get('project')
        report = js.get('report')
        digest = js.get('digest')
        attach = js.get('attach')
        print(project, agenda)
        if agenda and project and report:
            message = "Publishing report for %s via Reporter" % project
            payload = {
             'agenda': agenda,
             'project': project,
             'report': report,
             'message': message,
            }
            if digest and attach:
                del payload['project']
                payload['attach'] = attach
                payload['message'] = "Updating report for %s via Reporter." % project
                payload['digest'] = digest
            try:
                rv = requests.post(WHIMSY_SUBMIT, headers = {
                    'Authorization': environ.get('HTTP_AUTHORIZATION'),
                    "Content-Type": "application/json"
                    }, json = payload, timeout = 10)
                rv.raise_for_status()
                print(rv.text)
                return {'okay': True, 'message': "Posted to board agenda!"}
            except:
                pass
    return {}
    
    