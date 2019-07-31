let pdata = {};
let report = [null,null,null,null,null,null];
let current_step = 0;
let cycles = {};

function prime_wizard(state, json) {
    // Adjust title(s)
    if (!json.pdata[project]) {
        alert("Could not find project data for %s!".format(project));
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
    GET("/reportingcycles.json", prime_cycles, {})
}

function prime_cycles(state, json) {
    cycles = json;
    GET("steps.json", prime_steps, {});
}


let step_json = {};
function prime_steps(state, json) {
    document.getElementById('wizard_spinner').style.display = 'none';
    document.getElementById('wrapper').style.display = 'block';
    step_json = json.steps;
    build_steps(0, true);
}

function build_steps(s, start) {
    s = s || 0;
    
    let text = document.getElementById('step_text');
    if (!start && text && text.value.length > 0 && current_step < 5) {
        report[current_step] = text.value;
    }
    if (!start && text && current_step > 0 && text.value.length == 0 && s > current_step) {
        alert("Please write some text in the input field before continuing to the next step!");
        return
    }
    
    // Check that ALL fields are filled before preview
    if (s == 5) {
        for (var i = 1; i < 5; i++) {
            let step = step_json[i];
            if (report[i] == null || report[i].length == 0) {
                alert("Please fill out the \"%s\" section before you preview the report!".format(step.description));
                return
            }
        }
    }
    text.innerText = '';
    current_step = s;
    
    let stepParent = document.getElementById('steps');
    stepParent.innerHTML = '';
    for (var i = 0; i < step_json.length; i++) {
        let element = step_json[i];
        let wrapper = new HTML('div', {class: 'wizard-step-wrapper', onclick: 'build_steps(%u);'.format(i)});
        let stepcircle = new HTML('div', {class: 'wizard-step'});
        let stepicon = new HTML('i', {class: 'fas fa-%s'.format(element.icon)});
        stepcircle.inject(stepicon);
        let steptext = new HTML('div', {class: 'wizard-step-text'}, element.description);
        wrapper.inject([stepcircle, steptext]);
        if (s == i) stepcircle.setAttribute('class', 'wizard-step active');
        if (i < s) stepcircle.setAttribute('class', 'wizard-step done');
        stepParent.inject(wrapper);
        if (i < step_json.length-1) {
            let line = new HTML('div', {class: 'wizard-line'});
            if (i < s) line.setAttribute('class', 'wizard-line done');
            stepParent.inject(line);
        }
        if (s == i) {
            let title = document.getElementById('step_title');
            title.innerText = element.description;
            let help = document.getElementById('step_help');
            help.innerHTML = element.help || "No helper information available for this step...";
            if (element.helpgenerator) {
                let data = eval("%s(pdata);".format(element.helpgenerator));
                help.innerHTML = data;
            }
            let text = document.getElementById('step_text');
            text.placeholder = element.placeholder || "";
            let hw = document.getElementById('help_wrapper');
            if (element.noinput) {
                text.style.display = 'none';
            }
            else text.style.display = 'inline';
            text.style.height = (395 - hw.scrollHeight) + "px";
            if (element.generator && !(report[s] && report[s].length > 0)) {
                let data = eval("%s(pdata);".format(element.generator));
                text.value = data;
            }
            else if (report[s]) {
                text.value = report[s];
            } else {
                text.value = '';
            }
            
            // tips??
            let tip = document.getElementById('tips');
            if (element.tipgenerator) {
                let data = eval("%s(pdata);".format(element.tipgenerator));
                if (data && data.length > 0) {
                    tip.innerHTML = data;
                    tip.style.display = 'block';
                }
            } else {
                tip.style.display = 'none';
            }
        }
    }
    
    let bp = document.getElementById('step_prev');
    if (s == 0) bp.style.display = 'none';
    else bp.style.display = 'block';
    
    let bn = document.getElementById('step_next');
    if (s == step_json.length -1) bn.style.display = 'none';
    else bn.style.display = 'block';
}


function compile_report() {
    let rep = "## Board Report for %s ##\n".format(pdata.pdata[project].name);
    for (var i = 1; i < 5; i++) {
        let step = step_json[i];
        rep += "\n## %s:\n".format(step.description);
        if (report[i] !== null) {
            rep += report[i].replace(/(\r?\n)+$/, '');
        } else {
            rep += "Nothing to note...\n";
        }
        rep += "\n";
    }
    return rep;
}

