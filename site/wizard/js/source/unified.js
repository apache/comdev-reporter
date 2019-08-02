
function hilite_sections(b) {
    if (highlighted && !b) return;
    highlighted = true;
    let hilites = [];
    
    
    hilites.push({highlight: /^## [^\r\n]+:/mg, className: 'blue' });
    hilites.push({highlight: PLACEHOLDER, className: 'none' });
    
    let x = $('#unified-report').selectionStart;
    let y = $('#unified-report').selectionEnd;
        
    if (b) {
        $('#unified-report').highlightWithinTextarea('destroy');
        hilites.push({
            highlight: b,
            className: 'green'
            });
    }
    
    
    $('#unified-report').highlightWithinTextarea({
            highlight: hilites
        });
    if (x == y) {
        $('#unified-report').selectionStart = x;
        $('#unified-report').selectionEnd = y;
        $('#unified-report').focus();
    }
}


let report_unified = "";
let report_changed = true;
let highlighted = false;

function find_section(e) {
    let tmp = document.getElementById('unified-report').value;
    report_changed = (report_unified == tmp) ? false : true;
    report_unified = tmp;
    let spos = $('#unified-report').prop("selectionStart");
    let helper = document.getElementById('unified-helper');
    
    // Hop to next newline, so marking the title will jump to the right section
    while (report_unified[spos] != "\n" && spos < report_unified.length) spos++;
    
    let tprec = report_unified.substr(0, spos);
    let at_step = -1;
    for (var i = 0; i < step_json.length; i++) {
        let step = step_json[i];
        let tline = "## %s:".format(step.rawname || step.description);
        if (tprec.indexOf(tline) != -1) {
            at_step = i;
        }
    }
    
    if (at_step != -1) {
        build_steps(at_step, false, true, e);
        
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

// Parses a unified report into sections
function parse_unified(quiet) {
    let sections = [];
    let sX = 0;
    let tmp = document.getElementById('unified-report').value;
    while (tmp.length > 0) {
      let nextheader = tmp.match(/^## ([^\r\n]+)\r?\n/m);
      if (nextheader) {
        if (!quiet) console.log("Found report header: %s".format(nextheader[0]))
        let title = nextheader[1];
        let spos = tmp.indexOf(nextheader[0]);
        if (spos != -1) {
          sX += spos + nextheader[0].length;
          sY = sX;
          tmp = tmp.substr(spos + nextheader[0].length);
          let epos = tmp.search(/^## [^\r\n]+/m);
          epos = (epos == -1) ? tmp.length : epos;
          let section = tmp.substr(0, epos);
          if (title.length > 2) {
            sections.push({
              title: title.replace(/:.*$/, ''),
              text: section,
              start: sX,
              end: sX + epos
            });
          }
          if (!quiet) console.log("Section contains:");
          if (!quiet) console.log(section)
          tmp = tmp.substr(epos);
        } else { break }
      } else {
        if (!quiet) console.log("No more report headers found.");
      }
      
    }
    return sections;
}


// Mark a section using the highlighter
function mark_section(title) {
    let sections = parse_unified(true);
    let foundit = false;
    for (var i = 0; i < sections.length; i++) {
        if (sections[i].title == title && sections[i].text.indexOf(PLACEHOLDER) == -1 && sections[i].text.length > 4) {
            //console.log("Marking entire %s section from %u to %u".format(title, sections[i].start, sections[i].end))
            hilite_sections(sections[i].text);
            foundit = true;
            break
        }
    }
    if (!foundit) {
        hilite_sections("<-- EXTERMINATE -->");
    }
}