// Least common multiple
let lcm = (x, y) => (!x || !y) ? 0 : Math.abs((x * y) / gcd(x, y));

// Greatest common divisor
let gcd = (x,y) => {
  x = Math.abs(x);
  y = Math.abs(y);
  while (y) {
    let t = y;
    y = x % y;
    x = t;
  }
  return x;
}


function generate_pmc_roster(pdata) {
    // PMC age
    let founded = moment((pdata.pmcdates[project].pmc[2]||pdata.pmcdates[project].pmc[1]) * 1000.0);
    let age = founded.fromNow();
    let txt = "%s was founded %s (%s)\n".format(pdata.pmcsummary[project].name, founded.format('YYYY-MM-DD'), age);
    
    // PMC and committer count
    let no_com = pdata.count[project][1];
    let no_pmc = pdata.count[project][0];
    
    let y1 = no_com;
    let y2 = no_pmc;
    while (y1 > 20) {
        y1 = Math.round(y1/2)
        y2 = Math.round(y2/2);
    }
    l = lcm(y1, y2);
    x1 = l/y2;
    x2 = l/y1;
    while (x1 >= 10) {
        x1 /= 1.25;
        x2 /= 1.25;
    }
    x1 = Math.round(x1)
    x2 = Math.round(x2)
    
    let k = gcd(x1, x2);
    x1 /= k;
    x2 /= k;
    
    
    txt += "There are currently %u committers and %u PMC members in this project.\nThe Committer-to-PMC ratio is %u:%u.\n\n".format(no_com, no_pmc, x1, x2);
    
    
    
    // Last PMC addition
    let changes = pdata.changes[project].pmc;
    let now = moment();
    let three_months_ago = now.subtract(3, 'months');
    let no_added = 0;
    let last_added = null;
    txt += "PMC changes, past quarter:\n";
    for (var availid in changes) {
        let change = changes[availid];
        let name = change[0];
        let added = moment(change[1]*1000.0);
        if (!last_added || last_added[1] < change[1])  {
            last_added = change;
        }
        if (added.isAfter(three_months_ago)) {
            no_added++;
            txt += "- %s was added to the PMC on %s\n".format(name, added.format('YYYY-MM-DD'));
        }
    }
    
    if (!no_added) {
        txt += "- No new PMC members added in the past quarter.\n";
        if (last_added) {
            txt += "- Last PMC addition was %s on %s.\n".format(last_added[0], moment(last_added[1]*1000.0).format('YYYY-MM-DD'));
        }
    }
    
    // Last Committer addition
    txt += "\n"
    txt += "Committership changes, past quarter:\n"
    changes = pdata.changes[project].committer;
    now = moment();
    three_months_ago = now.subtract(3, 'months');
    no_added = 0;
    last_added = null;
    for (var availid in changes) {
        let change = changes[availid];
        let name = change[0];
        let added = moment(change[1]*1000.0);
        if (!last_added || last_added[1] < change[1])  {
            last_added = change;
        }
        if (added.isAfter(three_months_ago)) {
            no_added++;
            txt += "- %s was added as committer on %s\n".format(name, added.format('YYYY-MM-DD'));
        }
    }
    
    if (!no_added) {
        txt += "- No new committers added in the past quarter.\n";
        if (last_added) {
            txt += "- Last committer addition was %s on %s.\n".format(last_added[0], moment(last_added[1]*1000.0).format('YYYY-MM-DD'));
        }
    }
    
    return txt;
}

function generate_meta(data) {
    let founded = moment((data.pmcdates[project].pmc[2]||data.pmcdates[project].pmc[1]) * 1000.0);
    let age = founded.fromNow();
    let txt = "<b>Founded: </b>%s (%s)<br/>".format(founded.format('YYYY-MM-DD'), age);
    txt += "<b>Chair: </b> %s<br/>".format(data.pdata[project].chair);
    txt += getReportDate(cycles, project);
    
    // Previous comments of note?
    let cdates = Object.keys(comments.comments);
    cdates.sort();
    if (comments && cdates.length > 0) {
      let date = cdates[cdates.length-1];
      let comment = comments.comments[date];
      
      // split and rejoin comments
      let ntxt = "";
      let a = comment.match(/([a-z0-9]+: [\s\S\r\n]+?)(?=([a-z0-9]+:|$))/gi);
      if (a) {
        for (var i = 0; i < a.length; i++) {
          let cmt = a[i];
          cmt = cmt.replace(/[\r\n]+/g, ' ').replace(/([a-z0-9]+:)/, (a) => "<kbd>"+a+"</kbd><br/>");
          ntxt += cmt + "<br/>";
        }
      }
      txt += "<hr/><h6>Last report comments from the board: </h6>";
      txt += "<b style='color: #369;'>%s:</b><br/><span style='white-space: wrap; font-size: 0.75rem;'>%s</span>".format(date, ntxt);
    }
    return txt;
}


function pre_splash(state, json) {
    cycles = json;
    GET("/getjson.py", splash, {});
}

