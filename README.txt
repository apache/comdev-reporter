This file is an attempt to start to document how the reporter.apache.org site is set up.

It is currently very rudimentary.


Original version:
  Javascript and CSS are Foundation
  http://foundation.zurb.com
  Current version seems to be 5.5.1 (see start of site/css/foundation.css)

NG version:
  jQuery and custom CSS/CoffeeScript compiled into tabs.js using:
    cat coffee/*.coffee | coffee -b --compile --stdio > tabs.js

Also uses Google Loader:
https://developers.google.com/loader/
This is used by site/index.html which loads the visualization API modules: corechart, timeline

The site seems to run on the host nyx-ssl at present (Jul 2018)

The HTTPD conf was originally defined here:
https://svn.apache.org/repos/infra/infrastructure/trunk/machines/vms/nyx-ssl.apache.org/etc/apache2/sites-available/reporter.apache.org.conf

Some Puppet data is here
https://svn.apache.org/repos/infra/infrastructure/trunk/puppet/hosts/nyx-ssl/manifests/init.pp

The apache puppet config for the VM is stored at:
https://gitbox.apache.org/repos/asf?p=infrastructure-puppet.git;a=blob_plain;f=data/nodes/projects-vm.apache.org.yaml

There must be other puppet data files for the host; details TBA
modules/projects_pvm_asf/manifests/init.pp

Crontab:

crontab -l -u root (in puppet, part of projects-vm.apache.org.yaml):
# m h  dom mon dow   command

# Puppet Name: rao_releases_ci
45 0,6,12,18 * * * cd /var/www/reporter.apache.org/data/releases && sudo -n -u www-data svn ci -m "updating report releases data" --username projects_role --password `cat /root/.rolepwd` --non-interactive >>/var/log/www-data-root/svnreleases_$(date "+\%Y-\%m").log
# Puppet Name: rao_history_ci
10 4,12,20 * * * cd /var/www/reporter.apache.org/data/history && sudo -n -u www-data svn ci -m "updating report releases data" --username projects_role --password `cat /root/.rolepwd` --non-interactive >>/var/log/www-data-root/svnhistory_$(date "+\%Y-\%m").log
# Puppet Name: pao_json_ci
20 4 * * * cd /var/www/projects.apache.org/site/json && sudo -n -u www-data svn ci -m "updating projects data" --username projects_role --password `cat /root/.rolepwd` --non-interactive >>/var/log/www-data-root/svnjson_$(date "+\%Y-\%m").log

crontab -l -u www-data: (Not currently stored in puppet)
# m h   dom mon dow   command
00 4,12,20 * * * cd /var/www/reporter.apache.org/scripts && ./python3logger.sh parsepmcs.py
00 01 * * *      cd /var/www/reporter.apache.org/scripts && ./python3logger.sh mailglomper2.py
00 09 * * *      cd /var/www/reporter.apache.org/scripts && ./python3logger.sh readjira.py
10 00 * * *      cd /var/www/reporter.apache.org/scripts && ./python3logger.sh reportingcycles.py
20 00 * * *      cd /var/www/reporter.apache.org/scripts && ./python3logger.sh pmcdates.py
30 00 * * *      cd /var/www/reporter.apache.org/scripts && ./python3logger.sh bugzillastats.py
50 00 * * *      cd /var/www/reporter.apache.org/scripts && ./python3logger.sh health.py
32  * * * *      cd /var/www/reporter.apache.org/scripts && ./python3logger.sh readchecker.py
*/30 * * * *     pgrep -f "gunicorn3.*wsgi:app" || (cd /var/www/reporter.apache.org/scripts && gunicorn3 -b 127.0.0.1:8000 -w 6 -D wsgi:app && echo "restarting gunicorn for reporter")

# ensure that any new data files get picked up by the commit (which must be done by root)
40  * * * *      cd /var/www/reporter.apache.org/scripts && ./svnadd.sh ../data/releases

00 12 * * * curl -sS "(redacted)" > /var/www/reporter.apache.org/data/mailinglists.json

# Run scandist
@reboot         cd /var/www/reporter.apache.org/scripts && ./scandist.sh
@monthly        cd /var/www/reporter.apache.org/scripts && ./scandist.sh restart


Scripts:
- scripts/health.py
  Creates data/health.json

- scripts/parsepmcs.py
  Updates data/pmcs.json and data/projects.json (from Whimsy public data)
  Also updates historic copies (without the last seen timestamp) in data/history

-scripts/pmcdates.py
  Creates data/pmcdates.json from committee_info.json

-scripts/reportingcycles.py
  Creates site/reportingcycles.json from committee_info.json

- scripts/mailglomper.py
  Updates data/maildata_extended.json from http://mail-archives.us.apache.org/mod_mbox/<list>/<date>.mbox

- scripts/readchecker.py
  Caches output of https://checker.apache.org/json/ in data/cache/checker.json

- scripts/readjira.py
   For each .json file found under data/JSON (apart from jira_projects.json) it recreates the file.
   Also refreshes data/JIRA/jira_projects.json

- site/addrelease.py
  Updates data/releases/%s.json % committee from form data

- site/getjson.py
  If stale, re-creates data/JIRA/jira_projects.json (from JIRA)
  If stale, re-creates data/JIRA/%s.json % project (from JIRA)
  
- site/jiraversions.py
  Updates data/releases/%s.json % project

Data file consumers:
- chi.py
  data/health.json

- getjson.py
  data/health.json
  data/maildata_extended.json
  data/mailinglists.json
  data/pmcs.json
  data/projects.json
  data/pmcdates.json
  data/releases/%s.json % project
  data/JIRA/jira_projects.json
  data/JIRA/%s.json % project

- health.py
  data/maildata_extended.json
  data/pmcs.json
  data/projects.json
  data/releases/%s.json % project
  https://whimsy.apache.org/public/committee-info.json

- render.js
  site/reportingcycles.json
  site/getjson.py?only=project
  site/jiraversions.py?project=<pmc>&jiraname=<project>&prepend=<prepend>
  site/addrelease.py?json=true&committee=xxx&version=xxx&date=xxx
