function statistics_roster(pdata) {
    // PMC age
    let founded = moment((pdata.pmcdates[project].pmc[2] || pdata.pmcdates[project].pmc[1]) * 1000.0);
    let age = founded.fromNow();

    // PMC and committer count
    let no_com = pdata.count[project][1];
    let no_pmc = pdata.count[project][0];

    let y1 = no_com;
    let y2 = no_pmc;
    let cpr = "";

    // See if we can get a clean ratio
    let k = gcd(y1, y2);
    y1 /= k;
    y2 /= k;
    if (y1 < 10 && y2 < 10) cpr = "%u:%u".format(y1, y2);

    // Nope, let's rough it up a bit.
    else {
        // While >= 10 committers, halven both committers and pmc
        // to get a simpler number to "mathify".
        while (y1 >= 10) {
            y1 = Math.round(y1 / 2)
            y2 = Math.round(y2 / 2);
        }
        // round up/down
        y1 = Math.round(y1);
        y2 = Math.round(y2);

        // find greatest common divisor and make the final fraction
        let k = gcd(y1, y2);
        y1 /= k;
        y2 /= k;
        cpr = "roughly %u:%u".format(y1, y2);
    }

    let txt = "<h4>Project Composition:</h4>";
    txt += "<ul><li>There are currently %u committers and %u PMC members in this project.</li><li>The Committer-to-PMC ratio is %s.</li></ul>".format(no_com, no_pmc, cpr);



    // Last PMC addition
    let changes = pdata.pmcdates[project].roster;
    let now = moment();
    let three_months_ago = now.subtract(3, 'months');
    let no_added = 0;
    let last_added = null;
    txt += "<h5>Community changes, past quarter:</h5><ul>";
    for (var availid in changes) {
        let change = changes[availid];
        let name = change[0];
        let added = moment(change[1] * 1000.0);
        if (!last_added || last_added[1] < change[1]) {
            last_added = change;
        }
        if (added.isAfter(three_months_ago) && added.format('YYYY-MM-DD') != founded.format('YYYY-MM-DD')) {
            no_added++;
            txt += "<li>%s was added to the PMC on %s</li>".format(name, added.format('YYYY-MM-DD'));
        }
    }

    if (!no_added) {
        if (founded.isAfter(three_months_ago)) {
            txt += "<li>-No new PMC members (project graduated recently).</li>";
        } else if (last_added) {
            txt += "<li>No new PMC members. Last addition was %s on %s.</li>".format(last_added[0], moment(last_added[1] * 1000.0).format('YYYY-MM-DD'));
        } else {
            txt += "<li>No new PMC members were added.</li>";
        }
    }


    // Last Committer addition
    changes = pdata.changes[project].committer;
    now = moment();
    three_months_ago = now.subtract(3, 'months');
    no_added = 0;
    last_added = null;
    for (var availid in changes) {
        let change = changes[availid];
        let name = change[0];
        let added = moment(change[1] * 1000.0);
        if (!last_added || last_added[1] < change[1]) {
            last_added = change;
        }
        if (added.isAfter(three_months_ago)) {
            no_added++;
            txt += "<li>%s was added as committer on %s</li>".format(name, added.format('YYYY-MM-DD'));
        }
    }

    if (!no_added) {
        if (last_added) {
            txt += "<li>No new committers. Last addition was %s on %s.</li>".format(last_added[0], moment(last_added[1] * 1000.0).format('YYYY-MM-DD'));
        } else {
            txt += "<li>No new committers were added.</li>";
        }
    }
    txt += "</ul>";
    return txt;
}

