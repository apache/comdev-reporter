
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
        }
        
        
        if (this.changed) this.editor.highlight();
        
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
            
        let step = this.layout[s];
        // If helper exists, show useful data
        if (this.helper) {
            this.helper.innerHTML = "<h5>%s:</h5>".format(step.description);
            // Add in help
            if (step.helpgenerator) {
                let f = Function('a', 'b', "return %s(a, b);".format(step.helpgenerator));
                data = f(this.pdata, this.editor)
                this.helper.innerHTML += data;
            } else if (step.help) {
                this.helper.innerHTML += step.help;
            }
            // Add tips?
            if (step.tipgenerator) {
                let f = Function('a', 'b', "return %s(a,b);".format(step.tipgenerator));
                data = f(this.pdata, this.editor)
                this.helper.innerHTML += data;
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