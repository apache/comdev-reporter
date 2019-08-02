
// Function that highlights headers and optional sectin in a unified editor
function UnifiedEditor_highlight_sections(additional_text) {
    // Don't highlight unless we haven't before or new text is noted
    if (this.have_highligted && !additional_text) return;
    
    // Set which sections  highlight
    let hilites = [];
      // Headers are blue
    hilites.push({highlight: /^## [^\r\n]+:/mg, className: 'blue' });
      // Placeholders are grey with red border
    hilites.push({highlight: PLACEHOLDER, className: 'none' });
    
    // Capture text cursor position(s) before we continue.
    let x = $('#unified-report').prop('selectionStart');
    let y = $('#unified-report').prop('selectionEnd');
    let sx = this.object.scrollX, sy = this.object.scrollY;
    
    // If additional text is marked for highlighting, we'll have to
    // first destroy any original highlighting, as it's params changed!
    if (additional_text) {
        $('#unified-report').highlightWithinTextarea('destroy');
        
        // Sections are marked light green
        hilites.push({
            highlight: additional_text,
            className: 'green'
            });
    }
    
    // Run the highlighter on ourselves
    $(this.object).highlightWithinTextarea({
            highlight: hilites
        });
    
    // If x == y (cursor is present and not marking characters),
    // We'll force focus on ourselves as highlighting loses it.
    if (x == y || true) {
        $(this.object).prop( {
            'selectionStart': x,
            'selectionEnd': y}
            );
        $(this.object).focus();
    }
}



// Function for figuring out WHERE we are in our report, cursor-wise
function UnifiedEditor_find_section(e) {
    let tmp = this.object.value;
    this.changed = (this.report == tmp) ? false : true;
    this.report = tmp;
    let spos = this.object.selectionStart;
    
    // Hop to next newline, so marking the title will jump to the right section
    while (this.report[spos] != "\n" && spos < this.report.length) spos++;
    
    let tprec = this.report.substr(0, spos);
    let at_step = -1;
    for (var i = 0; i < this.layout.length; i++) {
        let step = this.layout[i];
        let tline = "## %s:".format(step.rawname || step.description);
        if (tprec.indexOf(tline) != -1) {
            at_step = i;
        }
    }
    
    if (at_step != -1 && this.stepper) {
        this.stepper.build(at_step, false, true, e);
    } 
}


// Quick shortcut to focusing somewhere in the report
function UnifiedEditor_set_position(text) {
    let pos = this.object.value.indexOf(text);
    if (pos != -1) {
        this.object.selectionStart = (pos + text.length + 2);
        this.object.selectionEnd = (pos + text.length + 2);
        this.object.focus();
    }
}

// Parses a unified report into sections
function UnifiedEditor_parse_report(quiet) {
    this.sections = []; // Reset sections
    let sX = 0; // sX is our moving cursor in the text as we parse.
    let tmp = this.object.value; // get our textarea data
    while (tmp.length > 0) {
      // Look for the next "## Foo Bar:" line
      let nextheader = tmp.match(/^## ([^\r\n]+)\r?\n/m);
      if (nextheader) {
        if (!quiet) console.log("Found report header: %s".format(nextheader[0]));
        let title = nextheader[1];
        let spos = tmp.indexOf(nextheader[0]);
        if (spos != -1) {
          sX += spos + nextheader[0].length; // move cursor
          sY = sX;
          // ourr buffer past this header, find another one further down
          tmp = tmp.substr(spos + nextheader[0].length);
          let epos = tmp.search(/^## [^\r\n]+/m);
          // if no further headers, use end of buffer as end pos.
          epos = (epos == -1) ? tmp.length : epos;
          let section = tmp.substr(0, epos);
          // We got something(?), push to sections array.
          if (title.length > 2) {
            this.sections.push({
              title: title.replace(/:.*$/, ''), // crop away colon and any spaces following
              text: section,
              start: sX,
              end: sX + epos
            });
          }
          if (!quiet) console.log("Section contains:");
          if (!quiet) console.log(section);
          tmp = tmp.substr(epos);
        } else { break; }
      } else {
        if (!quiet) console.log("No more report headers found.");
        break
      }
      
    }
}


// Mark a section using the highlighter.
function UnifiedEditor_mark_section(title) {
    this.parse(true);
    let foundit = false;
    for (var i = 0; i < this.sections.length; i++) {
        let section = this.sections[i];
        if (section.title == title && section.text.indexOf(PLACEHOLDER) == -1 && section.text.length > 4) {
            //console.log("Marking entire %s section from %u to %u".format(title, sections[i].start, sections[i].end))
            this.highlight(section.text);
            foundit = true;
            break;
        }
    }
    // If we don't know what to highlight, "reset" by highlighting a
    // piece of text that doesn't exist. HACK HACK HACK.
    if (!foundit) {
        this.highlight("<-- EXTERMINATE -->");
    }
}


// Function for resetting a report to follow layout
function UnifiedEditor_reset() {
    this.report = "";
    this.changed = true;
    for (var i = 0; i < this.layout.length; i++) {
        let step = this.layout[i];
        if (!step.noinput || step.rawname) {
            this.report += "## %s:\n".format(step.rawname || step.description);
            if (step.generator) {
                let f = Function('a', "return %s(a);".format(step.generator));
                data = f(this.stepper.pdata)
                if (data && data.length > 0) this.report += data
            } else {
                this.report += PLACEHOLDER;
            }
            this.report += "\n\n";
        }
    }
    this.object.value = this.report;
    this.sections = [];
}

// Function for compiling (validating) a report
function UnifiedEditor_compile() {
    this.compiles = true;
    let text = "";
      let required_sections = [];
      this.parse();
      for (var i = 0; i < this.layout.length; i++) {
        let step = this.layout[i];
        if (!step.noinput) {
          let found = false;
          required_sections.push(step.rawname||step.description);
          for (var n = 0; n < this.sections.length; n++) {
            if (this.sections[n].title == (step.rawname||step.description)) {
              found = true;
              if (this.sections[n].text.indexOf(PLACEHOLDER) != -1) {
                console.log("Found placeholder text: " + PLACEHOLDER)
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: red;'>&#xF7;</span> <kbd>%s</kbd> contains placeholder text!</li>".format(this.sections[n].title);
                this.compiles = false;
              } else if (this.sections[n].text.length < 20) {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: pink;'>&#8253;</span> <kbd>%s</kbd> seems a tad short?</li>".format(this.sections[n].title);
              } else {
                text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: green;'>&#x2713;</span> <kbd>%s</kbd> seems alright</li>".format(this.sections[n].title);
                
              }
              break;
            }
          }
          if (!found) {
            this.compiles = false;
            text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: red;'>&#xF7;</span> <kbd>%s</kbd> is missing from the report!</li>".format(step.description);
          }
        }
        
      }
      
      // Remark on additional sections not required
      for (var n = 0; n < this.sections.length; n++) {
          if (!required_sections.has(this.sections[n].title)) {
            text += "<li><span style='display: inline-block; width: 20px; font-size: 18px; color: pink;'>&#8253;</span> Found unknown section <kbd>%s</kbd></li>".format(this.sections[n].title);
          }
      }
     
    
    if (text.length > 0) {
        text = "<h5>Report review results:</h5>The following remarks were logged by the report compiler:<br/><ul>" + text + "</ul>";
    }
    if (!this.compiles) {
      text += "Your report could possibly use some more work, and that's okay! You can always save your current report as a draft and return later to work more on it. Drafts are saved for up to two months.";
    }
    else {
        text += "That's it, your board report compiled a-okay and is potentially ready for submission! If you'd like more time to work on it, you can save it as a draft, and return later to make some final edits. Or you can publish it to the agenda via Whimsy.";
    }
    text += "<br/><button class='btn btn-warning' onclick='save_draft();'>Save as draft</button>"
    if (this.compiles) text += " &nbsp; &nbsp; <button class='btn btn-success'>Publish via Whimsy</button>"
    return text;
}


// This is the Unfied Editor for reports.
function UnifiedEditor(div, layout) {
    // Bind to our textarea, direct or via ID.
    console.log(typeof div)
    if (typeof div == "string") this.object = document.getElementById(div);
    else this.object = div;
    
    this.layout = layout; // our JSON report layout (steps.json)
    this.sections = []; // Sections we have or have found in the editor.
    this.report = ""; // The combined report
    this.stepper = null; // optional stepper class
    
    this.have_highligted = false; // whether we have highlighted before?
    this.changed = false;  // whether report changed since last parse
    this.compiles = false; // Whether compiles are okay
    
    // Function references
    this.highlight = UnifiedEditor_highlight_sections;
    this.mark_section = UnifiedEditor_mark_section;
    this.parse = UnifiedEditor_parse_report;
    this.set_position = UnifiedEditor_set_position;
    this.reset = UnifiedEditor_reset;
    this.find_section = UnifiedEditor_find_section;
    this.compile = UnifiedEditor_compile;
    
    // set div events
    this.object.addEventListener('keyup', () => { this.find_section(true); });
    this.object.addEventListener('mouseup', () => { this.find_section(); });
    
}