function statistics_meta(data) {
    let chi = (6.33 + (data.health[project].score * -1.00 * (20 / 12.25))).toFixed(2);
    let cscore = data.health[project].cscore;
    let hcolors = ["#000070", "#007000", "#407000", "#70500", "#700000", "#A00000"]
	let hvalues = ["Super Healthy", "Healthy", "Mostly Okay", "Unhealthy", "Action required!", "URGENT ACTION REQUIRED!"]
    let txt = "<h4>Base Data:</h4>";
    let founded = moment((data.pmcdates[project].pmc[2] || data.pmcdates[project].pmc[1]) * 1000.0);
    let age = founded.fromNow();
    txt += "<b>Founded: </b>%s (%s)<br/>".format(founded.format('YYYY-MM-DD'), age);
    txt += "<b>Chair: </b> %s<br/>".format(data.pdata[project].chair);
    txt += getReportDate(cycles, project) + "<br/>";
    txt += "<b>Community Health Score (Chi): <a href='/chi.py#%s'><span style='color: %s !important;'>%s (%s)</span></a><br/>".format(project, hcolors[cscore], chi, hvalues[cscore]);

    return txt;
}


function statistics_health(data) {
    let html = new HTML('div', {
        style: {
            position: 'relative',
            clear: 'both'
        }
    });
    html.inject(new HTML('h4', {}, "Community Health Metrics:"))
    document.body.inject(html);
    let txt = "<h5>Notable mailing list trends:</h5>";
    // Mailing list changes
    for (var ml in data.delivery[project]) {

        let xhtml = new HTML('div', {
            style: {
                position: 'relative',
                clear: 'both'
            }
        });
        let mldata = data.delivery[project][ml];
        let a = ml.split('-', 2);
        ml = "%s@%s.apache.org".format(a[1], a[0]);
        if (a[1].match(/commits|cvs|announce/)) { // we already count commits, so...
            continue;
        }
        txt = "";
        let pct_change = Math.floor(100 * ((mldata.quarterly[0] - mldata.quarterly[1]) / (mldata.quarterly[1] * 1.0)));
        let pct_change_txt = "%u%".format(Math.abs(pct_change));
        if (isNaN(pct_change) || !isFinite(pct_change)) {
            pct_change_txt = 'big';
        }
        if (pct_change > 25 && mldata.quarterly[0] > 5) {
            txt += "<h6 style='color: #080'>%s had a %s increase in traffic in the past quarter (%u emails compared to %u):</h6>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        } else if (pct_change < -25 && mldata.quarterly[1] > 5) {
            txt += "<h6 style='color: #800'>%s had a %s decrease in traffic in the past quarter (%u emails compared to %u):</h6>".format(ml, pct_change_txt, mldata.quarterly[0], mldata.quarterly[1]);
        }

        xhtml.innerHTML = txt;
        html.inject(xhtml);

        if (txt.length > 0) {
            let cols = [
                ['x'],
                ['%s@'.format(a[1])]
            ];
            for (var i = 0; i < 24; i++) {
                let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(4);
                cols[0].push(date);
                cols[1].push(mldata.weekly[date.unix()] || 0);
            }
            let cutoff = moment.utc().subtract(12, 'weeks').startOf('week').weekday(4);
            let chartdiv = new HTML('div', {
                style: {
                    clear: 'both',
                    width: '620px',
                    height: '220px',
                    position: 'relative',
                    background: '#FFF',
                    borderRadius: '5px',
                    border: '0.75px solid #333'
                }
            });
            xhtml.inject(chartdiv);
            let chart = c3.generate({
                bindto: chartdiv,
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            count: 12,
                            format: (x) => {
                                return moment(x).format('MMM D, YYYY');
                            }
                        }
                    }
                },
                data: {
                    x: 'x',
                    type: 'bar',
                    columns: cols,
                    color: (color, d) => {
                        return d.index < 12 ? '#9639' : (pct_change < 0 ? '#900' : '#090');
                    }
                },
                bar: {
                    width: {
                        ratio: 0.35
                    }
                },
                tooltip: {
                    format: {
                        value: (x) => '%u emails'.format(x),
                        title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
                    }
                }
            });
            xhtml.inject(new HTML('br'))
        }

    }

    txt = "";
    // Bugzilla changes
    let bz = data.bugzilla[project];
    if (bz[0] || bz[1]) txt += "<li>%u BugZilla tickets opened and %u closed in the past quarter.</li>".format(bz[0], bz[1]);

    // JIRA changes
    if (data.kibble.jira) {
        let xhtml = new HTML('div', {
            style: {
                position: 'relative',
                clear: 'both'
            }
        });
        let txt = "<h5>JIRA activity:</h5>";
        // Opened tickets
        let color = 'black';
        let ctxt = data.kibble.jira.change.opened;
        let pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        let s = data.kibble.jira.after.opened == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.jira.after.opened == 0)) {
            txt += "<h6 style='color: %s;'>%u issue%s opened in JIRA, past quarter (%s)</hi>".format(color, data.kibble.jira.after.opened, s, ctxt);
        }
        
        // Closed tickets
        color = 'black';
        ctxt = data.kibble.jira.change.closed;
        pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        s = data.kibble.jira.after.closed == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.jira.after.closed == 0)) {
            txt += "<h6 style='color: %s;'>%u issue%s closed in JIRA, past quarter (%s)</h6>".format(color, data.kibble.jira.after.closed, s, ctxt);
        }

        xhtml.innerHTML = txt;
        html.inject(xhtml);
        if (data.kibble.timeseries.jira && data.kibble.timeseries.jira.length > 0) {

            let cols = [
                ['x'],
                ['Tickets opened'],
                ['Tickets closed']
            ];
            for (var i = 0; i < 24; i++) {
                let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(1);
                let c = 0;
                let o = 0;
                for (var n = 0; n < data.kibble.timeseries.jira.length; n++) {
                    let el = data.kibble.timeseries.jira[n];
                    if (el.date == date.unix()) {
                        c = el['issues closed']
                        o = el['issues opened']
                    }
                }
                cols[0].push(date);
                cols[1].push(c);
                cols[2].push(o);
            }
            let cutoff = moment.utc().subtract(12, 'weeks').startOf('week').weekday(4);
            let chartdiv = new HTML('div', {
                style: {
                    clear: 'both',
                    width: '620px',
                    height: '220px',
                    position: 'relative',
                    background: '#FFF',
                    borderRadius: '5px',
                    border: '0.75px solid #333'
                }
            });
            xhtml.inject(chartdiv);
            let chart = c3.generate({
                bindto: chartdiv,
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            count: 12,
                            format: (x) => {
                                return moment(x).format('MMM D, YYYY');
                            }
                        }
                    }
                },
                data: {
                    x: 'x',
                    type: 'bar',
                    columns: cols,
                    color: (color, d) => {
                        return (d.index < 12 ? color + '44': color +'FF');
                    }
                },
                bar: {
                    width: {
                        ratio: 0.25
                    }
                },
                tooltip: {
                    format: {
                        title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
                    }
                }
            });
            xhtml.inject(new HTML('br'));
        }
        html.inject(new HTML('hr'));
        
    }

    // Commits and contributors
    if (data.kibble.commits) {
        let xhtml = new HTML('div', {
            style: {
                position: 'relative',
                clear: 'both'
            }
        });
        html.inject(xhtml);
        let txt = "<h5>Commit activity:</h5>"
        let color = 'black';
        let ctxt = data.kibble.commits.change.commits
        let pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        let s = data.kibble.commits.after.commits == 1 ? '' : 's';
        txt += "<h6 style='color: %s;'>%u commit%s in the past quarter (%s)</h6>".format(color, data.kibble.commits.after.commits, s, ctxt);
        
        // committers
        color = 'black';
        ctxt = data.kibble.commits.change.authors;
        pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        s = data.kibble.commits.after.authors == 1 ? '' : 's';
        txt += "<h6 style='color: %s;'>%u code contributor%s in the past quarter (%s)</h6>".format(color, data.kibble.commits.after.authors, s, ctxt);
        
        xhtml.innerHTML = txt;
        html.inject(xhtml);
        if (data.kibble.timeseries.commits && data.kibble.timeseries.commits.length > 0) {

            let cols = [
                ['x'],
                ['Commits']
            ];
            for (var i = 0; i < 24; i++) {
                let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(1);
                let c = 0;
                for (var n = 0; n < data.kibble.timeseries.commits.length; n++) {
                    let el = data.kibble.timeseries.commits[n];
                    if (el.date == date.unix()) {
                        c = el['commits']
                    }
                }
                cols[0].push(date);
                cols[1].push(c);
            }
            let cutoff = moment.utc().subtract(12, 'weeks').startOf('week').weekday(4);
            let chartdiv = new HTML('div', {
                style: {
                    clear: 'both',
                    width: '620px',
                    height: '220px',
                    position: 'relative',
                    background: '#FFF',
                    borderRadius: '5px',
                    border: '0.75px solid #333'
                }
            });
            xhtml.inject(chartdiv);
            let chart = c3.generate({
                bindto: chartdiv,
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            count: 12,
                            format: (x) => {
                                return moment(x).format('MMM D, YYYY');
                            }
                        }
                    }
                },
                data: {
                    x: 'x',
                    type: 'bar',
                    columns: cols,
                    color: (color, d) => {
                        return (d.index < 12 ? color + '44': color +'FF');
                    }
                },
                bar: {
                    width: {
                        ratio: 0.25
                    }
                },
                tooltip: {
                    format: {
                        title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
                    }
                }
            });
            xhtml.inject(new HTML('br'))
        }
        html.inject(new HTML('hr'));
        
    }
    

    // GitHub: PRs
    if (data.kibble && data.kibble.prs) {
        
        let xhtml = new HTML('div', {
            style: {
                position: 'relative',
                clear: 'both'
            }
        });
        html.inject(xhtml);
        let txt = "<h5>GitHub activity:</h5>";
        
        let color = 'black';
        let ctxt = data.kibble.prs.change.opened
        let pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        let s = data.kibble.prs.after.opened == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.prs.after.opened == 0)) {
            txt += "<h6 style='color: %s;'>%u PR%s opened on GitHub, past quarter (%s)</h6>".format(color, data.kibble.prs.after.opened, s, ctxt);
        }
        
        
        color = 'black';
        ctxt = data.kibble.prs.change.closed;
        pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        s = data.kibble.prs.after.closed == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.prs.after.closed == 0)) {
            txt += "<h6 style='color: %s;'>%u PR%s closed on GitHub, past quarter (%s)</h6>".format(color, data.kibble.prs.after.closed, s, ctxt);
        }
        
        
        xhtml.innerHTML = txt;
        html.inject(xhtml);
        if (data.kibble.timeseries.github && data.kibble.timeseries.github.length > 0) {

            let cols = [
                ['x'],
                ['PRs opened'],
                ['PRs closed']
            ];
            for (var i = 0; i < 24; i++) {
                let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(1);
                let c = 0;
                let o = 0;
                for (var n = 0; n < data.kibble.timeseries.github.length; n++) {
                    let el = data.kibble.timeseries.github[n];
                    if (el.date == date.unix()) {
                        c = el['pull requests closed']
                        o = el['pull requests opened']
                    }
                }
                cols[0].push(date);
                cols[1].push(c);
                cols[2].push(o);
            }
            let cutoff = moment.utc().subtract(12, 'weeks').startOf('week').weekday(4);
            let chartdiv = new HTML('div', {
                style: {
                    clear: 'both',
                    width: '620px',
                    height: '220px',
                    position: 'relative',
                    background: '#FFF',
                    borderRadius: '5px',
                    border: '0.75px solid #333'
                }
            });
            xhtml.inject(chartdiv);
            let chart = c3.generate({
                bindto: chartdiv,
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            count: 12,
                            format: (x) => {
                                return moment(x).format('MMM D, YYYY');
                            }
                        }
                    }
                },
                data: {
                    x: 'x',
                    type: 'bar',
                    columns: cols,
                    colors: {
                        'PRs opened': '#008800',
                        'PRs closed': '#993322'
                    },
                    color: (color, d) => {
                        return (d.index < 12 ? color + '44': color +'FF');
                    }
                },
                bar: {
                    width: {
                        ratio: 0.25
                    }
                },
                tooltip: {
                    format: {
                        title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
                    }
                }
            });
            xhtml.inject(new HTML('br'));
        }
        html.inject(new HTML('hr'));
        
    }

    
    // GitHub: issues
    if (data.kibble && data.kibble.issues) {
        
        let xhtml = new HTML('div', {
            style: {
                position: 'relative',
                clear: 'both'
            }
        });
        html.inject(xhtml);
        let txt = "<h5>GitHub issues:</h5>";
        
        let color = 'black';
        let ctxt = data.kibble.issues.change.opened;
        let pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        let s = data.kibble.issues.after.opened == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.issues.after.opened == 0)) {
            txt += "<h6 style='color: %s;'>%u issue%s opened on GitHub, past quarter (%s)</h6>".format(color, data.kibble.issues.after.opened, s, ctxt);
        }
        
        
        color = 'black';
        ctxt = data.kibble.issues.change.closed;
        pct = parseInt(ctxt);
        if (pct > 0) {
            if (pct > 10) color = 'green';
            ctxt += ' increase';
        } else if (pct < 0) {
            if (pct < -10) color = 'maroon';
            ctxt += ' decrease';
        } else {
            ctxt = 'no change';
        }
        s = data.kibble.issues.after.closed == 1 ? '' : 's';
        if (!(ctxt == 'no change' && data.kibble.issues.after.closed == 0)) {
            txt += "<h6 style='color: %s;'>%u issue%s closed on GitHub, past quarter (%s)</h6>".format(color, data.kibble.issues.after.closed, s, ctxt);
        }
        
        
        xhtml.innerHTML = txt;
        html.inject(xhtml);
        if (data.kibble.timeseries.github && data.kibble.timeseries.github.length > 0) {

            let cols = [
                ['x'],
                ['issues opened'],
                ['issues closed']
            ];
            for (var i = 0; i < 24; i++) {
                let date = moment.utc().subtract(i, 'weeks').startOf('week').weekday(1);
                let c = 0;
                let o = 0;
                for (var n = 0; n < data.kibble.timeseries.github.length; n++) {
                    let el = data.kibble.timeseries.github[n];
                    if (el.date == date.unix()) {
                        c = el['issues closed']
                        o = el['issues opened']
                    }
                }
                cols[0].push(date);
                cols[1].push(c);
                cols[2].push(o);
            }
            let cutoff = moment.utc().subtract(12, 'weeks').startOf('week').weekday(4);
            let chartdiv = new HTML('div', {
                style: {
                    clear: 'both',
                    width: '620px',
                    height: '220px',
                    position: 'relative',
                    background: '#FFF',
                    borderRadius: '5px',
                    border: '0.75px solid #333'
                }
            });
            xhtml.inject(chartdiv);
            let chart = c3.generate({
                bindto: chartdiv,
                axis: {
                    x: {
                        type: 'timeseries',
                        tick: {
                            count: 12,
                            format: (x) => {
                                return moment(x).format('MMM D, YYYY');
                            }
                        }
                    }
                },
                data: {
                    x: 'x',
                    type: 'bar',
                    columns: cols,
                    colors: {
                        'issues opened': '#008800',
                        'issues closed': '#993322'
                    },
                    color: (color, d) => {
                        return (d.index < 12 ? color + '44': color +'FF');
                    }
                },
                bar: {
                    width: {
                        ratio: 0.25
                    }
                },
                tooltip: {
                    format: {
                        title: (x) => 'Week %s'.format(moment(x).format('W, YYYY'))
                    }
                }
            });
            xhtml.inject(new HTML('br'));
        }
        html.inject(new HTML('hr'));
        
    }


    // Busiest topics
    if (data.kibble) {
        let txt = "";
        let showit = false;
        if (data.kibble.busiest.email.length > 0) {
            txt += "<h5>Busiest email threads:</h5>";
            showit = true;
            let ul = new HTML('ul');
            let arr = data.kibble.busiest.email;
            for (var i = 0; i < arr.length; i++) {
                let ml = arr[i].source.split('?')[1];
                let li = new HTML('li', {}, [
                    new HTML("kbd", {}, ml),
                    new HTML('i', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, arr[i].name),
                    new HTML('span', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, "(%u emails)".format(arr[i].count))
                ]);
                ul.inject(li);
            }
            txt += ul.outerHTML;
            
        }


        if (data.kibble.busiest.github.length > 0) {
            showit = true;
            txt += "<h5>Busiest GitHub issues/PRs:</h5>";
            let ul = new HTML('ul');
            let arr = data.kibble.busiest.github;
            for (var i = 0; i < arr.length; i++) {
                let li = new HTML('li', {}, [
                    new HTML("a", {
                        href: arr[i].url
                    }, arr[i].url.replace('https://github.com/apache/', '')),
                    new HTML('i', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, arr[i].subject),
                    new HTML('span', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, "(%u comments)".format(arr[i].count))
                ]);
                ul.inject(li);
            }
            txt += ul.outerHTML;
            
        }

        if (data.kibble.busiest.jira.length > 0) {
            showit = true;
            txt += "<h5>Busiest JIRA tickets:</h5>";
            let ul = new HTML('ul');
            let arr = data.kibble.busiest.jira;
            for (var i = 0; i < arr.length; i++) {
                let li = new HTML('li', {}, [
                    new HTML("a", {
                        href: arr[i].url
                    }, arr[i].key),
                    new HTML('i', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, arr[i].subject),
                    new HTML('span', {
                        style: {
                            display: 'inline-block',
                            textIndent: '10px'
                        }
                    }, "(%u comments)".format(arr[i].count))
                ]);
                ul.inject(li);
            }
            txt += ul.outerHTML;
            
        }

        if (txt.length > 0) {
            let twrap = new HTML('div');
            twrap.innerHTML = txt;
            html.inject(twrap);
        }
    }
    
    headers = $(html).find("h5");
    let toc = "<ul>";
    for (var i = 0; i < headers.length; i++) {
        let t = headers[i].innerText.replace(/:.*$/, '');
        let id = t.replace(/\s+/g, '').toLowerCase();
        headers[i].setAttribute('id', id);
        toc += "<li><a href='#%s'>%s</a></li>".format(id, t);
    }
    toc += "</ul>";
    let twrap = new HTML('div');
    twrap.innerHTML = toc;
    html.insertBefore(twrap, html.childNodes[1]);
    
    return html;

   
}

