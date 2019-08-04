#!/usr/bin/env python3
""" Script for fetching somekibble data for reports """
import requests
import cgi
import json
import time
import re
import os
import sys

BEFORE = int(time.time() - (90*86400))
RAO_HOME = '/var/www/reporter.apache.org'
TOKEN = open('%s/data/kibble-token.txt' % RAO_HOME).read().strip()

def main():
    form = cgi.FieldStorage()
    project = form.getvalue('project')
    if not project:
        if len(sys.argv) > 1:
            project = sys.argv[1]
        else:    
            project = 'nosuchproject'
    
    # Check for cache?
    if not re.match(r"^[-_.a-z0-9]+$", project):
        project = "bogus"
    cache_file = '/tmp/kibble-cache-%s.json' % project
    if (os.path.exists(cache_file) and os.path.getmtime(cache_file) > (time.time() - 86400)):
        output = open(cache_file, "r").read()
    else:
        # Issues/PRs
        issues = requests.post('https://demo.kibble.apache.org/api/issue/issues',
                  headers = {
                    'Content-Type': 'application/json',
                    'Kibble-Token': TOKEN,
                  },
                  json = {
                    "page":"issues",
                    "quick":True,
                    "interval": "week",
                    "subfilter":"/" + project + ".*\\.git",
                    "distinguish":True
                    }
                 ).json();
        after = [x for x in issues['timeseries'] if x['date'] > BEFORE]
        before = [x for x in issues['timeseries'] if x['date'] <= BEFORE]
        pro_before = 0
        prc_before = 0
        for month in before:
            pro_before += month.get('pull requests opened', 0)
            prc_before += month.get('pull requests closed', 0)
        pro_after = 0
        prc_after = 0
        for month in after:
            pro_after += month.get('pull requests opened', 0)
            prc_after += month.get('pull requests closed', 0)
        pro_change = '%u%%' % int((pro_after - pro_before) / (pro_before or 1) * 100)
        prc_change = '%u%%' % int((prc_after - prc_before) / (prc_before or 1) * 100)
        
        
        iso_before = 0
        isc_before = 0
        for month in before:
            iso_before += month.get('issues opened', 0)
            isc_before += month.get('issues closed', 0)
        iso_after = 0
        isc_after = 0
        for month in after:
            iso_after += month.get('issues opened', 0)
            isc_after += month.get('issues closed', 0)
        iso_change = '%u%%' % int((iso_after - iso_before) / (iso_before or 1) * 100)
        isc_change = '%u%%' % int((isc_after - isc_before) / (isc_before or 1) * 100)
        
        
        # Commits
        commits = requests.post('https://demo.kibble.apache.org/api/code/commits',
                  headers = {
                    'Content-Type': 'application/json',
                    'Kibble-Token': TOKEN,
                  },
                  json = {
                    "page":"issues",
                    "quick":True,
                    "interval": "week",
                    "subfilter":"/" + project,
                    }
                 ).json();
        after = [x for x in commits['timeseries'] if x['date'] > BEFORE]
        before = [x for x in commits['timeseries'] if x['date'] <= BEFORE]
        cmt_before = 0
        for month in before:
            cmt_before += month.get('commits', 0)
        cmt_after = 0
        for month in after:
            cmt_after += month.get('commits', 0)
        cmt_change = '%u%%' % int((cmt_after - cmt_before) / (cmt_before or 1) * 100)
        
        
        # Committers
        authors_b = requests.post('https://demo.kibble.apache.org/api/code/committers',
                  headers = {
                    'Content-Type': 'application/json',
                    'Kibble-Token': TOKEN,
                  },
                  json = {
                    "page":"issues",
                    "quick":True,
                    "from": int(BEFORE - (90*86400)),
                    "to": BEFORE,
                    "interval": "99999d",
                    "subfilter":"/" + project,
                    }
                 ).json()
        authors_a = requests.post('https://demo.kibble.apache.org/api/code/committers',
                  headers = {
                    'Content-Type': 'application/json',
                    'Kibble-Token': TOKEN,
                  },
                  json = {
                    "page":"issues",
                    "quick":True,
                    "from": BEFORE,
                    "to": int(time.time()),
                    "interval": "99999d",
                    "subfilter":"/" + project,
                    }
                 ).json();
        after = authors_a['timeseries']
        before = authors_b['timeseries']
        cmtp_before = 0
        for month in before:
            cmtp_before += month.get('authors', 0)
        cmtp_after = 0
        for month in after:
            cmtp_after += month.get('authors', 0)
        cmtp_change = '%u%%' % int((cmtp_after - cmtp_before) / (cmtp_before or 1) * 100)
        
        
        js = {
            'prs': {
                'before': {
                    'opened': pro_before,
                    'closed': prc_before,
                },
                'after': {
                    'opened': pro_after,
                    'closed': prc_after,
                },
                'change': {
                    'opened': pro_change,
                    'closed': prc_change,
                }
            },
            'issues': {
                'before': {
                    'opened': iso_before,
                    'closed': isc_before,
                },
                'after': {
                    'opened': iso_after,
                    'closed': isc_after,
                },
                'change': {
                    'opened': iso_change,
                    'closed': isc_change,
                }
            },
            'commits' : {
                'before': {
                    'commits': cmt_before,
                    'authors': cmtp_before,
                },
                'after': {
                    'commits': cmt_after,
                    'authors': cmtp_after,
                },
                'change': {
                    'commits': cmt_change,
                    'authors': cmtp_change,
                }
            }
        }
        output = json.dumps(js, indent = 2)
        with open(cache_file, 'w') as f:
            f.write(output)
            f.close()
    
    if 'SCRIPT_NAME' in os.environ:
        print("Status: 200 Okay")
        print("Content-Type: application/json\r\n")
    print(output)
    
if __name__ == '__main__':
    main()
