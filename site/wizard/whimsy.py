#!/usr/bin/env python
# -*- coding: UTF-8 -*-
""" script for publishing a report to whimsy """
import os
import sys
import cgi
import time
import json
import requests
import re

WHIMSY_URL = 'https://whimsy.apache.org/board/agenda/json/post'
BASIC_AUTH = os.environ['HTTP_X_WHIMSY_AUTH'] if 'HTTP_X_WHIMSY_AUTH' in os.environ else ""
USER = os.environ['HTTP_X_AUTHENTICATED_USER'] if 'HTTP_X_AUTHENTICATED_USER' in os.environ else ""


def main():
    
    # Get project requested and report
    form = cgi.FieldStorage()
    project = form.getvalue('project')
    report = form.getvalue('report')
    agenda = form.getvalue('agenda')
    
    # If auth passed along and project is valid, go look for comments
    dumps = {'okay': False, 'message': "Could not post to whimsy!"}
    if BASIC_AUTH and project and report and re.match(r"^board_agenda_\d+_\d+_\d+\.txt$", agenda):
        js = {
         'agenda': agenda,
         'project': project,
         'report': report,
         'message': "Publishing %s report via reporter.a.o" % project,
        }
        try:
            rv = requests.post(WHIMSY_URL, headers = {'Authorization': BASIC_AUTH, "Content-Type": "application/json"}, json = js)
            rv.raise_for_status()
            dumps = {'okay': True, 'message': "Posted to board agenda!"}
        except:
            pass
    dump = json.dumps(dumps)
    sys.stdout.write("Content-Type: application/json\r\nContent-Length: %u\r\n\r\n" % (len(dump)))
    sys.stdout.write(dump)

if __name__ == '__main__':
    main()
