
function hilite_sections() {
    if (highlighted) return;
    highlighted = true;
    let hilites = [
        {highlight: '[Insert your own data here]', className: 'none' }
                   ];
    let hcolors = ['blue', 'green', 'red', 'yellow'];
    for (var i = 1; i < step_json.length-1; i++) {
        let step = step_json[i];
        let tline = "## %s:".format(step.description);
        console.log(step.description);
        hilites.push({
            highlight: tline,
            className: hcolors[i%hcolors.length]
            });
        
    }
    $('#unified-report').highlightWithinTextarea({
        highlight: hilites
    });
}


let report_unified = "";
let report_changed = true;
let highlighted = false;

function find_section() {
    let tmp = document.getElementById('unified-report').value;
    report_changed = (report_unified == tmp) ? false : true;
    report_unified = tmp;
    let spos = $('#unified-report').prop("selectionStart");
    let helper = document.getElementById('unified-helper');
    
    let tprec = report_unified.substr(0, spos);
    let at_step = 0;
    for (var i = 1; i < step_json.length-1; i++) {
        let step = step_json[i];
        let tline = "## %s:".format(step.description);
        if (tprec.search(tline) != -1) {
            at_step = i;
        }
    }
    
    if (at_step) {
        build_steps(at_step);
        
    } else {
        helper.innerText = "";
    }
}