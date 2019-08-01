
function hilite_sections() {
    if (highlighted) return;
    highlighted = true;
    let hilites = [
        {highlight: /^## [^\r\n]+:/mg, className: 'blue' },
        {highlight: PLACEHOLDER, className: 'none' }
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
    
    // Hop to next newline, so marking the title will jump to the right section
    while (report_unified[spos] != "\n" && spos < report_unified.length) spos++;
    
    let tprec = report_unified.substr(0, spos);
    let at_step = 0;
    for (var i = 1; i < step_json.length-1; i++) {
        let step = step_json[i];
        let tline = "## %s:".format(step.description);
        if (tprec.indexOf(tline) != -1) {
            at_step = i;
        }
    }
    
    if (at_step) {
        build_steps(at_step, false, true);
        
    } else {
        helper.innerText = "";
    }
}

function set_position(text) {
    let editor = document.getElementById('unified-report');
    let pos = editor.value.search(text);
    if (pos && pos > 0) {
        editor.selectionStart = (pos + text.length + 2);
        editor.selectionEnd = (pos + text.length + 2);
        editor.focus();
    }
}