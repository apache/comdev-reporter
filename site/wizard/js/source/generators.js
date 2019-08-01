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


function generate_pmc_roster(data) {
    
    // PMC age
    let founded = moment(data.pmcdates[project].pmc[2] * 1000.0);
    let age = founded.fromNow();
    let txt = "%s was founded %s (%s)\n".format(data.pmcsummary[project].name, founded.format('YYYY-MM-DD'), age);
    
    // PMC and committer count
    let no_com = data.count[project][1];
    let no_pmc = data.count[project][0];
    
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
    
    while ((x1/x2) == Math.floor(x1/x2) && x2 > 1) {
        let k = (x1/x2)
        x1 /= k
        x2 /= k
    }
    
    txt += "There are currently %u committers and %u PMC members in this project.\nThe Committer-to-PMC ratio is %u:%u.\n\n".format(no_com, no_pmc, x1, x2);
    
    
    
    // Last PMC addition
    let changes = data.changes[project].pmc;
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
    changes = data.changes[project].committer;
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
    let founded = moment(data.pmcdates[project].pmc[2] * 1000.0);
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
          ntxt += cmt + "<hr/>";
        }
      }
      txt += "<hr/><h6>Last report comments from the board: </h6>";
      txt += "<b style='color: #369;'>%s:</b><br/><span style='white-space: wrap; font-size: 0.8rem;'>%s</span>".format(date, ntxt);
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
        let pct_change_txt = "%u%".format(pct_change);
        if (isNaN(pct_change) || !isFinite(pct_change)) {
            pct_change_txt = 'big';
        }
        if (pct_change > 25 && mldata.quarterly[0] > 5) {
            txt += "<span style='color: #080'>- %s had a %s increase in traffic in the past quarter (%u emails compared to %u)</span><br/>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }
        else if (pct_change < -25  && mldata.quarterly[1] > 5) {
            pct_change = Math.abs(pct_change)
            txt += "<span style='color: #800'>- %s had a %s decrease in traffic in the past quarter (%u emails compared to %u)</span><br/>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }
    }
    
    // Bugzilla changes
    let bz = data.bugzilla[project];
    if (bz[0] || bz[1]) txt += "- %u BugZilla tickets opened and %u closed in the past quarter.".format(bz[0], bz[1]);
    
    // JIRA changes
    let jira = data.jira[project];
    if (jira[0] || jira[1]) txt += "- %u JIRA tickets opened and %u closed in the past quarter.".format(jira[0], jira[1]);
    
    // Append header IF there is data, otherwise nah.
    if (txt.length > 0) txt = "<h5>Potentially useful observations for your community health section:</h5>" + txt;
    return txt;
}

let compile_okay = false;

function check_compile(data) {
    
    compile_okay = true;
    let text = "";
    if (editor_type == 'unified') {
      let required_sections = [];
      let sections = [];
      let tmp = document.getElementById('unified-report').value;
      while (tmp.length > 0) {
        let nextheader = tmp.match(/^## ([^\r\n]+)\r?\n/m);
        if (nextheader) {
          console.log("Found report header: %s".format(nextheader[0]))
          let title = nextheader[1];
          let spos = tmp.indexOf(nextheader[0]);
          if (spos != -1) {
            tmp = tmp.substr(spos + nextheader[0].length);
            let epos = tmp.search(/^## [^\r\n]+/m);
            epos = (epos == -1) ? tmp.length : epos;
            let section = tmp.substr(0, epos);
            if (title.length > 2) {
              sections.push({
                title: title.replace(/:.*$/, ''),
                text: section
              });
            }
            console.log("Section contains:");
            console.log(section)
            tmp = tmp.substr(epos);
          } else { break }
        } else {
          console.log("No more report headers found.");
        }
        
      }
      
      for (var i = 0; i < step_json.length; i++) {
        let step = step_json[i];
        if (!step.noinput) {
          let found = false;
          required_sections.push(step.description);
          for (var n = 0; n < sections.length; n++) {
            if (sections[n].title == step.description) {
              found = true;
              if (sections[n].text.indexOf(PLACEHOLDER) != -1) {
                console.log("Found placeholder text: " + PLACEHOLDER)
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: red;'>&#xF7;</span> <kbd>%s</kbd> contains placeholder text!</li>".format(step.description);
                compile_okay = false;
              } else if (sections[n].text.length < 20) {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: pink;'>&#8253;</span> <kbd>%s</kbd> seems a tad short?</li>".format(step.description);
              } else {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: green;'>&#x2713;</span> <kbd>%s</kbd> seems alright</li>".format(step.description);
                
              }
              break;
            }
          }
          if (!found) {
            compile_okay = false;
            text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: red;'>&#xF7;</span> <kbd>%s</kbd> is missing from the report!</li>".format(step.description);
          }
        }
        
      }
      
      // Remark on additional sections not required
      for (var n = 0; n < sections.length; n++) {
          if (!required_sections.has(sections[n].title)) {
            text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: pink;'>&#8253;</span> Found unknown section <kbd>%s</kbd></li>".format(sections[n].title);
          }
      }
      
      
    }
    else {
      for (var i = 1; i < 5; i++) {
          if (report[i] == null || report[i].length == 0) {
              text += "<li>You have not filled out the <kbd>%s</kbd> section yet.".format(step_json[i].description);
              compile_okay = false;
          }
      }
    }
    
    if (text.length > 0) {
        text = "<h5>Report review results:</h5>The following remarks were logged by the report compiler:<br/><ul>" + text + "</ul>";
    }
    if (!compile_okay) {
      text += "Your report could possibly use some more work, and that's okay! You can always save your current report as a draft and return later to work more on it. Drafts are saved for up to two months.";
    }
    else {
        text += "That's it, your board report compiled a-okay and is potentially ready for submission! If you'd like more time to work on it, you can save it as a draft, and return later to make some final edits. Or you can publish it to the agenda via Whimsy.";
    }
    text += "<br/><button class='btn btn-warning' onclick='save_draft();'>Save as draft</button>"
    if (compile_okay) text += " &nbsp; &nbsp; <button class='btn btn-success'>Publish via Whimsy</button>"
    return text;
}


function compile_report(data, okay, force) {
    if (!okay && !force) return -1
    if (editor_type == 'unified') {
      return document.getElementById('unified-report').value;
    }
    let rep = "## Board Report for %s ##\n".format(pdata.pdata[project].name);
    for (var i = 1; i < 5; i++) {
        let step = step_json[i];
        rep += "\n## %s:\n".format(step.description);
        if (report[i] !== null) {
            rep += report[i].replace(/(\r?\n)+$/, '');
        } else {
            rep += "Nothing entered yet...\n";
        }
        rep += "\n";
    }
    return rep;
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
        rtxt = "<h6>Releases this quarter: </h6><ul>" + rtxt + "</ul>";
    }
    
    
    // Put it all together
    txt += rtxt;
    if (txt) txt = "<h5>Potentially useful data I found:</h5>" + txt
    return txt;
}

