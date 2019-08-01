let pdata = {};
let report = [null,null,null,null,null,null];
let current_step = 0;
let cycles = {};
let draft_mode = false;
let comments = {};

function modal(txt) {
    document.getElementById('alert_text').innerHTML = txt;
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
        if (s == i) {
            stepcircle.setAttribute('class', 'wizard-step active');
            steptext.setAttribute('class', 'wizard-step-text active');
        }
        if (i < s) {
            stepcircle.setAttribute('class', 'wizard-step done');
            steptext.setAttribute('class', 'wizard-step-text done');
        }
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
                let data = eval("%s(pdata, compile_okay);".format(element.generator));
                if (data === -1) text.style.display = 'none'; // hide if generator return -1
                else text.value = data;
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
                } else {
                    tip.style.display = 'none';
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
    
    if (editor_type == 'unified') {
        if (start) {
            let template = "";
            for (var i = 0; i < step_json.length; i++) {
                let step = step_json[i];
                if (!step.noinput) {
                    template += "## %s:\n".format(step.description);
                    if (step.generator) {
                        let data = eval("%s(pdata);".format(step.generator));
                        if (data && data.length > 0) template += data
                    } else {
                        template += "[Insert your own data here]";
                    }
                    template += "\n\n";
                }
            }
            document.getElementById('unified-report').value = template;
        }
        if (report_changed) hilite_sections();
        
        let step = step_json[s];
        let helper = document.getElementById('unified-helper');
        
        helper.innerHTML = "<h5>%s:</h5>".format(step.description);
        // Add in help
        if (step.helpgenerator) {
            let data = eval("%s(pdata);".format(step.helpgenerator));
            helper.innerHTML += data;
        } else if (step.help) {
            helper.innerHTML += step.help;
        }
        
        // Add tips?
        if (step.tipgenerator) {
            let data = eval("%s(pdata);".format(step.tipgenerator));
            helper.innerHTML += data;
        }
        
    }
    
}

