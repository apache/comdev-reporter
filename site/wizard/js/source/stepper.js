let custom_step = {
    'description': 'Custom section',
    'help': "This looks like a custom section. While I don't know how to help you here, it's great that you have additional things to report on :)"
};

// Left-hand side stepper for reports
function ReportStepper(div, editor, layout, helper) {
    
    // bind to object
    if (typeof div == "string") this.object = document.getElementById(div);
    else this.object = div;
    
    // bind to helper
    if (typeof helper == "string") this.helper = document.getElementById(helper);
    else this.helper = helper;
    
    this.layout = layout;
    this.editor = editor;
    this.timer = null; // highlight timer
    this.step = -1;
    this.changed = false;
    this.pdata = null;
    
    this.build =function (s, start, noclick, e) {
        s = s || 0;
        
        this.changed = (s == this.step) ? false : true;
        this.step = s;
        
        if (start) {
            this.editor.reset();
            this.editor.report_saved = this.editor.report;
        }
        
        
        if (this.changed) this.editor.highlight();
        // skip building if nothing changed
        if (!this.changed && !start && this.editor.report == this.editor.last_cursor_report && s != -1) return;
        this.editor.last_cursor_report = this.editor.report;
        
        // build the step div
        this.object.innerHTML = '';
        for (var i = 0; i < this.layout.length; i++) {
            let element = this.layout[i];
            let wrapper = new HTML('div', {class: 'wizard-step-wrapper'});
            let x = i;
            wrapper.addEventListener('click', () => { this.build(x);});
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
            this.object.inject(wrapper);
            if (i < this.layout.length-1) {
                let line = new HTML('div', {class: 'wizard-line'});
                if (i < s) line.setAttribute('class', 'wizard-line done');
                this.object.inject(line);
            }
        }
            
        let step = (s == -1) ? custom_step : this.layout[s];
        // If helper exists, show useful data
        if (this.helper) {
            this.helper.innerHTML = "";
            this.helper.inject(new HTML('h4', {}, step.description + ':'));
            // Add in help
            if (step.helpgenerator) {
                let f = Function('a', 'b', "return %s(a, b);".format(step.helpgenerator));
                data = f(this.pdata, this.editor)
                this.helper.innerHTML += data + "<hr/>";
            } else if (step.help) {
                this.helper.innerHTML += step.help + "<hr/>";
            }
            // If minimum char size is required for a section, note it here
            if (step.minchars)  {
                this.editor.parse(true);
                let chars_remain = step.minchars;
                for (var n = 0; n < this.editor.sections.length; n++ ) {
                    let sct = this.editor.sections[n];
                    if (sct.title == (step.rawname||step.description) && sct.text.indexOf(PLACEHOLDER) == -1) {
                        chars_remain = step.minchars - sct.text.length;
                        break;
                    }
                }
                if (chars_remain > 0) {
                    this.helper.innerHTML += "<p style='color: red;'>This section needs at least %u more characters.</p>".format(chars_remain);
                }
            }
            
            // Do we have examples?
            if (step.examples && step.examples.length > 0) {
                this.helper.inject(new HTML('hr'));
                this.helper.inject(new HTML('big', {style: {color: '#396'}}, 'Need help with this section?  '));
                let examples = step.examples;
                let mtitle = step.rawname || step.description;
                let btn = new HTML('button', {class: 'btn btn-info'}, "Show examples");
                this.helper.inject(btn);
                btn.addEventListener('click', () => {show_examples(examples, mtitle);}, false);
                this.helper.inject(new HTML('hr'));
            }
            
            // Add tips?
            if (step.tipgenerator) {
                let thtml = new HTML('p');
                let f = Function('a', 'b', "return %s(a,b);".format(step.tipgenerator));
                data = f(this.pdata, this.editor);
                thtml.innerHTML += data;
                this.helper.inject(thtml);
            }
            // If clicked to a section, move cursor
            if (!noclick) {
                this.editor.set_position(step.rawname||step.description);
            }
            if (this.changed || !noclick)  this.editor.mark_section(step.rawname||step.description);
            else {
                window.clearTimeout(this.timer);
                if (event && event.keyCode == 13) this.editor.mark_section(step.rawname||step.description);
                else this.timer = window.setTimeout(() => { this.editor.mark_section(step.rawname||step.description)}, 200);
            }
        }
    }
}