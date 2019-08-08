// some glopbal vars for now - we'll get them localized soon enough.
let pdata = {};
let cycles = {};
let meta_data = {};

function modal(txt, title = 'Notification') {
    document.getElementById('alert_text').innerHTML = txt;
    document.getElementById('modal-title').innerText = title;
    $("#alert").modal();
}

function prime_wizard(state, json) {
    // Adjust title(s)
    if (!json.pdata[project]) {
        modal("Could not find project data for %s!".format(project));
        return;
    }
    pdata = json;
    document.title = (statsonly ? "ASF Project Statistics: %s" : "ASF Board Report Wizard: %s").format(json.pdata[project].name);
    let titles = document.getElementsByClassName("title");
    for (var i in titles) {
        titles[i].innerText = document.title;
    }
    
    let xtitle = document.getElementById("pname");
    xtitle.innerText = document.title;
    if (statsonly) {
        GET("/reportingcycles.json", prime_cycles, {});
    } else {
        GET("/api/whimsy/agenda?%s".format(project), prime_meta, {})
    }
}

function prime_meta(state, json) {
    meta_data = json;
    if (state && state.noreset) return;
    GET("/reportingcycles.json", prime_cycles, {})
}

function prime_cycles(state, json) {
    cycles = json;
    GET("steps.json?" + Math.random(), prime_steps, {});
}


function prime_steps(state, json) {
    // Cancel spinner
    document.getElementById('wizard_spinner').style.display = 'none';
    document.getElementById('wrapper').style.display = 'block';
    
    if (!statsonly) {
        // Create editor and stepper class
        let editor = new UnifiedEditor('unified-report', json.steps);
        let stepper = new ReportStepper('unified-steps', editor, json.steps, 'unified-helper');
        editor.stepper = stepper;
        draft_stepper = stepper;
        stepper.pdata = pdata;
        stepper.build(0, true);
    }
    else {
        StatisticsPage(json.steps, pdata);
    }
    document.getElementById("pname").style.display = 'block';
}

