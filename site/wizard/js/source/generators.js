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