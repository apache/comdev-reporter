
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
}
