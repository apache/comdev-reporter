// Draft saving/loading features

let saved_drafts = null;
let draft_stepper = null;

function save_draft() {
    js = {
        'project': project,
        'action': 'save',
        'type': 'unified',
        'report': JSON.stringify(draft_stepper.editor.report),
        'report_compiled': draft_stepper.editor.report
    }
    
    let formdata = $.param(js);
    
    // Enable spinner, hide main wrapper
    document.getElementById('loader_text').innerText = "Saving draft...";
    document.getElementById('wizard_spinner').style.display = 'block';
    document.getElementById('wrapper').style.display = 'none';
    
    POST('drafts.py', draft_saved, {}, formdata);
}

function draft_saved(state, json) {
    // Disengage spinner
    document.getElementById('wizard_spinner').style.display = 'none';
    document.getElementById('wrapper').style.display = 'block';
    
    if (json.filename) {
        modal("Draft was saved in the reporter database as <kbd>%s</kbd>. You can revisit this draft at any time by loading it from the base data tab. Drafts are kept for up to two months.".format(json.filename));
    } else {
        modal("Could not save draft: %s".format(json.error || "Unspecified error"));
    }
}


function load_draft(filename) {
    GET('drafts.py?action=fetch&project=%s&filename=%s&type=%s'.format(project, filename, editor_type), read_draft, {});
}

function read_draft(state, json) {
    if (json.report) {
        draft_stepper.editor.object.value = json.report;
        draft_stepper.editor.report = json.report;
        window.setTimeout(() => { draft_stepper.editor.highlight() }, 250);
        draft_stepper.build(0, false, false);
        modal("Draft was successfully loaded and is ready.");
    } else {
        modal("Could not load report draft :/");
    }
}


function list_drafts(pdata, editor) {
  if (!saved_drafts) {
    GET('drafts.py?action=index&project=%s&type=%s'.format(project, editor_type), show_draft_list, {stepper:editor.stepper});
    return "";
  }
  else {
    return show_draft_list({stepper: editor.stepper});
  }
}

function show_draft_list(state, json) {
  if (json && json) { saved_drafts = json.drafts || {}; }
  draft_stepper = state.stepper||drafts_stepper; // hackish for now!
  let txt = "";
  let filenames = Object.keys(saved_drafts);
  if (filenames.length > 0) {
    txt += "<h6>Found the following saved drafts for %s:</h6>".format(project);
    txt += "<small style='font-size: 0.75rem;'><ul style='margin: 0px; padding: 10px;'>"
    filenames.sort();
    for (var i = filenames.length -1; i >= 0; i--) {
        let ts = filenames[i];
        let del = ''
        if (saved_drafts[ts].yours) {
             del = "<button class='btn btn-danger btn-sm' style='margin-left: 8px;' onclick='javascript:delete_draft(\"%s\");'>Delete</button>".format(saved_drafts[ts].filename);
        }
        let shortname = saved_drafts[ts].filename.replace(/[^-]+-[^-]+-/, '').replace('.json', ''); // don't need to show the full filename really
        txt += "<li>%s saved %s<button class='btn btn-info btn-sm' style='margin-left: 6px;' onclick='javascript:load_draft(\"%s\");'>Load</button> %s</li>".format(shortname, moment(parseInt(ts)*1000.0).fromNow(), saved_drafts[ts].filename, del);
    }
    txt += "</ul></small>"
  }
  if (json && state.stepper.step == 0) {
    let tip = document.getElementById('unified-helper');
    tip.innerHTML += txt;
  } else {
    return txt;
  }
}



function delete_draft(filename) {
    GET('drafts.py?action=delete&project=%s&filename=%s'.format(project, filename), deleted_draft, {filename: filename});
}

function deleted_draft(state, json) {
    if (json.message) {
        modal("Draft was successfully removed.");
        let filenames = Object.keys(saved_drafts);
        for (var i = 0; i < filenames.length; i++) {
            let ts = filenames[i];
            let fn = saved_drafts[ts].filename;
            if (fn == state.filename) {
                delete saved_drafts[ts];
                break
            }
        }
        draft_stepper.build(0, false);
    } else {
        modal("Could not remove report draft :/");
    }
}


function publish_report() {
    let agendafile = getReportDate(cycles, project, false, true);
    if (!window.confirm("This will publish your report to %s - are you sure?".format(agendafile))) {
      return;
    }
    let js = {
        'project': project,
        'agenda': agendafile,
        'report': draft_stepper.editor.report
    };
    
    let formdata = $.param(js);
    
    // Enable spinner, hide main wrapper
    document.getElementById('loader_text').innerText = "Publishing report, hang on...";
    document.getElementById('wizard_spinner').style.display = 'block';
    document.getElementById('wrapper').style.display = 'none';
    
    POST('whimsy.py', report_published, {}, formdata);
}

function report_published(state, json) {
  // Disengage spinner
  document.getElementById('wizard_spinner').style.display = 'none';
  document.getElementById('wrapper').style.display = 'block';
  
  if (json && json.okay) {
    modal("Your report was successfully posted to the board agenda!");
  } else {
    modal("Something went wrong, and we couldn't publish your report.<br/>Please check with the Whimsy tool to see if there is already a report posted!");
  }
}