function splash(state, json, all) {
    pdata = json;
    let html = document.body;
    html.style.margin = '16px';
    let link = all ? 'All projects (<a href="javascript:splash({}, pdata, false);">show only your projects</a>):' : 'Your projects (<a href="javascript:splash({}, pdata, true);">show all projects</a>):'
    html.innerHTML = '<h3>%s</h3>'.format(link);
    let tbl = new HTML('table', {cellpadding: '8px', style: {margin: '20px'}});
    let hdr = new HTML('tr', {style: {color: "#963"}})
    hdr.inject([
        new HTML('td', {}, "Project:"),
        new HTML('td', {}, "Chair:"),
        new HTML('td', {}, "Next report date:"),
        new HTML('td', {}, "Wizard link:")
    ])
    tbl.inject(hdr);
    let keys = json.pdata;
    if (all) keys = cycles;
    let found = 0;
    for (var key in keys) {
        found++;
        if (pdata.pmcsummary[key]) {
            let tlpname = pdata.pmcsummary[key].name;
            let chair = pdata.pmcsummary[key].chair;
            let ccolor = '#000';
            if (chair == pdata.you.name) {
                chair += " (You!)";
                ccolor = '#195';
            }
            let tr = new HTML('tr');
            let rd = new HTML('td', {}, getReportDate(cycles, key, true));
            let link = new HTML('td', {}, new HTML('a', {href: '?%s'.format(key)}, "Wizard for %s".format(tlpname)));
            let title = new HTML('td', {}, new HTML('b', {}, tlpname));
            let cname = new HTML('td', {style: {color: ccolor}}, new HTML('b', {}, chair));
            tr.inject([title, cname, rd, link])
            tbl.inject(tr);
        }
    }
    if (!found) {
        let tr = new HTML('tr', {}, new HTML('td', {colspan: 4}, "It doesn't look like you are on any PMCs"));
        tbl.inject(tr);
    }
    html.inject(tbl);
    
}

function health_tips(data) {
    let txt = "";    
    // Mailing list changes
    for (var ml in data.delivery[project]) {
        let mldata = data.delivery[project][ml];
        let a = ml.split('-', 2);
        ml = "%s@%s.apache.org".format(a[1], a[0]);
        let pct_change =Math.floor( 100 * ( (mldata.quarterly[0] - mldata.quarterly[1]) / (mldata.quarterly[1]*1.0) ));
        let pct_change_txt = "%u%".format(Math.abs(pct_change));
        if (isNaN(pct_change) || !isFinite(pct_change)) {
            pct_change_txt = 'big';
        }
        if (pct_change > 25 && mldata.quarterly[0] > 5) {
            txt += "<li style='color: #080'>%s had a %s increase in traffic in the past quarter (%u emails compared to %u)</li>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }
        else if (pct_change < -25  && mldata.quarterly[1] > 5) {
            txt += "<li style='color: #800'>%s had a %s decrease in traffic in the past quarter (%u emails compared to %u)</li>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }
    }
    
    // Bugzilla changes
    let bz = data.bugzilla[project];
    if (bz[0] || bz[1]) txt += "<li>%u BugZilla tickets opened and %u closed in the past quarter.</li>".format(bz[0], bz[1]);
    
    // JIRA changes
    let jira = data.jira[project];
    if (jira[0] || jira[1]) txt += "<li>%u JIRA tickets opened and %u closed in the past quarter.</li>".format(jira[0], jira[1]);
    
    // Append header IF there is data, otherwise nah.
    if (txt.length > 0) txt = "<h5>Potentially useful observations on community health:</h5><ul>" + txt + "</ul>";
    return txt;
}

function activity_tips(data) {
    let three_months_ago = moment().subtract(3, 'months');
    let txt = "";
    
    // Releases
    let rtxt = "";
    for (var rel in data.releases[project]) {
        let reldate = moment(data.releases[project][rel] * 1000.0);
        if (reldate > three_months_ago) {
            rtxt += "<li>%s was released on %s.</li>".format(rel, reldate.format('YYYY-MM-DD'));
        }
    }
    if (rtxt != '') {
        rtxt = "<h6>Releases this quarter: </h6><ul>" + rtxt + "</ul><hr/>";
    }
    
    
    // Put it all together
    txt += rtxt;
    if (txt) txt = "<h5>Potentially useful data I found:</h5>" + txt
    return txt;
}


// Quick check for reflow needs
function should_reflow(txt, chars) {
  chars = chars || 80;
  let lines = txt.split(/[\r\n]+/g);
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].length > chars && lines[i].match(/\s/)) return true;
  }
  return false;
}

function reflow(txt, chars) {
  chars = chars || 80;
  let words = txt.match(/([\S+?]+\s*)/mg);
  if (!words) return txt;
  let x = 0;
  let output = "";
  for (var i = 0; i < words.length; i++) {
    let word = words[i];
    x += word.length;
    if (x > chars) {
        output += (x == 0 ? "" : "\n") + word;
        x = word.length;
    } else if (word.indexOf('\n') != -1) {
      x = word.length - word.indexOf('\n') - 1;
      output += word;
    } else {
      output += word;
    }
  }
  return output;
}

function get_charter(pdata) {
  let charter = pdata.pdata[project].charter;
  
  let txt = reflow(charter);
  return txt;
}

function compile_check(pdata, editor) {
  return editor.compile();
}