// Draft saving/loading features

let saved_drafts = null;
let draft_stepper = null;
let editor_type = 'unified';

function save_draft() {
    js = {
        'project': project,
        'action': 'save',
        'type': 'unified',
        'report': draft_stepper.editor.report
    }
    
    let formdata = JSON.stringify(js);
    
    // Enable spinner, hide main wrapper
    document.getElementById('loader_text').innerText = "Saving draft...";
    document.getElementById('wizard_spinner').style.display = 'block';
    document.getElementById('wrapper').style.display = 'none';
    document.getElementById("pname").style.display = 'none';
    
    POST('/api/drafts/save', draft_saved, {}, formdata);
}

function draft_saved(state, json) {
    // Disengage spinner
    document.getElementById('wizard_spinner').style.display = 'none';
    document.getElementById('wrapper').style.display = 'block';
    document.getElementById("pname").style.display = 'block';
    
    if (json.filename) {
        draft_stepper.editor.check_changes(true);
        modal("Draft was saved in the reporter database as <kbd>%s</kbd>. You can revisit this draft at any time by loading it from the base data tab. Drafts are kept for up to two months.".format(json.filename));
        let obj = {
          yours: true,
          filename: json.filename
        };
        let a = json.filename.split('-');
        let ts = a[2];
        saved_drafts[ts] = obj;
    } else {
        modal("Could not save draft: %s".format(json.error || "Unspecified error"));
    }
}


function load_draft(filename) {
    GET('/api/drafts/fetch?%s'.format(filename), read_draft, {});
}

function read_draft(state, json) {
    if (json.report) {
        draft_stepper.editor.object.value = json.report;
        draft_stepper.editor.report = json.report;
        window.setTimeout(() => { draft_stepper.editor.highlight() }, 250);
        draft_stepper.build(0, false, false);
        draft_stepper.editor.check_changes(true);
        modal("Draft was successfully loaded and is ready.");
    } else {
        modal("Could not load report draft :/");
    }
}


function list_drafts(pdata, editor) {
  if (!saved_drafts) {
    GET('/api/drafts/index?%s'.format(project), show_draft_list, {stepper:editor.stepper});
    return "";
  }
  else {
    return show_draft_list({stepper: editor.stepper});
  }
}

function show_draft_list(state, json) {
  if (json && json) { saved_drafts = json.drafts || {}; }
  draft_stepper = state.stepper||draft_stepper; // hackish for now!
  if (!draft_stepper) return;
  let txt = "";
  let filenames = Object.keys(saved_drafts||{});
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
  if (!window.confirm("Are you sure you wish to delete %s?".format(filename))) {
    return;
  }
  GET('/api/drafts/delete?%s'.format(filename), deleted_draft, {filename: filename});
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
    
    if (meta_data && meta_data.filed) {
      if (!window.confirm("The report already exists in %s. Do you wish to force an update?".format(agendafile))) {
        return;
      }
      js.digest = meta_data.report.digest;
      js.attach = meta_data.report.attach;
    }
    
    let formdata = JSON.stringify(js);
    
    // Enable spinner, hide main wrapper
    document.getElementById('loader_text').innerText = "Publishing report, hang on...";
    document.getElementById('wizard_spinner').style.display = 'block';
    document.getElementById('wrapper').style.display = 'none';
    document.getElementById("pname").style.display = 'none';
    
    POST('/api/whimsy/publish', report_published, {}, formdata);
}

function report_published(state, json) {
  // Disengage spinner
  document.getElementById('wizard_spinner').style.display = 'none';
  document.getElementById('wrapper').style.display = 'block';
  document.getElementById("pname").style.display = 'block';
  
  if (json && json.okay) {
    modal("Your report was successfully posted to the board agenda!");
    draft_stepper.editor.check_changes(true);
  } else {
    modal("Something went wrong, and we couldn't publish your report.<br/>Please check with the Whimsy tool to see if there is already a report posted!");
  }
  
  // Force whimsy reload of report meta data
  GET("/api/whimsy/agenda/refresh?%s".format(project), prime_meta, {noreset: true});
    
}

function load_from_agenda() {
  if (meta_data && meta_data.report) {
    if (draft_stepper.editor.unsaved && !window.confirm("You have unsaved changes to your current draft. Do you wish to override these with the report in the agenda file??")) return;
    draft_stepper.editor.object.value = meta_data.report.report;
    draft_stepper.editor.report = meta_data.report.report;
    window.setTimeout(() => { draft_stepper.editor.highlight() }, 250);
    draft_stepper.build(0, false, false);
    draft_stepper.editor.check_changes(true);
  }
}