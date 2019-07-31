function generate_pmc_roster(data) {
    let no_com = data.count[project][1];
    let no_pmc = data.count[project][0];
    let txt = "There are currently %u committers and %u PMC members in this project.\n\n".format(no_com, no_pmc);
    
    // Last PMC addition
    let changes = data.changes[project].pmc;
    let now = moment();
    let three_months_ago = now.subtract(3, 'months');
    let no_added = 0;
    let last_added = null;
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
    let txt = "<b>Chair:</b> %s<br/>".format(data.pdata[project].chair);
    txt += getReportDate(cycles, project);
    return txt;
}


function splash(state, json) {
    let html = document.body;
    html.innerHTML = '';
    let tbl = new HTML('table');
    let hdr = new HTML('tr', {style: {color: "#963"}})
    hdr.inject([
        new HTML('td', {}, "Project:"),
        new HTML('td', {}, "Next report date:"),
        new HTML('td', {}, "Wizard link:")
    ])
    tbl.inject(hdr);
    
    for (var key in json) {
        let tr = new HTML('tr');
        let rd = new HTML('td', {}, getReportDate(json, key, true));
        let link = new HTML('td', {}, new HTML('a', {href: '?%s'.format(key)}, "Start reporting guide"));
        let title = new HTML('td', {}, new HTML('b', {}, key));
        tr.inject([title, rd, link])
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
        if (pct_change > 25 && mldata.quarterly[0] > 5) {
            txt += "<span style='color: #080'>- %s had a %u% increase in traffic in the past quarter (%u emails compared to %u)</span><br/>".format(ml, pct_change, mldata.quarterly[0], mldata.quarterly[1]);
        }
        else if (pct_change < -25  && mldata.quarterly[1] > 5) {
            pct_change = Math.abs(pct_change)
            txt += "<span style='color: #800'>- %s had a %u% decrease in traffic in the past quarter (%u emails compared to %u)</span><br/>".format(ml, pct_change, mldata.quarterly[0], mldata.quarterly[1]);
        }
    }
    
    // Bugzilla changes
    let bz = data.bugzilla[project];
    if (bz[0] || bz[1]) txt += "- %u BugZilla tickets opened and %u closed in the past quarter.".format(bz[0], bz[1]);
    
    // JIRA changes
    let jira = data.jira[project];
    if (jira[0] || jira[1]) txt += "- %u JIRA tickets opened and %u closed in the past quarter.".format(jira[0], jira[1]);
    
    // Append header IF there is data, otherwise nah.
    if (txt.length > 0) txt = "<h5>Potentially useful observations for your health metrics:</h5>" + txt;
    return txt;
}