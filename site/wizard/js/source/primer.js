// some glopbal vars for now - we'll get them localized soon enough.
let pdata = {};
let cycles = {};
let comments = {};

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
    document.title = "ASF Board Report Wizard: %s".format(json.pdata[project].name);
    let titles = document.getElementsByClassName("title");
    for (var i in titles) {
        titles[i].innerText = document.title;
    }
    
    let xtitle = document.getElementById("pname");
    xtitle.innerText = document.title;
    GET("comments.py?project=%s".format(project), prime_comments, {})
}

function prime_comments(state, json) {
    comments = json;
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
    
    // Create editor and stepper class
    let editor = new UnifiedEditor('unified-report', json.steps);
    let stepper = new ReportStepper('unified-steps', editor, json.steps, 'unified-helper');
    editor.stepper = stepper;
    stepper.pdata = pdata;
    stepper.build(0, true);
    document.getElementById("pname").style.display = 'block';
}

