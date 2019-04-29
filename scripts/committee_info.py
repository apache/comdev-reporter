"""

Module to give access to data from committee-info.json

This module acts as the gatekeeper for all access to committee-info.json
which is cached from https://whimsy.apache.org/public/committee-info.json

"""

import time
import calendar
import json
from urlutils import UrlCache

URL='https://whimsy.apache.org/public/committee-info.json'


# Don't check more often than every minute (used by webapp as well as cronjobs)
uc = UrlCache(interval=60, silent=True)

def loadJson(url):
    resp = uc.get(url, name=None, encoding='utf-8', errors=None)
    try:
        content = resp.read() # json.load() does this anyway
        try:
            j = json.loads(content)
        except Exception as e:
            # The Proxy error response is around 4800 bytes
            print("Error parsing response:\n%s" % content[0:4800])
            raise e
    finally:
        resp.close()
    return j

cidata = loadJson(URL) # The data read from the file

def PMCmails():

    """
        Returns output of the form:
        ['ace',...'whimsical',...]
    """
    committees = cidata['committees']
    mails=[]
    for ctte in committees:
        c = committees[ctte]
        if not c['pmc']:
            continue
        mails.append(c['mail_list'])

    return mails

def PMCnames():

    """
        Returns output of the form:
        {
         "ace": "Apache ACE",
         "abdera": "Apache Abdera,
         ...
        }
        Only includes actual PMC names
        Returns 'webservices' rather than 'ws'
    """
    committees = cidata['committees']

    namejson={}
    for ctte in committees:
        c = committees[ctte]
        if not c['pmc']:
            continue
        name = 'Apache %s' % c['display_name']
        if ctte == 'ws': ctte = 'webservices'
        namejson[ctte] = name

    return namejson

def PMCsummary():

    """
        Returns output of the form:
        {
         "ace": {
           "name": "Apache ACE",
           "chair": "Chair 1",
           "report": [
             "February",
             "May",
             "August",
             "November"
             ]
           },
         "abdera": {
           "name": "Apache Abdera",
           "chair": "Chair 2",
           "report: [...]
           },
         ...
        }
        Only includes actual PMCs
        Returns 'webservices' rather than 'ws'
    """
    committees = cidata['committees']

    namejson={}
    for ctte in committees:
        c = committees[ctte]
        if not c['pmc']:
            continue
        name = 'Apache %s' % c['display_name']
        if ctte == 'ws': ctte = 'webservices'
        chair = 'Unknown'
        chs = c['chair']
        for ch in chs: # allow for multiple chairs
            chair = chs[ch]['name']
            break
        namejson[ctte] = {
                      'name': name,
                      'report': c['report'],
                      'chair': chair
                      }

    return namejson


def pmcdates():
    dates = {}
    
    cttes = cidata['committees']
    for ent in cttes:
        ctte = cttes[ent]
        if not ctte['pmc']:
            continue
        roster = ctte['roster']
        est = ctte['established']
        date = 0
        if not est == None:
            # convert mm/yyyy to date (drop any subsequent text)
            try:
                date = calendar.timegm(time.strptime(est[0:7], '%m/%Y'))
            except Exception as e:
                print("Date parse error for %s: %s %s" % (ent, est, e))
        dates[ent] = {'pmc': [est, date], 'roster': {} }
        ids = {}
        for uid in roster:
            rid = roster[uid]
            try:
                date = calendar.timegm(time.strptime(rid['date'], '%Y-%m-%d'))
            except:
                date = 0
            ids[uid] = [rid['name'], date]
        dates[ent]['roster'] = ids
        # The 'CI' internal name for Web Services is 'ws' but reporter code originally used 'webservices'
        if ent == 'ws':
            dates['webservices'] = dates[ent]
    return dates

def cycles():

    committees = cidata['committees']

    report_cycles={}
    for ctte in committees:
        c = committees[ctte]
        if not c['pmc']:
            continue
        report_cycles[ctte] = c['report']
        # Duplicate some entries for now so the code can find them (the existing json has the duplicates)
        if ctte == 'ws': # Special processing
            report_cycles['webservices'] = report_cycles[ctte]
        if ctte == 'httpd': # Special processing
            report_cycles['http server'] = report_cycles[ctte]
    return report_cycles

def getPMCs(uid, incubator=False):
    """Returns the array of PMC committees to which the uid belongs. Excludes incubator by default"""
    pmcs = []
    cttes = cidata['committees']
    for ent in cttes:
        ctte = cttes[ent]
        if not ctte['pmc']:
            continue
        if ent == 'incubator' and not incubator:
            continue
        if uid in ctte['roster']:
            pmcs.append(ent)
    return pmcs

if __name__ == '__main__':
    emails=PMCmails()
    print(emails)
    print("Expect false: "+str('whimsy' in emails))
    print("Expect true: "+str('whimsical' in emails))
    import sys
    json.dump(PMCnames(), sys.stdout, indent=1, sort_keys=True)
    json.dump(PMCsummary(), sys.stdout, indent=1, sort_keys=True)
    json.dump(pmcdates(), sys.stdout, indent=1, sort_keys=True)
    json.dump(cycles(), sys.stdout, indent=1, sort_keys=True)
    print("")
    for arg in sys.argv[1:]:
        print("%s member of: %s" % (arg, getPMCs(arg)))
    for arg in sys.argv[1:]:
        print("%s member of: %s" % (arg, getPMCs(arg, True)))
