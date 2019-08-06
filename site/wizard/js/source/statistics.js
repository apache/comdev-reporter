
function StatisticsPage(layout, pdata) {
    let wrapper = document.getElementById('wrapper');
    wrapper.style.padding = '8px';
    wrapper.innerHTML = "";
    for (var i = 0; i < layout.length; i++) {
        let step = layout[i];
        if (step.statsgenerator||step.tipgenerator) {
            let thtml = new HTML('p');
            let f = Function('a', 'b', "return %s(a,b);".format(step.statsgenerator||step.tipgenerator));
            data = f(pdata, {});
            if (typeof data == 'string') thtml.innerHTML += data;
            else if (typeof data == 'object') thtml.inject(data);
            thtml.inject(new HTML('hr'));
            wrapper.inject(thtml);
        }
    }
    
    headers = $(wrapper).find("h4");
    let toc = "<ul style='background: #3333;'>";
    for (var i = 0; i < headers.length; i++) {
        let t = headers[i].innerText.replace(/:.*$/, '');
        let id = t.replace(/\s+/g, '').toLowerCase();
        headers[i].setAttribute('id', id);
        toc += "<li style='display: inline-block; margin-left: 24px;'><a href='#%s'>%s</a></li>".format(id, t);
    }
    toc += "</ul>";
    let twrap = new HTML('div');
    twrap.innerHTML = toc;
    wrapper.insertBefore(twrap, wrapper.childNodes[0]);
    
}