function statistics_releases(data) {
    let three_months_ago = moment().subtract(3, 'months');
    let txt = "";

    // Releases
    let rtxt = "";
    let new_releases = 0;
    let ages = [];
    for (var rel in data.releases[project]) {
        let reldate = moment(data.releases[project][rel] * 1000.0);
        if (reldate > three_months_ago) {
            new_releases++;
        }
        ages.push(reldate.unix());
    }
    ages.sort().reverse();
    ages = ages.splice(0, new_releases >= 3 ? new_releases : 3);
    let to_show = ages.length;
    let releases_shown = 0;
    while (ages.length) {
        let ts = ages.shift();
        for (var rel in data.releases[project]) {
            if (releases_shown == to_show) break;
            let reldate = moment(data.releases[project][rel] * 1000.0);
            if (ts == reldate.unix()) {
                rtxt += "<li>%s was released on %s.</li>".format(rel, reldate.format('YYYY-MM-DD'));
                releases_shown++;
            }
        }
    }
    if (rtxt != '') {
        rtxt = "<h6>Recent releases: </h6><ul>" + rtxt + "</ul>";
        rtxt += new HTML('a', {
            target: '_blank',
            href: 'https://reporter.apache.org/addrelease.html?%s'.format(project)
        }, 'Manage release data').outerHTML;
    }


    // Put it all together
    txt += rtxt;
    if (txt) txt = "<h4>Project Release Activity:</h4>" + txt
    return txt;
}